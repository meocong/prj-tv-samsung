#!/usr/bin/env python3
"""Đồng bộ danh sách app từ TV vào app/js/apps.js, kèm icon chính thức.

Trên Tizen, app web không đọc được danh sách Smart Hub (getAppsInfo trả cả trăm app hệ thống ẩn)
cũng như icon của app khác. Script này đọc danh sách thật qua `sdb shell 0 vd_applist` (đúng các app
bạn thấy trong mục Ứng dụng, kèm số lần mở) và tải icon chính thức từ App Store (iTunes Search API).

Mỗi icon vuông được dựng thành banner 16:9 (720×405): logo ở giữa, nền kéo dài theo màu của chính logo,
giống ô app trên Apple TV. Việc này làm sẵn trên máy Mac để TV không phải xử lý ảnh lúc chạy.

    tools/.venv/bin/python tools/sync_apps.py            # TV mặc định 192.168.1.7
    tools/.venv/bin/python tools/sync_apps.py --list     # chỉ in danh sách

Cần Pillow: tools/.venv/bin/pip install pillow
"""
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.parse
import urllib.request

from PIL import Image, ImageChops, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
TV = os.environ.get("TV_HOST", "192.168.1.7") + ":26101"
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tvdev import sdb_bin  # noqa: E402  (same folder)

SDB = sdb_bin()
ICON_DIR = os.path.join(ROOT, "app", "icons")
CACHE = os.path.join(HERE, ".cache", "icons")
BANNER = (720, 405)

# Smart Hub title (regex) -> (App Store search term, seller must contain, app name must contain).
# None = our own glyph in tools/glyphs/<name>.svg (Samsung's built-in apps have no store icon).
ICONS = [
    (r"^youtube$", ("YouTube", "Google", "YouTube")),
    (r"netflix", None),   # the store's iOS 26 artwork has a glossy rim that breaks up on a TV: our own flat N
    (r"prime video", ("Prime Video", "AMZN", "Prime Video")),
    (r"vieon", ("VieON", "VIEON", "VieON")),
    (r"fpt play", ("FPT Play", "FPT", "FPT Play")),
    (r"tv360", ("TV360", "Viettel", "TV360")),
    (r"^vtvgo", ("VTVgo", "Dai Truyen Hinh", "VTVgo")),
    (r"vtv giải trí", ("file", "vtv-giai-tri.png")),   # no longer in any store: our own wordmark
    (r"vtvcab", ("VTVcab ON", "Vietnam Cable", "VTVcab")),
    (r"galaxy play", ("Galaxy Play", "Galaxy Play", "Galaxy Play")),
    (r"mytv", ("MyTV VNPT", "VNPT", "MyTV")),
    (r"kplus|k\+", ("K+ Kplus", "", "K+")),
    (r"smartthings", ("SmartThings", "Samsung", "SmartThings")),
    (r"^apple tv", ("Apple TV", "Apple", "Apple TV")),
    (r"apple music", ("Apple Music", "Apple", "Apple Music")),
    (r"spotify", ("Spotify", "Spotify", "Spotify")),
    (r"zing mp3", ("Zing MP3", "VNG", "Zing MP3")),
    (r"facebook", ("Facebook", "Meta", "Facebook")),
    (r"^internet$", None),
    (r"^gallery$", None),
    (r"tizenbrew", ("file", "tizenbrew.png")),   # icon taken from TizenBrew's own package
    (r"^tizentube", ("banner", "tizentube.png")),   # TizenTube's own 16:9 artwork, used as it is
]
# One line shown under the app's name when it is focused (Apple TV's top shelf, in words).
DESCRIPTIONS = [
    (r"^youtube", "Video, âm nhạc và kênh yêu thích · YouTube Premium không quảng cáo"),
    (r"netflix", "Phim, series và chương trình độc quyền"),
    (r"prime video", "Phim và series Amazon Originals"),
    (r"^internet", "Trình duyệt web của Samsung"),
    (r"vieon", "Phim Việt, show thực tế và thể thao"),
    (r"fpt play", "Truyền hình, phim và bóng đá trực tiếp"),
    (r"smartthings", "Điều khiển thiết bị thông minh trong nhà"),
    (r"tv360", "Truyền hình, phim và thể thao của Viettel"),
    (r"^vtvgo", "Truyền hình VTV trực tiếp và xem lại"),
    (r"^apple tv", "Apple TV+ và phim thuê, mua từ Apple"),
    (r"galaxy play", "Phim Việt chiếu rạp và phim bộ"),
    (r"facebook", "Video từ Facebook"),
    (r"vtv giải trí", "Kênh giải trí và chương trình của VTVcab"),
    (r"mytv", "Truyền hình và phim của VNPT"),
    (r"^gallery", "Ảnh và video trên TV và USB"),
    (r"vtvcab", "Truyền hình cáp VTVcab, thể thao và phim"),
    (r"kplus|k\+", "Bóng đá, phim và các kênh K+"),
    (r"tizenbrew", "Cài module cho TV, như TizenTube"),
    (r"^tizentube", "YouTube không quảng cáo, tự bỏ qua đoạn tài trợ (SponsorBlock)"),
    (r"apple music", "Nhạc Apple Music"),
    (r"spotify", "Nhạc và podcast"),
    (r"zing mp3", "Nhạc Việt và bảng xếp hạng"),
]
# Smart Hub titles that read badly on a tile.
TITLES = [(r"^tizenbrew", "TizenBrew"), (r"^spotify", "Spotify"), (r"^kplus", "K+"),
          (r"^vtvgo truyền hình", "VTVgo"), (r"^vtv giải trí", "VTV Giải Trí"), (r"^mytv", "MyTV")]
