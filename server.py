"""
SkyGuard AI - Secure Local & Production Backend Server
Smart India Hackathon 2026 - Problem 26073
Team AI Avengers

Security Architecture:
1. Strict static asset server with root jail, directory traversal defense,
   hidden file blocking, and disabled directory listings.
2. Operator Authentication Layer (HMAC-SHA256 session tokens, /api/auth/login,
   and /api/auth/verify) securing all backend AI pipelines.
3. Secure /api/chat endpoint proxying requests to Google Gemini 2.5 Flash
   without exposing API keys to the browser.
4. In-memory sliding-window IP rate limiting on /api/chat to prevent
   quota exhaustion, automated abuse, and Denial-of-Service (DoS).
5. Request payload size enforcement (max 100 KB) and JSON schema validation.
6. Strict security headers (CSP, X-Content-Type-Options, X-Frame-Options,
   Referrer-Policy, Permissions-Policy).
7. Zero secret leakage: /api/config exposes ONLY boolean key status, never masked keys.
"""

import os
import sys
import time
import json
import hmac
import hashlib
import base64
import urllib.request
import urllib.error
import urllib.parse
from collections import defaultdict
from http.server import SimpleHTTPRequestHandler, HTTPServer

PORT = int(os.environ.get("PORT", 8080))
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ---------------------------------------------------------------------------
# Authentication Configuration & Token Management
# ---------------------------------------------------------------------------
AUTH_ENABLED = os.environ.get("AUTH_ENABLED", "true").lower() in ("true", "1", "yes")
ADMIN_USER = os.environ.get("SKYGUARD_ADMIN_USER", "operator")
ADMIN_PASS = os.environ.get("SKYGUARD_ADMIN_PASSWORD", "SkyGuard@2026")
SKYGUARD_AUTH_TOKEN = os.environ.get("SKYGUARD_AUTH_TOKEN", "skyguard-sih2026-auth-token")
SECRET_KEY = os.environ.get("SESSION_SECRET", "skyguard-secret-signature-key-2026").encode("utf-8")

