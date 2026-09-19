# AURA SkyGuard AI · Automatic Weather Station (AWS) Anomaly Detection

[![SIH 2026](https://img.shields.io/badge/SIH-2026-blue.svg)](https://www.sih.gov.in/)
[![Problem Statement](https://img.shields.io/badge/PS_ID-26073-orange.svg)]()
[![Theme](https://img.shields.io/badge/Theme-Disaster_Management-red.svg)]()
[![Team](https://img.shields.io/badge/Team-AI_Avengers-emerald.svg)]()

> **"Pipeline of Trust: Building Trustworthy Weather Data with AI"**  
> *Reliable Observations • Smarter Decisions • Safer Communities*

Web prototype for **Smart India Hackathon 2026** (Problem Statement ID: **26073** — *Anomaly detection for weather stations (AWS)*).

---

## 🌪️ The Problem
Automatic Weather Stations (AWS) and Automatic Rain Gauges (ARG) across India continuously collect atmospheric observations (Temperature, Relative Humidity, Barometric Pressure, Wind Velocity, Rainfall). However, environmental fouling, electrical spikes, calibration drift, and ADC buffer locks corrupt telemetry.

**The Crucial Dilemma:**
Traditional rule-based range filters fail because an extreme reading could be:
1. **A Genuine Catastrophic Weather Event** (Thunderstorm downdraft, cloudburst, microburst, cyclone eyewall), OR
2. **A Sensor Hardware Malfunction** (stuck thermistor ADC, 55°C electrical surge, clogged rain gauge).

If valid extreme weather is flagged as an error, disaster warnings are missed. If poisoned sensor data is ingested, Numerical Weather Prediction (NWP) models crash or issue false flood panics.

---

## 🛡️ The Solution: AURA 5-Tier Pipeline of Trust

```
[ Field AWS / ARG Sensors ]
            │ (Telemetry Ingestion: Live Open-Meteo API / Dept Streams / CSV)
            ▼
┌─────────────────────────────────────────────────────────────┐
│ Tier 1: WMO Climatological & Rapid Rate-of-Change Bounds     │
├─────────────────────────────────────────────────────────────┤
│ Tier 2: Thermodynamic Coupling (Magnus-Tetens Dew Point)    │
├─────────────────────────────────────────────────────────────┤
│ Tier 3: Time-Series Ensemble (Robust Z-score + Stuck ADC)   │
├─────────────────────────────────────────────────────────────┤
│ Tier 4: Spatial Buddy Consensus (KNN Peer Inter-Station)    │
├─────────────────────────────────────────────────────────────┤
│ Tier 5: Event vs. Sensor Fault Classifier & Virtual Sensor  │
└─────────────────────────────────────────────────────────────┘
            │
            ├── Real Storm? ────► [ Disaster Warning Dispatched ]
            │
            └── Sensor Fault? ──► [ Quarantined + Virtual Sensor Imputation ]
```

1. **Multivariate Thermodynamic Validation:** Evaluates physical laws (Clausius-Clapeyron saturation vapor pressure, dry bulb vs dew point depression). An isolated 48°C air temperature with 95% RH is flagged as physically inconsistent.
2. **Spatial Buddy Consensus:** Evaluates the target AWS against peer neighbor stations within a 50–300 km radius. An isolated step jump at one station while peer stations report steady conditions is flagged as a hardware failure. Conversely, if peer stations corroborate sudden barometric depression and squall gusts, it is classified as a **REAL WEATHER EVENT**.
3. **Sensor Health & Trust Index ($0 - 100\%$):** Real-time reliability rating for each parameter and station.
4. **Virtual Sensor Imputation:** Replaces poisoned readings using Inverse-Distance Weighted (IDW) spatial interpolation so downstream forecasting systems are never fed null or corrupt values.
5. **Interactive AI Copilot (AURA AI):** Embedded meteorological assistant that answers operator questions, explains why readings were flagged, and prescribes maintenance SOPs.
6. **Department Ingestion Studio:** Supports live API ingestion, interactive fault injection (55°C heat spike, frozen ADC, comms packet dropout, calibration drift, severe storm), and drag-and-drop CSV batch quality audits with one-click report export.

---

## 🚀 Quick Start (Local Run)

No Node.js or npm dependencies required! Everything runs on modern standards-compliant ES modules:

```bash
# Clone the repository
git clone https://github.com/yash2006kr/SIH_26.git
cd SIH_26

# Start local server (Python 3)
python -m http.server 8080
```

Open your browser at: **`http://localhost:8080`**

---

## 🌐 Deploy to Render (Static Site)

1. Sign in to your [Render Dashboard](https://render.com).
2. Click **New → Static Site**.
3. Connect your GitHub repository: **`yash2006kr/SIH_26`**, branch: **`main`**.
4. Configure:
   - **Build Command:** `echo "ready"`
   - **Publish Directory:** `.`
5. Click **Create Static Site**.

---

## 📊 Evaluation & Demo Features

- **Dashboard:** Real-time KPI telemetry, mini interactive spatial map, Explainable AI inspector, and live alert feed.
- **Spatial AWS Map:** Full-screen interactive Leaflet map covering 15+ Indian cities across all agro-climatic zones with buddy correlation links.
- **Telemetry & Imputation:** Multi-parameter tracking charts, rolling anomaly confidence, and Raw vs Virtual Sensor reconstructed comparison.
- **Simulation Lab:** Single-click fault injections for 55°C spikes, frozen hygrometers, barometric drops, and coordinated regional thunderstorms.
- **Department CSV Auditor:** Drag & drop any weather telemetry CSV to run batch anomaly scoring, view summary metrics, and export audited CSVs.
- **Sensor Health Matrix:** Component-level diagnostic cards for Thermistor, Hygrometer, Barometer, Anemometer, Rain Gauge, and ESP32 modem.
- **AI Weather Copilot:** Conversational AI drawer providing explainable insights and disaster management briefings.

---

## 👥 Team AI Avengers
- **Smart India Hackathon 2026**
- **Problem Statement:** 26073 (Anomaly detection for weather stations)
- **Category:** Software / Disaster Management
