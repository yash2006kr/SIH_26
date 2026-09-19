/**
 * AURA SkyGuard AI - Master Application Controller
 * Smart India Hackathon 2026 - Problem 26073
 * Team AI Avengers
 */

import { STATIONS, getStationById } from "./stations.js";
import { WeatherSimulator } from "./simulator.js";
import { AiCopilot } from "./ai-copilot.js";
import { DepartmentDataIngest } from "./data-ingest.js";

// Global instances
let simulator;
let copilot;
let deptIngest;

// Chart references
let tempDewChart = null;
let multiParamChart = null;
let imputedCompareChart = null;
let buddyCompareChart = null;

// Leaflet map references
let miniMap = null;
let fullMap = null;
let miniMarkers = {};
let fullMarkers = {};
let fullPolylines = [];
let miniPolylines = [];

// DOM ready initialization
document.addEventListener("DOMContentLoaded", () => {
  copilot = new AiCopilot();
  deptIngest = new DepartmentDataIngest();

  initNavigation();
  initTheme();
  initStationPickers();
  initCopilotUI();
  initSimulationButtons();
  initBatchCsvUI();
  initMaps();
  initCharts();

  // Initialize and start Simulator
  simulator = new WeatherSimulator((state) => {
    updateUI(state);
  });

  simulator.start();

  // Top stream controls
  document.getElementById("pauseStreamBtn")?.addEventListener("click", () => {
    const running = simulator.togglePause();
    const icon = document.getElementById("pauseIcon");
    const statusText = document.getElementById("streamStatusText");
    if (icon) icon.textContent = running ? "⏸️" : "▶️";
    if (statusText) statusText.textContent = running ? "LIVE INGESTION" : "STREAM PAUSED";
  });

  document.getElementById("streamSourceSelect")?.addEventListener("change", (e) => {
    const val = e.target.value;
    simulator.useLiveMeteo = val === "meteo";
    showToast(`Ingestion stream switched to: ${val === "meteo" ? "Live Open-Meteo API" : "Dept Telemetry Stream"}`);
  });

  document.getElementById("printReportBtn")?.addEventListener("click", () => {
    window.print();
  });
});

/* ----------------------------------------------------
   NAVIGATION VIEW SWITCHING
   ---------------------------------------------------- */
function initNavigation() {
  const navItems = document.querySelectorAll(".nav-item");
  const views = document.querySelectorAll(".view-content");
  const titleText = document.getElementById("pageTitleText");

  const viewTitles = {
    dashboard: "Network Command Center",
    mapview: "Spatial AWS Network & Buddy Map",
    analytics: "Multi-Sensor Telemetry & Imputation Analytics",
    simulation: "Department Ingest & Simulation Lab",
    health: "Hardware Sensor Health & Predictive SOP",
    audit: "Disaster Management QC Audit & Reports"
  };

  navItems.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetView = btn.getAttribute("data-view");
      navItems.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      views.forEach((v) => {
        v.classList.remove("active");
        if (v.id === `view-${targetView}`) {
          v.classList.add("active");
        }
      });

      if (titleText && viewTitles[targetView]) {
        titleText.textContent = viewTitles[targetView];
      }

      // Invalidate map sizes if map views become visible
      setTimeout(() => {
        if (miniMap) miniMap.invalidateSize();
        if (fullMap) fullMap.invalidateSize();
      }, 150);
    });
  });
}

/* ----------------------------------------------------
   THEME TOGGLING (DARK / LIGHT)
   ---------------------------------------------------- */
function initTheme() {
  const toggleBtn = document.getElementById("themeToggleBtn");
  const themeIcon = document.getElementById("themeIcon");
  const savedTheme = localStorage.getItem("skyguard_theme") || "dark";

  document.documentElement.setAttribute("data-theme", savedTheme);
  if (themeIcon) themeIcon.textContent = savedTheme === "dark" ? "☀️" : "🌙";

  toggleBtn?.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("skyguard_theme", next);
    if (themeIcon) themeIcon.textContent = next === "dark" ? "☀️" : "🌙";

    // Update map tile layers
    updateMapTiles(next);
  });
}

/* ----------------------------------------------------
   STATION SELECTORS
   ---------------------------------------------------- */
