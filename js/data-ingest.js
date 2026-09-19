/**
 * Department Weather Telemetry Ingestion & Batch CSV/JSON Audit Engine
 * Smart India Hackathon 2026 - Problem 26073
 * Team AI Avengers
 */

import { analyzeObservation } from "./ai-engine.js";
import { getStationById } from "./stations.js";

export class DepartmentDataIngest {
  constructor() {
    this.batchResults = null;
  }

  /**
   * Generates a realistic sample department weather log (CSV format)
   * containing normal readings, real thunderstorm signatures, and hardware faults
   * (such as 55°C heat spike, frozen humidity, barometric jump).
   */
  generateSampleDepartmentCSV() {
    const headers = "timestamp,station_id,temperature_c,relative_humidity_pct,pressure_hpa,wind_speed_kmh,rainfall_mm\n";
    const now = Date.now();
    const rows = [];

    // 40 sequential readings
    for (let i = 0; i < 40; i++) {
      const ts = new Date(now - (40 - i) * 10 * 60 * 1000).toISOString();
      let t = (27.0 + Math.sin(i / 5) * 2 + (Math.random() - 0.5) * 0.4).toFixed(1);
      let h = Math.round(62 - Math.sin(i / 5) * 8 + (Math.random() - 0.5) * 2);
      let p = (1012.0 - (Math.random() - 0.5) * 0.5).toFixed(1);
      let w = (10.0 + (Math.random() - 0.5) * 2).toFixed(1);
      let rain = 0.0;

      // Inject specific test anomalies for demonstration
      if (i === 12) {
        // Sudden 55°C electrical spike
        t = "55.2";
      } else if (i >= 18 && i <= 24) {
        // Frozen capacitive hygrometer
        h = 74;
      } else if (i === 30) {
        // Barometric glitch
        p = "982.5";
      } else if (i >= 34 && i <= 37) {
        // Real Severe Convective Thunderstorm
        t = (21.5).toFixed(1); // sudden cooling
        h = 95; // saturated humidity
        p = "1004.2"; // pressure drop
        w = "48.5"; // squall winds
        rain = "16.8"; // heavy precipitation
      }

      rows.push(`${ts},BLR-IMD,${t},${h},${p},${w},${rain}`);
    }

    return headers + rows.join("\n");
  }

  /**
   * Parses CSV content and runs AI Anomaly Detection on each row
   */
  processCSV(csvText) {
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length < 2) {
      throw new Error("CSV must have a header line and at least one data row.");
    }

    const header = lines[0].toLowerCase().split(",").map((h) => h.trim().replace(/['"]/g, ""));
    const tIdx = header.findIndex((h) => h.includes("temp") || h === "t");
    const hIdx = header.findIndex((h) => h.includes("humid") || h === "rh" || h === "h");
    const pIdx = header.findIndex((h) => h.includes("press") || h === "baro" || h === "p");
    const wIdx = header.findIndex((h) => h.includes("wind") || h === "w");
    const rIdx = header.findIndex((h) => h.includes("rain") || h === "precip");
    const sIdx = header.findIndex((h) => h.includes("station") || h === "id");
    const tsIdx = header.findIndex((h) => h.includes("time") || h.includes("date") || h === "ts");

    if (tIdx === -1 || hIdx === -1 || pIdx === -1) {
      throw new Error("CSV must include columns for Temperature, Humidity, and Pressure.");
    }

    const records = [];
    const history = [];
    const defaultStation = getStationById("BLR-IMD");

    let normalCount = 0;
    let faultCount = 0;
    let eventCount = 0;
    let watchCount = 0;
    let totalTrustSum = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = line.split(",").map((c) => c.trim().replace(/['"]/g, ""));

      const stationId = sIdx !== -1 && cols[sIdx] ? cols[sIdx] : "BLR-IMD";
      const station = getStationById(stationId) || defaultStation;
      const ts = tsIdx !== -1 ? cols[tsIdx] : new Date(Date.now() - (lines.length - i) * 300000).toISOString();

      const tVal = parseFloat(cols[tIdx]);
      const hVal = parseFloat(cols[hIdx]);
      const pVal = parseFloat(cols[pIdx]);
      const wVal = wIdx !== -1 ? parseFloat(cols[wIdx]) || 0 : 0;
      const rVal = rIdx !== -1 ? parseFloat(cols[rIdx]) || 0 : 0;

      if (!Number.isFinite(tVal) || !Number.isFinite(hVal) || !Number.isFinite(pVal)) {
        continue;
      }

      const reading = {
        ts: new Date(ts).getTime() || Date.now(),
        t: tVal,
        h: hVal,
        p: pVal,
        wind: wVal,
        rain: rVal,
        dtMin: 5,
        commsError: false
      };

      const analysis = analyzeObservation(station, reading, history, []);
      history.push(reading);
      if (history.length > 30) history.shift();

      totalTrustSum += analysis.trustIndex;
      if (analysis.status === "NORMAL") normalCount++;
      else if (analysis.status === "FAULT") faultCount++;
      else if (analysis.status === "EVENT") eventCount++;
      else if (analysis.status === "WATCH") watchCount++;

      records.push({
        row: i,
        timestamp: ts,
        stationId,
        raw: { t: tVal, h: hVal, p: pVal, wind: wVal, rain: rVal },
        analysis
      });
    }

    this.batchResults = {
      totalRows: records.length,
      normalCount,
      faultCount,
      eventCount,
      watchCount,
      averageTrustIndex: records.length ? Math.round(totalTrustSum / records.length) : 100,
      records
    };

    return this.batchResults;
  }

  /**
   * Generates a downloadable audited CSV with AI flags and imputed values
   */
  exportAuditedCSV() {
    if (!this.batchResults || !this.batchResults.records.length) return "";

    const headers = [
      "Row",
      "Timestamp",
      "Station_ID",
      "Raw_Temp_C",
      "Raw_RH_Pct",
      "Raw_Pressure_hPa",
      "AI_Status",
      "QC_Flag",
      "Trust_Index_Pct",
      "Classification",
      "Root_Cause",
      "Imputed_Temp_C",
      "Imputed_RH_Pct",
      "Imputed_Pressure_hPa",
      "Primary_AI_Reason"
    ].join(",");

    const rows = this.batchResults.records.map((r) => {
      const a = r.analysis;
      const imp = a.imputed;
      return [
        r.row,
        `"${r.timestamp}"`,
        `"${r.stationId}"`,
        r.raw.t,
        r.raw.h,
        r.raw.p,
        a.status,
        a.qcFlag,
        a.trustIndex,
        `"${a.eventClassification}"`,
        `"${a.rootCause.replace(/"/g, '""')}"`,
        imp.t,
        imp.h,
        imp.p,
        `"${(a.explanations[0] || '').replace(/"/g, '""')}"`
      ].join(",");
    });

    return headers + "\n" + rows.join("\n");
  }
}
