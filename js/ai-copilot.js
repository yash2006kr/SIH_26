/**
 * SkyGuard AI - Weather Intelligence Copilot
 * Smart India Hackathon 2026 - Problem 26073
 * Team AI Avengers
 * 
 * Secure Architecture:
 * 1. Default: Proxies requests via backend /api/chat without exposing any API key to the client.
 * 2. Static / GitHub Pages: Supports optional client-side BYOK stored strictly in sessionStorage (never localStorage, wiped on tab close).
 * 3. Offline / Zero-Key: Falls back gracefully to SkyGuard AI's built-in meteorological intelligence engine.
 */

const GEMINI_MODEL = "gemini-2.5-flash";

/**
 * Purge legacy keys from localStorage to remediate previous client-side persistence
 */
(function purgeLegacyStorage() {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      localStorage.removeItem("skyguard_gemini_key");
    } catch (e) {
      // Ignore
    }
  }
})();

export function getSessionApiKey() {
  if (typeof window !== "undefined" && window.sessionStorage) {
    return sessionStorage.getItem("skyguard_gemini_session_key") || "";
  }
  return "";
}

export function setSessionApiKey(newKey) {
  if (typeof window !== "undefined" && window.sessionStorage) {
    if (newKey && newKey.trim()) {
      sessionStorage.setItem("skyguard_gemini_session_key", newKey.trim());
    } else {
      sessionStorage.removeItem("skyguard_gemini_session_key");
    }
  }
}

export function getAuthToken() {
  if (typeof window !== "undefined" && window.sessionStorage) {
    return sessionStorage.getItem("skyguard_auth_token") || "";
  }
  return "";
}

export function setAuthToken(token) {
  if (typeof window !== "undefined" && window.sessionStorage) {
    if (token && token.trim()) {
      sessionStorage.setItem("skyguard_auth_token", token.trim());
    } else {
      sessionStorage.removeItem("skyguard_auth_token");
    }
  }
}

// Backward compatibility helper
export function getActiveApiKey() {
  return getSessionApiKey();
}

export function setActiveApiKey(newKey) {
  setSessionApiKey(newKey);
}

export class AiCopilot {
  constructor() {
    this.messages = [
      {
        sender: "ai",
        text: `**Welcome to SkyGuard AI Copilot!** 🤖✨\n\nI am your real-time meteorological AI diagnostic assistant for India's Automatic Weather Station (AWS) network.\n\nI continuously evaluate sensor health, distinguish genuine disasters from hardware faults, and formulate predictive maintenance SOPs.\n\n💡 *Ask me anything about current telemetry, atmospheric physics, sensor repairs, or general questions!*`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }
    ];

    // Maintain conversation history for multi-turn chat with Gemini
    this.conversationHistory = [];
    this.backendAvailable = false;
    this.backendChecked = false;

    // Check backend proxy status on startup
    this.checkBackend();
  }

  async checkBackend() {
    try {
      const resp = await fetch("/api/config", { method: "GET" });
      if (resp.ok) {
        const data = await resp.json();
        this.backendAvailable = Boolean(data.keyConfigured || data.status === "healthy");
        this.backendChecked = true;
        return this.backendAvailable;
      }
    } catch (e) {
      // Backend not running (e.g., static hosting on GitHub Pages)
      this.backendAvailable = false;
      this.backendChecked = true;
    }
    return false;
  }

  getSuggestedPrompts() {
    return [
      "🔍 Explain current station status & trust index",
      "⚡ How does AI distinguish a Real Storm from a Sensor Fault?",
      "🛠️ Prescribe maintenance for drifting hygrometer",
      "📊 How is the Trust Index mathematically calculated?",
      "📄 Generate Disaster Management Executive Briefing",
      "🌐 What are the WMO-No. 8 calibration standards for AWS?",
      "💻 Show Python code to calculate Magnus-Tetens dew point"
    ];
  }

  buildSystemInstruction() {
    return `You are SkyGuard AI Weather Copilot, an elite meteorological diagnostic and general intelligence assistant built for India's National Automatic Weather Station (AWS) Network (Smart India Hackathon 2026, Problem Statement 26073, Disaster Management theme, Team AI Avengers).

CORE MISSION & DOMAIN EXPERTISE:
1. Validate AWS surface observations per World Meteorological Organization (WMO-No. 8) standards.
2. Distinguish genuine extreme weather events (microbursts, squall lines, cyclone landfall, flash floods, heatwaves) from hardware malfunctions (stuck ADC registers, open RTD circuits, hygrometer drift from dust or salt crust, barometer port blockages).
3. Ground answers in atmospheric physics:
   - Clausius-Clapeyron thermodynamic relation
   - Magnus-Tetens formula for saturation vapor pressure and dew point depression (T - T_dew >= 0)
   - Barometric hypsometric lapse rate
   - Spatial K-Nearest Neighbors (KNN) peer consensus across neighboring Indian stations
   - Virtual Sensor Imputation via inverse-distance spatial weighting
4. Provide actionable Standard Operating Procedures (SOPs) for AWS instrumentation field engineers.
5. Formulate executive disaster advisories for State Disaster Management Authorities (SDMA) and NWP forecast pipelines.

VERSATILITY:
You can answer ANY question the user asks — including:
- In-depth meteorological analysis, sensors, electronics (ESP32, PT100 RTDs, capacitive hygrometers, ultrasonic anemometers).
- Mathematics, statistics, machine learning, Python/JavaScript code snippets.
- System architecture, SIH presentation tips, disaster risk mitigation.
- General questions, science, climate change, weather forecasts, or general chat.

FORMATTING RULES:
- Use clean Markdown formatting: bold keywords, bullet points, numbered lists, section headers (###), and code blocks where helpful.
- Keep responses informative, authoritative, and engaging.
- Always be helpful, polite, and technically accurate.`;
  }

