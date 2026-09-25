/**
 * Vercel / Serverless Gemini API Proxy (/api/chat)
 * Smart India Hackathon 2026 - Problem 26073
 * Team AI Avengers
 * 
 * Security Features:
 * 1. Keeps GEMINI_API_KEY safely on serverless backend, preventing browser key leakage.
 * 2. Sliding window IP rate limiting to mitigate quota exhaustion and automated abuse.
 * 3. Payload size enforcement (max 100 KB) and strict JSON structure validation.
 * 4. Zero secret disclosure in health endpoints.
 */

// In-memory sliding-window rate limiter (per serverless instance)
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const ipRequests = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const history = (ipRequests.get(ip) || []).filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
  if (history.length >= RATE_LIMIT_MAX_REQUESTS) {
    ipRequests.set(ip, history);
    return true;
  }
  history.push(now);
  ipRequests.set(ip, history);
  return false;
}

export default async function handler(req, res) {
  // CORS configuration
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // Handle health check (never disclose partial key)
  if (req.method === "GET") {
    const key = process.env.GEMINI_API_KEY;
    return res.status(200).json({
      status: "healthy",
      backend: "vercel-serverless",
      keyConfigured: Boolean(key),
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      rateLimit: {
        windowSeconds: 60,
        maxRequestsPerWindow: RATE_LIMIT_MAX_REQUESTS
      }
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  // Extract client IP for rate limiting
  const clientIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "127.0.0.1";
  if (isRateLimited(clientIp)) {
    res.setHeader("Retry-After", "60");
    return res.status(429).json({
      error: "Rate limit exceeded. Please wait a moment before sending more messages.",
      retryAfterSeconds: 60
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: "Server GEMINI_API_KEY environment variable is not configured.",
      hint: "Configure GEMINI_API_KEY in your Vercel Project Settings."
    });
  }

  // Enforce body payload size (max 100 KB)
  const bodyLength = req.headers["content-length"] ? parseInt(req.headers["content-length"], 10) : 0;
  if (bodyLength > 102400) {
    return res.status(413).json({ error: "Payload too large. Maximum request body is 100KB." });
  }

  // Validate request structure
  const contents = req.body?.contents;
  if (!Array.isArray(contents) || contents.length === 0) {
    return res.status(400).json({ error: "Invalid contents: must be a non-empty array." });
  }

  // Cap conversation turns to prevent token bomb attacks
  const sanitizedContents = contents.length > 25 ? contents.slice(-25) : contents;

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const geminiPayload = {
      contents: sanitizedContents,
      systemInstruction: req.body?.systemInstruction,
      generationConfig: req.body?.generationConfig || {
        temperature: 0.7,
        maxOutputTokens: 1200
      }
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiPayload)
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({
      error: "Failed to communicate with Gemini API",
      details: "An upstream network error occurred."
    });
  }
}