function initStationPickers() {
  const mainSelect = document.getElementById("stationSelect");
  const compareSelect = document.getElementById("compareStationSelect");

  if (!mainSelect) return;

  mainSelect.innerHTML = "";
  if (compareSelect) compareSelect.innerHTML = "";

  for (const st of STATIONS) {
    const opt = document.createElement("option");
    opt.value = st.id;
    opt.textContent = `${st.name} (${st.state})`;
    mainSelect.appendChild(opt);

    if (compareSelect) {
      const opt2 = document.createElement("option");
      opt2.value = st.id;
      opt2.textContent = `${st.name} (${st.state})`;
      if (st.id === "BLR-AP") opt2.selected = true;
      compareSelect.appendChild(opt2);
    }
  }

  mainSelect.value = "BLR-IMD";

  mainSelect.addEventListener("change", (e) => {
    simulator.selectStation(e.target.value);
    recenterMaps(e.target.value);
  });

  compareSelect?.addEventListener("change", (e) => {
    simulator.setCompareStation(e.target.value);
  });
}

/* ----------------------------------------------------
   LEAFLET MAPS
   ---------------------------------------------------- */
function getMapTileUrl(theme) {
  return theme === "light"
    ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
}

let miniTileLayer = null;
let fullTileLayer = null;

function initMaps() {
  const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
  const tileUrl = getMapTileUrl(currentTheme);

  // Mini Map (Dashboard)
  const miniEl = document.getElementById("miniLeafletMap");
  if (miniEl) {
    miniMap = L.map("miniLeafletMap", {
      center: [12.9716, 77.5946],
      zoom: 7,
      zoomControl: false,
      attributionControl: false
    });

    miniTileLayer = L.tileLayer(tileUrl, { maxZoom: 18 }).addTo(miniMap);
  }

  // Full Network Map
  const fullEl = document.getElementById("fullLeafletMap");
  if (fullEl) {
    fullMap = L.map("fullLeafletMap", {
      center: [20.5937, 78.9629], // Center of India
      zoom: 5,
      zoomControl: true,
      attributionControl: false
    });

    fullTileLayer = L.tileLayer(tileUrl, { maxZoom: 18 }).addTo(fullMap);
  }

  renderStationMarkers();
}

function updateMapTiles(theme) {
  const tileUrl = getMapTileUrl(theme);
  if (miniTileLayer && miniMap) {
    miniMap.removeLayer(miniTileLayer);
    miniTileLayer = L.tileLayer(tileUrl, { maxZoom: 18 }).addTo(miniMap);
  }
  if (fullTileLayer && fullMap) {
    fullMap.removeLayer(fullTileLayer);
    fullTileLayer = L.tileLayer(tileUrl, { maxZoom: 18 }).addTo(fullMap);
  }
}

function getStatusColor(status) {
  if (status === "FAULT") return "#f43f5e"; // Rose / Red
  if (status === "EVENT") return "#a855f7"; // Purple
  if (status === "WATCH") return "#f59e0b"; // Amber
  return "#10b981"; // Teal / Green
}

function renderStationMarkers() {
  if (!miniMap && !fullMap) return;

  // Clear existing polylines
  fullPolylines.forEach((p) => fullMap && fullMap.removeLayer(p));
  miniPolylines.forEach((p) => miniMap && miniMap.removeLayer(p));
  fullPolylines = [];
  miniPolylines = [];

  // Draw buddy connection lines
  for (const st of STATIONS) {
    if (st.neighbors) {
      for (const nid of st.neighbors) {
        const neighbor = getStationById(nid);
        if (neighbor) {
          const latlngs = [
            [st.lat, st.lng],
            [neighbor.lat, neighbor.lng]
          ];
          if (fullMap) {
            const line = L.polyline(latlngs, {
              color: "rgba(56, 189, 248, 0.4)",
              weight: 1.5,
              dashArray: "4, 6"
            }).addTo(fullMap);
            fullPolylines.push(line);
          }
          if (miniMap) {
            const line = L.polyline(latlngs, {
              color: "rgba(56, 189, 248, 0.35)",
              weight: 1.2,
              dashArray: "3, 5"
            }).addTo(miniMap);
            miniPolylines.push(line);
          }
        }
      }
    }
  }

  // Draw Station Markers
  for (const st of STATIONS) {
    const analysis = simulator?.stations?.[st.id]?.analysis;
    const status = analysis?.status || "NORMAL";
    const color = getStatusColor(status);

    const markerOptions = {
      radius: st.id === simulator?.selectedStationId ? 10 : 7,
      fillColor: color,
      color: "#ffffff",
      weight: 2,
      opacity: 0.9,
      fillOpacity: 0.85
    };

    // Mini Map marker
    if (miniMap) {
      if (!miniMarkers[st.id]) {
        miniMarkers[st.id] = L.circleMarker([st.lat, st.lng], markerOptions).addTo(miniMap);
        miniMarkers[st.id].on("click", () => {
          document.getElementById("stationSelect").value = st.id;
          simulator.selectStation(st.id);
          recenterMaps(st.id);
        });
      } else {
        miniMarkers[st.id].setStyle(markerOptions);
      }
      miniMarkers[st.id].bindTooltip(`<b>${st.name}</b><br/>Status: ${status}`, { direction: "top" });
    }

    // Full Map marker
    if (fullMap) {
      if (!fullMarkers[st.id]) {
        fullMarkers[st.id] = L.circleMarker([st.lat, st.lng], markerOptions).addTo(fullMap);
        fullMarkers[st.id].on("click", () => {
          document.getElementById("stationSelect").value = st.id;
          simulator.selectStation(st.id);
          recenterMaps(st.id);
        });
      } else {
        fullMarkers[st.id].setStyle(markerOptions);
      }
      fullMarkers[st.id].bindPopup(`
        <div style="font-family: sans-serif; font-size: 13px; min-width: 180px;">
          <strong style="color: #0284c7;">${st.name}</strong><br/>
          <span>State: ${st.state} (Elev: ${st.elevation}m)</span><br/>
          <span style="font-weight: 600; color: ${color};">Status: ${status}</span><br/>
          <span>Trust Index: <b>${analysis?.trustIndex || 98}%</b></span><br/>
          <small style="color: #64748b;">Click to set as active station</small>
        </div>
      `);
    }
  }
}

