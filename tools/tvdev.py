#!/usr/bin/env python3
"""Công cụ cho người muốn tự sửa và cài app từ mã nguồn. Chạy được trên Windows, macOS và Linux.

Người dùng bình thường không cần file này: cài bản có sẵn bằng Apps2Samsung (docs/huong-dan-cai-dat.md).

    python3 tools/tvdev.py setup                 # một lần: Tizen Studio CLI, chứng chỉ ký app, môi trường Python
    python3 tools/tvdev.py check                 # chặn cú pháp JS/CSS quá mới cho Chromium 69 của TV
    python3 tools/tvdev.py deploy --tv <IP TV>   # kiểm tra, đóng gói (ghép local/), cài lên TV, mở app
    python3 tools/tvdev.py deploy --no-run       # cài nhưng không mở
    python3 tools/tvdev.py debug --tv <IP TV>    # mở app ở chế độ debug, chuyển cổng về máy này (cho inspect.js)
    python3 tools/tvdev.py release               # đóng gói bản công khai (không có local/) vào dist/

Trên Windows thay python3 bằng py. IP của TV có thể đặt sẵn bằng biến môi trường TV_HOST.
"""
import argparse
import os
import platform
import re
import secrets
import shutil
import subprocess
import sys
import tempfile
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.join(ROOT, "app")
LOCAL = os.path.join(ROOT, "local")
DIST = os.path.join(ROOT, "dist")
APP_ID = "NhaMinh000.NhaMinh"
PROFILE = os.environ.get("TIZEN_PROFILE", "nhaminh")
WINDOWS = os.name == "nt"
INSTALLER = "https://download.tizen.org/sdk/Installer/tizen-studio_6.1/web-cli_Tizen_Studio_6.1_%s"


def say(msg):
    print("\033[1;36m==>\033[0m " + msg if sys.stdout.isatty() else "==> " + msg, flush=True)


def die(msg):
    sys.exit("Lỗi: " + msg)


# ---- where things are ------------------------------------------------------------------------------------------

def tizen_home():
    return os.environ.get("TIZEN_HOME") or (r"C:\tizen-studio" if WINDOWS else os.path.expanduser("~/tizen-studio"))


def tizen_data():
    return os.environ.get("TIZEN_DATA") or (r"C:\tizen-studio-data" if WINDOWS else os.path.expanduser("~/tizen-studio-data"))


def tizen_bin():
    return os.path.join(tizen_home(), "tools", "ide", "bin", "tizen.bat" if WINDOWS else "tizen")


def sdb_bin():
    return os.path.join(tizen_home(), "tools", "sdb.exe" if WINDOWS else "sdb")


def run(cmd, check=True, capture=False, **kw):
    """Runs a command; .bat files need cmd.exe on Windows."""
    if WINDOWS and cmd[0].lower().endswith(".bat"):
        cmd = ["cmd", "/c"] + cmd
    r = subprocess.run(cmd, capture_output=capture, text=True, **kw)
    if check and r.returncode != 0:
        if capture:
            print((r.stdout or "") + (r.stderr or ""))
        die("lệnh thất bại: " + " ".join(os.path.basename(c) if i == 0 else c for i, c in enumerate(cmd)))
    return r


class Result:
    def __init__(self, code, out):
        self.returncode, self.stdout, self.stderr = code, out, ""


def run_answering(cmd, answers):
    """Run cmd on a pseudo-terminal (POSIX), typing each answer when its prompt shows up."""
    import pty
    import select
    master, slave = pty.openpty()
    proc = subprocess.Popen(cmd, stdin=slave, stdout=slave, stderr=slave, close_fds=True)
    os.close(slave)
    seen, out, pending = b"", b"", list(answers)
    while True:
        ready, _, _ = select.select([master], [], [], 0.5)
        if ready:
            try:
                chunk = os.read(master, 4096)
            except OSError:
                break
            if not chunk:
                break
            out += chunk
            seen += chunk
            while pending and pending[0][0] in seen:
                os.write(master, pending[0][1])
                seen = seen.split(pending[0][0], 1)[1]
                pending.pop(0)
        elif proc.poll() is not None:
            break
    proc.wait()
    os.close(master)
    return Result(proc.returncode, out.decode("utf-8", "replace"))


def need_tizen():
    if not os.path.exists(tizen_bin()):
        die("chưa có Tizen Studio CLI ở %s. Chạy trước: python3 tools/tvdev.py setup" % tizen_home())