  formatTelemetryContext(context) {
    if (!context || !context.selectedStation) return "";

    const st = context.selectedStation;
    const latest = st.latest || {};
    const analysis = st.analysis || {};
    const trust = analysis.trustIndex != null ? analysis.trustIndex : 98;
    const neighbors = st.neighbors ? st.neighbors.join(", ") : "None listed";

    return `\n\n[LIVE TELEMETRY SNAPSHOT FOR ACTIVE AWS NODE:
• Station: ${st.name} (ID: ${st.id}, WMO: ${st.wmoId || "43295"})
• Location: ${st.state}, India (${st.lat?.toFixed(4)}°N, ${st.lng?.toFixed(4)}°E, Alt: ${st.elevation || 0}m MSL)
• Air Temperature: ${latest.t != null ? latest.t + "°C" : "N/A"}
• Dew Point: ${analysis.dewPoint != null ? analysis.dewPoint + "°C" : "N/A"} (Depression: ${analysis.dewDepression != null ? analysis.dewDepression + "°C" : "N/A"})
• Relative Humidity: ${latest.h != null ? latest.h + "%" : "N/A"}
• Barometric Pressure: ${latest.p != null ? latest.p + " hPa" : "N/A"}
• Wind Speed & Gusts: ${latest.wind != null ? latest.wind + " km/h" : "N/A"}
• Precipitation: ${latest.rain != null ? latest.rain + " mm" : "0.0 mm"}
• Overall Station Trust Index: ${trust}%
• AI Quality Control Status: ${analysis.status || "NORMAL"} (${analysis.rootCause || "Nominal operation"})
• Quarantine / Imputation: ${analysis.status === "FAULT" ? "Active (quarantined from NWP; imputed value substituted)" : "Pass"}
• Spatial Peer AWS Neighbors: ${neighbors}
• Overall Network Trust Index: ${context.networkTrust || 98}%]`;
  }

  /**
   * Process query using secure backend proxy or session BYOK, falling back to local AI
   */
  async processUserQuery(query, context) {
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Record user message in UI log
    this.messages.push({
      sender: "user",
      text: query,
      time: timestamp
    });

    const telemetryContext = this.formatTelemetryContext(context);
    const enrichedPrompt = `${query}${telemetryContext}`;

    this.conversationHistory.push({
      role: "user",
      parts: [{ text: enrichedPrompt }]
    });

    if (this.conversationHistory.length > 12) {
      this.conversationHistory = this.conversationHistory.slice(-12);
    }

    const payload = {
      systemInstruction: {
        parts: [{ text: this.buildSystemInstruction() }]
      },
      contents: this.conversationHistory,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1200
      }
    };