function recenterMaps(stationId) {
  const st = getStationById(stationId);
  if (!st) return;
  if (miniMap) miniMap.setView([st.lat, st.lng], 8, { animate: true });
}

/* ----------------------------------------------------
   CHARTS INITIALIZATION & UPDATES
   ---------------------------------------------------- */
function initCharts() {
  const chartFont = { family: "'Inter', sans-serif", size: 11 };

  // 1. Temperature & Dew Point Chart
  const ctx1 = document.getElementById("tempDewChart")?.getContext("2d");
  if (ctx1) {
    tempDewChart = new Chart(ctx1, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Air Temperature (°C)",
            borderColor: "#0ea5e9",
            backgroundColor: "rgba(14, 165, 233, 0.12)",
            borderWidth: 2,
            tension: 0.3,
            fill: true,
            data: []
          },
          {
            label: "Dew Point (°C)",
            borderColor: "#10b981",
            borderDash: [4, 4],
            borderWidth: 1.5,
            tension: 0.3,
            fill: false,
            data: []
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: "#94a3b8", font: chartFont } }
        },
        scales: {
          x: { ticks: { color: "#64748b", font: chartFont }, grid: { color: "rgba(255, 255, 255, 0.05)" } },
          y: { ticks: { color: "#64748b", font: chartFont }, grid: { color: "rgba(255, 255, 255, 0.05)" } }
        }
      }
    });
  }

  // 2. Multivariate Parameter Chart
  const ctx2 = document.getElementById("multiParamChart")?.getContext("2d");
  if (ctx2) {
    multiParamChart = new Chart(ctx2, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          { label: "Temp (°C)", borderColor: "#0ea5e9", borderWidth: 2, data: [], yAxisID: "y" },
          { label: "Humidity (%)", borderColor: "#10b981", borderWidth: 2, data: [], yAxisID: "y1" },
          { label: "Pressure (hPa)", borderColor: "#f59e0b", borderWidth: 2, data: [], yAxisID: "y2" },
          { label: "Wind (km/h)", borderColor: "#a855f7", borderWidth: 1.5, data: [], yAxisID: "y" }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: "#94a3b8", font: chartFont } } },
        scales: {
          x: { ticks: { color: "#64748b" }, grid: { color: "rgba(255, 255, 255, 0.05)" } },
          y: { type: "linear", position: "left", ticks: { color: "#0ea5e9" } },
          y1: { type: "linear", position: "right", ticks: { color: "#10b981" }, grid: { drawOnChartArea: false } },
          y2: { type: "linear", position: "right", ticks: { color: "#f59e0b" }, grid: { drawOnChartArea: false } }
        }
      }
    });
  }

  // 3. Raw vs Imputed Comparison Chart
  const ctx3 = document.getElementById("imputedCompareChart")?.getContext("2d");
  if (ctx3) {
    imputedCompareChart = new Chart(ctx3, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          { label: "Raw Sensor Reading", borderColor: "#f43f5e", borderWidth: 2, tension: 0.2, data: [] },
          { label: "AI Virtual Sensor Imputed", borderColor: "#10b981", borderDash: [5, 5], borderWidth: 2, tension: 0.2, data: [] }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: "#94a3b8", font: chartFont } } },
        scales: {
          x: { ticks: { color: "#64748b" }, grid: { color: "rgba(255, 255, 255, 0.05)" } },
          y: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(255, 255, 255, 0.05)" } }
        }
      }
    });
  }

  // 4. Peer Buddy Station Comparison
  const ctx4 = document.getElementById("buddyCompareChart")?.getContext("2d");
  if (ctx4) {
    buddyCompareChart = new Chart(ctx4, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          { label: "Active Station (Temp °C)", borderColor: "#0ea5e9", borderWidth: 2, data: [] },
          { label: "Buddy Station (Temp °C)", borderColor: "#f59e0b", borderDash: [4, 4], borderWidth: 2, data: [] }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: "#94a3b8", font: chartFont } } },
        scales: {
          x: { ticks: { color: "#64748b" }, grid: { color: "rgba(255, 255, 255, 0.05)" } },
          y: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(255, 255, 255, 0.05)" } }
        }
      }
    });
  }
}

