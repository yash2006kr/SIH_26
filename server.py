"""
SkyGuard AI - Secure Local & Production Backend Server
Smart India Hackathon 2026 - Problem 26073
Team AI Avengers

Architecture:
1. Static asset server (HTML, CSS, JS, Assets)
2. Secure /api/chat endpoint proxying requests to Google Gemini 2.5 Flash
   without exposing API keys to the browser
3. Configuration discovery at /api/config
4. Reads GEMINI_API_KEY from environment variables or local .env file
"""

import os
import sys
import json
import urllib.request
import urllib.error
from http.server import SimpleHTTPRequestHandler, HTTPServer

PORT = int(os.environ.get("PORT", 8080))
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

def load_env_file():
    """Load .env file if present in the working directory."""
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if os.path.exists(env_path):
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip("'\"")
                        if k and not os.environ.get(k):
                            os.environ[k] = v
        except Exception as e:
            print(f"[WARN] Failed to read .env file: {e}")

load_env_file()

def get_gemini_api_key():
    return os.environ.get("GEMINI_API_KEY", "").strip()

class SkyGuardServerHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS for development
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        # API Health & Config check
        if self.path in ("/api/config", "/api/health"):
            key = get_gemini_api_key()
            resp = {
                "status": "healthy",
                "backend": "python",
                "model": GEMINI_MODEL,
                "keyConfigured": bool(key),
                "maskedKey": f"{key[:6]}...{key[-4:]}" if key and len(key) > 10 else None
            }
            body = json.dumps(resp).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        # Serve static files normally
        super().do_GET()

    def do_POST(self):
        if self.path == "/api/chat":
            key = get_gemini_api_key()
            if not key:
                self.send_json_response(503, {
                    "error": "Server GEMINI_API_KEY environment variable is not configured.",
                    "hint": "Set GEMINI_API_KEY in your server environment or .env file."
                })
                return

            content_len = int(self.headers.get("Content-Length", 0))
            if content_len == 0:
                self.send_json_response(400, {"error": "Empty request body"})
                return

            try:
                body_bytes = self.rfile.read(content_len)
                req_data = json.loads(body_bytes.decode("utf-8"))
            except Exception as e:
                self.send_json_response(400, {"error": f"Invalid JSON payload: {str(e)}"})
                return

            # Call Google Gemini API securely on the server side
            api_url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={key}"
            gemini_payload = {
                "contents": req_data.get("contents", []),
                "systemInstruction": req_data.get("systemInstruction"),
                "generationConfig": req_data.get("generationConfig", {
                    "temperature": 0.7,
                    "maxOutputTokens": 1200
                })
            }

            try:
                post_data = json.dumps(gemini_payload).encode("utf-8")
                req = urllib.request.Request(
                    api_url,
                    data=post_data,
                    headers={"Content-Type": "application/json"},
                    method="POST"
                )
                with urllib.request.urlopen(req, timeout=30) as response:
                    res_body = response.read()
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Content-Length", str(len(res_body)))
                    self.end_headers()
                    self.wfile.write(res_body)
            except urllib.error.HTTPError as he:
                err_content = he.read().decode("utf-8", errors="ignore")
                self.send_json_response(he.code, {
                    "error": f"Gemini API returned status {he.code}",
                    "details": err_content
                })
            except Exception as e:
                self.send_json_response(500, {
                    "error": f"Failed to communicate with Gemini API: {str(e)}"
                })
            return

        self.send_json_response(404, {"error": "Endpoint not found"})

    def send_json_response(self, status_code, obj):
        data = json.dumps(obj).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

def run():
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass

    key = get_gemini_api_key()
    print("=" * 60)
    print("[SkyGuard AI] Mission Control & Secure Backend Server")
    print(f"[SkyGuard AI] Serving at: http://localhost:{PORT}")
    print(f"[SkyGuard AI] Model: {GEMINI_MODEL}")
    if key:
        print(f"[SkyGuard AI] API Key Status: Configured securely via environment ({key[:6]}...{key[-4:]})")
    else:
        print("[SkyGuard AI] API Key Status: NOT CONFIGURED (Using built-in offline intelligence)")
    print("=" * 60)

    server = HTTPServer(("", PORT), SkyGuardServerHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")
        server.server_close()

if __name__ == "__main__":
    run()
