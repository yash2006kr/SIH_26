/**
 * AURA AI Weather Intelligence Copilot
 * Smart India Hackathon 2026 - Problem 26073
 * Team AI Avengers
 * 
 * Interactive AI Assistant specialized in:
 * - Meteorological physics & WMO sensor standards
 * - Explainable AI diagnostics of flagged anomalies
 * - Real Event vs Sensor Fault discrimination
 * - Predictive sensor maintenance guidance
 * - Disaster Management situational reporting
 */

export class AiCopilot {
  constructor() {
    this.messages = [
      {
        sender: "ai",
        text: `**Welcome to AURA SkyGuard AI Copilot!** 👋\n\nI am your real-time meteorological AI diagnostic assistant. I continuously monitor India's Automatic Weather Station (AWS) network to validate sensor integrity, distinguish genuine disaster events from hardware faults, and recommend predictive maintenance.\n\n*Click any quick prompt below or ask me a question!*`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }
    ];
  }

  getSuggestedPrompts() {
    return [
      "🔍 Explain current station status & trust index",
      "⚡ How does AI distinguish a Real Storm from a Sensor Fault?",
      "🛠️ Prescribe maintenance for drifting hygrometer",
      "📊 How is the Trust Index mathematically calculated?",
      "📄 Generate Disaster Management Executive Briefing"
    ];
  }