# Store artwork with a light rim baked into its edges (iOS 26 style): cropped before building the banner.
RIMMED = [r"^apple tv", r"apple music", r"spotify", r"vtvcab", r"zing mp3"]
HIDE = [r"^e-manual$", r"^nhà ", r"^nha minh", r"^tizenbrew installer"]


def sdb(*args):
    return subprocess.run([SDB, "-s", TV] + list(args), capture_output=True, text=True, timeout=60).stdout


def tv_apps():
    subprocess.run([SDB, "connect", TV], capture_output=True, timeout=30)
    raw = sdb("shell", "0", "vd_applist")
    apps, cur = [], {}
    for line in raw.splitlines():
        m = re.match(r"-+(\w[\w():,]*)\s*=(.*?)-+$", line.strip())
        if not m:
            continue
        k, v = m.group(1), m.group(2)
        if k == "app_id" and cur:
            apps.append(cur)
            cur = {}
        cur[k] = v
    if cur:
        apps.append(cur)
    return apps


def store_icon(term, seller, name):
    for country in ("vn", "us"):   # some apps (Prime Video) are not in the Vietnamese store
        q = urllib.parse.urlencode({"term": term, "entity": "software", "country": country, "limit": 10})
        with urllib.request.urlopen("https://itunes.apple.com/search?" + q, timeout=20) as r:
            results = json.load(r).get("results", [])
        for res in results:
            if seller.lower() in res.get("sellerName", "").lower() and name.lower() in res.get("trackName", "").lower():
                # mzstatic serves any size: 400px is sharp on a 202px-high tile scaled to 1.1.
                return re.sub(r"/\d+x\d+bb\.\w+$", "/400x400bb.png", res["artworkUrl512"])
    return None


def _avg(px):
    n = len(px) or 1
    return tuple(sum(p[i] for p in px) // n for i in range(3))


def _diff(a, b):
    return sum(abs(x - y) for x, y in zip(a[:3], b[:3]))


def _rounded_mask(size, radius, feather):
    """Antialiased rounded square, faded at the left and right edges."""
    big = 4
    m = Image.new("L", (size * big, size * big), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, size * big - 1, size * big - 1), radius * big, fill=255)
    m = m.resize((size, size), Image.LANCZOS)
    if feather:
        ramp = Image.new("L", (size, size), 255)
        for x in range(feather):
            a = int(255 * x / feather)
            ramp.paste(a, (x, 0, x + 1, size))
            ramp.paste(a, (size - 1 - x, 0, size - x, size))
        m = ImageChops.multiply(m, ramp)
    return m


def _soft_mask(size, feather):
    """Opaque centre fading to transparent on all four sides, so no square edge is ever visible."""
    m = Image.new("L", (size, size), 0)
    ImageDraw.Draw(m).rectangle((feather, feather, size - 1 - feather, size - 1 - feather), fill=255)
    return m.filter(ImageFilter.GaussianBlur(feather / 2))


