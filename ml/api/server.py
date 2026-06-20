from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from ml.prediction.reply_engine import generate_artist_reply


ROOT = Path(__file__).parent


class ReviewReplyHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self) -> None:
        self._send_empty(204)

    def do_GET(self) -> None:
        if self.path == "/":
            self._send_json(
                {
                    "service": "mural-art-review-ml-model",
                    "status": "running",
                    "predict_endpoint": "/api/generate-reply",
                }
            )
            return

        if self.path == "/api/health":
            self._send_json({"status": "ok"})
            return

        self._send_json({"error": "Not found"}, status=404)

    def do_POST(self) -> None:
        if self.path != "/api/generate-reply":
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

    def _send_json(self, data: dict[str, object], status: int = 200) -> None:
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self._send_common_headers("application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_empty(self, status: int) -> None:
        self.send_response(status)
        self._send_common_headers("text/plain")
        self.end_headers()

    def _send_common_headers(self, content_type: str) -> None:
        self.send_header("Content-Type", content_type)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")


def run() -> None:
    server = ThreadingHTTPServer(("127.0.0.1", 8000), ReviewReplyHandler)
    print("Mural Art Review Reply server running at http://127.0.0.1:8000")
    server.serve_forever()


if __name__ == "__main__":
    run()