function updateCharts(activeStation, compareStation) {
  if (!activeStation || !activeStation.history) return;

  const history = activeStation.history.slice(-30);
  const labels = history.map((h, i) => {
    const d = new Date(h.ts);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  });

  // 1. Temp & Dew Point
  if (tempDewChart) {
    tempDewChart.data.labels = labels;
    tempDewChart.data.datasets[0].data = history.map((h) => h.t);
    tempDewChart.data.datasets[1].data = history.map((h) => {
      // Magnus formula approximation for history
      const a = 17.27, b = 237.7;
      const alpha = ((a * h.t) / (b + h.t)) + Math.log(Math.max(1, h.h) / 100);
      return Number(((b * alpha) / (a - alpha)).toFixed(1));
    });
    tempDewChart.update("none");
  }

  // 2. Multivariate
  if (multiParamChart) {
    multiParamChart.data.labels = labels;
    multiParamChart.data.datasets[0].data = history.map((h) => h.t);
    multiParamChart.data.datasets[1].data = history.map((h) => h.h);
    multiParamChart.data.datasets[2].data = history.map((h) => h.p);
    multiParamChart.data.datasets[3].data = history.map((h) => h.wind);
    multiParamChart.update("none");
  }

  // 3. Imputed Comparison
  if (imputedCompareChart) {
    imputedCompareChart.data.labels = labels;
    imputedCompareChart.data.datasets[0].data = history.map((h) => h.t);
    imputedCompareChart.data.datasets[1].data = history.map((h, idx) => {
      // If it's the latest point and faulty, show imputed value
      if (idx === history.length - 1 && activeStation.analysis?.status === "FAULT") {
        return activeStation.analysis.imputed.t;
      }
      return h.t;
    });
    imputedCompareChart.update("none");
  }

  // 4. Buddy Compare
  if (buddyCompareChart && compareStation) {
    const buddyHistory = compareStation.history.slice(-30);
    buddyCompareChart.data.labels = labels;
    buddyCompareChart.data.datasets[0].data = history.map((h) => h.t);
    buddyCompareChart.data.datasets[1].data = buddyHistory.map((h) => h.t);
    buddyCompareChart.update("none");
  }
}

/* ----------------------------------------------------
   UI UPDATER (DRIVEN BY SIMULATOR TICK)
   ---------------------------------------------------- */