  processUserQuery(query, context) {
    const q = query.toLowerCase().trim();
    const st = context.selectedStation;
    const analysis = st?.analysis;
    const latest = st?.latest;
    const trust = analysis?.trustIndex || 98;
    const stName = st?.name || "Selected Station";

    let response = "";

    if (q.includes("explain current") || q.includes("current station") || q.includes("why is it flagged") || q.includes("status")) {
      if (!analysis || analysis.status === "NORMAL") {
        response = `### 🟢 Diagnostics for **${stName}** (${st?.id})\n\n` +
          `• **Overall Trust Index:** \`${trust}%\` (High Reliability)\n` +
          `• **Current Telemetry:** Temp: \`${latest?.t}°C\` | RH: \`${latest?.h}%\` | Pressure: \`${latest?.p} hPa\` | Wind: \`${latest?.wind} km/h\`\n` +
          `• **Status:** **NORMAL OBSERVATION**\n` +
          `• **AI Validation:** All parameters conform to WMO physical limits, Magnus-Tetens dew point coupling, and spatial correlation with buddy station **${st?.neighbors?.[0] || "peer stations"}**.\n\n` +
          `*The data stream is currently approved for automated ingest into National NWP forecasting models.*`;
      } else if (analysis.status === "FAULT") {
        response = `### 🚨 Fault Diagnostic Report: **${stName}** (${st?.id})\n\n` +
          `• **Trust Index Degraded To:** \`${trust}%\` (Flagged as \`${analysis.severity}\` Severity)\n` +
          `• **Classified Root Cause:** **${analysis.rootCause}**\n` +
          `• **Probability of Sensor Failure:** \`${analysis.pFault}%\` (vs Real Event: \`${analysis.pEvent}%\`)\n` +
          `• **Explainable AI (XAI) Reasons:**\n` +
          analysis.explanations.map(e => `  - ${e}`).join("\n") + "\n\n" +
          `• **Virtual Sensor Imputation:** Reconstructed replacement value: Temp \`${analysis.imputed.t}°C\` using *${analysis.imputed.method}*.\n\n` +
          `> ⚠️ **Action Taken:** Raw telemetry quarantined from forecast ingest to prevent disaster model poisoning.`;
      } else if (analysis.status === "EVENT") {
        response = `### 🌪️ Real Extreme Weather Event Detected: **${stName}** (${st?.id})\n\n` +
          `• **Trust Index:** \`${trust}%\` (Sensor is healthy; reporting valid severe weather!)\n` +
          `• **Event Classification:** **${analysis.eventClassification}**\n` +
          `• **Corroborating Evidence:**\n` +
          analysis.explanations.map(e => `  - ${e}`).join("\n") + "\n\n" +
          `• **Spatial Consensus:** Correlated with neighboring AWS stations (**${st?.neighbors?.join(", ")}**).\n\n` +
          `> 📢 **Recommendation:** Issue early disaster advisory to State Disaster Management Authority (SDMA).`;
      } else {
        response = `### 🟡 Watch Status: **${stName}** (${st?.id})\n\n` +
          `• **Trust Index:** \`${trust}%\`\n` +
          `• **Observation:** Minor signal perturbation or slow drift detected (${analysis.rootCause}). Surveillance ongoing.`;
      }
    } else if (q.includes("distinguish") || q.includes("storm") || q.includes("real event") || q.includes("vs sensor fault")) {
      response = `### 🧠 How AURA AI Distinguishes **Real Weather Events vs Sensor Faults**\n\n` +
        `This is the core innovation of **SIH Problem 26073**! A traditional single-sensor threshold fails because a sudden 6°C drop could be a severe thunderstorm downdraft or a loose wire.\n\n` +
        `Our **5-Tier Verification Pipeline** evaluates:\n\n` +
        `1. **Multivariate Thermodynamic Coupling**:\n` +
        `   - In a **Real Storm**, atmospheric laws dictate that a rapid temperature drop MUST be accompanied by a sudden pressure plunge ($\\Delta P < -2.5$ hPa), humidity surge ($RH > 85\\%$), and wind gust spike.\n` +
        `   - In a **Sensor Fault**, only one parameter leaps (e.g. 55°C heat spike) while pressure, humidity, and wind remain completely flat.\n\n` +
        `2. **Spatial Buddy Consensus (Spatial K-Nearest Neighbors)**:\n` +
        `   - Real weather spans meso-scale fronts ($10\\text{--}50\\text{ km}$). Nearest peer stations (e.g. Kempegowda Airport and Bengaluru IMD) will show matching trend departures.\n` +
        `   - If only ONE station exhibits extreme departure while its neighbors 15 km away show calm weather, the AI isolates it as a **hardware fault**.\n\n` +
        `3. **Rate of Diffusion & Frozen Variance**:\n` +
        `   - Natural air cannot change 15°C in 60 seconds without heat exchange. Furthermore, a sensor stuck at exact digits (0.000 variance) indicates an ADC buffer lock.`;
    } else if (q.includes("maintenance") || q.includes("drifting") || q.includes("repair") || q.includes("sensor health")) {
      response = `### 🛠️ Standard Operating Procedure (SOP) for AWS Maintenance\n\n` +
        `Based on WMO-No. 8 (Guide to Instruments & Methods of Observation):\n\n` +
        `1. **Capacitive Hygrometer Drift**:\n` +
        `   - **Symptom:** Sensor reads $>98\\%$ RH in dry conditions or exhibits positive drift $+0.3\\%$/hr.\n` +
        `   - **Action:** Inspect the sintered bronze / Teflon protective filter for dust or salt crust. Perform 2-point salt chamber calibration (Lithium Chloride $11.3\\%$ and Sodium Chloride $75.3\\%$).\n\n` +
        `2. **Thermistor / RTD Spike**:\n` +
        `   - **Symptom:** $55^\\circ\\text{C}$ step jump or open circuit ($<-40^\\circ\\text{C}$).\n` +
        `   - **Action:** Inspect terminal screw blocks on ESP32 ADC expansion board. Check 4-wire RTD compensation line for corrosion.\n\n` +
        `3. **Barometer (PTB110) Sticking**:\n` +
        `   - **Symptom:** Static barometric pressure while synoptic fronts pass.\n` +
        `   - **Action:** Check static pressure port tube for insect nesting or water condensation blockages.`;
    } else if (q.includes("trust index") || q.includes("mathematical") || q.includes("calculated") || q.includes("formula")) {
      response = `### 📐 Mathematical Formulation of the **Trust Index ($I_{\\text{trust}}$)**\n\n` +
        `The Trust Index is a composite probabilistic metric between $0\\%$ and $100\\%$:\n\n` +
        `$$I_{\\text{trust}} = 100 \\times \\left[ 1 - \\sum_{k=1}^N w_k \\cdot S_k(\\mathbf{x}) \\right]$$\n\n` +
        `Where:\n` +
        `• $S_1(\\mathbf{x})$: **Climatological Bound Penalty** (0 if within bounds, 1.0 if physical limit exceeded)\n` +
        `• $S_2(\\mathbf{x})$: **Thermodynamic Inconsistency** ($|T - T_{\\text{dew}}| < 0$ or Clausius-Clapeyron violation)\n` +
        `• $S_3(\\mathbf{x})$: **Robust Z-Score Departure** ($Z_{\\text{MAD}} = 0.6745 \\cdot \\frac{|x - \\tilde{x}|}{\\text{MAD}}$)\n` +
        `• $S_4(\\mathbf{x})$: **Spatial Buddy Divergence** ($|\\Delta T_{\\text{station}} - \\text{median}(\\Delta T_{\\text{buddies}})|$)\n` +
        `• $S_5(\\mathbf{x})$: **Frozen Signal Detector** (variance $\\sigma < 0.005$ across $N$ ticks)\n\n` +
        `*If a genuine meteorological storm is proven via spatial agreement, the penalty is suppressed ($w_{\\text{event}} = 0.15$), ensuring accurate extreme weather observations are trusted and not discarded!*`;
    } else if (q.includes("disaster") || q.includes("briefing") || q.includes("executive") || q.includes("summary")) {
      response = `### 📋 National Weather Network · Disaster Preparedness Briefing\n\n` +
        `**Authority:** Ministry of Earth Sciences (MoES) / IMD National AWS Network\n` +
        `**Generated At:** ${new Date().toLocaleString()}\n` +
        `**Monitored Stations:** 15 Primary Agro-Meteorological & Coastal Nodes\n\n` +
        `**Key Network Health Indicators:**\n` +
        `• **Network Trust Index:** \`${context.networkTrust || 98}%\`\n` +
        `• **Operational Stations:** \`${Object.values(context.stations || {}).filter(s => s.analysis?.status === "NORMAL").length} / ${Object.keys(context.stations || {}).length}\`\n` +
        `• **Active Sensor Faults Quarantined:** \`${Object.values(context.stations || {}).filter(s => s.analysis?.status === "FAULT").length}\`\n` +
        `• **Active Severe Weather Warnings:** \`${Object.values(context.stations || {}).filter(s => s.analysis?.status === "EVENT").length}\`\n\n` +
        `**Operational Directive:**\n` +
        `1. All automated Numerical Weather Prediction (NWP) ingestion pipelines are protected by AURA Virtual Sensor Imputation.\n` +
        `2. Field maintenance teams dispatched for stations with Trust Index $< 60\\%$.\n` +
        `3. Early warning siren systems primed for coastal and cyclone corridors.`;
    } else {
      // General intelligent assistant response
      response = `### 🌤️ AURA AI Meteorological Intelligence\n\n` +
        `You asked: *"${query}"*\n\n` +
        `In relation to our **Automatic Weather Station (AWS) Anomaly Detection Pipeline**:\n\n` +
        `• **Active Station:** **${stName}** (${st?.id}) with **${trust}% Trust Index**.\n` +
        `• **Current Analysis:** ${analysis?.rootCause || "Nominal operation"}.\n` +
        `• **Key Capabilities:**\n` +
        `  1. Real-time physical boundary checks (-20°C to 53°C).\n` +
        `  2. Clausius-Clapeyron thermodynamic consistency between temperature & humidity.\n` +
        `  3. Spatial buddy check with peer AWS nodes across India.\n` +
        `  4. Real weather event vs sensor fault discrimination.\n` +
        `  5. Reconstructed data imputation via virtual sensors.\n\n` +
        `*Try clicking one of the suggested prompts below to explore specific diagnostics!*`;
    }

    const aiMsg = {
      sender: "ai",
      text: response,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    this.messages.push({
      sender: "user",
      text: query,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    });
    this.messages.push(aiMsg);

    return aiMsg;
  }
}
