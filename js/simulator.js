/**
 * Weather Station Telemetry Ingestion & Simulation Engine
 * Smart India Hackathon 2026 - Problem 26073
 * Team AI Avengers
 */

import { STATIONS, getStationById } from "./stations.js";
import { analyzeObservation } from "./ai-engine.js";

const MAX_HISTORY_POINTS = 60;

export class WeatherSimulator {
  constructor(onUpdateCallback) {
    this.onUpdate = onUpdateCallback || (() => {});
    this.stations = {};
    this.selectedStationId = "BLR-IMD";
    this.compareStationId = "BLR-AP";
    this.isRunning = true;
    this.useLiveMeteo = true;
    this.activeScenario = null; // 'spike' | 'frozen' | 'drift' | 'pressure' | 'comms' | 'storm'
    this.driftAccumulator = 0;
    this.frozenValues = null;
    this.stormTicksRemaining = 0;
    this.alerts = [];
    this.auditLog = [];
    this.tickCounter = 0;
    this.timerId = null;

    this.initStations();
  }

  initStations() {
    for (const st of STATIONS) {
      this.stations[st.id] = {
        ...st,
        history: [],
        latest: null,
        analysis: null,
        activeFaults: []
      };
    }
  }

  async start() {
    // Generate initial realistic history for all stations so charts have baseline context immediately
    this.seedSyntheticHistory();

    // Fetch live data for initial state if enabled
    if (this.useLiveMeteo) {
      try {
        await this.fetchLiveMeteoForStation(this.selectedStationId);
        // Also fetch buddy stations
        const current = this.stations[this.selectedStationId];
        if (current && current.neighbors) {
          for (const nid of current.neighbors.slice(0, 2)) {
            await this.fetchLiveMeteoForStation(nid);
          }
        }
      } catch (e) {
        console.warn("Live Open-Meteo initial fetch failed, using synthetic department stream:", e);
      }
    }

    // Run first analysis pass
    this.tick();

    // Start auto-tick loop (every 3 seconds for active, animated demo experience)
    this.timerId = setInterval(() => {
      if (this.isRunning) {
        this.tick();
      }
    }, 3000);
  }

  seedSyntheticHistory() {
    const now = Date.now();
    for (const st of STATIONS) {
      const history = [];
      const baseT = st.climate.t;
      const baseH = st.climate.h;
      const baseP = st.climate.p;
      const baseWind = st.climate.wind;

      for (let i = MAX_HISTORY_POINTS; i >= 1; i--) {
        const timeOffset = now - i * 60 * 1000;
        const hour = new Date(timeOffset).getHours();
        // Natural diurnal cycle
        const diurnalShift = Math.sin(((hour - 9) / 24) * 2 * Math.PI) * (st.climate.diurnalRange / 2);
        const jitterT = (Math.random() - 0.5) * 0.4;
        const jitterH = (Math.random() - 0.5) * 1.5;
        const jitterP = (Math.random() - 0.5) * 0.3;

        const tVal = Number((baseT + diurnalShift + jitterT).toFixed(1));
        const hVal = Math.round(Math.max(15, Math.min(98, baseH - (diurnalShift * 1.5) + jitterH)));
        const pVal = Number((baseP - (diurnalShift * 0.2) + jitterP).toFixed(1));
        const wVal = Number((baseWind + (Math.random() - 0.5) * 2).toFixed(1));

        history.push({
          ts: timeOffset,
          t: tVal,
          h: hVal,
          p: pVal,
          wind: Math.max(1, wVal),
          rain: 0,
          dtMin: 1,
          commsError: false,
          isSynthetic: true
        });
      }

      this.stations[st.id].history = history;
      this.stations[st.id].latest = history[history.length - 1];
    }
  }

  async fetchLiveMeteoForStation(stationId) {
    const station = this.stations[stationId];
    if (!station) return;

    const params = new URLSearchParams({
      latitude: String(station.lat),
      longitude: String(station.lng),
      current: "temperature_2m,relative_humidity_2m,precipitation,pressure_msl,wind_speed_10m,wind_direction_10m",
      hourly: "temperature_2m,relative_humidity_2m,precipitation,pressure_msl,wind_speed_10m",
      past_days: "1",
      forecast_days: "1",
      timezone: "auto"
    });

    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
    if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
    const data = await res.json();

    if (data.current) {
      const cur = data.current;
      const reading = {
        ts: Date.now(),
        t: Number(cur.temperature_2m),
        h: Number(cur.relative_humidity_2m),
        p: Number(cur.pressure_msl || cur.surface_pressure || 1012),
        wind: Number(cur.wind_speed_10m || 8),
        rain: Number(cur.precipitation || 0),
        dtMin: 5,
        commsError: false,
        source: "Open-Meteo Live API"
      };

      if (station.history.length >= MAX_HISTORY_POINTS) {
        station.history.shift();
      }
      station.history.push(reading);
      station.latest = reading;
    }
  }

