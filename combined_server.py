from __future__ import annotations

import json
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from ml.prediction.reply_engine import generate_artist_reply


class CombinedHandler(SimpleHTTPRequestHandler):
    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def _send_json(self, data: dict[str, object], status: int = 200) -> None:
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/") or "/"

        print(f"DEBUG GET request: original={parsed.path!r}, normalized={path!r}")

        if path == "/api/health":
            self._send_json({"status": "ok"})
            return

        admin_prefix = "/admin"
        if path == "/":
            path = "/index.html"
            print("DEBUG Root path mapped to /index.html")

        if path.startswith(admin_prefix):
            relative_path = path[len(admin_prefix):] or "/index.html"
            frontend_dir = (ROOT / "frontend" / "admin").resolve()
        else:
            frontend_dir = (ROOT / "frontend").resolve()

        file_path = (frontend_dir / path.lstrip("/")).resolve()

        print(f"DEBUG Serving from frontend_dir={frontend_dir}")
        print(f"DEBUG file_path={file_path}")
        print(f"DEBUG exists={file_path.is_file()}")

        if file_path.is_file():
            self.send_response(200)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            content_type = "text/html"
            if file_path.suffix == ".css":
                content_type = "text/css"
            elif file_path.suffix == ".js":
                content_type = "application/javascript"
            elif file_path.suffix == ".json":
                content_type = "application/json"
            elif file_path.suffix == ".png":
                content_type = "image/png"
            elif file_path.suffix == ".jpg" or file_path.suffix == ".jpeg":
                content_type = "image/jpeg"
            elif file_path.suffix == ".svg":
                content_type = "image/svg+xml"
            self.send_header("Content-Type", content_type)
            with open(file_path, "rb") as f:
                content = f.read()
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
            print(f"DEBUG Served {path} successfully")
            return

        print(f"DEBUG Returning 404 for {path}")
        self.send_response(404)
        self.end_headers()
        self.wfile.write(b"Not found")

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/") or "/"

        if path != "/api/generate-reply":
            self._send_json({"error": "Not found"}, status=404)
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            review = str(payload.get("review", "")).strip()
            customer_name = payload.get("customer_name")
        except (json.JSONDecodeError, UnicodeDecodeError, ValueError):
            self._send_json({"error": "Invalid JSON body"}, status=400)
            return

        if len(review) < 2:
            self._send_json({"error": "Review cannot be empty"}, status=400)
            return

        result = generate_artist_reply(review=review, customer_name=customer_name)
        self._send_json(result)

    def log_message(self, format: str, *args: object) -> None:
        print(f"{self.address_string()} - {format % args}")


def run(port: int = 8000) -> None:
    server = ThreadingHTTPServer(("0.0.0.0", port), CombinedHandler)
    print(f"Serving on http://0.0.0.0:{port}")
    server.serve_forever()


if __name__ == "__main__":
    run()