def tv_target(args):
    host = args.tv or os.environ.get("TV_HOST")
    if not host:
        die("cần IP của TV: thêm --tv <IP TV> (hoặc đặt biến TV_HOST)")
    return host if ":" in host else host + ":26101"


# ---- setup -------------------------------------------------------------------------------------------------------

def installer_name():
    system = platform.system()
    if system == "Windows":
        return "windows-64.exe"
    if system == "Darwin":
        return "macos-64.bin"
    return "ubuntu-64.bin"


def setup(args):
    if platform.system() == "Darwin" and platform.machine() == "arm64":
        # The CLI's sdb and bundled JDK are x86_64 builds.
        if subprocess.run(["/usr/bin/arch", "-x86_64", "/usr/bin/true"], capture_output=True).returncode != 0:
            say("Cài Rosetta 2 (Mac chip Apple)")
            run(["softwareupdate", "--install-rosetta", "--agree-to-license"])

    if not os.path.exists(tizen_bin()):
        name = installer_name()
        say("Tải Tizen Studio 6.1 CLI (%s, khoảng 280 MB) vào %s" % (name, tizen_home()))
        tmp = tempfile.mkdtemp()
        path = os.path.join(tmp, "tizen-installer-" + name)
        urllib.request.urlretrieve(INSTALLER % name, path)
        if not WINDOWS:
            os.chmod(path, 0o755)
        r = subprocess.run([path, "--accept-license", tizen_home()])
        if r.returncode != 0 or not os.path.exists(tizen_bin()):
            die("cài Tizen Studio không xong. Chạy tay file %s và chọn thư mục %s (không dấu, không khoảng trắng)"
                % (path, tizen_home()))
        shutil.rmtree(tmp, ignore_errors=True)

    data = tizen_data()
    os.makedirs(data, exist_ok=True)
    pass_file = os.path.join(data, PROFILE + ".pass")
    if not os.path.exists(pass_file):
        # The password lives only on this machine, never in the repo.
        with open(pass_file, "w") as f:
            f.write(secrets.token_hex(12))
        os.chmod(pass_file, 0o600)
    password = open(pass_file).read().strip()

    cert = os.path.join(data, "keystore", "author", PROFILE + ".p12")
    if not os.path.exists(cert):
        say("Tạo chứng chỉ ký app " + cert)
        run([tizen_bin(), "certificate", "-a", PROFILE, "-p", password, "-c", "VN", "-ct", "Ha Noi", "-n", "Nha Minh",
             "-f", PROFILE])
    profiles = run([tizen_bin(), "security-profiles", "list"], check=False, capture=True).stdout or ""
    if not re.search(r"\b%s\b" % re.escape(PROFILE), profiles):
        say("Tạo security profile " + PROFILE)
        run([tizen_bin(), "security-profiles", "add", "-n", PROFILE, "-a", cert, "-p", password])
    run([tizen_bin(), "cli-config", "default.profiles.path=" + os.path.join(data, "profile", "profiles.xml")],
        check=False, capture=True)
    fix_linux_passwords(os.path.join(data, "profile", "profiles.xml"), password)

    venv = os.path.join(ROOT, "tools", ".venv")
    py = os.path.join(venv, "Scripts" if WINDOWS else "bin", "python")
    if not args.no_venv and not os.path.exists(py):
        say("Tạo môi trường Python tools/.venv (samsungtvws, Pillow)")
        run([sys.executable, "-m", "venv", venv])
        run([py, "-m", "pip", "install", "-q", "--upgrade", "pip"])
        run([py, "-m", "pip", "install", "-q", "samsungtvws", "pillow"])
    say("Xong. Bước tiếp: bật Developer Mode trên TV (docs/huong-dan-cai-dat.md), rồi chạy"
        " python3 tools/tvdev.py deploy --tv <IP TV>")


DISTRIBUTOR_PASSWORD = "tizenpkcs12passfordsigner"   # the public password of Tizen's own distributor certificate