    // Strategy 1: Try secure backend proxy (/api/chat) with Operator Authentication
    try {
      const headers = { "Content-Type": "application/json" };
      const authToken = getAuthToken();
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      const proxyResp = await fetch("/api/chat", {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });

      if (proxyResp.status === 401) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("skyguard:auth_required"));
        }
      } else if (proxyResp.ok) {
        const data = await proxyResp.json();
        const aiReply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (aiReply) {
          this.conversationHistory.push({
            role: "model",
            parts: [{ text: aiReply }]
          });
          const aiMsg = { sender: "ai", text: aiReply, time: timestamp };
          this.messages.push(aiMsg);
          return aiMsg;
        }
      }
    } catch (e) {
      // Backend not reachable, attempt client fallback
    }

    // Strategy 2: If user provided a session key in sessionStorage (for static GitHub Pages)
    const sessionKey = getSessionApiKey();
    if (sessionKey) {
      try {
        const directUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(sessionKey)}`;
        const directResp = await fetch(directUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (directResp.ok) {
          const data = await directResp.json();
          const aiReply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (aiReply) {
            this.conversationHistory.push({
              role: "model",
              parts: [{ text: aiReply }]
            });
            const aiMsg = { sender: "ai", text: aiReply, time: timestamp };
            this.messages.push(aiMsg);
            return aiMsg;
          }
        }
      } catch (e) {
        console.warn("Direct Gemini session API call failed:", e);
      }
    }

    // Strategy 3: Resilient built-in offline intelligence engine (zero API key needed)
    const fallbackText = this.getLocalFallbackResponse(query, context);
    const advisoryNote = sessionKey
      ? ""
      : "\n\n*(🛡️ Operating in Zero-Key Offline AI mode. For live Gemini 2.5 Flash, launch `python server.py` with `GEMINI_API_KEY` or click 🔑 in the top right to provide a session key.)*";

    const finalReply = `${fallbackText}${advisoryNote}`;
    const fallbackMsg = {
      sender: "ai",
      text: finalReply,
      time: timestamp
    };

    this.messages.push(fallbackMsg);
    return fallbackMsg;
  }

  getLocalFallbackResponse(query, context) {
    const q = query.toLowerCase().trim();
    const st = context.selectedStation;
    const analysis = st?.analysis;
    const latest = st?.latest;
    const trust = analysis?.trustIndex != null ? analysis.trustIndex : 98;
    const stName = st?.name || "Selected Station";

    if (q.includes("status") || q.includes("trust") || q.includes("current")) {
      return `### 🟢 Real-Time Diagnostics for **${stName}** (${st?.id || "N/A"})\n\n` +
        `• **Operational Trust Index:** \`${trust}%\`\n` +
        `• **Current Telemetry:** Temp: \`${latest?.t != null ? latest.t + "°C" : "N/A"}\` | RH: \`${latest?.h != null ? latest.h + "%" : "N/A"}\` | Pressure: \`${latest?.p != null ? latest.p + " hPa" : "N/A"}\` | Wind: \`${latest?.wind != null ? latest.wind + " km/h" : "N/A"}\`\n` +
        `• **QC State:** **${analysis?.status || "NORMAL"}** (${analysis?.rootCause || "Nominal operation"})\n` +
        `• **Mathematical Corroboration:** Analyzed via Clausius-Clapeyron thermodynamic consistency and regional spatial consensus.`;
    }

    if (q.includes("distinguish") || q.includes("storm") || q.includes("real event") || q.includes("fault")) {
      return `### 🧠 Anomaly Discrimination: Real Storm vs. Hardware Malfunction\n\n` +
        `1. **Thermodynamic Coupling:** In a genuine atmospheric storm, rapid temperature drops correlate directly with barometric plunges ($\\Delta P < -2.5$ hPa) and relative humidity surges ($>85\\%$). In a sensor fault, a single parameter fluctuates abruptly in thermodynamic isolation.\n` +
        `2. **Spatial Buddy Consensus:** Real meso-scale convective systems encompass multiple regional AWS nodes (10-30 km). If only a single isolated station deviates while neighboring nodes remain nominal, it is categorized as a localized sensor failure.`;
    }

    if (q.includes("maintenance") || q.includes("sop") || q.includes("hygrometer") || q.includes("repair")) {
      return `### 🛠️ Standard Operating Procedure (SOP): Sensor Calibration & Maintenance\n\n` +
        `• **Observation:** High hygrometer drift or sensor divergence detected.\n` +
        `• **Protocol (WMO No. 8):**\n` +
        `  1. Inspect radiation shield and aspiration filter for dust accumulation, salt crust, or particulate blockage.\n` +
        `  2. Execute 2-point relative humidity salt chamber verification (LiCl 11.3% RH and NaCl 75.3% RH).\n` +
        `  3. Check transducer lead resistance and supply voltage stability (nominal 3.3V / 12V bus).\n` +
        `  4. Clear calibration offsets and record field calibration timestamp into station registry.`;
    }

    return `### 🌤️ SkyGuard AI Meteorological Intelligence\n\n` +
      `You inquired: *"${query}"*\n\n` +
      `• **Active Station:** **${stName}** (${st?.id || "N/A"}) operating at **${trust}% Trust Index**.\n` +
      `• **AI Pipeline Verdict:** ${analysis?.rootCause || "All sensor transducers operating within standard WMO tolerance envelopes"}.\n` +
      `• **Data Ingestion Status:** Telemetry is actively verified by SkyGuard's 5-Tier AI Anomaly Detection Pipeline.`;
  }

  async authenticate(username, password) {
    try {
      const resp = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.token) {
          setAuthToken(data.token);
          return { success: true, user: data.user, role: data.role };
        }
      }
      const err = await resp.json().catch(() => ({}));
      return { success: false, error: err.error || "Authentication failed." };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async checkAuthStatus() {
    try {
      const token = getAuthToken();
      const headers = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const resp = await fetch("/api/auth/verify", { headers });
      if (resp.ok) {
        return await resp.json();
      }
    } catch (e) {
      // Backend offline
    }
    return { authenticated: false };
  }

  logout() {
    setAuthToken("");
  }
}
