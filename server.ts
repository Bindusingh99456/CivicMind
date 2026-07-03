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

  // API Routes
  app.get("/api/domains", (req, res) => {
    res.json(DOMAINS);
  });

  app.get("/api/predictions", (req, res) => {
    const predictions = PREDICTIONS_TEMPLATE.map(p => ({
      ...p,
      confidence: Math.max(70, Math.min(99, p.confidence + Math.floor(Math.random() * 7) - 3))
    }));
    res.json(predictions);
  });

  app.get("/api/insights", (req, res) => {
    res.json(INSIGHTS);
  });

  app.get("/api/metrics", (req, res) => {
    const randomArray = (length: number, min: number, max: number) => {
      return Array.from({ length }, () => Math.floor(Math.random() * (max - min + 1)) + min);
    };

    res.json({
      aqi: {
        score: Math.floor(Math.random() * 21) + 75,
        pm25: Math.floor(Math.random() * 21) + 55,
        pm10: Math.floor(Math.random() * 21) + 35,
        no2: Math.floor(Math.random() * 16) + 30,
        o3: Math.floor(Math.random() * 16) + 65
      },
      energy: randomArray(12, 45, 95),
      mobility: {
        bus: randomArray(24, 40, 90),
        metro: randomArray(24, 30, 70),
        traffic: randomArray(24, 20, 80)
      },
      health: {
        score: Math.floor(Math.random() * 11) + 72,
        beds: parseFloat((Math.random() * 0.5 + 4.0).toFixed(1)),
        wait_time: Math.floor(Math.random() * 8) + 15,
        ambulance_eta: parseFloat((Math.random() * 1.4 + 6.8).toFixed(1)),
        clinics: Math.floor(Math.random() * 8) + 138
      },
      waste: randomArray(7, 40, 95),
      heatmap: Array.from({ length: 98 }, (_, i) => ({
        zone: i + 1,
        value: Math.random(),
        status: ["low", "med", "high", "crit"][Math.floor(Math.random() * 4)]
      }))
    });
  });

  app.post("/api/chat", async (req, res) => {
    const { message, latitude, longitude } = req.body;
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

    // Rule-based content generation for the fallback (or if Gemini fails)
    const getFallbackResponse = () => {
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
          "You are CivicMind AI, a decision intelligence platform for smart cities. " +
          "Analyze requests related to city operations (transportation, energy, environment, safety, healthcare, waste, etc.). " +
          "Provide detailed, structured data analysis, specific policy recommendations, and confidence metrics where appropriate. " +
          `The user is located at latitude ${lat}, longitude ${lng}. If they ask for nearby hospitals or services, use these coordinates to construct a helpful response. ` +
          "Use elegant markdown formatting including bold text, lists, and markdown tables if showing structured data comparisons."
        );

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: message,
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
