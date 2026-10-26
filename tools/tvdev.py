#!/usr/bin/env python3
"""Công cụ cho người muốn tự sửa và cài app từ mã nguồn. Chạy được trên Windows, macOS và Linux.

Người dùng bình thường không cần file này: cài bản có sẵn bằng Apps2Samsung (docs/huong-dan-cai-dat.md).

    python3 tools/tvdev.py setup                 # một lần: Tizen Studio CLI, chứng chỉ ký app, môi trường Python
    python3 tools/tvdev.py check                 # chặn cú pháp JS/CSS quá mới cho Chromium 69 của TV
    python3 tools/tvdev.py deploy --tv <IP TV>   # kiểm tra, đóng gói (ghép local/), cài lên TV, mở app
    python3 tools/tvdev.py deploy --no-run       # cài nhưng không mở
    python3 tools/tvdev.py debug --tv <IP TV>    # mở app ở chế độ debug, chuyển cổng về máy này (cho inspect.js)
    python3 tools/tvdev.py release               # đóng gói bản công khai (không có local/) vào dist/
    python3 tools/tvdev.py install --tv <IP TV> app.wgt   # ký lại một file .wgt bất kỳ (vd. TizenTube) và cài lên TV
    python3 tools/tvdev.py backup --tv <IP TV>   # chép dữ liệu của app trên TV (cài đặt, ảnh từ điện thoại, từ đã học)
    python3 tools/tvdev.py restore --tv <IP TV> local/backup/….json   # trả lại sau khi gỡ và cài lại app
    python3 tools/tvdev.py partner --tv <IP TV>  # ký bằng chứng chỉ Partner của Apps2Samsung (để TV khởi động hẳn
                                                 # vẫn mở màn hình chính); chuyển app đang cài sang chứng chỉ đó

Trên Windows thay python3 bằng py. IP của TV có thể đặt sẵn bằng biến môi trường TV_HOST.
"""
import argparse
import json
import os
import platform
import re
import secrets
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.join(ROOT, "app")
LOCAL = os.path.join(ROOT, "local")
DIST = os.path.join(ROOT, "dist")
APP_ID = "NhaMinh000.NhaMinh"
PROFILE = "nhaminh"                 # the profile tvdev.py setup makes (Tizen certificate, Public level)
PARTNER_PROFILE = "apps2samsung-partner"   # Apps2Samsung's Samsung Partner certificate, after tvdev.py partner
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
        shown = []
        for i, c in enumerate(cmd):   # never print a password ("-p <password>")
            shown.append("***" if i and cmd[i - 1] in ("-p", "-dp") else os.path.basename(c) if i == 0 else c)
        die("lệnh thất bại: " + " ".join(shown))
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
    # The CLI remembers where profiles.xml lives; a fresh data folder (new machine, CI cache) needs the file to exist.
    profiles_xml = os.path.join(data, "profile", "profiles.xml")
    os.makedirs(os.path.dirname(profiles_xml), exist_ok=True)
    run([tizen_bin(), "cli-config", "default.profiles.path=" + profiles_xml], check=False, capture=True)
    if not os.path.exists(profiles_xml):
        with open(profiles_xml, "w", encoding="utf-8") as f:
            f.write('<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n<profiles active="%s" version="3.1">\n</profiles>\n' % PROFILE)
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


def fix_linux_passwords(profiles, password, distributor_password=None):
    """Without a desktop keyring (Linux servers, CI) the CLI keeps no .pwd files and signing fails with "Invalid
    password": write the passwords into profiles.xml itself, as the Tizen Docker images do."""
    if platform.system() != "Linux" or not os.path.exists(profiles):   # macOS and Windows keep them in their keychain
        return
    s = open(profiles, encoding="utf-8").read()

    def repl(m):
        key, pwd = m.group(1), m.group(2)
        if not pwd.endswith(".pwd") or os.path.exists(pwd):
            return m.group(0)
        dist = distributor_password or DISTRIBUTOR_PASSWORD
        return m.group(0).replace('password="%s"' % pwd, 'password="%s"' % (dist if "distributor" in key else password))

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
    dest = os.path.join(DIST, "NhaMinh.wgt" if not public else "NhaMinh-%s.wgt" % version())
    sign(src, dest)
    shutil.rmtree(tmp, ignore_errors=True)
    return dest