  generateNextSyntheticReading(stationId) {
    const station = this.stations[stationId];
    const prev = station.latest || {
      t: station.climate.t,
      h: station.climate.h,
      p: station.climate.p,
      wind: station.climate.wind,
      rain: 0
    };

    const hour = new Date().getHours();
    const diurnalShift = Math.sin(((hour - 9) / 24) * 2 * Math.PI) * (station.climate.diurnalRange / 2);

    let t = station.climate.t + diurnalShift + (Math.random() - 0.5) * 0.35;
    let h = station.climate.h - (diurnalShift * 1.4) + (Math.random() - 0.5) * 1.2;
    let p = station.climate.p - (diurnalShift * 0.15) + (Math.random() - 0.5) * 0.25;
    let wind = station.climate.wind + (Math.random() - 0.5) * 1.8;
    let rain = 0;
    let commsError = false;
    let freezeSensor = false;
    let freezeHumidity = false;
    let isRealStorm = false;

    // Apply active fault injection scenario if target is selected station
    if (this.selectedStationId === stationId && this.activeScenario) {
      switch (this.activeScenario) {
        case "spike":
          t = 55.4; // SIH 55°C heat spike benchmark
          break;
        case "frozen":
          freezeSensor = true;
          freezeHumidity = true;
          if (!this.frozenValues) {
            this.frozenValues = { t: prev.t, h: prev.h };
          }
          t = this.frozenValues.t;
          h = this.frozenValues.h;
          break;
        case "drift":
          this.driftAccumulator += 0.45;
          t += this.driftAccumulator;
          break;
        case "pressure":
          p = prev.p - 14.2; // Massive barometric drop with no storm corroboration
          break;
        case "comms":
          commsError = true;
          break;
        case "storm":
          // Coordinated regional weather event
          isRealStorm = true;
          p -= 5.5; // True atmospheric low
          h = 94; // Saturated humid air
          t -= 4.2; // Rain cooling
          wind += 38.0; // High squall gusts
          rain = 18.5; // Heavy precipitation
          break;
      }
    } else if (this.activeScenario === "storm" && station.neighbors && station.neighbors.includes(this.selectedStationId)) {
      // Neighboring buddy stations also experience the regional storm!
      isRealStorm = true;
      p -= 4.0;
      h = 90;
      t -= 3.5;
      wind += 28.0;
      rain = 12.0;
    }

    const reading = {
      ts: Date.now(),
      t: Number(t.toFixed(1)),
      h: Math.round(Math.max(1, Math.min(100, h))),
      p: Number(p.toFixed(1)),
      wind: Math.max(0, Number(wind.toFixed(1))),
      rain: Number(rain.toFixed(1)),
      dtMin: 2,
      commsError,
      freezeSensor,
      freezeHumidity,
      isRealStorm,
      source: "Department Telemetry Stream"
    };

    return reading;
  }

  tick() {
    this.tickCounter++;

    // Update readings for all stations
    for (const sId of Object.keys(this.stations)) {
      const station = this.stations[sId];
      const nextReading = this.generateNextSyntheticReading(sId);

      if (station.history.length >= MAX_HISTORY_POINTS) {
        station.history.shift();
      }
      station.history.push(nextReading);
      station.latest = nextReading;
    }

    // Now analyze all stations using AI engine
    for (const sId of Object.keys(this.stations)) {
      const station = this.stations[sId];
      const neighbors = (station.neighbors || []).map((nid) => this.stations[nid]).filter(Boolean);
      const analysis = analyzeObservation(station, station.latest, station.history, neighbors);
      station.analysis = analysis;

      // Handle alerts
      if (analysis.status === "FAULT" || analysis.status === "EVENT") {
        this.logAlert(station, analysis);
      }
    }

    // Decay storm scenario counter if running
    if (this.activeScenario === "storm") {
      this.stormTicksRemaining--;
      if (this.stormTicksRemaining <= 0) {
        this.activeScenario = null;
      }
    }

    // Notify listeners
    this.onUpdate({
      stations: this.stations,
      selectedStation: this.stations[this.selectedStationId],
      compareStation: this.stations[this.compareStationId],
      alerts: this.alerts,
      activeScenario: this.activeScenario,
      networkTrust: this.calculateNetworkTrust()
    });
  }

  logAlert(station, analysis) {
    const alertId = `${station.id}-${Date.now()}`;
    const newAlert = {
      id: alertId,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      stationId: station.id,
      stationName: station.name,
      status: analysis.status,
      severity: analysis.severity,
      qcFlag: analysis.qcFlag,
      eventClassification: analysis.eventClassification,
      rootCause: analysis.rootCause,
      trustIndex: analysis.trustIndex,
      confidence: analysis.score,
      reasons: analysis.explanations,
      imputed: analysis.imputed
    };

    // Keep unique recent alerts
    this.alerts.unshift(newAlert);
    if (this.alerts.length > 50) this.alerts.pop();

    this.auditLog.unshift({
      timestamp: new Date().toISOString(),
      ...newAlert
    });
  }

  calculateNetworkTrust() {
    const list = Object.values(this.stations);
    if (!list.length) return 100;
    const total = list.reduce((sum, s) => sum + (s.analysis?.trustIndex || 95), 0);
    return Math.round(total / list.length);
  }

  // Fault Injection Triggers
  injectSpike() {
    this.activeScenario = "spike";
    this.tick();
  }

  freezeSensor() {
    this.activeScenario = "frozen";
    this.frozenValues = null;
    this.tick();
  }

  injectDrift() {
    this.activeScenario = "drift";
    this.driftAccumulator = 1.0;
    this.tick();
  }

  injectPressureDrop() {
    this.activeScenario = "pressure";
    this.tick();
  }

  injectCommsDropout() {
    this.activeScenario = "comms";
    this.tick();
  }

  simulateStorm() {
    this.activeScenario = "storm";
    this.stormTicksRemaining = 6; // Active for 6 ticks (~18 seconds)
    this.tick();
  }

  clearScenario() {
    this.activeScenario = null;
    this.driftAccumulator = 0;
    this.frozenValues = null;
    this.stormTicksRemaining = 0;
    this.tick();
  }

  selectStation(id) {
    if (this.stations[id]) {
      this.selectedStationId = id;
      // Re-evaluate
      this.tick();
    }
  }

  setCompareStation(id) {
    if (this.stations[id]) {
      this.compareStationId = id;
      this.tick();
    }
  }

  togglePause() {
    this.isRunning = !this.isRunning;
    return this.isRunning;
  }
}
