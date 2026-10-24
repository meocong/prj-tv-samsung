#!/usr/bin/env python3
"""Ảnh gia đình → khung 1920×1080 cho hình nền và màn hình chờ (local/img/family/NN.jpg, không lên Git).

Ảnh ngang rộng (≥ 1.6:1) được cắt vừa khung; ảnh vuông hoặc 4:3 đặt giữa, nền là chính ảnh đó phóng to và làm mờ,
để không mất đầu ai. Sau đó cập nhật danh sách familyPhotos trong local/config.local.js (tạo nếu chưa có).

    tools/.venv/bin/python tools/photos.py ~/Downloads/a.jpg ~/Downloads/b.jpg …
"""
import os
import re
import sys

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "local", "img", "family")
W, H = 1920, 1080


def cover(im, anchor_y=0.42):
    s = max(W / im.width, H / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x = (im.width - W) // 2
    y = int(max(0, min(im.height - H, (im.height - H) * anchor_y)))
    return im.crop((x, y, x + W, y + H))


def framed(im):
    bg = ImageEnhance.Brightness(cover(im, 0.5).filter(ImageFilter.GaussianBlur(42))).enhance(0.5)
    ph = H - 110
    pw = round(im.width * ph / im.height)
    photo = im.resize((pw, ph), Image.LANCZOS)
    x0, y0 = (W - pw) // 2, 55
    shadow = Image.new("L", (W, H), 0)
    ImageDraw.Draw(shadow).rounded_rectangle((x0 + 8, y0 + 22, x0 + pw + 8, y0 + ph + 22), 34, fill=150)
    bg.paste(Image.new("RGB", (W, H)), (0, 0), shadow.filter(ImageFilter.GaussianBlur(28)))
    mask = Image.new("L", (pw, ph), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, pw - 1, ph - 1), 34, fill=255)
    bg.paste(photo, (x0, y0), mask)
    return bg


def main(paths):
    os.makedirs(OUT, exist_ok=True)
    names = []
    for i, p in enumerate(paths, 1):
        im = ImageOps.exif_transpose(Image.open(os.path.expanduser(p))).convert("RGB")
        out = cover(im) if im.width / im.height >= 1.6 else framed(im)
        name = "%02d.jpg" % i
        out.save(os.path.join(OUT, name), quality=86, optimize=True)
        names.append("img/family/" + name)
        print("  %s  %dx%d → %s" % (os.path.basename(p), im.width, im.height, name))
    cfg = os.path.join(ROOT, "local", "config.local.js")
    photos = "familyPhotos: [" + ", ".join("'%s'" % n for n in names) + "]"
    if os.path.exists(cfg):
        s = open(cfg, encoding="utf-8").read()
        s = re.sub(r"familyPhotos: \[[^\]]*\]", photos, s) if "familyPhotos" in s else s.replace("Object.assign(window.CONFIG, {", "Object.assign(window.CONFIG, {\n  " + photos + ",")
    else:
        s = "// Cấu hình riêng (không lên Git). Xem local.example/config.local.js.\nObject.assign(window.CONFIG, {\n  " + photos + "\n});\n"
    open(cfg, "w", encoding="utf-8").write(s)
    print("Đã ghi %d ảnh vào local/img/family và cập nhật local/config.local.js" % len(names))


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1:])