def signing_profile():
    """TIZEN_PROFILE if set, else the one tvdev.py partner chose (kept in <data>/nhaminh.profile), else ours."""
    if os.environ.get("TIZEN_PROFILE"):
        return os.environ["TIZEN_PROFILE"]
    chosen = os.path.join(tizen_data(), "nhaminh.profile")
    return open(chosen).read().strip() if os.path.exists(chosen) else PROFILE


def sign(src, dest):
    """Package and sign the folder src with our certificate into dest (a .wgt)."""
    need_tizen()
    tmp = tempfile.mkdtemp()
    out = os.path.join(tmp, "out")
    profile = signing_profile()
    cmd = [tizen_bin(), "package", "-t", "wgt", "-s", profile, "-o", out, "--", src]
    pass_file = os.path.join(tizen_data(), profile + ".pass")
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
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    # The package is named after <name> (may have Vietnamese letters); the installer wants a plain file name.
    shutil.move(os.path.join(out, wgts[0]), dest)
    shutil.rmtree(tmp, ignore_errors=True)


def version():
    m = re.search(r'<widget[^>]*\sversion="([^"]+)"', open(os.path.join(APP, "config.xml"), encoding="utf-8").read())
    return m.group(1) if m else "0"


def connect(target):
    run([sdb_bin(), "connect", target], check=False, capture=True)
    devices = run([sdb_bin(), "devices"], capture=True).stdout
    if not re.search(r"^%s\s+device" % re.escape(target), devices, re.M):
        die("không thấy TV ở %s. Kiểm tra: TV đang bật, Developer Mode bật, Host PC IP = IP của máy này." % target)


