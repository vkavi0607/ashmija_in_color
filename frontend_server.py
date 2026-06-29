from __future__ import annotations

import mimetypes
from pathlib import Path
from flask import Flask, send_file, jsonify, Response
import json

ROOT = Path(__file__).resolve().parent / "frontend"
app = Flask(__name__)


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path: str):
    # Handle admin paths
    if path.startswith("admin") or path.startswith("admin/"):
        relative = path[len("admin/"):] if path.startswith("admin/") else ""
        file_path = (ROOT / "admin" / (relative or "index.html")).resolve()
    else:
        if not path:
            path = "index.html"
        file_path = (ROOT / path).resolve()

    if file_path.is_file():
        mimetype, _ = mimetypes.guess_type(str(file_path))
        return send_file(file_path, mimetype=mimetype or "application/octet-stream")

    return jsonify({"error": "Not found"}), 404


if __name__ == "__main__":
    print(f"Frontend server running at http://127.0.0.1:8000")
    app.run(host="127.0.0.1", port=8000, debug=False)