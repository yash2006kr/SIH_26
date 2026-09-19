/**
 * Automatic Weather Stations (AWS) Network Registry - India
 * Smart India Hackathon 2026 - Problem 26073
 * Team AI Avengers
 */

export const STATIONS = [
  {
    id: "BLR-IMD",
    name: "Bengaluru Central IMD",
    city: "Bengaluru",
    state: "Karnataka",
    region: "South Interior",
    lat: 12.9716,
    lng: 77.5946,
    elevation: 920,
    wmoId: "43295",
    neighbors: ["BLR-AP", "MYS-01", "HSN-01"],
    climate: { t: 27.2, h: 64, p: 1012.5, wind: 10.5, diurnalRange: 11.0 },
    hardware: {
      stationModel: "AWS-IMD Mk-IV",
      controller: "ESP32-S3 + LoRaWAN/4G",
      firmware: "v3.8.2-rtos",
      sensors: {
        temp: { model: "PT100 RTD Class A", health: 98, lastCalibrated: "2026-01-15" },
        humidity: { model: "Capacitive Thin-Film (Rotronic)", health: 96, lastCalibrated: "2026-01-15" },
        pressure: { model: "Piezoresistive Barometer (Vaisala PTB110)", health: 99, lastCalibrated: "2025-11-20" },
        wind: { model: "Ultrasonic 2D Anemometer (Gill WindSonic)", health: 95, lastCalibrated: "2025-12-10" },
        rain: { model: "Tipping Bucket 0.2mm (ARG-200)", health: 97, lastCalibrated: "2026-02-01" },
        power: { batteryV: 12.6, solarW: 28, uptimeDays: 142 }
      }
    }
  },
  {
    id: "BLR-AP",
    name: "Kempegowda Int'l Airport AWS",
    city: "Bengaluru Devanahalli",
    state: "Karnataka",
    region: "South Interior",
    lat: 13.1986,
    lng: 77.7066,
    elevation: 915,
    wmoId: "43296",
    neighbors: ["BLR-IMD", "MYS-01", "HSN-01"],
    climate: { t: 26.8, h: 62, p: 1011.8, wind: 14.2, diurnalRange: 12.2 },
    hardware: {
      stationModel: "AWS-Aviation Grade-III",
      controller: "ESP32-DualCore + Dual SIM 4G",
      firmware: "v4.1.0-faa",
      sensors: {
        temp: { model: "Dual PT100 Calibrated", health: 99, lastCalibrated: "2026-02-10" },
        humidity: { model: "Chilled Mirror Dewpoint", health: 98, lastCalibrated: "2026-02-10" },
        pressure: { model: "Triple Resonant Silicon Barometer", health: 100, lastCalibrated: "2026-01-05" },
        wind: { model: "Heated Ultrasonic 3D Anemometer", health: 99, lastCalibrated: "2026-01-05" },
        rain: { model: "Optical Precipitation Sensor", health: 98, lastCalibrated: "2026-02-10" },
        power: { batteryV: 13.2, solarW: 45, uptimeDays: 310 }
      }
    }
  },
  {
    id: "MYS-01",
    name: "Mysuru AWS",
    city: "Mysuru",
    state: "Karnataka",
    region: "South Interior",
    lat: 12.2958,
    lng: 76.6394,
    elevation: 763,
    wmoId: "43301",
    neighbors: ["BLR-IMD", "BLR-AP", "HSN-01"],
    climate: { t: 28.0, h: 58, p: 1010.5, wind: 9.8, diurnalRange: 13.0 },
    hardware: {
      stationModel: "AWS-IMD Mk-IV",
      controller: "ESP32-WROOM-32U",
      firmware: "v3.6.0",
      sensors: {
        temp: { model: "PT100 RTD", health: 94, lastCalibrated: "2025-10-18" },
        humidity: { model: "Capacitive Polymer", health: 91, lastCalibrated: "2025-10-18" },
        pressure: { model: "Silicon Piezoresistive", health: 97, lastCalibrated: "2025-10-18" },
        wind: { model: "Cup Anemometer + Vane", health: 92, lastCalibrated: "2025-08-12" },
        rain: { model: "Tipping Bucket 0.5mm", health: 95, lastCalibrated: "2025-10-18" },
        power: { batteryV: 12.4, solarW: 25, uptimeDays: 88 }
      }
    }
  },
  {
    id: "HSN-01",
    name: "Hassan Agro-AWS",
    city: "Hassan",
    state: "Karnataka",
    region: "Malnad / South",
    lat: 13.0033,
    lng: 76.1004,
    elevation: 957,
    wmoId: "43292",
    neighbors: ["BLR-IMD", "MYS-01"],
    climate: { t: 25.5, h: 72, p: 1013.0, wind: 11.0, diurnalRange: 10.5 },
    hardware: {
      stationModel: "Agro-AWS AgroNet",
      controller: "ESP32 + Satellite Backup",
      firmware: "v3.7.1",
      sensors: {
        temp: { model: "PT1000 Precision RTD", health: 97, lastCalibrated: "2025-11-04" },
        humidity: { model: "Capacitive Sensor", health: 95, lastCalibrated: "2025-11-04" },
        pressure: { model: "Digital Barometer", health: 98, lastCalibrated: "2025-11-04" },
        wind: { model: "Ultrasonic 2D Anemometer", health: 94, lastCalibrated: "2025-09-20" },
        rain: { model: "Weighing Gauge", health: 98, lastCalibrated: "2025-11-04" },
        power: { batteryV: 12.7, solarW: 32, uptimeDays: 165 }
      }
    }
  },
  {
    id: "MAA-01",
    name: "Chennai Nungambakkam IMD",
    city: "Chennai",
    state: "Tamil Nadu",
    region: "Coastal Tamil Nadu",
    lat: 13.0827,
    lng: 80.2707,
    elevation: 16,
    wmoId: "43279",
    neighbors: ["MAA-AP", "BLR-IMD"],
    climate: { t: 31.8, h: 76, p: 1008.2, wind: 15.5, diurnalRange: 8.5 },
    hardware: {
      stationModel: "Coastal-AWS MarineGuard",
      controller: "ESP32 Industrial + 4G LTE",
      firmware: "v4.0.2",
      sensors: {
        temp: { model: "Marine Grade RTD", health: 93, lastCalibrated: "2025-12-05" },
        humidity: { model: "Heated Humidity Probe (Anti-Saline)", health: 90, lastCalibrated: "2025-12-05" },
        pressure: { model: "High-Precision Barometer", health: 99, lastCalibrated: "2025-12-05" },
        wind: { model: "Ultrasonic Corrosion-Resistant", health: 96, lastCalibrated: "2025-12-05" },
        rain: { model: "Tipping Bucket with Leaf Filter", health: 94, lastCalibrated: "2025-12-05" },
        power: { batteryV: 12.8, solarW: 35, uptimeDays: 204 }
      }
    }
  },
  {
    id: "MAA-AP",
    name: "Chennai Meenambakkam Airport",
    city: "Chennai Meenambakkam",
    state: "Tamil Nadu",
    region: "Coastal Tamil Nadu",
    lat: 12.9941,
    lng: 80.1709,
    elevation: 16,
    wmoId: "43278",
    neighbors: ["MAA-01", "BLR-AP"],
    climate: { t: 32.2, h: 72, p: 1008.0, wind: 16.8, diurnalRange: 9.2 },
    hardware: {
      stationModel: "AWS-Aviation Grade-III",
      controller: "ESP32 + Dual Redundancy",
      firmware: "v4.1.0-faa",
      sensors: {
        temp: { model: "Dual PT100 Calibrated", health: 98, lastCalibrated: "2026-01-20" },
        humidity: { model: "Capacitive Thin-Film", health: 96, lastCalibrated: "2026-01-20" },
        pressure: { model: "Dual Silicon Barometer", health: 100, lastCalibrated: "2026-01-20" },
        wind: { model: "Heated Ultrasonic 2D", health: 98, lastCalibrated: "2026-01-20" },
        rain: { model: "Tipping Bucket 0.2mm", health: 97, lastCalibrated: "2026-01-20" },
        power: { batteryV: 13.0, solarW: 40, uptimeDays: 280 }
      }
    }
  },
  {
    id: "BOM-01",
    name: "Mumbai Colaba IMD",
    city: "Mumbai",
    state: "Maharashtra",
    region: "Konkan Coast",
    lat: 18.9067,
    lng: 72.8147,
    elevation: 11,
    wmoId: "43057",
    neighbors: ["PNQ-01", "AMD-01"],
    climate: { t: 29.8, h: 80, p: 1007.5, wind: 17.5, diurnalRange: 7.0 },
    hardware: {
      stationModel: "Coastal-AWS MarineGuard",
      controller: "ESP32 Industrial + 4G LTE",
      firmware: "v4.0.0",
      sensors: {
        temp: { model: "PT100 Marine Enclosed", health: 96, lastCalibrated: "2025-11-12" },
        humidity: { model: "Hydrophobic Polymer", health: 92, lastCalibrated: "2025-11-12" },
        pressure: { model: "Barometer Vaisala PTB110", health: 98, lastCalibrated: "2025-11-12" },
        wind: { model: "Heavy-Duty Marine Ultrasonic", health: 95, lastCalibrated: "2025-11-12" },
        rain: { model: "Dual Tipping Bucket", health: 96, lastCalibrated: "2025-11-12" },
        power: { batteryV: 12.5, solarW: 30, uptimeDays: 190 }
      }
    }
  },
  {
    id: "PNQ-01",
    name: "Pune Shivajinagar AWS",
    city: "Pune",
    state: "Maharashtra",
    region: "Madhya Maharashtra",
    lat: 18.5204,
    lng: 73.8567,
    elevation: 559,
    wmoId: "43063",
    neighbors: ["BOM-01", "HYD-01"],
    climate: { t: 27.4, h: 56, p: 1010.8, wind: 10.2, diurnalRange: 14.5 },
    hardware: {
      stationModel: "AWS-IMD Mk-IV",
      controller: "ESP32-WROOM-32D",
      firmware: "v3.8.0",
      sensors: {
        temp: { model: "PT100 RTD Class A", health: 97, lastCalibrated: "2026-01-10" },
        humidity: { model: "Capacitive Thin-Film", health: 95, lastCalibrated: "2026-01-10" },
        pressure: { model: "Digital Barometric Sensor", health: 99, lastCalibrated: "2026-01-10" },
        wind: { model: "Cup Anemometer", health: 93, lastCalibrated: "2025-10-05" },
        rain: { model: "Tipping Bucket 0.2mm", health: 97, lastCalibrated: "2026-01-10" },
        power: { batteryV: 12.8, solarW: 35, uptimeDays: 220 }
      }
    }
  },
  {
    id: "DEL-01",
    name: "Delhi Safdarjung IMD",
    city: "New Delhi",
    state: "Delhi NCR",
    region: "Northwest Plains",
    lat: 28.5845,
    lng: 77.2058,
    elevation: 216,
    wmoId: "42182",
    neighbors: ["JAI-01", "LKO-01"],
    climate: { t: 33.5, h: 44, p: 1005.2, wind: 8.5, diurnalRange: 16.0 },
    hardware: {
      stationModel: "AWS-IMD Metro-I",
      controller: "ESP32-S3 Dual-Core",
      firmware: "v4.2.1",
      sensors: {
        temp: { model: "Triple Shielded PT100", health: 97, lastCalibrated: "2026-02-15" },
        humidity: { model: "Dust-Filtered Capacitive", health: 89, lastCalibrated: "2025-11-20" },
        pressure: { model: "Precision Piezoresistive", health: 99, lastCalibrated: "2026-01-15" },
        wind: { model: "Ultrasonic Anemometer", health: 94, lastCalibrated: "2025-12-08" },
        rain: { model: "Heated Rain Gauge", health: 98, lastCalibrated: "2026-02-15" },
        power: { batteryV: 13.1, solarW: 38, uptimeDays: 250 }
      }
    }
  },
  {
    id: "CCU-01",
    name: "Kolkata Alipore IMD",
    city: "Kolkata",
    state: "West Bengal",
    region: "Gangetic West Bengal",
    lat: 22.5375,
    lng: 88.3312,
    elevation: 6,
    wmoId: "42809",
    neighbors: ["BBI-01", "GHY-01"],
    climate: { t: 31.0, h: 78, p: 1006.5, wind: 12.8, diurnalRange: 8.8 },
    hardware: {
      stationModel: "Coastal-AWS MarineGuard",
      controller: "ESP32 + Cellular 4G",
      firmware: "v3.9.5",
      sensors: {
        temp: { model: "PT100 RTD", health: 95, lastCalibrated: "2025-12-22" },
        humidity: { model: "Capacitive Polymer", health: 93, lastCalibrated: "2025-12-22" },
        pressure: { model: "Digital Barometer", health: 98, lastCalibrated: "2025-12-22" },
        wind: { model: "Ultrasonic 2D", health: 96, lastCalibrated: "2025-12-22" },
        rain: { model: "Tipping Bucket 0.2mm", health: 95, lastCalibrated: "2025-12-22" },
        power: { batteryV: 12.6, solarW: 30, uptimeDays: 175 }
      }
    }
  },
  {
    id: "HYD-01",
    name: "Hyderabad Begumpet AWS",
    city: "Hyderabad",
    state: "Telangana",
    region: "Telangana Plateau",
    lat: 17.4531,
    lng: 78.4677,
    elevation: 531,
    wmoId: "43128",
    neighbors: ["PNQ-01", "MAA-01", "BBI-01"],
    climate: { t: 30.8, h: 52, p: 1009.2, wind: 11.5, diurnalRange: 13.8 },
    hardware: {
      stationModel: "AWS-IMD Mk-IV",
      controller: "ESP32-S2",
      firmware: "v3.8.0",
      sensors: {
        temp: { model: "PT100 RTD Class A", health: 98, lastCalibrated: "2026-01-08" },
        humidity: { model: "Capacitive Sensor", health: 94, lastCalibrated: "2026-01-08" },
        pressure: { model: "Precision Barometer", health: 99, lastCalibrated: "2026-01-08" },
        wind: { model: "Ultrasonic Anemometer", health: 96, lastCalibrated: "2025-11-19" },
        rain: { model: "Tipping Bucket 0.5mm", health: 97, lastCalibrated: "2026-01-08" },
        power: { batteryV: 12.9, solarW: 36, uptimeDays: 240 }
      }
    }
  },
  {
    id: "JAI-01",
    name: "Jaipur Sanganer AWS",
    city: "Jaipur",
    state: "Rajasthan",
    region: "East Rajasthan / Semi-Arid",
    lat: 26.8286,
    lng: 75.8056,
    elevation: 385,
    wmoId: "42348",
    neighbors: ["DEL-01", "AMD-01"],
    climate: { t: 33.2, h: 36, p: 1004.8, wind: 9.4, diurnalRange: 17.2 },
    hardware: {
      stationModel: "Desert-AWS High-Temp",
      controller: "ESP32 Industrial Grade",
      firmware: "v4.0.1",
      sensors: {
        temp: { model: "High-Temp PT100 (Up to 70C)", health: 98, lastCalibrated: "2026-02-05" },
        humidity: { model: "Dust-Proof Capacitive", health: 92, lastCalibrated: "2025-12-14" },
        pressure: { model: "Barometer Vaisala PTB110", health: 99, lastCalibrated: "2026-01-12" },
        wind: { model: "Ultrasonic Sealed", health: 95, lastCalibrated: "2025-10-30" },
        rain: { model: "Tipping Bucket with Sand Shield", health: 96, lastCalibrated: "2026-02-05" },
        power: { batteryV: 13.4, solarW: 50, uptimeDays: 320 }
      }
    }
  },
  {
    id: "AMD-01",
    name: "Ahmedabad Airport AWS",
    city: "Ahmedabad",
    state: "Gujarat",
    region: "Gujarat Plains",
    lat: 23.0734,
    lng: 72.6347,
    elevation: 58,
    wmoId: "42647",
    neighbors: ["JAI-01", "BOM-01"],
    climate: { t: 32.6, h: 46, p: 1006.8, wind: 11.2, diurnalRange: 15.0 },
    hardware: {
      stationModel: "AWS-IMD Mk-IV",
      controller: "ESP32 + 4G Gateway",
      firmware: "v3.9.0",
      sensors: {
        temp: { model: "PT100 RTD", health: 96, lastCalibrated: "2026-01-18" },
        humidity: { model: "Capacitive Polymer", health: 93, lastCalibrated: "2026-01-18" },
        pressure: { model: "Digital Barometer", health: 98, lastCalibrated: "2026-01-18" },
        wind: { model: "Cup Anemometer + Vane", health: 94, lastCalibrated: "2025-11-25" },
        rain: { model: "Tipping Bucket 0.2mm", health: 97, lastCalibrated: "2026-01-18" },
        power: { batteryV: 12.8, solarW: 34, uptimeDays: 215 }
      }
    }
  },
  {
    id: "COK-01",
    name: "Kochi Marine AWS",
    city: "Kochi",
    state: "Kerala",
    region: "Coastal Kerala / Monsoon Gateway",
    lat: 9.9312,
    lng: 76.2673,
    elevation: 4,
    wmoId: "43353",
    neighbors: ["BLR-IMD", "MAA-01"],
    climate: { t: 29.5, h: 84, p: 1009.5, wind: 14.5, diurnalRange: 6.8 },
    hardware: {
      stationModel: "Coastal-AWS MarineGuard",
      controller: "ESP32-S3 IP67",
      firmware: "v4.1.2",
      sensors: {
        temp: { model: "Waterproof PT100", health: 97, lastCalibrated: "2026-02-12" },
        humidity: { model: "Condensation-Resistant Film", health: 95, lastCalibrated: "2026-02-12" },
        pressure: { model: "Precision Marine Barometer", health: 99, lastCalibrated: "2026-02-12" },
        wind: { model: "Ultrasonic 2D Heated", health: 98, lastCalibrated: "2026-02-12" },
        rain: { model: "Dual Siphon Tipping Bucket", health: 98, lastCalibrated: "2026-02-12" },
        power: { batteryV: 12.7, solarW: 32, uptimeDays: 180 }
      }
    }
  },
  {
    id: "BBI-01",
    name: "Bhubaneswar Coastal AWS",
    city: "Bhubaneswar",
    state: "Odisha",
    region: "Coastal Odisha / Cyclone Belt",
    lat: 20.2961,
    lng: 85.8245,
    elevation: 45,
    wmoId: "42971",
    neighbors: ["CCU-01", "HYD-01"],
    climate: { t: 30.5, h: 74, p: 1007.2, wind: 13.0, diurnalRange: 10.2 },
    hardware: {
      stationModel: "Cyclone-Ready AWS Mk-V",
      controller: "ESP32-DualCore + SatCom Backhaul",
      firmware: "v4.2.0-cyc",
      sensors: {
        temp: { model: "Ruggedized RTD Class A", health: 98, lastCalibrated: "2026-01-25" },
        humidity: { model: "Sealed Capacitive Sensor", health: 96, lastCalibrated: "2026-01-25" },
        pressure: { model: "High-Rate Barometer (10 Hz capable)", health: 100, lastCalibrated: "2026-01-25" },
        wind: { model: "Gale-Proof Ultrasonic (Up to 320 km/h)", health: 99, lastCalibrated: "2026-01-25" },
        rain: { model: "High-Intensity Rain Gauge", health: 97, lastCalibrated: "2026-01-25" },
        power: { batteryV: 13.3, solarW: 42, uptimeDays: 295 }
      }
    }
  }
];

export function getStationById(id) {
  return STATIONS.find((s) => s.id === id) || STATIONS[0];
}

export function getAllStations() {
  return STATIONS;
}
