"""Tiny local server for the browser tests.
Serves the project folder and saves whatever a test page POSTs to /result into a file.
Usage: python3 tests/serve.py <folder> <result-file> [port]"""
import http.server, sys, os
os.chdir(sys.argv[1]); OUT = sys.argv[2]; PORT = int(sys.argv[3]) if len(sys.argv) > 3 else 8766
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def end_headers(self):
        self.send_header("Cache-Control", "no-store"); super().end_headers()
    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0)); open(OUT, "wb").write(self.rfile.read(n))
        self.send_response(204); self.end_headers()
http.server.ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()