function updateUI(state) {
  const st = state.selectedStation;
  if (!st || !st.latest) return;

  const cur = st.latest;
  const analysis = st.analysis || {};

  // Topbar Trust Gauge
  const topTrust = document.getElementById("topTrustVal");
  if (topTrust) {
    topTrust.textContent = `${state.networkTrust}%`;
    topTrust.style.color = state.networkTrust > 85 ? "var(--c-teal)" : state.networkTrust > 65 ? "var(--c-amber)" : "var(--c-rose)";
  }

  // KPI Cards
  const kpiTemp = document.getElementById("kpiTemp");
  const kpiHumidity = document.getElementById("kpiHumidity");
  const kpiPressure = document.getElementById("kpiPressure");
  const kpiTrustIndex = document.getElementById("kpiTrustIndex");
  const kpiDewPoint = document.getElementById("kpiDewPoint");
  const kpiQcFlag = document.getElementById("kpiQcFlag");
  const kpiQcChip = document.getElementById("kpiQcChip");

  if (kpiTemp) kpiTemp.textContent = cur.t.toFixed(1);
  if (kpiHumidity) kpiHumidity.textContent = cur.h;
  if (kpiPressure) kpiPressure.textContent = cur.p.toFixed(1);
  if (kpiDewPoint) kpiDewPoint.textContent = `${analysis.dewPoint || "--"}°C`;
  if (kpiQcFlag) kpiQcFlag.textContent = analysis.qcFlag || "G";

  if (kpiTrustIndex) {
    kpiTrustIndex.textContent = `${analysis.trustIndex || 98}%`;
    const color = analysis.trustIndex > 85 ? "var(--c-teal)" : analysis.trustIndex > 65 ? "var(--c-amber)" : "var(--c-rose)";
    kpiTrustIndex.style.color = color;
  }

  if (kpiQcChip) {
    if (analysis.status === "FAULT") {
      kpiQcChip.className = "kpi-chip chip-fault";
      kpiQcChip.textContent = "Suspect (Fault)";
    } else if (analysis.status === "EVENT") {
      kpiQcChip.className = "kpi-chip chip-event";
      kpiQcChip.textContent = "Extreme Weather";
    } else if (analysis.status === "WATCH") {
      kpiQcChip.className = "kpi-chip chip-watch";
      kpiQcChip.textContent = "Surveillance";
    } else {
      kpiQcChip.className = "kpi-chip chip-normal";
      kpiQcChip.textContent = "Validated Good";
    }
  }

  // Explainable AI (XAI) Box
  const xaiBadge = document.getElementById("xaiStatusBadge");
  const faultVal = document.getElementById("meterFaultVal");
  const faultBar = document.getElementById("meterFaultBar");
  const eventVal = document.getElementById("meterEventVal");
  const eventBar = document.getElementById("meterEventBar");
  const reasonsList = document.getElementById("xaiReasonsList");
  const imputeText = document.getElementById("imputeText");

  if (xaiBadge) {
    if (analysis.status === "FAULT") {
      xaiBadge.className = "status-badge-lg chip-fault";
      xaiBadge.textContent = `🚨 SENSOR FAULT (${analysis.severity})`;
    } else if (analysis.status === "EVENT") {
      xaiBadge.className = "status-badge-lg chip-event";
      xaiBadge.textContent = "🌪️ REAL WEATHER EVENT";
    } else if (analysis.status === "WATCH") {
      xaiBadge.className = "status-badge-lg chip-watch";
      xaiBadge.textContent = "🟡 WATCH (DEGRADED)";
    } else {
      xaiBadge.className = "status-badge-lg chip-normal";
      xaiBadge.textContent = "🟢 NOMINAL OBSERVATION";
    }
  }

  if (faultVal) faultVal.textContent = `${analysis.pFault || 2}%`;
  if (faultBar) faultBar.style.width = `${analysis.pFault || 2}%`;
  if (eventVal) eventVal.textContent = `${analysis.pEvent || 1}%`;
  if (eventBar) eventBar.style.width = `${analysis.pEvent || 1}%`;

  if (reasonsList && analysis.explanations) {
    reasonsList.innerHTML = "";
    analysis.explanations.forEach((exp) => {
      const li = document.createElement("li");
      li.textContent = exp;
      if (analysis.status === "FAULT") li.className = "crit";
      else if (analysis.status === "EVENT") li.className = "event";
      else if (analysis.status === "WATCH") li.className = "warn";
      reasonsList.appendChild(li);
    });
  }

  if (imputeText) {
    if (analysis.status === "FAULT" && analysis.imputed) {
      imputeText.innerHTML = `⚠️ <b>Raw reading quarantined!</b> Virtual Sensor reconstructed value: <span style="color: var(--c-teal); font-weight: 700;">${analysis.imputed.t}°C</span> (RH: ${analysis.imputed.h}%, P: ${analysis.imputed.p} hPa). Injected into NWP pipeline via <i>${analysis.imputed.method}</i>.`;
    } else {
      imputeText.textContent = "Data stream is healthy; raw sensor readings directly ingested into NWP models.";
    }
  }

  // Update Recent Alerts Table
  updateAlertsFeed(state.alerts);

  // Update Charts
  updateCharts(st, state.compareStation);

  // Update Map Markers
  renderStationMarkers();

  // Update Sensor Health Matrix view
  renderSensorHealthMatrix(st);

  // Update Official Audit Prose Content
  renderAuditReportProse(state);
}

