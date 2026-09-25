"""
SkyGuard AI - Secure Local & Production Backend Server
Smart India Hackathon 2026 - Problem 26073
Team AI Avengers

Security Architecture:
1. Strict static asset server with root jail, directory traversal defense,
   hidden file blocking, and disabled directory listings.
2. Secure /api/chat endpoint proxying requests to Google Gemini 2.5 Flash
   without exposing API keys to the browser.
3. In-memory sliding-window IP rate limiting on /api/chat to prevent
   quota exhaustion, automated abuse, and Denial-of-Service (DoS).
4. Request payload size enforcement (max 100 KB) and JSON schema validation.
5. Strict security headers (CSP, X-Content-Type-Options, X-Frame-Options,
   Referrer-Policy, Permissions-Policy).
6. Zero secret leakage: /api/config exposes ONLY boolean key status, never masked keys.
"""

import os
import sys
import time
import json
import urllib.request
import urllib.error
import urllib.parse
from collections import defaultdict
from http.server import SimpleHTTPRequestHandler, HTTPServer

PORT = int(os.environ.get("PORT", 8080))
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ---------------------------------------------------------------------------
# Rate Limiting (In-Memory Sliding Window)
# ---------------------------------------------------------------------------
# Max 20 chat requests per minute per IP to protect Gemini API quota
RATE_LIMIT_WINDOW_SECONDS = 60
RATE_LIMIT_MAX_REQUESTS = 20
ip_request_history = defaultdict(list)

def is_rate_limited(ip_address: str) -> bool:
    """Check if the requesting IP has exceeded the allowed request quota."""
    now = time.time()
    history = ip_request_history[ip_address]
    # Prune timestamps outside the current window
    ip_request_history[ip_address] = [ts for ts in history if now - ts < RATE_LIMIT_WINDOW_SECONDS]
    if len(ip_request_history[ip_address]) >= RATE_LIMIT_MAX_REQUESTS:
        return True
    ip_request_history[ip_address].append(now)
    return False

# ---------------------------------------------------------------------------
# Environment Variable Loader
# ---------------------------------------------------------------------------
def load_env_file():
    """Load .env file if present in the working directory."""
    env_path = os.path.join(BASE_DIR, ".env")
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