def fix_linux_passwords(profiles, password):
    """Without a desktop keyring (Linux servers, CI) the CLI keeps no .pwd files and signing fails with "Invalid
    password": write the passwords into profiles.xml itself, as the Tizen Docker images do."""
    if platform.system() != "Linux" or not os.path.exists(profiles):   # macOS and Windows keep them in their keychain
        return
    s = open(profiles, encoding="utf-8").read()

    def repl(m):
        key, pwd = m.group(1), m.group(2)
        if not pwd.endswith(".pwd") or os.path.exists(pwd):
            return m.group(0)
        return m.group(0).replace('password="%s"' % pwd, 'password="%s"' % (DISTRIBUTOR_PASSWORD if "distributor" in key else password))

    fixed = re.sub(r'<profileitem[^>]*key="([^"]*)"[^>]*password="([^"]*)"[^>]*/>', repl, s)
    if fixed != s:
        open(profiles, "w", encoding="utf-8").write(fixed)
        say("Ghi mật khẩu chứng chỉ vào profiles.xml (máy không có keyring)")


# ---- check -------------------------------------------------------------------------------------------------------

CSS_TOO_NEW = re.compile(r"(^|[^-])inset:|backdrop-filter|aspect-ratio|:is\(|:where\(|clamp\(|[^a-z-]min\(|[^a-z-]max\("
                         r"|(^|[;{ ])gap:|row-gap|column-gap")


def files(ext):
    for base, dirs, names in os.walk(APP):
        dirs[:] = [d for d in dirs if d != "node_modules"]
        for n in names:
            if n.endswith(ext):
                yield os.path.join(base, n)


def check(_args=None):
    """Chromium 69 (Tizen 5.5): ES2018 at most, and no CSS it does not know."""
    npx = shutil.which("npx.cmd" if WINDOWS else "npx")
    if not npx:
        die("cần Node.js (có lệnh npx) để kiểm tra JS: https://nodejs.org")
    js = sorted(files(".js"))
    r = subprocess.run([npx, "-y", "acorn@8", "--ecma2018", "--silent"] + js, capture_output=True, text=True, cwd=ROOT)
    ok = r.returncode == 0
    if not ok:
        print("JS quá mới cho Tizen 5.5: " + (r.stdout + r.stderr).strip().replace(ROOT + os.sep, ""))
    for css in files(".css"):
        for i, line in enumerate(open(css, encoding="utf-8"), 1):
            if CSS_TOO_NEW.search(line) and not line.lstrip().startswith(("/*", "*")):
                print("CSS không chạy trên Tizen 5.5: %s:%d: %s" % (os.path.relpath(css, ROOT), i, line.strip()))
                ok = False
    if not ok:
        sys.exit(1)
    print("check: OK")


# ---- build / deploy ----------------------------------------------------------------------------------------------

def build(public):
    """Package app/ (plus local/ unless public) into dist/; returns the .wgt path."""
    need_tizen()
    tmp = tempfile.mkdtemp()
    src = os.path.join(tmp, "app")
    shutil.copytree(APP, src, ignore=shutil.ignore_patterns(".DS_Store", "*.wgt", "icon.svg"))
    if not public and os.path.isdir(LOCAL):
        for base, _dirs, names in os.walk(LOCAL):
            for n in names:
                if n in (".DS_Store", "app-name.txt"):
                    continue
                rel = os.path.relpath(os.path.join(base, n), LOCAL)
                os.makedirs(os.path.dirname(os.path.join(src, rel)), exist_ok=True)
                shutil.copy2(os.path.join(base, n), os.path.join(src, rel))
        name_file = os.path.join(LOCAL, "app-name.txt")
        if os.path.exists(name_file):
            name = open(name_file, encoding="utf-8").readline().strip().replace("&", "&amp;")
            for f, pat in (("config.xml", r"<name>[^<]*</name>"), ("index.html", r"<title>[^<]*</title>")):
                p = os.path.join(src, f)
                s = open(p, encoding="utf-8").read()
                tag = pat[1:pat.index(">")]
                s = re.sub(pat, "<%s>%s</%s>" % (tag, name, tag), s, count=1)
                open(p, "w", encoding="utf-8").write(s)
    out = os.path.join(tmp, "out")
    cmd = [tizen_bin(), "package", "-t", "wgt", "-s", PROFILE, "-o", out, "--", src]
    pass_file = os.path.join(tizen_data(), PROFILE + ".pass")
    if platform.system() == "Linux" and os.path.exists(pass_file):
        # Without a keyring the CLI asks for the password on a terminal (and whether to save it).
        password = open(pass_file).read().strip()
        r = run_answering(cmd, [(b"Author password:", (password + "\r").encode()), (b"(N) ?", b"N\r")])
    else:
        r = run(cmd, check=False, capture=True)
    wgts = [f for f in os.listdir(out)] if os.path.isdir(out) else []
    if r.returncode != 0 or not wgts:
        print((r.stdout or "") + (r.stderr or ""))
        log = os.path.join(tizen_data(), "cli", "logs", "cli.log")
        if os.path.exists(log):
            print("--- cuối " + log + " ---")
            print("".join(open(log, encoding="utf-8", errors="replace").readlines()[-40:]))
        die("đóng gói không xong (đã chạy tvdev.py setup chưa?)")
    os.makedirs(DIST, exist_ok=True)
    # The package is named after <name> (may have Vietnamese letters); the installer wants a plain file name.
    dest = os.path.join(DIST, "NhaMinh.wgt" if not public else "NhaMinh-%s.wgt" % version())
    shutil.move(os.path.join(out, wgts[0]), dest)
    shutil.rmtree(tmp, ignore_errors=True)
    return dest