function updateAlertsFeed(alerts) {
  const tbody = document.getElementById("dashAlertsTableBody");
  if (!tbody) return;

  if (!alerts || alerts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 20px;">No active alerts. Network is operating nominally.</td></tr>`;
    return;
  }

  tbody.innerHTML = alerts.slice(0, 8).map((a) => {
    const chipClass = a.status === "FAULT" ? "chip-fault" : a.status === "EVENT" ? "chip-event" : "chip-watch";
    return `
      <tr>
        <td style="font-family: var(--font-mono); font-size: 11.5px;">${a.time}</td>
        <td><strong>${a.stationId}</strong></td>
        <td><span class="kpi-chip ${chipClass}">${a.status}</span></td>
        <td>${a.severity}</td>
        <td style="max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${a.rootCause}">${a.rootCause}</td>
      </tr>
    `;
  }).join("");
}

/* ----------------------------------------------------
   SENSOR HEALTH MATRIX
   ---------------------------------------------------- */
function renderSensorHealthMatrix(station) {
  const grid = document.getElementById("sensorHealthGrid");
  const title = document.getElementById("healthStationTitle");
  if (!grid || !station) return;

  if (title) title.textContent = `${station.name} (${station.id})`;

  const sensors = station.hardware?.sensors || {};
  const healthScores = station.analysis?.sensorHealth || { temp: 98, humidity: 96, pressure: 99, wind: 95, comms: 99 };

  const sensorList = [
    { key: "temp", name: "Temperature RTD Transducer", model: sensors.temp?.model || "PT100 Class A", score: healthScores.temp, cal: sensors.temp?.lastCalibrated || "2026-01-15" },
    { key: "humidity", name: "Capacitive Thin-Film Hygrometer", model: sensors.humidity?.model || "Rotronic Polymer", score: healthScores.humidity, cal: sensors.humidity?.lastCalibrated || "2026-01-15" },
    { key: "pressure", name: "Resonant Barometric Sensor", model: sensors.pressure?.model || "Vaisala PTB110", score: healthScores.pressure, cal: sensors.pressure?.lastCalibrated || "2025-11-20" },
    { key: "wind", name: "Ultrasonic 2D Anemometer", model: sensors.wind?.model || "Gill WindSonic", score: healthScores.wind, cal: sensors.wind?.lastCalibrated || "2025-12-10" },
    { key: "comms", name: "ESP32 Modem & Uplink Watchdog", model: station.hardware?.controller || "ESP32-S3 Dual-Core", score: healthScores.comms, cal: "Firmware v4.2.0" },
    { key: "rain", name: "Tipping Bucket Precipitation Gauge", model: sensors.rain?.model || "ARG-200 0.2mm", score: sensors.rain?.health || 97, cal: sensors.rain?.lastCalibrated || "2026-02-01" }
  ];

  grid.innerHTML = sensorList.map((s) => {
    const cardClass = s.score < 50 ? "sensor-card faulty" : s.score < 80 ? "sensor-card degraded" : "sensor-card";
    const scoreColor = s.score < 50 ? "var(--c-rose)" : s.score < 80 ? "var(--c-amber)" : "var(--c-teal)";
    return `
      <div class="card ${cardClass}">
        <div class="sensor-card-top">
          <div>
            <div class="sensor-name">${s.name}</div>
            <div class="sensor-model">${s.model}</div>
          </div>
          <div class="sensor-score-ring" style="color: ${scoreColor};">${s.score}%</div>
        </div>
        <div class="progress-track" style="margin-bottom: 8px;">
          <div class="progress-fill" style="width: ${s.score}%; background: ${scoreColor};"></div>
        </div>
        <div class="sensor-meta-row">
          <span>Calibration: <b>${s.cal}</b></span>
          <span>Status: <b>${s.score >= 80 ? "Certified" : s.score >= 50 ? "Maintenance Due" : "Critical Failure"}</b></span>
        </div>
      </div>
    `;
  }).join("");
}

/* ----------------------------------------------------
   QC AUDIT REPORT PROSE
   ---------------------------------------------------- */