def _rim_banner(flat, dst):
    """iOS 26 artwork: a full-bleed square with a light rim along its rounded edge. Keep the whole logo,
    paint the rim band (and the corners outside it) with the icon's own inner colour."""
    S = flat.size[0]
    W, H = BANNER
    # The four inner corners, stretched bilinearly: matches icons that are a vertical gradient (Apple TV).
    corners = Image.new("RGB", (2, 2))
    for (cx, cy), (px, py) in zip(((0, 0), (1, 0), (0, 1), (1, 1)), ((40, 40), (S - 41, 40), (40, S - 41), (S - 41, S - 41))):
        corners.putpixel((cx, cy), flat.getpixel((px, py)))
    out = corners.resize((W, H), Image.BILINEAR)
    logo = flat.resize((H, H), Image.LANCZOS)
    k = H / S
    big = 4
    m = Image.new("L", (H * big, H * big), 0)
    inset, radius = 16 * k * big, 88 * k * big
    ImageDraw.Draw(m).rounded_rectangle((inset, inset, H * big - 1 - inset, H * big - 1 - inset), radius, fill=255)
    m = m.resize((H, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(3))
    out.paste(logo, ((W - H) // 2, 0), m)
    out.save(dst, "JPEG", quality=88, optimize=True)


def make_banner(src, dst, rimmed=False):
    """Square store icon -> 16:9 tile: the logo full-height in the middle, its own background extended.

    Mac-style artwork (Netflix, Apple TV, Spotify…) is a rounded square inside a grey frame: find that inner
    square, extend *its* colour, and paste it with a rounded mask so the corners melt into the extension.
    """
    im = Image.open(src).convert("RGBA").resize((400, 400), Image.LANCZOS)
    flat = Image.alpha_composite(Image.new("RGBA", im.size, (0, 0, 0, 255)), im).convert("RGB")
    S = 400
    if rimmed:
        return _rim_banner(flat, dst)
    corner = flat.getpixel((2, 2))
    mid = S // 2

    def scan(points):
        for i, xy in enumerate(points):
            if _diff(flat.getpixel(xy), corner) > 45:
                return i
        return 0

    x0 = scan([(x, mid) for x in range(S // 3)])
    x1 = S - 1 - scan([(x, mid) for x in range(S - 1, 2 * S // 3, -1)])
    y0 = scan([(mid, y) for y in range(S // 3)])
    y1 = S - 1 - scan([(mid, y) for y in range(S - 1, 2 * S // 3, -1)])
    # A frame is an even margin on all four sides around a large inner square; a logo that merely
    # differs from the corner colour (YouTube, FPT Play) is not.
    margins = [x0, y0, S - 1 - x1, S - 1 - y1]
    framed = im.getpixel((2, 2))[3] < 250 or (
        min(margins) >= 8 and max(margins) - min(margins) <= 8 and x1 - x0 >= 0.7 * S)
    radius = 0
    # iOS 26 artwork bakes a light rim along the edges of a full-bleed square (RIMMED below):
    # crop past it (12% clears the rounded part of the rim too) and treat the rest as full-bleed.
    rim = False
    if rim:
        # Past the rim and the squircle corners it follows; the soft mask below blends what is left.
        flat = flat.crop((60, 60, S - 60, S - 60))
    if framed:
        # Cut past the bevel/rim that Mac-style artwork draws just inside its rounded edge.
        inset = int(0.09 * (x1 - x0))
        flat = flat.crop((x0 + inset, y0 + inset, x1 + 1 - inset, y1 + 1 - inset))
        radius = int(0.16 * flat.size[0])
    w, h = flat.size
    # Background colours: the corners for full-bleed icons, the inner edges (clear of the rounding) otherwise.
    if framed:
        ys = range(int(h * 0.35), int(h * 0.65), 3)
        left = _avg([flat.getpixel((3, y)) for y in ys])
        right = _avg([flat.getpixel((w - 4, y)) for y in ys])
    else:
        left = _avg([flat.getpixel((2, 2)), flat.getpixel((2, h - 3))])
        right = _avg([flat.getpixel((w - 3, 2)), flat.getpixel((w - 3, h - 3))])

    W, H = BANNER
    out = Image.new("RGB", (W, H))
    for x in range(W):   # left edge colour -> right edge colour, so gradients continue smoothly
        t = x / (W - 1)
        out.paste(tuple(int(left[i] * (1 - t) + right[i] * t) for i in range(3)), (x, 0, x + 1, H))
    size = int(H * 0.86) if rim else H   # rim crops zoom the logo in: give it room again
    logo = flat.resize((size, size), Image.LANCZOS)
    if rim:
        mask = _soft_mask(size, 34)
    else:
        mask = _rounded_mask(size, int(radius * size / max(w, 1)), 0 if framed else 24)
    out.paste(logo, ((W - size) // 2, (H - size) // 2), mask)
    out.save(dst, "JPEG", quality=88, optimize=True)


def glyph_png(svg, png):
    """Render a bundled SVG glyph with macOS Quick Look (no extra dependencies)."""
    d = os.path.dirname(png)
    subprocess.run(["qlmanage", "-t", "-s", "400", "-o", d, svg], capture_output=True, timeout=60)
    os.replace(os.path.join(d, os.path.basename(svg) + ".png"), png)


def main():
    apps = tv_apps()
    if not apps:
        sys.exit("Không đọc được danh sách app — TV có đang bật và kết nối sdb không? (chạy thử: python3 tools/tvdev.py deploy --tv <IP TV>)")
    if "--list" in sys.argv:
        for a in sorted(apps, key=lambda a: -int(a.get("use_count") or 0)):
            print("%5s  %-40s %-16s %s" % (a.get("use_count"), a.get("app_title"), a.get("app_id"), a.get("app_tizen_id")))
        return

    os.makedirs(ICON_DIR, exist_ok=True)
    os.makedirs(CACHE, exist_ok=True)
    out = []
    for a in apps:
        title = a.get("app_title", "")
        low = title.lower()
        if a.get("is_hidden") == "1" or any(re.search(p, low) for p in HIDE):
            continue
        shown = title
        for pattern, nice in TITLES:
            if re.search(pattern, low):
                shown = nice
        entry = {
            "id": a.get("app_tizen_id") or a.get("app_id"),
            "storeId": a.get("app_id"),
            "title": shown,
            "uses": int(a.get("use_count") or 0),
        }
        for pattern, text in DESCRIPTIONS:
            if re.search(pattern, low):
                entry["desc"] = text
                break
        for pattern, spec in ICONS:
            if not re.search(pattern, low):
                continue
            raw = os.path.join(CACHE, "%s.png" % entry["storeId"])
            if not os.path.exists(raw):
                try:
                    if spec and spec[0] in ("file", "banner"):
                        shutil.copyfile(os.path.join(HERE, "glyphs", spec[1]), raw)
                    elif spec is None:
                        svg = os.path.join(HERE, "glyphs", "%s.svg" % re.sub(r"\W+", "-", low).strip("-"))
                        if os.path.exists(svg):
                            glyph_png(svg, raw)
                    else:
                        url = store_icon(*spec)
                        if url:
                            urllib.request.urlretrieve(url, raw)
                except Exception as e:  # noqa: BLE001 - a missing icon just falls back to a letter tile
                    print("  ! %s: %s" % (title, e))
            if os.path.exists(raw):
                fname = "%s.jpg" % entry["storeId"]
                if spec and spec[0] == "banner":   # already 16:9
                    Image.open(raw).convert("RGB").resize(BANNER, Image.LANCZOS).save(
                        os.path.join(ICON_DIR, fname), "JPEG", quality=88, optimize=True)
                else:
                    make_banner(raw, os.path.join(ICON_DIR, fname), any(re.search(p, low) for p in RIMMED))
                entry["icon"] = "icons/" + fname
            break
        out.append(entry)
        print("  %-40s %5d  %s" % (title, entry["uses"], entry.get("icon", "—")))

    out.sort(key=lambda e: -e["uses"])
    with open(os.path.join(ROOT, "app", "js", "apps.js"), "w", encoding="utf-8") as f:
        f.write("// Sinh bởi tools/sync_apps.py: các app trong mục Ứng dụng của TV, nhiều lượt mở nhất trước.\n")
        f.write("window.TV_APPS = " + json.dumps(out, ensure_ascii=False, indent=2) + ";\n")
    print("Đã ghi %d app vào app/js/apps.js" % len(out))


if __name__ == "__main__":
    main()
