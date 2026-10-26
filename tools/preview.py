#!/usr/bin/env python3
"""Xem thử app trên Chrome máy tính: phục vụ thư mục app/ và proxy JSON cho các nguồn không bật CORS.

    python3 tools/preview.py               # http://localhost:8765, có ghép local/ (cấu hình, ảnh riêng)
    python3 tools/preview.py 8765 --public # chỉ app/, đúng như người khác thấy khi clone repo
"""
import http.server
import os
import socketserver
import sys
import urllib.parse
import urllib.request

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "app")
LOCAL = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "local")
USE_LOCAL = "--public" not in sys.argv
ALLOWED = ("www.bing.com", "en.wikipedia.org", "vi.wikipedia.org", "api.open-meteo.com", "air-quality-api.open-meteo.com",
           "api.wikimedia.org", "translate.googleapis.com", "www.youtube.com", "www.googleapis.com",
           "vnexpress.net", "thanhnien.vn", "dantri.com.vn", "tuoitre.vn",
           "zenquotes.io", "vi.wikiquote.org",
           "edge-api.pnj.io", "portal.vietcombank.com.vn", "open.er-api.com", "api.github.com")


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def translate_path(self, path):
        """A file in local/ wins over the same path in app/ (as tools/tvdev.py deploy does)."""
        p = super().translate_path(path)
        if USE_LOCAL:
            alt = os.path.join(LOCAL, os.path.relpath(p, os.path.abspath(ROOT)))
            if os.path.isfile(alt) and not alt.endswith("app-name.txt"):
                return alt
        return p

    def do_GET(self):
        if self.path.startswith("/proxy?"):
            return self.proxy()
        return super().do_GET()

    def proxy(self):
        url = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query).get("u", [""])[0]
        host = urllib.parse.urlparse(url).hostname or ""
        if host not in ALLOWED:
            return self.send_error(403, "host not allowed")
        # parse_qs decoded the query: re-encode anything non-ASCII (Vietnamese page titles) for urllib.
        url = urllib.parse.quote(url, safe=":/?&=%*+,;@!$'()~#")
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 NhaMinh-preview/1.0"})
            with urllib.request.urlopen(req, timeout=15) as r:
                body = r.read()
                self.send_response(r.status)
                self.send_header("Content-Type", r.headers.get("Content-Type", "application/json"))
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
        except Exception as e:  # noqa: BLE001 - surface any upstream failure as 502
            self.send_error(502, repr(e).encode("ascii", "replace").decode())

    def log_message(self, fmt, *args):
        if args and isinstance(args[0], str) and "/proxy?" in args[0]:
            sys.stderr.write("proxy %s\n" % (args[0],))


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else 8765
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(("127.0.0.1", port), Handler) as httpd:
        print("Nhà Mình preview: http://localhost:%d" % port)
        httpd.serve_forever()