function renderAuditReportProse(state) {
  const container = document.getElementById("auditProseContent");
  if (!container) return;

  const st = state.selectedStation;
  const analysis = st?.analysis;

  container.innerHTML = `
    <h3 style="color: var(--text-primary); margin-bottom: 8px;">Executive Summary for Disaster Management & Forecast Integration</h3>
    <p>
      This audit certify the data trust posture of the India Meteorological Department (IMD) Automatic Weather Station network.
      Under <b>SIH 2026 Problem Statement 26073</b>, all surface observation vectors (Temperature, Humidity, Pressure, Wind, Rainfall)
      are dynamically audited via thermodynamic physics models and spatial consensus algorithms.
    </p>

    <div style="background: rgba(0,0,0,0.15); padding: 14px; border-radius: var(--radius-md); margin: 14px 0; border: 1px solid var(--border-subtle);">
      <strong>Active Node:</strong> ${st?.name} (${st?.id}) | <strong>Network Reliability Index:</strong> ${state.networkTrust}%<br/>
      <strong>Current Observation QC Flag:</strong> <code>Flag ${analysis?.qcFlag || "G"}</code> (${analysis?.eventClassification || "Nominal"})<br/>
      <strong>Virtual Sensor Imputation Engine:</strong> ${analysis?.status === "FAULT" ? "Active (Reconstructed Values Substituted)" : "Standby (Direct Feed Verified)"}
    </div>

    <h4 style="color: var(--text-primary); margin-top: 14px; margin-bottom: 6px;">Compliance Directives:</h4>
    <ul style="padding-left: 20px; line-height: 1.6;">
      <li><b>WMO-No. 8 Standard:</b> Sensor sampling frequency validated at 10-second intervals with rolling median envelope.</li>
      <li><b>Real Storm Verification:</b> Correlated barometric depression and spatial buddy consensus confirm severe weather without generating false instrument failure alarms.</li>
      <li><b>Data Poisoning Prevention:</b> All sensors with Trust Index &lt; 60% are automatically quarantined from NWP ingestion.</li>
    </ul>
  `;
}

/* ----------------------------------------------------
   FAULT INJECTION BUTTONS
   ---------------------------------------------------- */
function initSimulationButtons() {
  const buttons = [
    { id: "btnInjectSpike", fn: () => simulator.injectSpike(), msg: "Injected 55°C isolated heat spike (Hardware Fault)" },
    { id: "btnFreezeSensor", fn: () => simulator.freezeSensor(), msg: "Injected frozen sensor signal (Stuck ADC lock)" },
    { id: "btnInjectPressure", fn: () => simulator.injectPressureDrop(), msg: "Injected -14 hPa barometric drop without weather corroboration" },
    { id: "btnInjectComms", fn: () => simulator.injectCommsDropout(), msg: "Simulated ESP32 uplink telemetry packet dropout" },
    { id: "btnInjectDrift", fn: () => simulator.injectDrift(), msg: "Injected progressive thermal calibration drift" },
    { id: "btnSimulateStorm", fn: () => simulator.simulateStorm(), msg: "🌪️ Simulated Severe Regional Thunderstorm (Real Weather Event across peer stations!)" },
    { id: "btnClearFaults", fn: () => simulator.clearScenario(), msg: "Cleared all active fault scenarios. Network restored to nominal." }
  ];

  buttons.forEach((b) => {
    const el = document.getElementById(b.id);
    el?.addEventListener("click", () => {
      b.fn();
      showToast(b.msg, b.id === "btnSimulateStorm" ? "event" : b.id === "btnClearFaults" ? "normal" : "fault");
    });
  });
}

/* ----------------------------------------------------
   BATCH CSV AUDIT STUDIO
   ---------------------------------------------------- */
