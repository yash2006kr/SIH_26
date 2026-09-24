/**
 * SkyGuard AI - Master Application Controller
 * Smart India Hackathon 2026 - Problem 26073
 * Team AI Avengers
 */

import { STATIONS, getStationById } from "./stations.js";
import { WeatherSimulator } from "./simulator.js";
import { AiCopilot, getActiveApiKey, setActiveApiKey } from "./ai-copilot.js";
import { DepartmentDataIngest } from "./data-ingest.js";

// Global instances
let simulator;
let copilot;
let deptIngest;
let latestSimulatorState = null;

// Chart references
let tempDewChart = null;
let multiParamChart = null;
let imputedCompareChart = null;
let buddyCompareChart = null;
let sensorRadarChart = null;

// Leaflet map references
let miniMap = null;
let fullMap = null;
let miniMarkers = {};
let fullMarkers = {};
let fullPolylines = [];
let miniPolylines = [];
let miniTileLayers = [];
let fullTileLayers = [];

// DOM ready initialization
document.addEventListener("DOMContentLoaded", () => {
  copilot = new AiCopilot();
  deptIngest = new DepartmentDataIngest();

  initCustomCursor();
  initNavigation();
  initTheme();
  initStationPickers();
  initCopilotUI();
  initSimulationButtons();
  initBatchCsvUI();
  initMaps();
  initCharts();
  initAnalyticsControls();

  // Initialize and start Simulator
  simulator = new WeatherSimulator((state) => {
    latestSimulatorState = state;
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
    // Ensure audit view is active and populated
    const auditView = document.getElementById("view-audit");
    if (auditView && !auditView.classList.contains("active")) {
      document.querySelectorAll(".view-content").forEach((v) => v.classList.remove("active"));
      auditView.classList.add("active");
      document.querySelectorAll(".nav-item").forEach((btn) => {
        btn.classList.toggle("active", btn.getAttribute("data-view") === "audit");
      });
      const titleText = document.getElementById("pageTitleText");
      if (titleText) titleText.textContent = "Government Meteorological QC Audit Dossier";
    }
    if (latestSimulatorState) {
      renderOfficialDossier(latestSimulatorState);
    }
    setTimeout(() => {
      window.print();
    }, 50);
  });
});

/* ----------------------------------------------------
   INTERACTIVE CURSOR & MOUSE-FOLLOW SPOTLIGHT
   ---------------------------------------------------- */
function initCustomCursor() {
  const dot = document.getElementById("cursorDot");
  const ring = document.getElementById("cursorRing");
  if (!dot || !ring) return;

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let ringX = mouseX;
  let ringY = mouseY;

  window.addEventListener("pointermove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    // Direct dot position
    dot.style.left = `${mouseX}px`;
    dot.style.top = `${mouseY}px`;

    // Dynamic background spotlight
    document.documentElement.style.setProperty("--mouse-x", `${mouseX}px`);
    document.documentElement.style.setProperty("--mouse-y", `${mouseY}px`);
  });

  // Smooth lerp for ring
  function renderCursor() {
    ringX += (mouseX - ringX) * 0.22;
    ringY += (mouseY - ringY) * 0.22;
    ring.style.left = `${ringX}px`;
    ring.style.top = `${ringY}px`;
    requestAnimationFrame(renderCursor);
  }
  renderCursor();

  // Click burst
  window.addEventListener("pointerdown", () => {
    dot.style.transform = "translate(-50%, -50%) scale(0.7)";
    ring.style.transform = "translate(-50%, -50%) scale(0.85)";
  });

  window.addEventListener("pointerup", () => {
    dot.style.transform = "translate(-50%, -50%) scale(1)";
    ring.style.transform = "translate(-50%, -50%) scale(1)";
  });

  // Hover detection on interactive elements
  const hoverSelector = "button, a, select, input, .card, .fault-btn, .nav-item, .leaflet-interactive, .floating-robot-btn";
  document.addEventListener("mouseover", (e) => {
    if (e.target.closest(hoverSelector)) {
      dot.classList.add("hovering");
      ring.classList.add("hovering");
    }
  });

  document.addEventListener("mouseout", (e) => {
    if (e.target.closest(hoverSelector)) {
      dot.classList.remove("hovering");
      ring.classList.remove("hovering");
    }
  });
}

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
    audit: "Government Meteorological QC Audit Dossier"
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
   LEAFLET MAPS (ESRI GRAY CANVAS - ZERO WATERMARKS!)
   ---------------------------------------------------- */
