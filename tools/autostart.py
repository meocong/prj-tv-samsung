#!/usr/bin/env python3
"""Bật TV là vào thẳng màn hình chính: chạy trên một thiết bị luôn bật trong nhà, cùng mạng với TV.

Samsung không cho app tự cài chạy khi TV khởi động (Autorun Last App chỉ dành cho app được Samsung cho phép), và
SmartThings không có hành động "mở app" trong Thói quen. Script này cứ vài giây hỏi TV một lần qua REST API của TV
(cổng 8001, không cần ghép đôi). Thấy TV vừa bật, nó mở màn hình chính, rồi mở lại vài lần trong ~30 giây đầu nếu TV
tự bật app khác (Smart Hub, app cuối cùng). Sau đó dịch vụ nền trong app lo việc quay về khi thoát app.

Chỉ cần Python 3 (không cần cài thêm gì): điện thoại Android cũ (Termux), Raspberry Pi, NAS, máy tính bàn, Mac.

    python3 autostart.py --tv 192.168.1.7              # chạy mãi; Ctrl+C để dừng
    python3 autostart.py --tv 192.168.1.7 --once       # mở màn hình chính ngay một lần (để thử)

Cách để nó tự chạy trên từng loại thiết bị: docs/cai-dat-tv.md, mục "Bật TV là vào thẳng màn hình chính".
"""
import argparse
import json
import time
import urllib.error
import urllib.request

POLL_S = 3                       # hỏi TV mỗi 3 giây
CHECKS_AFTER_ON = (4, 9, 16, 26)  # giây sau khi TV bật: lúc đó màn hình chính chưa hiện thì mở


def log(msg):
    print(time.strftime("%H:%M:%S"), msg, flush=True)


def get(url, timeout=2.5):
    try:
        with urllib.request.urlopen(url, timeout=timeout) as r:
            return json.loads(r.read() or b"{}")
    except (urllib.error.URLError, OSError, ValueError):
        return None


def tv_on(base):
    """True when the TV answers and says it is on (off or asleep: no answer, or PowerState 'standby')."""
    info = get(base + "/api/v2/")
    return bool(info) and (info.get("device") or {}).get("PowerState", "on") == "on"


def home_visible(base, app):
    s = get(base + "/api/v2/applications/" + app)
    return bool(s and s.get("visible"))


def launch(base, app):
    req = urllib.request.Request(base + "/api/v2/applications/" + app, method="POST", data=b"")
    try:
        with urllib.request.urlopen(req, timeout=5) as r:
            return 200 <= r.status < 300
    except (urllib.error.URLError, OSError):
        return False


def bring_home(base, app):
    """Right after the TV comes on: make sure the home screen ends up in front."""
    start = time.time()
    for at in CHECKS_AFTER_ON:
        time.sleep(max(0, start + at - time.time()))
        if not tv_on(base):
            return log("TV lại tắt")
        if home_visible(base, app):
            continue
        log("mở màn hình chính: " + ("được" if launch(base, app) else "không được"))


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--tv", required=True, help="IP của TV, ví dụ 192.168.1.7")
    ap.add_argument("--app", default="NhaMinh000.NhaMinh", help="mã app màn hình chính (mặc định NhaMinh000.NhaMinh)")
    ap.add_argument("--once", action="store_true", help="mở màn hình chính ngay một lần rồi thoát")
    a = ap.parse_args()
    base = "http://%s:8001" % a.tv
    if a.once:
        ok = launch(base, a.app)
        return log("mở %s: %s" % (a.app, "được" if ok else "không được (TV đang tắt, hoặc sai IP?)"))
    log("đang canh TV %s" % a.tv)
    was_on = tv_on(base)
    log("TV đang " + ("bật" if was_on else "tắt"))
    while True:
        time.sleep(POLL_S)
        on = tv_on(base)
        if on and not was_on:
            log("TV vừa bật")
            bring_home(base, a.app)
        elif was_on and not on:
            log("TV tắt")
        was_on = on


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        pass