function initBatchCsvUI() {
  const dropzone = document.getElementById("csvDropzone");
  const fileInput = document.getElementById("csvFileInput");
  const sampleBtn = document.getElementById("loadSampleCsvBtn");
  const exportBtn = document.getElementById("exportAuditedCsvBtn");

  dropzone?.addEventListener("click", () => fileInput?.click());

  dropzone?.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  });

  dropzone?.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));

  dropzone?.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
    if (e.dataTransfer.files.length > 0) {
      handleCsvFile(e.dataTransfer.files[0]);
    }
  });

  fileInput?.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      handleCsvFile(e.target.files[0]);
    }
  });

  sampleBtn?.addEventListener("click", () => {
    const sampleCsv = deptIngest.generateSampleDepartmentCSV();
    runBatchCsvAudit(sampleCsv);
    showToast("Loaded sample department weather log with 40 records & injected anomalies.");
  });

  exportBtn?.addEventListener("click", () => {
    const csvContent = deptIngest.exportAuditedCSV();
    if (!csvContent) return;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `audited_weather_telemetry_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Audited CSV downloaded successfully!");
  });
}

function handleCsvFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      runBatchCsvAudit(e.target.result);
      showToast(`Analyzed ${file.name} successfully!`);
    } catch (err) {
      alert("Error parsing CSV: " + err.message);
    }
  };
  reader.readAsText(file);
}

function runBatchCsvAudit(csvText) {
  const results = deptIngest.processCSV(csvText);
  const area = document.getElementById("batchSummaryArea");
  const exportBtn = document.getElementById("exportAuditedCsvBtn");
  if (area) area.style.display = "block";
  if (exportBtn) exportBtn.style.display = "inline-flex";

  document.getElementById("batchTotalRows").textContent = results.totalRows;
  document.getElementById("batchNormalCount").textContent = results.normalCount;
  document.getElementById("batchFaultCount").textContent = results.faultCount;
  document.getElementById("batchEventCount").textContent = results.eventCount;
  document.getElementById("batchMeanTrust").textContent = `${results.averageTrustIndex}%`;

  const tbody = document.getElementById("batchTableBody");
  if (tbody) {
    tbody.innerHTML = results.records.map((r) => {
      const a = r.analysis;
      const chipClass = a.status === "FAULT" ? "chip-fault" : a.status === "EVENT" ? "chip-event" : "chip-normal";
      return `
        <tr>
          <td>${r.row}</td>
          <td style="font-family: var(--font-mono); font-size: 11px;">${new Date(r.timestamp).toLocaleTimeString()}</td>
          <td><strong>${r.stationId}</strong></td>
          <td>${r.raw.t}°C</td>
          <td>${r.raw.h}%</td>
          <td>${r.raw.p} hPa</td>
          <td><span class="kpi-chip ${chipClass}">${a.status}</span></td>
          <td><b>${a.qcFlag}</b></td>
          <td style="font-size: 11.5px;">${a.eventClassification}</td>
          <td style="color: var(--c-teal); font-weight: 600;">${a.imputed.t}°C</td>
        </tr>
      `;
    }).join("");
  }
}

/* ----------------------------------------------------
   AI COPILOT UI CONTROLS
   ---------------------------------------------------- */
function initCopilotUI() {
  const drawer = document.getElementById("copilotDrawer");
  const overlay = document.getElementById("copilotOverlay");
  const openBtn = document.getElementById("openCopilotBtn");
  const closeBtn = document.getElementById("closeCopilotBtn");
  const form = document.getElementById("copilotForm");
  const input = document.getElementById("copilotInput");
  const msgContainer = document.getElementById("copilotMessages");
  const suggestionsContainer = document.getElementById("copilotSuggestions");

  function openDrawer() {
    drawer?.classList.add("open");
    overlay?.classList.add("open");
    renderCopilotMessages();
    renderCopilotSuggestions();
    input?.focus();
  }

  function closeDrawer() {
    drawer?.classList.remove("open");
    overlay?.classList.remove("open");
  }

  openBtn?.addEventListener("click", openDrawer);
  closeBtn?.addEventListener("click", closeDrawer);
  overlay?.addEventListener("click", closeDrawer);

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    input.value = "";
    sendCopilotQuery(q);
  });

  function renderCopilotSuggestions() {
    if (!suggestionsContainer) return;
    suggestionsContainer.innerHTML = "";
    copilot.getSuggestedPrompts().forEach((p) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "suggestion-chip";
      chip.textContent = p;
      chip.addEventListener("click", () => {
        sendCopilotQuery(p);
      });
      suggestionsContainer.appendChild(chip);
    });
  }

  function renderCopilotMessages() {
    if (!msgContainer) return;
    msgContainer.innerHTML = copilot.messages.map((m) => {
      // Basic markdown parsing for bold, code, bullets, headers
      let formatted = m.text
        .replace(/^### (.*$)/gim, '<h4 style="color: #38bdf8; margin: 8px 0 4px 0;">$1</h4>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code style="background: rgba(0,0,0,0.3); padding: 1px 5px; border-radius: 4px; font-family: monospace;">$1</code>')
        .replace(/\n\n/g, '<br/><br/>')
        .replace(/\n/g, '<br/>');

      return `
        <div class="chat-bubble ${m.sender}">
          <div>${formatted}</div>
          <div style="font-size: 10px; opacity: 0.6; text-align: right; margin-top: 4px;">${m.time}</div>
        </div>
      `;
    }).join("");

    msgContainer.scrollTop = msgContainer.scrollHeight;
  }

  function sendCopilotQuery(text) {
    const context = {
      selectedStation: simulator?.stations?.[simulator?.selectedStationId],
      networkTrust: simulator?.calculateNetworkTrust(),
      stations: simulator?.stations
    };

    copilot.processUserQuery(text, context);
    renderCopilotMessages();
  }
}

/* ----------------------------------------------------
   TOAST NOTIFICATIONS
   ---------------------------------------------------- */
function showToast(message, type = "normal") {
  const container = document.getElementById("toastsContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === "fault" ? "🚨" : type === "event" ? "🌪️" : "ℹ️"}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