def generate_session_token(username: str, role: str = "IMD Duty Officer") -> str:
    """Generate a tamper-proof HMAC-SHA256 signed session token valid for 24 hours."""
    payload = {
        "user": username,
        "role": role,
        "exp": int(time.time()) + 86400  # 24h expiration
    }
    payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode("utf-8")).decode("utf-8")
    sig = hmac.new(SECRET_KEY, payload_b64.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{payload_b64}.{sig}"

def verify_token(token: str) -> dict:
    """Verify an HMAC session token or static API Bearer token."""
    if not token:
        return None
    # Static token match for direct automation / scripts
    if token == SKYGUARD_AUTH_TOKEN:
        return {"user": "automated-agent", "role": "System Operator"}
    # Session token validation
    try:
        parts = token.split(".")
        if len(parts) != 2:
            return None
        payload_b64, sig = parts
        expected_sig = hmac.new(SECRET_KEY, payload_b64.encode("utf-8"), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected_sig):
            return None
        payload = json.loads(base64.urlsafe_b64decode(payload_b64.encode("utf-8")).decode("utf-8"))
        if payload.get("exp", 0) < time.time():
            return None  # Expired
        return payload
    except Exception:
        return None

# ---------------------------------------------------------------------------
# Rate Limiting (In-Memory Sliding Window)
# ---------------------------------------------------------------------------
RATE_LIMIT_WINDOW_SECONDS = 60
RATE_LIMIT_MAX_REQUESTS = 20
ip_request_history = defaultdict(list)

def is_rate_limited(ip_address: str) -> bool:
    """Check if the requesting IP has exceeded the allowed request quota."""
    now = time.time()
    history = ip_request_history[ip_address]
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

    def get_auth_identity(self):
        """Extract and verify Bearer token from the Authorization header."""
        auth_header = self.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()
            return verify_token(token)
        return None

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
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
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
        path = path.split("?", 1)[0].split("#", 1)[0]
        decoded = urllib.parse.unquote(path)

        rel = decoded.lstrip("/\\")
        norm = os.path.normpath(os.path.join(BASE_DIR, rel))

        try:
            common = os.path.commonpath([BASE_DIR, norm])
            if common != BASE_DIR:
                return None
        except ValueError:
            return None

        rel_parts = os.path.relpath(norm, BASE_DIR).replace("\\", "/").split("/")
        if any(part.startswith(".") for part in rel_parts if part and part != "."):
            return None

        _, ext = os.path.splitext(norm)
        blocked_exts = {".py", ".pyc", ".env", ".key", ".pem", ".yaml", ".yml", ".sh", ".bat", ".ps1"}
        if ext.lower() in blocked_exts:
            return None

        return norm

    def do_GET(self):
        decoded_path = urllib.parse.unquote(self.path.split("?", 1)[0].split("#", 1)[0])
        segments = [s for s in decoded_path.replace("\\", "/").split("/") if s]

        # Block any traversal or hidden file requests immediately
        if any(s.startswith(".") or s == ".." for s in segments):
            self.send_error(403, "Access denied: Request to hidden or parent paths is prohibited.")
            return

        # API: Health & Configuration discovery
        if decoded_path in ("/api/config", "/api/health"):
            key = get_gemini_api_key()
            resp = {
                "status": "healthy",
                "backend": "python",
                "model": GEMINI_MODEL,
                "keyConfigured": bool(key),
                "authRequired": AUTH_ENABLED,
                "rateLimit": {
                    "windowSeconds": RATE_LIMIT_WINDOW_SECONDS,
                    "maxRequestsPerWindow": RATE_LIMIT_MAX_REQUESTS
                }
            }
            self.send_json_response(200, resp)
            return

        # API: Verify Auth Session
        if decoded_path == "/api/auth/verify":
            identity = self.get_auth_identity()
            if identity:
                self.send_json_response(200, {
                    "authenticated": True,
                    "user": identity.get("user", "operator"),
                    "role": identity.get("role", "IMD Duty Officer")
                })
            else:
                self.send_json_response(200, {
                    "authenticated": not AUTH_ENABLED,
                    "authRequired": AUTH_ENABLED
                })
            return

        # Block access to backend scripts or config
        if any(decoded_path.lower().endswith(ext) for ext in (".py", ".env", ".yaml", ".yml", ".sh", ".bat", ".key")):
            self.send_error(403, "Access denied: Direct access to server source or configuration is forbidden.")
            return

        # Fall back to secure static file serving
        resolved_path = self.translate_path(self.path)
        if not resolved_path:
            self.send_error(404, "File not found")
            return

        super().do_GET()

    def do_POST(self):
        clean_path = self.path.split("?", 1)[0].split("#", 1)[0]

        # -------------------------------------------------------------------
        # POST /api/auth/login - Operator Login & Session Token Issuer
        # -------------------------------------------------------------------
        if clean_path == "/api/auth/login":
            try:
                content_len = int(self.headers.get("Content-Length", 0))
                if content_len == 0 or content_len > 4096:
                    self.send_json_response(400, {"error": "Invalid login request payload."})
                    return
                body_bytes = self.rfile.read(content_len)
                req_data = json.loads(body_bytes.decode("utf-8"))
            except Exception:
                self.send_json_response(400, {"error": "Invalid JSON format."})
                return

            username = req_data.get("username", "").strip()
            password = req_data.get("password", "").strip()

            # Verify against configured admin credentials or master passcode
            if (username == ADMIN_USER and password == ADMIN_PASS) or password == SKYGUARD_AUTH_TOKEN:
                token = generate_session_token(username or "operator", "IMD Duty Officer")
                self.send_json_response(200, {
                    "success": True,
                    "token": token,
                    "user": username or "operator",
                    "role": "IMD Duty Officer",
                    "expiresIn": 86400
                })
            else:
                # Artificial timing delay against brute force enumeration
                time.sleep(0.3)
                self.send_json_response(401, {"error": "Invalid operator credentials or passcode."})
            return

        # -------------------------------------------------------------------
        # POST /api/chat - Protected Gemini AI Proxy
        # -------------------------------------------------------------------
        if clean_path == "/api/chat":
            client_ip = self.get_client_ip()

            # 1. Rate Limiting Protection (Sliding Window per IP)
            if is_rate_limited(client_ip):
                self.send_json_response(429, {
                    "error": "Rate limit exceeded. Please wait a moment before sending more messages.",
                    "retryAfterSeconds": RATE_LIMIT_WINDOW_SECONDS
                }, extra_headers={"Retry-After": str(RATE_LIMIT_WINDOW_SECONDS)})
                return

            # 2. Authentication Enforcement (when AUTH_ENABLED)
            if AUTH_ENABLED:
                identity = self.get_auth_identity()
                if not identity:
                    self.send_json_response(401, {
                        "error": "Authentication required. Please sign in with valid operator credentials.",
                        "authRequired": True
                    })
                    return

            # 3. Check Gemini API Key configuration
            key = get_gemini_api_key()
            if not key:
                self.send_json_response(503, {
                    "error": "Server GEMINI_API_KEY environment variable is not configured.",
                    "hint": "Set GEMINI_API_KEY in your server environment or .env file."
                })
                return

            # 4. Payload size enforcement (Max 100 KB to mitigate DoS / Memory Exhaustion)
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

            # 5. JSON Payload Parsing & Validation
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

            if len(contents) > 25:
                contents = contents[-25:]

            # 6. Call Google Gemini API securely on the server side
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
    print(f"[SkyGuard AI] Authentication Layer: {'ACTIVE (Operator Login / Bearer Required)' if AUTH_ENABLED else 'DISABLED'}")
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