def install_wgt(wgt, target):
    r = run([tizen_bin(), "install", "-n", os.path.basename(wgt), "-s", target, "--", os.path.dirname(wgt)], check=False, capture=True)
    if "successfully installed" not in (r.stdout or ""):
        print((r.stdout or "") + (r.stderr or ""))
        die("cài lên TV không xong")
    print("Đã cài %d MB lên TV %s" % (os.path.getsize(wgt) // 1048576, target))


def deploy(args):
    target = tv_target(args)
    check()
    connect(target)
    wgt = build(public=False)
    install_wgt(wgt, target)
    if not args.no_run:
        run([tizen_bin(), "run", "-p", APP_ID, "-s", target], check=False)


def install(args):
    """Another app's .wgt (TizenTube, a game…): its signatures replaced by ours, then installed like this one."""
    import zipfile
    target = tv_target(args)
    if not os.path.isfile(args.wgt):
        die("không thấy file " + args.wgt)
    tmp = tempfile.mkdtemp()
    src = os.path.join(tmp, "app")
    with zipfile.ZipFile(args.wgt) as z:
        z.extractall(src)
    for n in os.listdir(src):
        if re.match(r"(author-)?signature\d*\.xml$", n):
            os.remove(os.path.join(src, n))
    m = re.search(r'<tizen:application[^>]*\sid="([^"]+)"', open(os.path.join(src, "config.xml"), encoding="utf-8").read())
    connect(target)
    dest = os.path.join(tmp, "signed", "app.wgt")
    sign(src, dest)
    install_wgt(dest, target)
    if m and not args.no_run:
        run([tizen_bin(), "run", "-p", m.group(1), "-s", target], check=False)
    shutil.rmtree(tmp, ignore_errors=True)


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
    run([sdb_bin(), "-s", target, "forward", "--remove", "tcp:9333"], check=False, capture=True)
    run([sdb_bin(), "-s", target, "forward", "tcp:9333", "tcp:" + m.group(1)], check=False, capture=True)
    print("App đang ở chế độ debug. Dùng: node tools/inspect.js --port 9333 --eval \"NhaMinhDebug.wall()\"")


def normal(target):
    """Back from debug mode: the app as it runs every day, without the port forward."""
    run([sdb_bin(), "-s", target, "forward", "--remove", "tcp:9333"], check=False, capture=True)
    run([sdb_bin(), "-s", target, "shell", "0", "was_kill", APP_ID], check=False, capture=True)
    run([sdb_bin(), "-s", target, "shell", "0", "execute", APP_ID], check=False, capture=True)


def in_app(args, script, out=None, data=None):
    """Run tools/tvdata/<script> inside the app on the TV (debug mode for a moment); the JSON result goes to out."""
    target = tv_target(args)
    debug(args)
    time.sleep(8)   # the app's own start-up first
    src = open(os.path.join(ROOT, "tools", "tvdata", script), encoding="utf-8").read()
    if data is not None:
        src = src.replace("(DATA)", "(" + data + ")")
    job = os.path.join(tempfile.mkdtemp(), script)
    open(job, "w", encoding="utf-8").write(src)
    cmd = ["node", os.path.join(ROOT, "tools", "inspect.js"), "--port", "9333", "--await", "--timeout", "120000", "--eval-file", job]
    r = run(cmd + (["--out", out] if out else []), check=False, capture=True)
    normal(target)
    if r.returncode != 0:
        print((r.stdout or "") + (r.stderr or ""))
        die("không chạy được trong app trên TV")
    return r.stdout or ""


def backup(args):
    out = args.out or os.path.join(LOCAL, "backup", "tv-data-%s.json" % time.strftime("%Y%m%d-%H%M"))
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    in_app(args, "backup.js", out=out)
    d = json.load(open(out, encoding="utf-8"))
    print("Đã sao lưu vào %s: %d mục cài đặt, %d mục dữ liệu, %d ảnh (bản %s)"
          % (os.path.relpath(out, ROOT), len(d["localStorage"]), len(d["kv"]), len(d["photos"]), d.get("version")))


def restore(args):
    d = json.load(open(args.file, encoding="utf-8"))
    if d.get("app") != "NhaMinh":
        die("không phải file sao lưu của màn hình chính")
    print(in_app(args, "restore.js", data=json.dumps(d)).strip())
    print("Đã trả lại dữ liệu từ " + args.file)


def apps2samsung_dir():
    """Apps2Samsung's data folder (desktop app and apps2samsung-cli share it)."""
    if os.environ.get("APPS2SAMSUNG_DATA_DIR"):
        return os.environ["APPS2SAMSUNG_DATA_DIR"]
    if WINDOWS:
        base = os.environ.get("APPDATA", os.path.expanduser("~"))
    elif platform.system() == "Darwin":
        base = os.path.expanduser("~/Library/Application Support")
    else:
        base = os.environ.get("XDG_CONFIG_HOME", os.path.expanduser("~/.config"))
    return os.path.join(base, "Apps2Samsung")


def partner(args):
    """Sign with Apps2Samsung's Partner certificate from now on; with --tv, move the installed app over to it.

    Tizen honours on-boot="true" (the service starts when the TV boots, and brings the home screen up) only for
    Partner-signed apps. The certificate is Samsung's, made once by Apps2Samsung after a Samsung account sign-in:
    apps2samsung-cli cert --tv <IP TV> --partner --prepare. A TV refuses an update signed by another certificate, so
    moving over means backup → uninstall → install → restore.
    """
    need_tizen()
    d = os.path.join(apps2samsung_dir(), "Certificate", "Jelly2Sams - Partner")
    author, dist, pw = (os.path.join(d, n) for n in ("author.p12", "distributor.p12", "password.txt"))
    if not all(os.path.exists(f) for f in (author, dist, pw)):
        die("chưa có chứng chỉ Partner của Apps2Samsung ở " + d + ". Tạo bằng: apps2samsung-cli cert --tv <IP TV> "
            "--partner --prepare (đăng nhập tài khoản Samsung), hoặc cài một app bất kỳ bằng Apps2Samsung với Partner Signing.")
    password = open(pw).read().strip()
    run([tizen_bin(), "security-profiles", "remove", "-n", PARTNER_PROFILE], check=False, capture=True)
    r = run([tizen_bin(), "security-profiles", "add", "-n", PARTNER_PROFILE, "-a", author, "-p", password, "-d", dist,
             "-dp", password], check=False, capture=True)
    if r.returncode != 0:
        print((r.stdout or "") + (r.stderr or ""))
        die("không thêm được security profile " + PARTNER_PROFILE)
    fix_linux_passwords(os.path.join(tizen_data(), "profile", "profiles.xml"), password, password)
    pass_file = os.path.join(tizen_data(), PARTNER_PROFILE + ".pass")
    with open(pass_file, "w") as f:
        f.write(password)
    os.chmod(pass_file, 0o600)
    with open(os.path.join(tizen_data(), "nhaminh.profile"), "w") as f:
        f.write(PARTNER_PROFILE)
    say("Từ giờ tvdev.py ký bằng chứng chỉ Partner (%s). Quay về chứng chỉ thường: xóa %s"
        % (PARTNER_PROFILE, os.path.join(tizen_data(), "nhaminh.profile")))
    if not args.tv and not os.environ.get("TV_HOST"):
        return
    target = tv_target(args)
    connect(target)
    say("Sao lưu dữ liệu của app trên TV")
    out = os.path.join(LOCAL, "backup", "tv-data-%s.json" % time.strftime("%Y%m%d-%H%M"))
    os.makedirs(os.path.dirname(out), exist_ok=True)
    in_app(args, "backup.js", out=out)
    say("Gỡ app (chứng chỉ cũ) rồi cài bản ký Partner")
    run([tizen_bin(), "uninstall", "-p", APP_ID, "-s", target], check=False, capture=True)   # the TV wants the app id here
    check()
    install_wgt(build(public=False), target)
    run([tizen_bin(), "run", "-p", APP_ID, "-s", target], check=False)
    time.sleep(6)
    say("Trả lại dữ liệu")
    in_app(args, "restore.js", data=open(out, encoding="utf-8").read())
    say("Xong. Bản sao lưu: " + os.path.relpath(out, ROOT))


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
    p = sub.add_parser("backup", help="chép dữ liệu của app trên TV về máy (local/backup/)")
    p.add_argument("--tv", help="IP của TV (hoặc biến TV_HOST)")
    p.add_argument("--out", help="file JSON (mặc định local/backup/tv-data-<giờ>.json)")
    p = sub.add_parser("restore", help="trả dữ liệu đã sao lưu lại cho app trên TV")
    p.add_argument("file", help="file JSON do lệnh backup tạo")
    p.add_argument("--tv", help="IP của TV (hoặc biến TV_HOST)")
    p = sub.add_parser("partner", help="ký bằng chứng chỉ Partner của Apps2Samsung; --tv: chuyển app trên TV sang")
    p.add_argument("--tv", help="IP của TV (hoặc biến TV_HOST)")
    p = sub.add_parser("install", help="ký lại một file .wgt khác (vd. TizenTube) và cài lên TV")
    p.add_argument("wgt", help="file .wgt")
    p.add_argument("--tv", help="IP của TV (hoặc biến TV_HOST)")
    p.add_argument("--no-run", action="store_true", help="cài nhưng không mở app")
    args = ap.parse_args()
    {"setup": setup, "check": check, "deploy": deploy, "debug": debug, "release": release, "install": install,
     "backup": backup, "restore": restore, "partner": partner}[args.cmd](args)


if __name__ == "__main__":
    main()
