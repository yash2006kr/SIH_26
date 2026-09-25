/**
 * Vercel / Serverless Gemini API Proxy (/api/chat)
 * Smart India Hackathon 2026 - Problem 26073
 * Team AI Avengers
 * 
 * Proxies Gemini chat requests on the server side using the GEMINI_API_KEY
 * environment variable, preventing any API key leakage to browser clients.
 */

export default async function handler(req, res) {
  // CORS configuration
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Handle health check
  if (req.method === "GET") {
    const key = process.env.GEMINI_API_KEY;
    return res.status(200).json({
      status: "healthy",
      backend: "vercel-serverless",
      keyConfigured: Boolean(key),
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash"
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: "Server GEMINI_API_KEY environment variable is not configured.",
      hint: "Configure GEMINI_API_KEY in your Vercel Project Settings."
    });
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const geminiPayload = {
      contents: req.body?.contents || [],
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
    console.error("Gemini serverless proxy failure:", err);
    return res.status(500).json({
      error: "Failed to communicate with Gemini API",
      details: err.message
    });
  }
}
