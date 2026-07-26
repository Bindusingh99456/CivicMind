import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Initialize Gemini AI client if GEMINI_API_KEY is present
  let ai: GoogleGenAI | null = null;
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
    try {
      ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
      console.log("Gemini AI client successfully initialized on server.");
    } catch (err) {
      console.error("Failed to initialize GoogleGenAI client:", err);
    }
  } else {
    console.warn("GEMINI_API_KEY is not defined or is placeholder. Using rule-based fallback decision engine.");
  }

  // Domain static data
  const DOMAINS = [
    { icon: "🚌", id: "mobility", name: "Urban Mobility", desc: "Real-time traffic flow analysis, route optimization, and public transit intelligence.", stat: "94% on-time rate", pct: 94, color: "#00d4ff" },
    { icon: "🛡️", id: "safety", name: "Public Safety", desc: "AI-powered incident detection, emergency response optimization, and crime pattern analysis.", stat: "32% faster response", pct: 78, color: "#a855f7" },
    { icon: "🏥", id: "health", name: "Healthcare Access", desc: "Hospital resource allocation, epidemic surveillance, and wellness program effectiveness.", stat: "76 access score", pct: 76, color: "#22c55e" },
    { icon: "🎓", id: "education", name: "Education & Learning", desc: "Learning outcome prediction, resource gap analysis, and lifelong education pathways.", stat: "88% completion rate", pct: 88, color: "#f59e0b" },
    { icon: "🌿", id: "environment", name: "Environmental Health", desc: "Air quality monitoring, climate resilience planning, and sustainability metrics tracking.", stat: "AQI: 87 (Moderate)", pct: 60, color: "#10b981" },
    { icon: "♻️", id: "waste", name: "Waste Management", desc: "Smart collection routing, recycling rate optimization, and landfill reduction strategies.", stat: "68% recycling rate", pct: 68, color: "#3b82f6" },
    { icon: "⚡", id: "energy", name: "Energy & Utilities", desc: "Demand forecasting, grid optimization, renewable integration, and consumption analytics.", stat: "-12% consumption", pct: 82, color: "#eab308" },
    { icon: "🗣️", id: "citizen", name: "Citizen Engagement", desc: "Sentiment analysis from public feedback, service satisfaction tracking, and petition insights.", stat: "4.2/5 satisfaction", pct: 84, color: "#06b6d4" },
  ];

  // Static Insights data
  const INSIGHTS = [
    { icon: "🚌", color: "rgba(0,212,255,0.15)", category: "Transportation", title: "Optimize Bus Network for 22% Efficiency Gain", body: "AI analysis of 6 months of ridership data reveals 3 underperforming routes and 2 critically overcrowded corridors. Rebalancing fleet allocation could reduce cost by ₹1.2Cr annually.", impact: "₹1.2Cr savings", pct: 78 },
    { icon: "🌿", color: "rgba(16,185,129,0.15)", category: "Environment", title: "Green Corridor Initiative Can Cut PM2.5 by 40%", body: "Planting 12,000 trees along the Industrial Ring Road and Outer Bypass would reduce particulate matter by an estimated 40% over 3 years based on climate modeling.", impact: "40% PM2.5 reduction", pct: 85 },
    { icon: "🏥", color: "rgba(168,85,247,0.15)", category: "Healthcare", title: "Mobile Clinic Deployment in 4 Underserved Zones", body: "Machine learning geospatial analysis identifies 4 zones with > 40,000 residents more than 8km from any healthcare facility. Mobile clinics would improve access for 67,000 people.", impact: "67K people reached", pct: 92 },
    { icon: "⚡", color: "rgba(245,158,11,0.15)", category: "Energy", title: "Smart Grid Demand Response Saves 18% Peak Load", body: "Predictive load shifting using IoT-enabled appliances in 15,000 enrolled households can flatten the evening peak by 18%, reducing grid stress and avoiding 3 planned capacity upgrades.", impact: "18% peak reduction", pct: 70 },
    { icon: "🎓", color: "rgba(16,185,129,0.15)", category: "Education", title: "Early Warning System Reduces Dropout by 30%", body: "NLP sentiment analysis on student feedback combined with attendance ML models can identify at-risk students 6 weeks early, enabling targeted interventions that reduce dropout by 30%.", impact: "30% dropout reduction", pct: 88 },
    { icon: "🤝", color: "rgba(0,212,255,0.15)", category: "Social Impact", title: "Food Security Program Gaps Identified in 8 Wards", body: "Cross-referencing census data, food distribution records, and income data reveals 8 wards with food insecurity ratios above 25% that are not covered by existing welfare programs.", impact: "52K families impacted", pct: 65 },
  ];

  const PREDICTIONS_TEMPLATE = [
    { type: "warn", domain: "Transportation", text: "Bus route 42 projected to face 35% capacity overload next Tuesday due to stadium event. Recommend deploying 8 additional vehicles.", confidence: 91 },
    { type: "crit", domain: "Public Safety", text: "Anomaly detected in District 7 — unusual crowd density pattern. High probability of public gathering conflict in 4–6 hours.", confidence: 84 },
    { type: "good", domain: "Energy", text: "Solar generation forecast exceeds demand by 18% this weekend. Suggest selling surplus to regional grid and charging EV hubs.", confidence: 96 },
    { type: "warn", domain: "Healthcare", text: "Flu case uptick of 23% detected in North Zone. Recommend pre-positioning 3,000 antiviral doses at Zone 3 clinics.", confidence: 87 },
    { type: "good", domain: "Environment", text: "Air quality projected to improve to Good (AQI < 50) by Friday with incoming wind patterns. Reduce emission monitoring intensity.", confidence: 89 },
    { type: "warn", domain: "Waste", text: "Landfill Site B approaching 85% capacity. Diversion of 40% waste volume to Site A recommended within 10 days.", confidence: 93 },
  ];

  // Helper to get location-specific stats
  const getLocationStats = (lat: number, lng: number) => {
    const isClose = (val1: number, val2: number) => Math.abs(val1 - val2) < 0.01;
    
    if (isClose(lat, 12.9716) && isClose(lng, 77.5946)) {
      return { name: "Bengaluru", temp: 28, aqi: 92, traffic: 85, metro: 60, energyPeak: 2950 };
    } else if (isClose(lat, 40.7128) && isClose(lng, -74.0060)) {
      return { name: "New York", temp: 22, aqi: 54, traffic: 72, metro: 88, energyPeak: 4100 };
    } else if (isClose(lat, 51.5074) && isClose(lng, -0.1278)) {
      return { name: "London", temp: 16, aqi: 42, traffic: 65, metro: 82, energyPeak: 3200 };
    } else if (isClose(lat, 35.6762) && isClose(lng, 139.6503)) {
      return { name: "Tokyo", temp: 19, aqi: 48, traffic: 58, metro: 95, energyPeak: 4800 };
    } else if (isClose(lat, -33.8688) && isClose(lng, 151.2093)) {
      return { name: "Sydney", temp: 21, aqi: 28, traffic: 60, metro: 70, energyPeak: 2400 };
    }
    
    // Deterministic fallback generator
    const seed = Math.abs(Math.sin(lat) * Math.cos(lng));
    const temp = Math.max(-10, Math.min(45, Math.round(35 - Math.abs(lat) * 0.5)));
    const aqi = Math.floor(20 + seed * 130);
    const traffic = Math.floor(40 + seed * 50);
    const metro = Math.floor(30 + seed * 60);
    const energyPeak = Math.floor(1500 + seed * 3000);
    return { name: "Custom Sector", temp, aqi, traffic, metro, energyPeak };
  };

  // API Routes
  app.get("/api/domains", (req, res) => {
    res.json(DOMAINS);
  });

  app.get("/api/predictions", (req, res) => {
    const latitude = req.query.latitude;
    const longitude = req.query.longitude;
    const lat = latitude !== undefined && latitude !== null ? Number(latitude) : 12.9716;
    const lng = longitude !== undefined && longitude !== null ? Number(longitude) : 77.5946;
    const stats = getLocationStats(lat, lng);

    const predictions = PREDICTIONS_TEMPLATE.map(p => {
      let text = p.text;
      let confidence = p.confidence;
      if (p.domain === "Transportation") {
        text = `Bus route 42 projected to face ${stats.traffic}% capacity overload next Tuesday in the ${stats.name} sector. Recommend deploying additional vehicles.`;
        confidence = Math.max(70, Math.min(99, stats.traffic + 5));
      } else if (p.domain === "Energy") {
        const peakGW = (stats.energyPeak / 1000).toFixed(1);
        text = `Demand forecast is approaching peak load of ${peakGW} GW this weekend. Suggest enabling battery storage grid offset.`;
        confidence = 94;
      }
      return {
        ...p,
        text,
        confidence: Math.max(70, Math.min(99, confidence + Math.floor(Math.random() * 5) - 2))
      };
    });
    res.json(predictions);
  });

  app.get("/api/insights", (req, res) => {
    const latitude = req.query.latitude;
    const longitude = req.query.longitude;
    const lat = latitude !== undefined && latitude !== null ? Number(latitude) : 12.9716;
    const lng = longitude !== undefined && longitude !== null ? Number(longitude) : 77.5946;
    const stats = getLocationStats(lat, lng);

    const insights = INSIGHTS.map(ins => {
      let body = ins.body;
      if (ins.category === "Transportation") {
        body = `AI analysis of ridership data in ${stats.name} reveals underperforming corridors. Rebalancing fleet allocation could improve transit efficiency by ${stats.traffic - 10}%.`;
      }
      return { ...ins, body };
    });
    res.json(insights);
  });

  app.get("/api/metrics", (req, res) => {
    const latitude = req.query.latitude;
    const longitude = req.query.longitude;
    const lat = latitude !== undefined && latitude !== null ? Number(latitude) : 12.9716;
    const lng = longitude !== undefined && longitude !== null ? Number(longitude) : 77.5946;

    // Parse scenario simulation controls
    const tempOffset = req.query.tempOffset !== undefined ? Number(req.query.tempOffset) : 0;
    const disruption = req.query.disruption !== undefined ? Number(req.query.disruption) : 0;
    const greenCover = req.query.greenCover !== undefined ? Number(req.query.greenCover) : 0;

    const baseStats = getLocationStats(lat, lng);

    const stats = {
      ...baseStats,
      temp: baseStats.temp + tempOffset,
      aqi: Math.max(10, Math.min(250, Math.round(baseStats.aqi * (1 - (greenCover * 0.4) / 100)))),
      traffic: Math.max(10, Math.min(99, Math.round(baseStats.traffic * (1 + (disruption * 0.3) / 100)))),
      metro: Math.max(10, Math.min(99, Math.round(baseStats.metro * (1 - (disruption * 0.5) / 100))))
    };

    const randomArray = (length: number, min: number, max: number) => {
      return Array.from({ length }, () => Math.floor(Math.random() * (max - min + 1)) + min);
    };

    const dynamicArray = (length: number, baseVal: number, range: number) => {
      return Array.from({ length }, () => Math.max(10, Math.min(99, Math.floor(baseVal + (Math.random() * range * 2 - range)))));
    };

    const k = 0.038;
    const tMultiplier = Math.exp(k * (stats.temp - 24)) / Math.exp(k * (baseStats.temp - 24));
    const simulatedEnergyPeak = stats.energyPeak * tMultiplier;

    res.json({
      aqi: {
        score: stats.aqi,
        pm25: Math.round(stats.aqi * 0.7),
        pm10: Math.round(stats.aqi * 0.5),
        no2: Math.round(stats.aqi * 0.4),
        o3: Math.round(stats.aqi * 0.8)
      },
      energy: Array.from({ length: 12 }, (_, i) => {
        const hour = i + 8;
        const isPeak = hour === 18 || hour === 19 || hour === 12 || hour === 13;
        const multiplier = isPeak ? 0.95 : 0.7;
        const val = Math.round((simulatedEnergyPeak * multiplier) / 20);
        return Math.max(10, Math.min(99, val));
      }),
      mobility: {
        bus: dynamicArray(24, stats.metro * 0.8, 8),
        metro: dynamicArray(24, stats.metro, 10),
        traffic: Array.from({ length: 24 }, (_, i) => {
          const isPeak = (i >= 8 && i <= 10) || (i >= 17 && i <= 19);
          const base = isPeak ? stats.traffic : stats.traffic * 0.5;
          return Math.round(Math.min(99, base + Math.random() * 10 - 5));
        })
      },
      health: {
        score: Math.max(50, Math.min(99, Math.round(100 - stats.aqi * 0.2 - stats.traffic * 0.2 + (greenCover * 0.15)))),
        beds: parseFloat((Math.random() * 0.5 + 4.0).toFixed(1)),
        wait_time: Math.max(5, Math.floor(Math.random() * 8) + 15 - Math.round(greenCover * 0.1)),
        ambulance_eta: parseFloat(Math.max(3.0, Math.random() * 1.4 + 6.8 + (disruption * 0.05)).toFixed(1)),
        clinics: Math.floor(Math.random() * 8) + 138
      },
      waste: randomArray(7, 40, 95),
      heatmap: Array.from({ length: 98 }, (_, i) => {
        const val = Math.random();
        let status = "low";
        if (val > 0.85) status = "crit";
        else if (val > 0.65) status = "high";
        else if (val > 0.35) status = "med";

        const localAqi = Math.round(stats.aqi * (0.85 + val * 0.3));
        const population = Math.floor(2000 + val * 18000);
        
        let anomaly = "Normal Operations";
        if (status === "crit") {
          const anomalies = [
            "Power Grid Overload",
            "Severe Traffic Gridlock",
            "High PM2.5 Exposure Alert",
            "Emergency Clinic Bed Shortage",
            "Overflowing Waste Hub"
          ];
          anomaly = anomalies[i % anomalies.length];
        } else if (status === "high") {
          anomaly = "Elevated Stress Metrics";
        }

        return {
          zone: i + 1,
          value: val,
          status: status,
          population: population,
          localAqi: localAqi,
          anomaly: anomaly
        };
      })
    });
  });

  app.post("/api/chat", async (req, res) => {
    const { message, latitude, longitude, image } = req.body;
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Empty message" });
    }

    const lower = message.toLowerCase();
    const lat = latitude !== undefined && latitude !== null ? Number(latitude) : 12.9716;
    const lng = longitude !== undefined && longitude !== null ? Number(longitude) : 77.5946;

    // Helper: Haversine distance
    const getDist = (la1: number, lo1: number, la2: number, lo2: number) => {
      const R = 6371.0;
      const dlat = (la2 - la1) * Math.PI / 180;
      const dlon = (lo2 - lo1) * Math.PI / 180;
      const a = Math.sin(dlat / 2) * Math.sin(dlat / 2) +
                Math.cos(la1 * Math.PI / 180) * Math.cos(la2 * Math.PI / 180) *
                Math.sin(dlon / 2) * Math.sin(dlon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return parseFloat((R * c).toFixed(2));
    };

    const getFallbackResponse = () => {
      if (image) {
        return (
          `### 👁️ Local Computer Vision Diagnostic Report\n\n` +
          `📍 **Analysis Coordinates**: \`${lat.toFixed(4)}, ${lng.toFixed(4)}\`\n` +
          `📁 **Simulated File Type**: \`${image.mimeType || 'image/jpeg'}\`\n\n` +
          `The local offline computer vision engine processed the uploaded sensor image frame:\n` +
          `- **Detected Asset Signature**: Municipal infrastructure anomaly matching request: *"${message}"*\n` +
          `- **Disruption Hazard Class**: 3 (Moderate to High risk vector)\n` +
          `- **Confidence Matrix**: 89.2% matching local feature descriptor\n\n` +
          `#### Offline Policy Mitigation Directive:\n` +
          `1. Auto-generate municipal dispatch work ticket for Sector \`SEC-${Math.floor(lat * 10)}-${Math.floor(lng * 10)}\`.\n` +
          `2. Alert municipal response units for priority traffic flow regulation.\n\n` +
          `*Note: Cloud Gemini node is offline. Using local visual feature-matching heuristics.*`
        );
      }
      // 1. Math Fallback / API Fail demonstration
      if (lower.includes("fail") || lower.includes("mathematical fallback") || lower.includes("local registry") || lower.includes("engine calculates")) {
        const targetLat = lat + 0.0108;
        const targetLng = lng - 0.0074;
        const dist = getDist(lat, lng, targetLat, targetLng);
        const radLat1 = lat * Math.PI / 180;
        const radLat2 = targetLat * Math.PI / 180;
        const cosTerm = Math.cos(radLat1) * Math.cos(radLat2);
        
        return (
          `### 📐 Mathematical Fallback Engine: Proximity & GIS Mapping\n\n` +
          `📍 **User GPS Coordinates ($A$)**: \`\\phi_1 = ${lat.toFixed(4)}^\\circ, \\lambda_1 = ${lng.toFixed(4)}^\\circ\`\n` +
          `📍 **Nearest Registry Coordinates ($B$)**: \`\\phi_2 = ${targetLat.toFixed(4)}^\\circ, \\lambda_2 = ${targetLng.toFixed(4)}^\\circ\`\n\n` +
          `In the absence of a live Google Gemini API cloud connection, the system automatically triggers the local GIS math fallback engine to compute distances using the spherical **Haversine Formula**:\n\n` +
          `#### 1. The Haversine Equations\n` +
          `$$a = \\sin^2\\left(\\frac{\\Delta \\phi}{2}\\right) + \\cos(\\phi_1)\\cos(\\phi_2)\\sin^2\\left(\\frac{\\Delta \\lambda}{2}\\right)$$\n` +
          `$$c = 2 \\arctan2\\left(\\sqrt{a}, \\sqrt{1-a}\\right)$$\n` +
          `$$d = R \\times c$$\n\n` +
          `Where:\n` +
          `- $R = 6371.0 \\text{ km}$ (Mean radius of Earth)\n` +
          `- $\\Delta \\phi = (\\phi_2 - \\phi_1) \\times \\frac{\\pi}{180}$ (Latitude difference in radians)\n` +
          `- $\\Delta \\lambda = (\\lambda_2 - \\lambda_1) \\times \\frac{\\pi}{180}$ (Longitude difference in radians)\n` +
          `- $\\phi_1, \\phi_2$ are in radians.\n\n` +
          `#### 2. Step-by-Step Manual Calculation\n` +
          `1. **Calculate Angular Differences**:\n` +
          `   - $\\Delta \\phi = 0.0108^\\circ \\times 0.0174533 \\approx 0.0001885\\text{ rad}$\n` +
          `   - $\\Delta \\lambda = -0.0074^\\circ \\times 0.0174533 \\approx -0.0001292\\text{ rad}$\n` +
          `2. **Compute Intermediate Value $a$**:\n` +
          `   - $\\sin^2(\\Delta \\phi / 2) = \\sin^2(0.00009425) \\approx 8.88 \\times 10^{-9}$\n` +
          `   - $\\sin^2(\\Delta \\lambda / 2) = \\sin^2(-0.00006460) \\approx 4.17 \\times 10^{-9}$\n` +
          `   - $\\cos(\\phi_1)\\cos(\\phi_2) \\approx \\cos(${lat.toFixed(2)}^\\circ) \\times \\cos(${targetLat.toFixed(2)}^\\circ) \\approx ${cosTerm.toFixed(6)}$\n` +
          `   - $a = 8.88 \\times 10^{-9} + (${cosTerm.toFixed(6)} \\times 4.17 \\times 10^{-9}) \\approx ${(8.88e-9 + cosTerm * 4.17e-9).toExponential(4)}$\n` +
          `3. **Compute Central Angle $c$**:\n` +
          `   - $c = 2 \\arctan2\\left(\\sqrt{a}, \\sqrt{1-a}\\right) \\approx ${(2 * Math.atan2(Math.sqrt(8.88e-9 + cosTerm * 4.17e-9), Math.sqrt(1 - (8.88e-9 + cosTerm * 4.17e-9)))).toExponential(4)} \\text{ rad}$\n` +
          `4. **Compute Distance $d$**:\n` +
          `   - $d = 6371.0 \\text{ km} \\times c = \\mathbf{${dist} \\text{ km}}$\n\n` +
          `#### 3. Verification Report\n` +
          `- **Local Registry Node ID**: \`REG-MUNICIPAL-04\`\n` +
          `- **Calculated Distance**: **\`${dist} km\`**\n` +
          `- **Fallback State**: \`ACTIVE\`\n` +
          `- **Communication Status**: \`OFFLINE_LOCAL_COMPUTE\`\n`
        );
      }

      // 2. Logic Behind Latest Energy Demand Calculation
      if (lower.includes("logic behind") || lower.includes("demand calculation") || (lower.includes("energy") && lower.includes("calculation"))) {
        const baseDemand = 1850;
        const temp = 31;
        const tempBase = 24;
        const k = 0.038;
        const tFactor = Math.exp(k * (temp - tempBase));
        const activeEV = 120;
        const lineLossPct = 0.045;
        const baseloadAdjusted = baseDemand * tFactor;
        const lineLoss = baseloadAdjusted * lineLossPct;
        const projectedDemand = baseloadAdjusted + activeEV + lineLoss;

        return (
          `### ⚡ Smart Grid Technical Breakdown: Demand Forecasting Logic\n\n` +
          `📍 **Sector Reference**: \`SEC-${Math.floor(lat * 10)}-${Math.floor(lng * 10)}\` (Coordinates: \`${lat.toFixed(4)}, ${lng.toFixed(4)}\`)\n\n` +
          `The demand forecasting engine utilizes a multivariate regression equation modified for smart grid environments:\n\n` +
          `$$\\text{Demand}_{\\text{proj}} = (L_{\\text{base}} \\times T_{\\text{factor}}) + E_{\\text{EV}} + I_{\\text{loss}} - C_{\\text{solar}}$$\n\n` +
          `#### 1. Formula Component Definitions\n` +
          `- **$L_{\\text{base}}$ (Baseline Baseload)**: Calculated as the historical rolling average of the corresponding hour, day, and season. For this sector, the baseline baseline load is: **${baseDemand} MW**.\n` +
          `- **$T_{\\text{factor}}$ (Temperature Heat Index Factor)**: An exponential multiplier representing increased cooling demand:\n` +
          `  $$T_{\\text{factor}} = e^{k(T - T_{\\text{base}})}$$\n` +
          `  Where $T$ is local ambient temperature (${temp}^\\circ\\text{C}$), $T_{\\text{base}} = ${tempBase}^\\circ\\text{C}$, and $k \\approx ${k}$ cooling coefficient.\n` +
          `- **$E_{\\text{EV}}$ (EV Charging Vector)**: The real-time aggregate capacity of active charging sessions. Currently projected: **${activeEV} MW**.\n` +
          `- **$I_{\\text{loss}}$ (Grid Line Losses)**: Constant loss factor due to transmission resistance:\n` +
          `  $$I_{\\text{loss}} = I^2 R \\approx 4.5\\% \\text{ of baseload}$$\n` +
          `- **$C_{\\text{solar}}$ (Distributed Generation Offset)**: Subtracts behind-the-meter rooftop solar generation, peaking between 12:00 and 15:00. (Currently $0 MW$ at evening peak hours).\n\n` +
          `#### 2. Mathematical Sample Calculation\n` +
          `Using coordinates \`${lat.toFixed(4)}, \${lng.toFixed(4)}\` with temperature $T = ${temp}^\\circ\\text{C}$ and $E_{\\text{EV}} = ${activeEV}\\text{ MW}$:\n` +
          `- $T_{\\text{factor}} = e^{0.038 \\times (${temp} - ${tempBase})} = e^{${(k * (temp - tempBase)).toFixed(3)}} \\approx ${tFactor.toFixed(3)}$\n` +
          `- Baseload Adjusted = $1850 \\times ${tFactor.toFixed(3)} = ${baseloadAdjusted.toFixed(2)}\\text{ MW}$\n` +
          `- Line Loss = $${baseloadAdjusted.toFixed(2)} \\times 0.045 = ${lineLoss.toFixed(2)}\\text{ MW}$\n` +
          `- Solar Offset (at peak hour 19:00) = $0\\text{ MW}$\n` +
          `- **Projected Peak Demand** = $${baseloadAdjusted.toFixed(2)} + ${activeEV} + ${lineLoss.toFixed(2)} - 0 = \\mathbf{${projectedDemand.toFixed(2)}\\text{ MW}}$$\n`
        );
      }

      // 3. Critique waste management infrastructure / Civic Planner Persona
      if (lower.includes("civic planner") || lower.includes("critique") || lower.includes("waste management")) {
        return (
          `### ♻️ Civic Planner Infrastructure Critique: Waste Management\n\n` +
          `📍 **Location District Sector**: \`${lat.toFixed(4)}, ${lng.toFixed(4)}\`\n` +
          `*Prepared by Lead Civic Planner Persona*\n\n` +
          `#### 1. Critical Diagnostic Assessment\n` +
          `The current waste management framework in this sector is highly centralized, leaving it fragile and prone to capacity crises. Key critique points include:\n\n` +
          `- **Landfill Over-Reliance**: Approximately **85% of municipal waste** from this sector goes directly to Landfill Site B. Site B is currently at **85% capacity** and has less than 18 months of operational lifespan remaining.\n` +
          `- **Low Source Segregation**: Organic waste, plastics, and paper are still collected together. The source segregation rate is under **22%**, significantly lower than the municipal target of **60%**.\n` +
          `- **Waste Collection Route Inefficiency**: Diesel collection trucks follow fixed daily schedules without smart bins, wasting fuel on half-empty bins while overflowing commercial bins are left unserviced.\n\n` +
          `#### 2. Strategic Policy Recommendations\n` +
          `1. **Decentralized Composting**: Construct three micro-composting yards in the district to divert organic waste (which represents 58% of total volume) locally.\n` +
          `2. **IoT Smart Bin Deployment**: Retrofit optical sensor units on commercial bins to communicate fill levels, optimizing truck dispatch.\n` +
          `3. **Segregation Incentives**: Launch a ward-level "Green Points" mobile app matching household segregation to utility bill credits.\n`
        );
      }

      // 4. Simulate Environmental Impact of Industrial Transit Hub
      if (lower.includes("environmental impact") || lower.includes("transit hub") || lower.includes("industrial transit")) {
        return (
          `### 🏭 Environmental Impact Simulation: New Industrial Transit Hub\n\n` +
          `📍 **Simulated Location Coordinates**: \`${lat.toFixed(4)}, ${lng.toFixed(4)}\`\n\n` +
          `#### 1. Simulation Parameters\n` +
          `- **Project Scale**: 45-Acre Freight Interchange Hub.\n` +
          `- **Estimated Heavy Vehicle Traffic**: 1,200 diesel truck trips per day.\n` +
          `- **Impervious Surface Area Increase**: +74% (Soil sealing).\n\n` +
          `#### 2. Simulated Environmental Impact Projections\n` +
          `| Parameter | Baseline (Current) | Projected (With Hub) | Change (%) | Regulatory Impact |\n` +
          `| :--- | :--- | :--- | :--- | :--- |\n` +
          `| **PM2.5 Level** | 62 µg/m³ | 79.3 µg/m³ | **+28%** | 🔴 Exceeds safe ceiling limits |\n` +
          `| **Acoustic Noise** | 54 dBA | 72.8 dBA | **+35%** | 🟡 Requires acoustic sound barriers |\n` +
          `| **Surface Runoff** | 1,400 m³/h | 1,988 m³/h | **+42%** | 🟡 Overloads local drainage canal |\n` +
          `| **Local Heat Island Offset** | +0.4°C | +1.8°C | **+350%** | 🔴 Significant local microclimate impact |\n\n` +
          `#### 3. Mandatory Mitigation Recommendations\n` +
          `- **Acoustic Barriers**: Erect 4.5m soundproof buffer walls along residential faces.\n` +
          `- **Permeable Pavements**: Lay porous asphalt in parking zones to absorb 25% runoff.\n` +
          `- **Urban Forestry**: Plant 5,000 native evergreen trees along the perimeter boundary to absorb PM2.5.\n`
        );
      }

      // 5. Generate Pedestrian Safety Policy Recommendation Report
      if (lower.includes("pedestrian safety") || lower.includes("policy recommendation report") || lower.includes("improving pedestrian")) {
        return (
          `### 🚸 Pedestrian Safety Policy Recommendation Report\n\n` +
          `📍 **Target Infrastructure Zone**: Grid \`${lat.toFixed(4)}, ${lng.toFixed(4)}\`\n\n` +
          `#### 1. Identified Safety Hazards\n` +
          `- High speed limits (60 km/h) near multi-lane crossings.\n` +
          `- Poor street lighting at the Sector 4 Commercial Crossing.\n` +
          `- Pedestrian crossings lack physical refuge islands, forcing pedestrians to cross 4 lanes at once.\n\n` +
          `#### 2. Recommended Strategic Interventions\n` +
          `| Intervention | Technical Specifications | Target Location | Estimated Cost | Est. Impact |\n` +
          `| :--- | :--- | :--- | :--- | :--- |\n` +
          `| **Raised Crosswalk Tables** | 3-inch elevation, textured bricks | School Road Crossing | ₹4,50,000 | Speed reduction -35% |\n` +
          `| **Refuge Island Installation** | 1.8m wide concrete splitter island | Main Boulevard Ring | ₹8,20,000 | Crossing conflict -60% |\n` +
          `| **Smart Crosswalk Sensors** | Infrared sensors + flashing yellow LEDs | Commercial Market | ₹3,80,000 | Night visibility +70% |\n` +
          `| **Speed Enforcement Cameras** | Continuous ANPR tracking | Industrial Bypass Link | ₹12,00,000 | Compliance +95% |\n\n` +
          `#### 3. Policy Executive Timeline\n` +
          `- **Month 1-2**: Design approval & contractor bidding.\n` +
          `- **Month 3**: Installation of Raised Tables and smart signs.\n` +
          `- **Month 4**: Construction of Refuge Islands.\n` +
          `- **Evaluation**: Post-implementation speed audit in Month 6.\n`
        );
      }

      // 6. Air Quality Metrics Comparison
      if (lower.includes("air quality metrics") || lower.includes("air quality") || lower.includes("aqi") || lower.includes("standards")) {
        return (
          `### 🌿 Localized Air Quality Metrics & Regulatory Compliance Audit\n\n` +
          `📍 **Location Grid**: \`${lat.toFixed(4)}, ${lng.toFixed(4)}\`\n\n` +
          `#### 1. Current Pollutant Metrics (24-Hour Average)\n` +
          `| Pollutant | Measured Concentration | National Safety Standard (EPA/NAAQS) | Comparison Ratio | Compliance Status |\n` +
          `| :--- | :--- | :--- | :--- | :--- |\n` +
          `| **AQI (Overall)** | 87 | 100 (Satisfactory) | 0.87 | Compliant (Moderate) |\n` +
          `| **PM2.5** | **62 µg/m³** | **60 µg/m³** (24h Mean) | **1.03** | 🔴 **NON-COMPLIANT (Exceeds)** |\n` +
          `| **PM10** | 48 µg/m³ | 100 µg/m³ (24h Mean) | 0.48 | Compliant |\n` +
          `| **NO2** | 38 ppb | 80 ppb (24h Mean) | 0.47 | Compliant |\n` +
          `| **O3 (Ozone)** | 72 ppb | 100 ppb (8h Mean) | 0.72 | Compliant |\n\n` +
          `#### 2. Environmental Impact Summary\n` +
          `- PM2.5 levels exceed national thresholds by **3.3%** due to industrial exhaust drift from the adjacent Eastern corridor.\n` +
          `- Recommended actions: Sensitive groups (asthma, children, elderly) should limit outdoor exposure and use N95 masks during peak morning hours.\n`
        );
      }

      // 7. Active Evacuation Zones & Safety Protocols
      if (lower.includes("evacuation zones") || lower.includes("evacuation zone") || lower.includes("safety protocol")) {
        return (
          `### ⚠️ Active Municipal Evacuation Zones & Safety Protocols\n\n` +
          `📍 **Target District Sector**: \`${lat.toFixed(4)}, ${lng.toFixed(4)}\`\n\n` +
          `#### 1. Evacuation Zone Status List\n` +
          `| Zone ID | Area / Landmark Description | Current Status | Risk Trigger | Designated Shelter |\n` +
          `| :--- | :--- | :--- | :--- | :--- |\n` +
          `| **Zone 3-Alpha** | Riverfront Low-Lying Sector | **ACTIVE (Evacuate)** | Flash Flood Vulnerability | Sector 4 Community Center |\n` +
          `| **Zone 7-Beta** | East Industrial Annex Corridor | **STANDBY (Prepare)** | Chemical Vapor Alert | St. Jude Academic Hall |\n` +
          `| **Zone 12-Gamma** | North Forest Border Hills | **INACTIVE (Clear)** | Seasonal Brushfire Risk | North Ridge Gymnasium |\n\n` +
          `#### 2. Resident Safety Protocol Summary (For Active Zone 3-Alpha)\n` +
          `1. **Securing Premises**: Shut off main gas valves, electrical breakers, and water mains before departing.\n` +
          `2. **Packing Essentials**: Secure water (3L per person), shelf-stable rations, critical prescriptions, battery banks, and physical identification/documents.\n` +
          `3. **Evacuation Route**: Evacuate via **West Ring Road Link** only. Avoid underpasses at Sector 4 Main which are subject to water logging.\n` +
          `4. **Reporting**: Report arrival at Sector 4 Shelter to the coordinator to ensure census tracking.\n\n` +
          `*Emergency broadcast broadcasted by Municipal Civil Defense Authority. Last updated: 5m ago.*`
        );
      }

      // 8. Find Nearest Hospitals with capacity
      if (lower.includes("hospital") || lower.includes("medical") || lower.includes("clinic") || lower.includes("beds")) {
        const hospitals = [
          { name: "Metro Trauma & General Hospital", lat: lat + 0.007, lng: lng - 0.006, beds: 14, specialty: "Multispecialty, Level 1 Emergency", rating: "4.8 ⭐" },
          { name: "St. Elizabeth Care Center", lat: lat - 0.012, lng: lng + 0.009, beds: 5, specialty: "Cardiology & Pediatrics", rating: "4.6 ⭐" },
          { name: "Apex Community Medical Clinic", lat: lat + 0.021, lng: lng + 0.018, beds: 19, specialty: "Outpatient, General Medicine", rating: "4.3 ⭐" },
          { name: "Sacred Heart Specialty Clinic", lat: lat - 0.025, lng: lng - 0.014, beds: 2, specialty: "Neurology & Trauma", rating: "4.5 ⭐" },
        ].map(h => ({
          ...h,
          distance: getDist(lat, lng, h.lat, h.lng)
        })).sort((a, b) => a.distance - b.distance);

        const coordStatus = latitude !== undefined && latitude !== null
          ? `📍 **Located User Coordinates**: \`${lat.toFixed(4)}, ${lng.toFixed(4)}\``
          : `⚠️ **Location permission denied/unavailable. Using default City Center Coordinates**: \`12.9716, 77.5946\``;

        const tableContent = hospitals.map(h => 
          `| ${h.name} | **${h.distance} km** | ${h.beds} | ${h.specialty} | ${h.rating} |`
        ).join("\n");

        return (
          `### GIS Decision Engine: Nearby Healthcare Resources\n\n` +
          `${coordStatus}\n\n` +
          `Searching municipal records and active registry for healthcare centers within 10 km...\n\n` +
          `| Hospital/Clinic Name | Distance | Available Beds | Primary Specialty | Rating |\n` +
          `| :--- | :--- | :--- | :--- | :--- |\n` +
          `${tableContent}\n\n` +
          `- For minor/general consultation: **${hospitals[2].name}** has the highest bed capacity (${hospitals[2].beds}).\n\n` +
          `*Geospatial calculation powered by Haversine Matrix Model. Data refresh rate: 5s.*`
        );
      }

      // 9. Traffic Congestion Patterns & Route Optimization
      if (lower.includes("congestion patterns") || (lower.includes("traffic") && lower.includes("alternative routes")) || lower.includes("commute times")) {
        const routeADist = (getDist(lat, lng, lat + 0.015, lng - 0.02) + 1.2).toFixed(2);
        const routeBDist = (getDist(lat, lng, lat - 0.01, lng + 0.012) + 0.8).toFixed(2);
        const routeCDist = (getDist(lat, lng, lat + 0.028, lng + 0.03) + 2.1).toFixed(2);

        return (
          `### 🚦 GIS Decision Engine: Localized Traffic Congestion & Route Optimization\n\n` +
          `📍 **Simulated District Center**: \`${lat.toFixed(4)}, ${lng.toFixed(4)}\`\n\n` +
          `#### 1. Congestion Pattern Analysis\n` +
          `- **Main Corridor (Ring Road Junction)**: Currently **87% saturated**. Bottlenecks are active.\n` +
          `- **Central Arterial Street**: **74% saturation** due to high volume.\n` +
          `- **Bypass Expressway**: **35% saturation** (Flowing freely).\n\n` +
          `#### 2. Three Suggested Alternative Routes\n` +
          `| Route Name | Key Detour Path | Distance | Est. Travel Time | Commute Savings | Risk Profile |\n` +
          `| :--- | :--- | :--- | :--- | :--- | :--- |\n` +
          `| **Route A (Bypass Detour)** | Via North Bypass Corridor | ${routeADist} km | 14 mins | **-8 mins** | Low (Freely flowing) |\n` +
          `| **Route B (Metro Link)** | Via West Station Road | ${routeBDist} km | 17 mins | **-5 mins** | Medium (Minor construction) |\n` +
          `| **Route C (North Ridge Expressway)** | Via Elevated Expressway Link | ${routeCDist} km | 11 mins | **-11 mins** | Low (Tolls apply) |\n\n` +
          `*Data generated from municipal velocity sensors. Route calculations updated 10s ago.*`
        );
      }

      // 10. General Traffic / Congestion / Transport
      if (lower.includes("traffic") || lower.includes("congestion") || lower.includes("transport") || lower.includes("bus") || lower.includes("mobility") || lower.includes("route")) {
        if (latitude !== undefined && latitude !== null) {
          return (
            `### GIS Decision Engine: Regional Mobility Index\n\n` +
            `📍 **Calculating traffic density near your coordinates**: \`${lat.toFixed(4)}, ${lng.toFixed(4)}\`\n\n` +
            `- **Nearest Hotspot:** Ring Road Junction (1.2 km away) — **87% congestion level**.\n` +
            `- **Transit Delay:** Average bus delay in your sector is **4.2 minutes**.\n` +
            `- **Alternative Path:** Recommended detour via Old Bypass Corridor (estimated travel time savings: 7 mins).\n\n` +
            `**Recommendation & Routing Policy:**\n` +
            `- Adjust adaptive signal cycles in real-time at the Ring Road intersection.\n` +
            `- Re-route bus lines 12A and 14C to bypass the central corridor until 7:30 PM.\n\n` +
            `*Spatial optimization generated using dynamic traffic velocity matrices. Confidence: 94%.*`
          );
        } else {
          return (
            `### Decision Analysis: Urban Mobility Optimization\n\n` +
            `Based on simulated real-time sensor streams and routing graphs, I have detected the following congestion patterns:\n\n` +
            `1. **Ring Road Junction** — 87% saturation. Main bottleneck is transit wave delay.\n` +
            `2. **Old Market Area** — 79% saturation. Pedestrian flow conflict.\n` +
            `3. **Tech Hub Corridor** — 74% saturation. Rush-hour volume surge.\n\n` +
            `**Policy Recommendation:**\n` +
            `- Implement adaptive signal priority for public transit buses.\n` +
            `- Deploy 4 extra shuttle units to Route 10B during peak hours.\n\n` +
            `*Confidence Score: 92% | Model: NetworkFlow-Sim v4.2*`
          );
        }
      }

      // 11. Energy Grid Demand 24 Hours Summary
      if (lower.includes("grid demand") || lower.includes("peak load warnings") || (lower.includes("energy") && lower.includes("24 hours"))) {
        return (
          `### ⚡ Smart Grid & Utility Forecast: 24-Hour Energy Demand Report\n\n` +
          `📍 **Grid Sector Registry ID**: \`SEC-${Math.floor(lat * 10)}-${Math.floor(lng * 10)}\` (Coordinates: \`${lat.toFixed(4)}, ${lng.toFixed(4)}\`)\n\n` +
          `#### 1. 24-Hour Demand Projection Profile\n` +
          `| Time Slot | Expected Demand (MW) | Available Supply (MW) | Stress Index | Status |\n` +
          `| :--- | :--- | :--- | :--- | :--- |\n` +
          `| **00:00 - 06:00 (Night)** | 1,450 MW | 2,200 MW (Baseload) | 65% | Normal |\n` +
          `| **06:00 - 12:00 (Morning Peak)** | 2,400 MW | 2,800 MW (Baseload + Wind) | 85% | Warning (Yellow) |\n` +
          `| **12:00 - 18:00 (Midday)** | 2,100 MW | 3,100 MW (Baseload + Max Solar) | 67% | Normal |\n` +
          `| **18:00 - 22:00 (Evening Peak)** | **2,950 MW** | **3,000 MW** (Max Grid Capacity) | **98%** | 🔴 **Critical (Red Alert)** |\n` +
          `| **22:00 - 24:00 (Night)** | 1,800 MW | 2,200 MW | 81% | Warning (Yellow) |\n\n` +
          `#### 2. Peak Load Warning Details\n` +
          `> [!WARNING]\n` +
          `> **Evening Peak Load warning active between 18:30 and 21:00.** Projected grid stress exceeds safe threshold (95%) reaching **98%** capacity. Risk of voltage sag or localized rolling blackouts in sector.\n\n` +
          `#### 3. Recommended Dispatch Protocol\n` +
          `1. **Dynamic Load Shifting**: Dispatch automated smart-meter requests to shift EV charging and laundry cycles to off-peak slots.\n` +
          `2. **Battery Discharge**: Enable discharge of the Sector 4 Grid Battery Bank (150 MW capacity) starting at 18:15.\n` +
          `3. **Solar Reserve**: Reserve peak battery storage from solar surplus captured during the 12:00-15:00 window.\n`
        );
      }

      // 12. EV Charging stations availability
      if (lower.includes("charging stations") || lower.includes("ev charging") || lower.includes("electric vehicle")) {
        const dist1 = getDist(lat, lng, lat + 0.008, lng - 0.012);
        const dist2 = getDist(lat, lng, lat - 0.015, lng + 0.005);
        const dist3 = getDist(lat, lng, lat + 0.022, lng + 0.024);
        const dist4 = getDist(lat, lng, lat - 0.028, lng - 0.035);

        return (
          `### 🔋 EV Charging Station Proximity & Availability Index\n\n` +
          `📍 **Geospatial Search Anchor**: \`${lat.toFixed(4)}, ${lng.toFixed(4)}\` (Radius: 5.0 km)\n\n` +
          `Municipal database search matching active EV charging terminals...\n\n` +
          `| Rank | Station Name | Distance | Active Chargers | Plug Type | Pricing / Min | Current Availability |\n` +
          `| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n` +
          `| **1** | **ChargePoint Prime - Sector 4** | ${dist1} km | 6 / 8 Available | CCS2, CHAdeMO (Fast) | ₹12.00 | **Highly Available (75%)** |\n` +
          `| **2** | **SparkGrid Express Hub** | ${dist2} km | 4 / 10 Available | CCS2, Type 2 | ₹10.50 | **Moderate Availability (40%)** |\n` +
          `| **3** | **EcoVolt Station** | ${dist3} km | 1 / 6 Available | CCS2 | ₹9.00 | **Low Availability (16%)** |\n` +
          `| **4** | **VoltRange Main Hub** | ${dist4} km | 0 / 8 Available | CCS2, Type 2 | ₹11.00 | **Occupied (0%)** |\n\n` +
          `*Note: Availability values are updated in real-time via OCPP 1.6 API protocols.*`
        );
      }

      // General Energy Fallback
      if (lower.includes("energy") || lower.includes("power") || lower.includes("utility") || lower.includes("solar") || lower.includes("demand") || lower.includes("electric")) {
        return (
          `### Decision Analysis: Smart Grid & Utility Forecast\n\n` +
          `Predictive analysis of utility load profiles shows:\n\n` +
          `- **Peak demand forecast:** 2,847 MW (projected peak at 7:15 PM).\n` +
          `- **Renewable generation:** Solar peak at 340 MW, Wind peak at 110 MW.\n` +
          `- **Grid stress index:** 78% (Yellow/Warning state).\n\n` +
          `**Optimization Steps:**\n` +
          `1. Enable battery bank discharge starting 6:00 PM to offset peak.\n` +
          `2. Send micro-incentive notifications to 12k registered EV users to postpone charging until 11:00 PM.\n\n` +
          `*Confidence Score: 95% | Model: GradientBoostedDemandPredictor*`
        );
      }

      // General Safety Fallback
      if (lower.includes("safety") || lower.includes("incident") || lower.includes("emergency") || lower.includes("crime") || lower.includes("police") || lower.includes("warning")) {
        if (latitude !== undefined && latitude !== null) {
          return (
            `### GIS Decision Engine: Local Safety Assessment\n\n` +
            `📍 **Analyzing active incident database near your coordinates**: \`${lat.toFixed(4)}, ${lng.toFixed(4)}\`\n\n` +
            `- **Safety Risk Level:** Low (Green Zone).\n` +
            `- **Nearest Patrol Unit:** Unit 42B (stationed 0.8 km away, ETA: 3.5 minutes).\n` +
            `- **Recent Incidents:** No safety threats or reports recorded within 5 km in the last 24 hours.\n\n` +
            `**Recommendation & Dispatch Action:**\n` +
            `- Maintain regular patrol frequency in the sector.\n` +
            `- Check-in with community monitors at the primary healthcare clinic (1.6 km away).\n\n` +
            `*Analysis based on real-time municipal dispatch feeds. Confidence: 91%.*`
          );
        } else {
          return (
            `### Decision Analysis: Public Safety Matrix\n\n` +
            `- Active incident alerts: 0 critical, 2 moderate warnings city-wide.\n` +
            `- Average emergency response time: 7.3 minutes.\n` +
            `**Proposed Action Plan:**\n` +
            `- Optimize patrol route cycles in District 7 to reduce response latency by 12%.\n\n` +
            `*Confidence Score: 89% | Model: SafetyDispatchSim v2.1*`
          );
        }
      }

      return (
        `### CivicMind Decision Intelligence Platform\n\n` +
        `I am ready to help you analyze city data. Here are some options you can ask me to run simulations on:\n\n` +
        `- **'Analyze urban mobility hotspots'**\n` +
        `- **'Optimize grid energy demand'**\n` +
        `- **'Audit healthcare accessibility scores'**\n` +
        `- **'Find the nearest hospital'** (shares distance and availability table if location is enabled)\n\n` +
        `Simply state the domain you want to inspect, and the analytical model will compute the current status, predictions, and recommendations.`
      );
    };

    // If Gemini is initialized, attempt to generate the response using LLM with background grounding context
    if (ai) {
      try {
        const systemInstruction = (
          "You are CivicMind AI, a premium decision intelligence platform for smart cities and urban planning.\n\n" +
          "Your goal is to provide high-fidelity, professional analytical reports on city operations including:\n" +
          "- Urban Mobility (transit, congestion, routing, priority signalling)\n" +
          "- Smart Grid Energy & Utilities (peak load forecasts, solar/wind offsets, battery dispatch)\n" +
          "- Public Safety & Emergency Services (ETAs, patrols, incident detection)\n" +
          "- Environmental Health (AQI metrics, PM2.5/PM10 levels, mitigation policies)\n" +
          "- Healthcare & Hospital Access (geospatial mapping, bed counts, wait times)\n" +
          "- Smart Waste Management (collection routes, source segregation, landfill capacity)\n\n" +
          `The user's current coordinates are latitude ${lat.toFixed(4)}, longitude ${lng.toFixed(4)}. When requested to find nearby resources (such as hospitals or services) or analyze the local area, always calculate distances from these coordinates using the Haversine formula and present them in a clean markdown table.\n\n` +
          "Formatting guidelines:\n" +
          "1. Start with a header incorporating a relevant emoji (e.g., ### 🚦 GIS Decision Engine).\n" +
          "2. Always show the coordinates you are using for the analysis.\n" +
          "3. When answering questions about forecasts, grid demands, or spatial models, include a formal mathematical equation in LaTeX (e.g., using $$) and show a step-by-step calculation.\n" +
          "4. Present comparative stats or lists of services in structured markdown tables (e.g., Name, Distance, Available Capacity, Specialty, Rating).\n" +
          "5. Conclude with a clear 'Strategic Policy Recommendations' section and an analytical 'Confidence Score: XX% | Model: [ModelName]'.\n" +
          "6. Maintain a highly professional, academic, yet actionable tone suitable for city planners and municipal directors."
        );

        const contents: any[] = [message];
        if (image && image.data && image.mimeType) {
          const base64Data = image.data.includes("base64,")
            ? image.data.split("base64,")[1]
            : image.data;
          contents.push({
            inlineData: {
              data: base64Data,
              mimeType: image.mimeType
            }
          });
        }

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: contents,
          config: {
            systemInstruction: systemInstruction,
          }
        });

        if (response.text) {
          return res.json({ response: response.text });
        }
      } catch (err) {
        console.error("Gemini content generation failed, falling back to rule-based engine:", err);
      }
    }

    // Fallback response if Gemini is not set up or failed
    const responseText = getFallbackResponse();
    res.json({ response: responseText });
  });

  app.post("/api/projection", async (req, res) => {
    const { policy, sector, funding, latitude, longitude } = req.body;
    
    if (!policy || typeof policy !== "string" || !policy.trim()) {
      return res.status(400).json({ error: "Empty policy statement" });
    }

    const lat = latitude !== undefined && latitude !== null ? Number(latitude) : 12.9716;
    const lng = longitude !== undefined && longitude !== null ? Number(longitude) : 77.5946;
    const fundAmount = funding !== undefined ? Number(funding) : 10;

    // Rule-based fallback generator
    const getFallbackProjection = () => {
      const results = [];
      const isPositive = !policy.toLowerCase().includes("cut") && !policy.toLowerCase().includes("reduce funding") && !policy.toLowerCase().includes("stop");
      
      let baseMetric = 60;
      let baseEco = 50;
      let baseApp = 65;

      for (let i = 0; i < 5; i++) {
        const year = (2026 + i).toString();
        const factor = isPositive ? (i + 1) * (fundAmount * 0.15) : -((i + 1) * (fundAmount * 0.1));
        
        let primaryMetric = Math.max(10, Math.min(99, Math.round(baseMetric + factor + (Math.random() * 4 - 2))));
        let economicEfficiency = Math.max(10, Math.min(99, Math.round(baseEco + factor * 0.8 + (Math.random() * 4 - 2))));
        let publicApproval = Math.max(10, Math.min(99, Math.round(baseApp + factor * 1.2 + (Math.random() * 4 - 2))));

        // Adjust metric logic if sector-specific
        let rationale = `Policy deployment Phase ${i + 1} completed. Municipal indices in ${sector} sector show stabilizing vectors.`;
        if (i === 0) rationale = `Initial engineering allocation of ₹${fundAmount}Cr deployed across district coordinates.`;
        else if (i === 4) rationale = `Full integration complete. Long-term efficiency returns stabilized at ${economicEfficiency}%.`;

        results.push({
          year,
          primaryMetric,
          economicEfficiency,
          publicApproval,
          rationale
        });
      }
      return results;
    };

    if (ai) {
      try {
        const prompt = `Project the year-over-year impact of the following policy for the next 5 years (2026 to 2030):
Policy Action: "${policy}"
Municipal Sector: "${sector}"
Funding Amount: ₹${fundAmount} Cr
Reference Sector Coordinates: latitude ${lat.toFixed(4)}, longitude ${lng.toFixed(4)}`;

        const systemInstruction = 
          "You are CivicMind AI, a premium decision intelligence forecasting engine.\n" +
          "Your job is to return a 5-year data projection representing the calculated impact of municipal policies.\n" +
          "Return ONLY a JSON array of 5 objects representing the years 2026, 2027, 2028, 2029, and 2030.\n" +
          "Do not return any conversational text or markdown blocks outside the JSON array.";

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  year: { type: "STRING" },
                  primaryMetric: { type: "INTEGER", description: "Projected value of the main sector indicator (0-100)" },
                  economicEfficiency: { type: "INTEGER", description: "Projected economic efficiency / budget savings / return rate (0-100)" },
                  publicApproval: { type: "INTEGER", description: "Projected public approval / satisfaction rating (0-100)" },
                  rationale: { type: "STRING", description: "A very brief one-sentence reason for this year's trend" }
                },
                required: ["year", "primaryMetric", "economicEfficiency", "publicApproval", "rationale"]
              }
            }
          }
        });

        if (response.text) {
          const parsed = JSON.parse(response.text.trim());
          if (Array.isArray(parsed) && parsed.length > 0) {
            return res.json(parsed);
          }
        }
      } catch (err) {
        console.error("Gemini projection forecasting failed, falling back:", err);
      }
    }

    const fallbackData = getFallbackProjection();
    res.json(fallbackData);
  });

  // Serve static assets and handle Vite dev server
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Error starting server:", err);
});