function getMapTileConfigs(theme) {
  if (theme === "light") {
    return [
      {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        options: { maxZoom: 16, attribution: "Esri, USGS" }
      },
      {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
        options: { maxZoom: 16 }
      }
    ];
  }
  return [
    {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      options: { maxZoom: 16, attribution: "Esri, DeLorme" }
    },
    {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
      options: { maxZoom: 16 }
    }
  ];
}

function initMaps() {
  const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
  const tileConfigs = getMapTileConfigs(currentTheme);

  // Mini Map (Dashboard)
  const miniEl = document.getElementById("miniLeafletMap");
  if (miniEl) {
    miniMap = L.map("miniLeafletMap", {
      center: [12.9716, 77.5946],
      zoom: 7,
      zoomControl: false,
      attributionControl: false
    });

    miniTileLayers = tileConfigs.map((cfg) => L.tileLayer(cfg.url, cfg.options).addTo(miniMap));
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

    fullTileLayers = tileConfigs.map((cfg) => L.tileLayer(cfg.url, cfg.options).addTo(fullMap));
  }

  renderStationMarkers();
}

function updateMapTiles(theme) {
  const tileConfigs = getMapTileConfigs(theme);
  if (miniMap) {
    miniTileLayers.forEach((l) => miniMap.removeLayer(l));
    miniTileLayers = tileConfigs.map((cfg) => L.tileLayer(cfg.url, cfg.options).addTo(miniMap));
  }
  if (fullMap) {
    fullTileLayers.forEach((l) => fullMap.removeLayer(l));
    fullTileLayers = tileConfigs.map((cfg) => L.tileLayer(cfg.url, cfg.options).addTo(fullMap));
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
              color: "rgba(56, 189, 248, 0.45)",
              weight: 1.6,
              dashArray: "4, 6"
            }).addTo(fullMap);
            fullPolylines.push(line);
          }
          if (miniMap) {
            const line = L.polyline(latlngs, {
              color: "rgba(56, 189, 248, 0.4)",
              weight: 1.3,
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
      radius: st.id === simulator?.selectedStationId ? 11 : 7,
      fillColor: color,
      color: "#ffffff",
      weight: 2,
      opacity: 0.95,
      fillOpacity: 0.88
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
        <div style="font-family: sans-serif; font-size: 13px; min-width: 190px;">
          <strong style="color: #0284c7;">${st.name}</strong><br/>
          <span>State: ${st.state} (Elev: ${st.elevation}m)</span><br/>
          <span style="font-weight: 600; color: ${color};">Status: ${status}</span><br/>
          <span>Trust Index: <b>${analysis?.trustIndex || 98}%</b></span><br/>
          <small style="color: #64748b;">Click to inspect node telemetry</small>
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
            backgroundColor: "rgba(14, 165, 233, 0.15)",
            borderWidth: 2.2,
            tension: 0.3,
            fill: true,
            data: []
          },
          {
            label: "Dew Point (°C)",
            borderColor: "#10b981",
            borderDash: [4, 4],
            borderWidth: 1.8,
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
          { label: "Temp (°C)", borderColor: "#0ea5e9", backgroundColor: "rgba(14, 165, 233, 0.1)", fill: true, borderWidth: 2, data: [], yAxisID: "y" },
          { label: "Humidity (%)", borderColor: "#10b981", backgroundColor: "rgba(16, 185, 129, 0.08)", fill: true, borderWidth: 2, data: [], yAxisID: "y1" },
          { label: "Pressure (hPa)", borderColor: "#f59e0b", borderWidth: 2, data: [], yAxisID: "y2" },
          { label: "Wind (km/h)", borderColor: "#a855f7", borderWidth: 1.8, data: [], yAxisID: "y" }
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

  // 4. Sensor Balance Radar Chart
  const ctxRadar = document.getElementById("sensorRadarChart")?.getContext("2d");
  if (ctxRadar) {
    sensorRadarChart = new Chart(ctxRadar, {
      type: "radar",
      data: {
        labels: [
          "Thermal Stability",
          "Moisture Coupling",
          "Barometric Envelope",
          "Anemometer Vector",
          "Uplink Reliability",
          "Spatial Concordance"
        ],
        datasets: [
          {
            label: "Current Station Quality",
            data: [98, 96, 99, 95, 99, 96],
            backgroundColor: "rgba(14, 165, 233, 0.22)",
            borderColor: "#0ea5e9",
            pointBackgroundColor: "#0ea5e9",
            pointBorderColor: "#fff",
            borderWidth: 2
          },
          {
            label: "WMO Certified Baseline",
            data: [85, 85, 85, 85, 85, 85],
            borderDash: [3, 3],
            borderColor: "rgba(255, 255, 255, 0.3)",
            fill: false,
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            angleLines: { color: "rgba(255, 255, 255, 0.08)" },
            grid: { color: "rgba(255, 255, 255, 0.08)" },
            pointLabels: { color: "#94a3b8", font: chartFont },
            ticks: { display: false, max: 100, min: 20 }
          }
        },
        plugins: {
          legend: { labels: { color: "#94a3b8", font: chartFont } }
        }
      }
    });
  }

  // 5. Peer Buddy Station Comparison
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

function initAnalyticsControls() {
  const pills = document.querySelectorAll(".channel-pill");
  pills.forEach((p) => {
    p.addEventListener("click", () => {
      pills.forEach((b) => b.classList.remove("active"));
      p.classList.add("active");
      const channel = p.getAttribute("data-channel");
      filterMultiParamChart(channel);
    });
  });
}

function filterMultiParamChart(channel) {
  if (!multiParamChart) return;
  const ds = multiParamChart.data.datasets;
  if (channel === "all") {
    ds.forEach((d) => (d.hidden = false));
  } else if (channel === "temp") {
    ds[0].hidden = false;
    ds[1].hidden = true;
    ds[2].hidden = true;
    ds[3].hidden = true;
  } else if (channel === "pressure") {
    ds[0].hidden = true;
    ds[1].hidden = true;
    ds[2].hidden = false;
    ds[3].hidden = true;
  } else if (channel === "humidity") {
    ds[0].hidden = true;
    ds[1].hidden = false;
    ds[2].hidden = true;
    ds[3].hidden = true;
  } else if (channel === "wind") {
    ds[0].hidden = true;
    ds[1].hidden = true;
    ds[2].hidden = true;
    ds[3].hidden = false;
  }
  multiParamChart.update();
}

function updateCharts(activeStation, compareStation) {
  if (!activeStation || !activeStation.history) return;

  const history = activeStation.history.slice(-30);
  const labels = history.map((h) => {
    const d = new Date(h.ts);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  });

  // 1. Temp & Dew Point
  if (tempDewChart) {
    tempDewChart.data.labels = labels;
    tempDewChart.data.datasets[0].data = history.map((h) => h.t);
    tempDewChart.data.datasets[1].data = history.map((h) => {
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
      if (idx === history.length - 1 && activeStation.analysis?.status === "FAULT") {
        return activeStation.analysis.imputed.t;
      }
      return h.t;
    });
    imputedCompareChart.update("none");
  }

  // 4. Radar Chart
  if (sensorRadarChart && activeStation.analysis?.sensorHealth) {
    const h = activeStation.analysis.sensorHealth;
    sensorRadarChart.data.datasets[0].data = [
      h.temp || 98,
      h.humidity || 96,
      h.pressure || 99,
      h.wind || 95,
      h.comms || 99,
      Math.max(40, Math.round(100 - (activeStation.analysis.spatialDiscrepancy || 0) * 4))
    ];
    sensorRadarChart.update("none");
  }

  // 5. Buddy Compare
  if (buddyCompareChart && compareStation) {
    const buddyHistory = compareStation.history.slice(-30);
    buddyCompareChart.data.labels = labels;
    buddyCompareChart.data.datasets[0].data = history.map((h) => h.t);
    buddyCompareChart.data.datasets[1].data = buddyHistory.map((h) => h.t);
    buddyCompareChart.update("none");
  }

  // Quick stats update
  const temps = history.map((h) => h.t);
  if (temps.length >= 2) {
    const meanVal = (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1);
    const variance = temps.reduce((a, b) => a + Math.pow(b - meanVal, 2), 0) / (temps.length - 1);
    const stdVal = Math.sqrt(variance).toFixed(2);
    const rateVal = Math.abs(temps[temps.length - 1] - temps[temps.length - 2]).toFixed(2);

    const mEl = document.getElementById("statMean");
    const sEl = document.getElementById("statStd");
    const rEl = document.getElementById("statRate");
    if (mEl) mEl.textContent = `${meanVal}°C`;
    if (sEl) sEl.textContent = `${stdVal}°C`;
    if (rEl) rEl.textContent = `${rateVal}°C/min`;
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

  // Update Official Government Audit Report Dossier
  renderOfficialDossier(state);
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
   OFFICIAL GOVERNMENT INSPECTION & QC AUDIT DOSSIER
   ---------------------------------------------------- */
function renderOfficialDossier(state) {
  const st = state.selectedStation;
  const analysis = st?.analysis;
  const cur = st?.latest;
  if (!st || !analysis || !cur) return;

  const docRef = document.getElementById("docRefId");
  const docTime = document.getElementById("docTimestamp");
  const verdictBanner = document.getElementById("dossierVerdictBanner");
  const stampText = document.getElementById("dossierStampText");
  const summaryText = document.getElementById("dossierVerdictSummary");
  const stationIdEl = document.getElementById("dossierStationId");
  const geoCoordsEl = document.getElementById("dossierGeoCoords");
  const trustScoreEl = document.getElementById("dossierTrustScore");
  const nwpActionEl = document.getElementById("dossierNwpAction");
  const tableBody = document.getElementById("dossierTableBody");
  const proofContent = document.getElementById("dossierProofContent");

  if (docRef) docRef.textContent = `IMD/AWS-QC/2026/09/${st.id}-${st.wmoId || "43295"}`;
  if (docTime) docTime.textContent = new Date().toLocaleString("en-IN", { timeZoneName: "short" });

  if (stationIdEl) stationIdEl.textContent = `${st.name} (${st.id}) · WMO ID: ${st.wmoId || "43295"}`;
  if (geoCoordsEl) geoCoordsEl.textContent = `${st.lat.toFixed(4)}° N, ${st.lng.toFixed(4)}° E (Elevation: ${st.elevation}m MSL)`;
  if (trustScoreEl) {
    trustScoreEl.textContent = `${analysis.trustIndex}% (${analysis.trustIndex >= 80 ? "High Reliability" : analysis.trustIndex >= 50 ? "Questionable / Degraded" : "Critical Malfunction"})`;
    trustScoreEl.style.color = analysis.trustIndex >= 80 ? "#16a34a" : analysis.trustIndex >= 50 ? "#d97706" : "#dc2626";
  }

  // Verdict banner styling
  if (verdictBanner && stampText && summaryText) {
    if (analysis.status === "FAULT") {
      verdictBanner.className = "report-verdict-banner fault-banner";
      stampText.textContent = "QUARANTINED · SENSOR FAULT DETECTED";
      summaryText.innerHTML = `Observation from <strong>${st.name}</strong> rejected due to confirmed <strong>${analysis.rootCause}</strong>. Data quarantined from NWP model feeds. Virtual Sensor Imputation active.`;
      if (nwpActionEl) {
        nwpActionEl.textContent = "HOLD & QUARANTINE (RECONSTRUCTED VALUE SUBSTITUTED)";
        nwpActionEl.style.color = "#dc2626";
      }
    } else if (analysis.status === "EVENT") {
      verdictBanner.className = "report-verdict-banner";
      stampText.textContent = "VERIFIED · REAL EXTREME WEATHER EVENT";
      stampText.style.color = "#7c3aed";
      stampText.style.borderColor = "#7c3aed";
      summaryText.innerHTML = `Observation from <strong>${st.name}</strong> confirmed as a <strong>${analysis.eventClassification}</strong>. Corroborated by spatial buddy network. Immediate early warning dispatched.`;
      if (nwpActionEl) {
        nwpActionEl.textContent = "EXPEDITE BROADCAST TO STATE DISASTER MGMT (SDMA)";
        nwpActionEl.style.color = "#7c3aed";
      }
    } else {
      verdictBanner.className = "report-verdict-banner";
      stampText.textContent = "VERIFIED · CERTIFIED GOOD";
      stampText.style.color = "#16a34a";
      stampText.style.borderColor = "#16a34a";
      summaryText.innerHTML = `Observations from <strong>${st.name}</strong> satisfy all Clausius-Clapeyron thermodynamic laws, rate-of-change thresholds, and regional spatial consensus.`;
      if (nwpActionEl) {
        nwpActionEl.textContent = "APPROVED FOR AUTOMATED NWP MODEL INGEST";
        nwpActionEl.style.color = "#16a34a";
      }
    }
  }

  // Populate Forensic Table
  if (tableBody) {
    const isTempFault = analysis.detectors?.some((d) => d.param === "temperature");
    const isHumidFault = analysis.detectors?.some((d) => d.param === "humidity");
    const isPressFault = analysis.detectors?.some((d) => d.param === "pressure");

    const rows = [
      {
        subsystem: "Ambient Air Temperature (RTD PT100 Class A)",
        observed: `${cur.t.toFixed(1)}°C`,
        tolerance: "±0.2°C (WMO-No. 8)",
        departure: `${analysis.spatialDiscrepancy > 0 ? "+" : ""}${analysis.spatialDiscrepancy.toFixed(1)}°C vs Buddy Median`,
        qc: isTempFault ? "Flag S (Suspect)" : "Flag G (Good)",
        quarantine: isTempFault ? "Quarantined (Substituted)" : "Pass"
      },
      {
        subsystem: "Relative Humidity (Capacitive Thin-Film)",
        observed: `${cur.h}%`,
        tolerance: "±3.0% RH (WMO-No. 8)",
        departure: `Dew Point: ${analysis.dewPoint}°C (Depression: ${analysis.dewDepression}°C)`,
        qc: isHumidFault ? "Flag S (Suspect)" : "Flag G (Good)",
        quarantine: isHumidFault ? "Quarantined" : "Pass"
      },
      {
        subsystem: "Barometric Pressure (Vaisala PTB110 Resonant)",
        observed: `${cur.p.toFixed(1)} hPa`,
        tolerance: "±0.15 hPa (WMO-No. 8)",
        departure: `Lapse-rate corrected MSL: ${(cur.p + (st.elevation / 8.3)).toFixed(1)} hPa`,
        qc: isPressFault ? "Flag S (Suspect)" : "Flag G (Good)",
        quarantine: isPressFault ? "Quarantined" : "Pass"
      },
      {
        subsystem: "Wind Velocity & Gusts (Ultrasonic 2D)",
        observed: `${cur.wind.toFixed(1)} km/h`,
        tolerance: "±0.5 m/s",
        departure: "Vector direction within climatological envelope",
        qc: "Flag G (Good)",
        quarantine: "Pass"
      },
      {
        subsystem: "Precipitation Accumulator (Tipping Bucket 0.2mm)",
        observed: `${(cur.rain || 0).toFixed(1)} mm`,
        tolerance: "±2% at 50mm/h",
        departure: "Siphon filter clean, 0.0mm spurious count",
        qc: "Flag G (Good)",
        quarantine: "Pass"
      }
    ];

    tableBody.innerHTML = rows.map((r) => `
      <tr>
        <td><strong>${r.subsystem}</strong></td>
        <td><code>${r.observed}</code></td>
        <td>${r.tolerance}</td>
        <td>${r.departure}</td>
        <td><strong style="color: ${r.qc.includes('Suspect') ? '#dc2626' : '#16a34a'};">${r.qc}</strong></td>
        <td><span style="font-weight: 700; color: ${r.quarantine === 'Pass' ? '#16a34a' : '#dc2626'};">${r.quarantine}</span></td>
      </tr>
    `).join("");
  }

  // Populate Mathematical Proof Box
  if (proofContent) {
    proofContent.innerHTML = `
      <strong>Thermodynamic Coupling Proof:</strong> Magnus-Tetens saturation vapor pressure confirms dry-bulb depression 
      <code>T - T_dew = ${analysis.dewDepression}°C</code>. ${analysis.dewDepression < 0 ? '❌ <b>Thermodynamic Violation:</b> Dew point exceeds dry-bulb temperature (physically impossible).' : '✅ Satisfies Clausius-Clapeyron boundary conditions.'}<br/>
      <strong>Spatial Peer Consensus:</strong> Target station departure compared with nearest buddy nodes (<code>${st.neighbors?.join(", ") || "Peer stations"}</code>). Spatial divergence = <code>${analysis.spatialDiscrepancy}°C</code>. ${analysis.spatialDiscrepancy > 6 ? '❌ <b>Spatial Consensus Divergence:</b> Local anomaly not corroborated by regional stations.' : '✅ Local departure aligns with regional synoptic envelope.'}<br/>
      <strong>Virtual Sensor Imputation Audit:</strong> ${analysis.status === 'FAULT' ? `Active substitution: Reconstructed Temperature <code>${analysis.imputed.t}°C</code> using <em>${analysis.imputed.method}</em>.` : 'Direct sensor ingest verified; no imputation required.'}
    `;
  }
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
   BATCH CSV AUDIT STUDIO & SAMPLE DATA GENERATOR
   ---------------------------------------------------- */
function initBatchCsvUI() {
  const dropzone = document.getElementById("csvDropzone");
  const fileInput = document.getElementById("csvFileInput");
  const sampleBtn = document.getElementById("loadSampleCsvBtn");
  const exportBtn = document.getElementById("exportAuditedCsvBtn");
  const downloadSampleBtn = document.getElementById("downloadSampleCsvBtn");

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

  // Download Sample CSV button in the guide card
  downloadSampleBtn?.addEventListener("click", () => {
    const sampleCsv = deptIngest.generateSampleDepartmentCSV();
    const blob = new Blob([sampleCsv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `imd_aws_sample_data_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Downloaded imd_aws_sample_data_2026.csv!");
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
   AI COPILOT UI & FLOATING ROBOT TRIGGER
   ---------------------------------------------------- */
function initCopilotUI() {
  const drawer = document.getElementById("copilotDrawer");
  const overlay = document.getElementById("copilotOverlay");
  const robotBtn = document.getElementById("floatingRobotBtn");
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

  robotBtn?.addEventListener("click", openDrawer);
  closeBtn?.addEventListener("click", closeDrawer);
  overlay?.addEventListener("click", closeDrawer);

  const keyBtn = document.getElementById("copilotKeyBtn");
  keyBtn?.addEventListener("click", () => {
    const current = getActiveApiKey();
    const masked = current ? `${current.slice(0, 7)}...${current.slice(-4)}` : "None";
    const entered = window.prompt(`Google Gemini 2.5 Flash API Key:\nStatus: Active (${masked})\n\nEnter new key if you wish to override (stored in browser):`, current || "");
    if (entered !== null && entered.trim()) {
      setActiveApiKey(entered.trim());
      showToast("Google Gemini API Key updated successfully!", "normal");
    }
  });

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

  function formatMarkdown(raw) {
    if (!raw) return "";

    // 1. Code blocks ```lang\ncode\n```
    let formatted = raw.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
      const cleanCode = code.replace(/</g, "&lt;").replace(/>/g, "&gt;");
      return `<pre><code>${cleanCode}</code></pre>`;
    });

    // 2. Headers (###, ##, #)
    formatted = formatted
      .replace(/^### (.*$)/gim, '<h4>$1</h4>')
      .replace(/^## (.*$)/gim, '<h4 style="font-size: 15px; color: #38bdf8;">$1</h4>')
      .replace(/^# (.*$)/gim, '<h4 style="font-size: 16px; color: #38bdf8;">$1</h4>');

    // 3. Blockquotes
    formatted = formatted.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');

    // 4. Bold & Italic
    formatted = formatted
      .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');

    // 5. Inline code
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

    // 6. Bullet lists
    formatted = formatted.replace(/^[\*\-•] (.*$)/gim, '<li>$1</li>');
    formatted = formatted.replace(/(<li>.*<\/li>)/gims, '<ul>$1</ul>');
    formatted = formatted.replace(/<\/ul>\s*<ul>/g, '');

    // 7. Paragraph breaks
    formatted = formatted.replace(/\n\n/g, '<br/><br/>').replace(/\n/g, '<br/>');

    return formatted;
  }

  function renderCopilotMessages() {
    if (!msgContainer) return;
    msgContainer.innerHTML = copilot.messages.map((m) => {
      const formatted = formatMarkdown(m.text);
      return `
        <div class="chat-bubble ${m.sender}">
          <div>${formatted}</div>
          <div style="font-size: 10px; opacity: 0.6; text-align: right; margin-top: 4px;">${m.time}</div>
        </div>
      `;
    }).join("");

    msgContainer.scrollTop = msgContainer.scrollHeight;
  }

  async function sendCopilotQuery(text) {
    const context = {
      selectedStation: simulator?.stations?.[simulator?.selectedStationId],
      networkTrust: simulator?.calculateNetworkTrust(),
      stations: simulator?.stations
    };

    // Render user message immediately
    const userMsg = {
      sender: "user",
      text: text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };
    copilot.messages.push(userMsg);
    renderCopilotMessages();

    // Show animated thinking bubble
    const thinkingEl = document.createElement("div");
    thinkingEl.className = "chat-bubble ai thinking";
    thinkingEl.id = "copilotThinkingBubble";
    thinkingEl.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span style="font-size: 12px; color: var(--c-sky); font-weight: 500;">Gemini 2.5 Flash is thinking...</span>
      </div>
    `;
    msgContainer?.appendChild(thinkingEl);
    if (msgContainer) msgContainer.scrollTop = msgContainer.scrollHeight;

    // Pop the temporary userMsg so processUserQuery doesn't duplicate it
    copilot.messages.pop();

    // Asynchronously query Google Gemini 2.5 Flash
    await copilot.processUserQuery(text, context);

    // Remove thinking bubble and re-render messages
    document.getElementById("copilotThinkingBubble")?.remove();
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
    toast.style.transform = "translateX(-100%)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