def version():
    m = re.search(r'<widget[^>]*\sversion="([^"]+)"', open(os.path.join(APP, "config.xml"), encoding="utf-8").read())
    return m.group(1) if m else "0"


def connect(target):
    run([sdb_bin(), "connect", target], check=False, capture=True)
    devices = run([sdb_bin(), "devices"], capture=True).stdout
    if not re.search(r"^%s\s+device" % re.escape(target), devices, re.M):
        die("không thấy TV ở %s. Kiểm tra: TV đang bật, Developer Mode bật, Host PC IP = IP của máy này." % target)


def deploy(args):
    target = tv_target(args)
    check()
    connect(target)
    wgt = build(public=False)
    r = run([tizen_bin(), "install", "-n", os.path.basename(wgt), "-s", target, "--", DIST], check=False, capture=True)
    if "successfully installed" not in (r.stdout or ""):
        print((r.stdout or "") + (r.stderr or ""))
        die("cài lên TV không xong")
    print("Đã cài %d MB lên TV %s" % (os.path.getsize(wgt) // 1048576, target))
    if not args.no_run:
        run([tizen_bin(), "run", "-p", APP_ID, "-s", target], check=False)


def debug(args):
    target = tv_target(args)
    connect(target)
    run([sdb_bin(), "-s", target, "shell", "0", "was_kill", APP_ID], check=False, capture=True)
    # "debug" prints the port and may keep running: read until the port shows up, then leave it be.
    proc = subprocess.Popen([sdb_bin(), "-s", target, "shell", "0", "debug", APP_ID], stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT, text=True)
    out, m = "", None
    for line in proc.stdout:
        out += line
        m = re.search(r"port:\s*(\d+)", line)
        if m or "error" in line.lower():
            break
    if not m:
        die("không mở được chế độ debug: " + out.strip())
    run([sdb_bin(), "-s", target, "forward", "tcp:9333", "tcp:" + m.group(1)], check=False, capture=True)
    print("App đang ở chế độ debug. Dùng: node tools/inspect.js --port 9333 --eval \"NhaMinhDebug.wall()\"")


def release(_args):
    check()
    wgt = build(public=True)
    print("Bản công khai: %s (%d MB). Đưa lên GitHub: gh release create v%s %s"
          % (os.path.relpath(wgt, ROOT), os.path.getsize(wgt) // 1048576, version(), os.path.relpath(wgt, ROOT)))


def main():
    ap = argparse.ArgumentParser(description="Công cụ dev cho màn hình chính TV Samsung (Windows, macOS, Linux).")
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("setup", help="cài Tizen Studio CLI, chứng chỉ, môi trường Python")
    p.add_argument("--no-venv", action="store_true", help="bỏ qua môi trường Python (tv.py, photos.py)")
    sub.add_parser("check", help="kiểm tra JS/CSS cho Chromium 69")
    p = sub.add_parser("deploy", help="đóng gói và cài lên TV")
    p.add_argument("--tv", help="IP của TV (hoặc biến TV_HOST)")
    p.add_argument("--no-run", action="store_true", help="cài nhưng không mở app")
    p = sub.add_parser("debug", help="mở app ở chế độ debug")
    p.add_argument("--tv", help="IP của TV (hoặc biến TV_HOST)")
    sub.add_parser("release", help="đóng gói bản công khai vào dist/")
    args = ap.parse_args()
    {"setup": setup, "check": check, "deploy": deploy, "debug": debug, "release": release}[args.cmd](args)


if __name__ == "__main__":
    main()
