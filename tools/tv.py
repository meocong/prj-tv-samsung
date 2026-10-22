#!/usr/bin/env python3
"""Điều khiển TV Samsung qua mạng (cổng 8002, lần đầu TV hỏi "Cho phép" — bấm Cho phép).

    tools/.venv/bin/python tools/tv.py info
    tools/.venv/bin/python tools/tv.py apps                 # app đã cài: id, tên, đường dẫn icon
    tools/.venv/bin/python tools/tv.py sync                 # ghi app/apps.js + app/icons/*.png cho Nhà Mình
    tools/.venv/bin/python tools/tv.py key KEY_HOME KEY_RIGHT KEY_ENTER
    tools/.venv/bin/python tools/tv.py launch 111299001912
    tools/.venv/bin/python tools/tv.py power                # bật/tắt (KEY_POWER)

Cài thư viện: python3 -m venv tools/.venv && tools/.venv/bin/pip install samsungtvws websocket-client
"""
import base64
import json
import os
import sys
import time

import samsungtvws.connection as _conn
from samsungtvws import SamsungTVWS

# 2020 sets send touch events before ms.channel.connect; the library would treat them as a failure.
_conn.IGNORE_EVENTS_AT_STARTUP = tuple(_conn.IGNORE_EVENTS_AT_STARTUP) + ("ms.remote.touchDisable", "ms.remote.touchEnable")

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
HOST = os.environ.get("TV_HOST", "192.168.1.7")
TOKEN = os.path.join(HERE, ".tv-token")
NAME = "NhaMinh"


def tv():
    return SamsungTVWS(host=HOST, port=8002, token_file=TOKEN, name=NAME, timeout=30)


def emit(remote, event, data=None):
    """Send an ms.channel.emit event to the TV host and return the first reply for that event."""
    remote._ws_send({"method": "ms.channel.emit", "params": {"event": event, "to": "host", "data": data or ""}})
    deadline = time.time() + 15
    while time.time() < deadline:
        msg = json.loads(remote.connection.recv())
        if msg.get("event") == event:
            return msg
        if msg.get("event") == "ms.error":
            raise RuntimeError(msg)
    raise TimeoutError(event)


def installed(remote):
    msg = emit(remote, "ed.installedApp.get")
    return msg.get("data", {}).get("data", [])


def icon_bytes(remote, path):
    msg = emit(remote, "ed.apps.icon", {"iconPath": path})
    data = msg.get("data", {}).get("imageData")
    return base64.b64decode(data) if data else None


def cmd_apps():
    r = tv()
    r.open()
    for a in installed(r):
        print(f'{a.get("appId", ""):36} {a.get("name", ""):36} {a.get("icon", "")}')


def cmd_sync():
    """Bundle the TV's own launcher icons: a web app on the TV is not allowed to read them itself."""
    r = tv()
    r.open()
    apps = installed(r)
    icon_dir = os.path.join(ROOT, "app", "icons")
    os.makedirs(icon_dir, exist_ok=True)
    out = []
    for a in apps:
        app_id, path = a.get("appId"), a.get("icon")
        entry = {"storeId": app_id, "title": a.get("name", app_id)}
        if path:
            try:
                data = icon_bytes(r, path)
            except TimeoutError:
                data = None
            if data:
                fname = "%s.png" % app_id
                with open(os.path.join(icon_dir, fname), "wb") as f:
                    f.write(data)
                entry["icon"] = "icons/" + fname
        out.append(entry)
        print("  %-36s %s" % (entry["title"], entry.get("icon", "(không có icon)")))
    with open(os.path.join(ROOT, "app", "js", "apps.js"), "w", encoding="utf-8") as f:
        f.write("// Sinh bởi tools/tv.py sync — app đã cài trên TV (Smart Hub) và icon gốc của chúng.\n")
        f.write("window.TV_APPS = " + json.dumps(out, ensure_ascii=False, indent=2) + ";\n")
    print("Đã ghi %d app vào app/js/apps.js" % len(out))


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return
    c = sys.argv[1]
    if c == "info":
        print(json.dumps(tv().rest_device_info(), indent=2, ensure_ascii=False))
    elif c == "apps":
        cmd_apps()
    elif c == "sync":
        cmd_sync()
    elif c == "key":
        r = tv()
        for k in sys.argv[2:]:
            if k.startswith("wait"):
                time.sleep(float(k[4:] or 1))
                continue
            r.send_key(k)
            time.sleep(float(os.environ.get("KEY_DELAY", "0.8")))
    elif c == "launch":
        tv().rest_app_run(sys.argv[2])
    elif c == "power":
        tv().send_key("KEY_POWER")
    else:
        print(__doc__)


if __name__ == "__main__":
    main()