# ---------------------------------------------------------------------------
# HTTP Server Handler
# ---------------------------------------------------------------------------
class SkyGuardServerHandler(SimpleHTTPRequestHandler):
    server_version = "SkyGuardServer/2.0"

    def get_client_ip(self):
        """Extract client IP, taking X-Forwarded-For into account behind reverse proxies."""
        xff = self.headers.get("X-Forwarded-For")
        if xff:
            return xff.split(",")[0].strip()
        return self.client_address[0] if self.client_address else "127.0.0.1"

    def end_headers(self):
        # Security hardening headers
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "SAMEORIGIN")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("Permissions-Policy", "geolocation=(), camera=(), microphone=()")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://server.arcgisonline.com https://*.basemaps.cartocdn.com; "
            "connect-src 'self' https://generativelanguage.googleapis.com;"
        )
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def list_directory(self, path):
        """Disable directory listing completely to prevent sensitive file enumeration."""
        self.send_error(403, "Directory listing is disabled for security reasons.")
        return None

    def translate_path(self, path):
        """
        Secure path translation:
        - Decodes URL encoding (preventing %2e%2e / %2eenv bypasses)
        - Jails file requests strictly within BASE_DIR
        - Blocks access to dotfiles (.env, .git, etc.) and server source code
        """
        # Strip query and fragments
        path = path.split("?", 1)[0].split("#", 1)[0]
        # Fully decode URL encoding
        decoded = urllib.parse.unquote(path)

        # Normalize and resolve relative to BASE_DIR
        rel = decoded.lstrip("/\\")
        norm = os.path.normpath(os.path.join(BASE_DIR, rel))

        # Root directory jail check
        try:
            common = os.path.commonpath([BASE_DIR, norm])
            if common != BASE_DIR:
                return None
        except ValueError:
            return None

        # Check path components for forbidden patterns
        rel_parts = os.path.relpath(norm, BASE_DIR).replace("\\", "/").split("/")
        if any(part.startswith(".") for part in rel_parts if part and part != "."):
            return None

        # Block direct access to server-side code or config files
        _, ext = os.path.splitext(norm)
        blocked_exts = {".py", ".pyc", ".env", ".key", ".pem", ".yaml", ".yml", ".sh", ".bat", ".ps1"}
        if ext.lower() in blocked_exts:
            return None

        return norm

    def do_GET(self):
        # 1. Fully decode requested path to check for directory traversal / sensitive files
        decoded_path = urllib.parse.unquote(self.path.split("?", 1)[0].split("#", 1)[0])
        segments = [s for s in decoded_path.replace("\\", "/").split("/") if s]

        # Block any traversal or hidden file requests immediately
        if any(s.startswith(".") or s == ".." for s in segments):
            self.send_error(403, "Access denied: Request to hidden or parent paths is prohibited.")
            return

        # 2. API Health & Configuration check
        if decoded_path in ("/api/config", "/api/health"):
            key = get_gemini_api_key()
            # Security: ZERO secret leakage. Never output partial/masked keys.
            resp = {
                "status": "healthy",
                "backend": "python",
                "model": GEMINI_MODEL,
                "keyConfigured": bool(key),
                "rateLimit": {
                    "windowSeconds": RATE_LIMIT_WINDOW_SECONDS,
                    "maxRequestsPerWindow": RATE_LIMIT_MAX_REQUESTS
                }
            }
            body = json.dumps(resp).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(body)
            return

        # 3. Block access to backend scripts or config
        if any(decoded_path.lower().endswith(ext) for ext in (".py", ".env", ".yaml", ".yml", ".sh", ".bat", ".key")):
            self.send_error(403, "Access denied: Direct access to server source or configuration is forbidden.")
            return

        # 4. Fall back to secure static file serving
        resolved_path = self.translate_path(self.path)
        if not resolved_path:
            self.send_error(404, "File not found")
            return

        super().do_GET()

    def do_POST(self):
        clean_path = self.path.split("?", 1)[0].split("#", 1)[0]

        if clean_path == "/api/chat":
            client_ip = self.get_client_ip()

            # 1. Rate Limiting Protection (Sliding Window per IP)
            if is_rate_limited(client_ip):
                self.send_json_response(429, {
                    "error": "Rate limit exceeded. Please wait a moment before sending more messages.",
                    "retryAfterSeconds": RATE_LIMIT_WINDOW_SECONDS
                }, extra_headers={"Retry-After": str(RATE_LIMIT_WINDOW_SECONDS)})
                return

            # 2. Check API Key configuration
            key = get_gemini_api_key()
            if not key:
                self.send_json_response(503, {
                    "error": "Server GEMINI_API_KEY environment variable is not configured.",
                    "hint": "Set GEMINI_API_KEY in your server environment or .env file."
                })
                return

            # 3. Payload size enforcement (Max 100 KB to mitigate DoS / Memory Exhaustion)
            try:
                content_len = int(self.headers.get("Content-Length", 0))
            except ValueError:
                self.send_json_response(400, {"error": "Invalid Content-Length header."})
                return

            if content_len == 0:
                self.send_json_response(400, {"error": "Empty request body."})
                return

            if content_len > 102400:
                self.send_json_response(413, {"error": "Payload too large. Maximum request body is 100KB."})
                return

            # 4. JSON Payload Parsing & Validation
            try:
                body_bytes = self.rfile.read(content_len)
                req_data = json.loads(body_bytes.decode("utf-8"))
            except Exception as e:
                self.send_json_response(400, {"error": f"Invalid JSON payload: {str(e)}"})
                return

            contents = req_data.get("contents")
            if not isinstance(contents, list) or len(contents) == 0:
                self.send_json_response(400, {"error": "Invalid contents payload: must be a non-empty array."})
                return

            # Cap conversation history length to prevent token bomb attacks
            if len(contents) > 25:
                contents = contents[-25:]

            # 5. Call Google Gemini API securely on the server side
            api_url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={key}"
            gemini_payload = {
                "contents": contents,
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
                    self.send_header("Content-Type", "application/json; charset=utf-8")
                    self.send_header("Content-Length", str(len(res_body)))
                    self.send_header("Access-Control-Allow-Origin", "*")
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

    def send_json_response(self, status_code, obj, extra_headers=None):
        data = json.dumps(obj).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Access-Control-Allow-Origin", "*")
        if extra_headers:
            for k, v in extra_headers.items():
                self.send_header(k, v)
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
        print("[SkyGuard AI] API Key Status: Configured securely via environment (REDACTED)")
    else:
        print("[SkyGuard AI] API Key Status: NOT CONFIGURED (Using built-in offline intelligence)")
    print(f"[SkyGuard AI] Rate Limiting: Active ({RATE_LIMIT_MAX_REQUESTS} req / {RATE_LIMIT_WINDOW_SECONDS}s window)")
    print("[SkyGuard AI] Security Hardening: Active (Directory traversal jail, hidden file defense, CSP)")
    print("=" * 60)

    server = HTTPServer(("", PORT), SkyGuardServerHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")
        server.server_close()

if __name__ == "__main__":
    run()
