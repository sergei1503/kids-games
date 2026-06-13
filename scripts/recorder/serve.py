#!/usr/bin/env python3
"""Tiny local server for the syllable voice recorder.

  GET  /            -> the recorder UI (index.html)
  POST /save?name=mem_a&ext=webm -> writes body to scripts/recorder/raw/mem_a.webm

Run:  python3 scripts/recorder/serve.py   then open http://localhost:8123/
Recordings land in scripts/recorder/raw/ ; run convert.sh afterwards.
"""
import http.server, socketserver, os, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "raw")
os.makedirs(RAW, exist_ok=True)
PORT = int(os.environ.get("PORT", "8123"))

class Handler(http.server.BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")

    def do_OPTIONS(self):
        self.send_response(204); self._cors(); self.end_headers()

    def do_GET(self):
        path = urllib.parse.urlparse(self.path).path
        if path in ("/", "/index.html"):
            with open(os.path.join(HERE, "index.html"), "rb") as f:
                body = f.read()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self._cors(); self.end_headers(); self.wfile.write(body)
        elif path == "/list":
            files = sorted(os.listdir(RAW))
            body = ("\n".join(files)).encode()
            self.send_response(200); self.send_header("Content-Type", "text/plain")
            self._cors(); self.end_headers(); self.wfile.write(body)
        else:
            self.send_response(404); self._cors(); self.end_headers()

    def do_POST(self):
        q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        name = (q.get("name", ["clip"])[0]).replace("/", "_")
        ext = (q.get("ext", ["webm"])[0]).replace("/", "")
        length = int(self.headers.get("Content-Length", "0"))
        data = self.rfile.read(length) if length else b""
        out = os.path.join(RAW, f"{name}.{ext}")
        with open(out, "wb") as f:
            f.write(data)
        print(f"  saved {out} ({len(data)} bytes)")
        self.send_response(200); self.send_header("Content-Type", "text/plain")
        self._cors(); self.end_headers(); self.wfile.write(b"ok")

    def log_message(self, *a):  # quieter
        pass

if __name__ == "__main__":
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", PORT), Handler) as httpd:
        print(f"Recorder at http://localhost:{PORT}/   (saving to {RAW})")
        print("Ctrl-C to stop. Then run: scripts/recorder/convert.sh")
        httpd.serve_forever()
