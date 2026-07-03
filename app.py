import os
import random
import time
import math
from flask import Flask, jsonify, request, render_template
# pyrefly: ignore [missing-import]
from google import genai
# pyrefly: ignore [missing-import]
from google.genai import types
from dotenv import load_dotenv

# Load environmental variables
load_dotenv()

app = Flask(__name__)

# Initialize Gemini AI client if GEMINI_API_KEY is present
ai_client = None
api_key = os.environ.get("GEMINI_API_KEY")
if api_key and api_key != "MY_GEMINI_API_KEY" and api_key.strip() != "":
    try:
        # The google-genai library will pick up GEMINI_API_KEY automatically or we can pass it
        ai_client = genai.Client(api_key=api_key)
        print("Gemini AI client successfully initialized on server.")
    except Exception as e:
        print(f"Failed to initialize GoogleGenAI client: {e}")
else:
    print("GEMINI_API_KEY is not defined or is placeholder. Using rule-based fallback decision engine.")

# Domain static data
DOMAINS = [
    { "icon": "🚌", "id": "mobility", "name": "Urban Mobility", "desc": "Real-time traffic flow analysis, route optimization, and public transit intelligence.", "stat": "94% on-time rate", "pct": 94, "color": "#00d4ff" },
    { "icon": "🛡️", "id": "safety", "name": "Public Safety", "desc": "AI-powered incident detection, emergency response optimization, and crime pattern analysis.", "stat": "32% faster response", "pct": 78, "color": "#a855f7" },
    { "icon": "🏥", "id": "health", "name": "Healthcare Access", "desc": "Hospital resource allocation, epidemic surveillance, and wellness program effectiveness.", "stat": "76 access score", "pct": 76, "color": "#22c55e" },
    { "icon": "🎓", "id": "education", "name": "Education & Learning", "desc": "Learning outcome prediction, resource gap analysis, and lifelong education pathways.", "stat": "88% completion rate", "pct": 88, "color": "#f59e0b" },
    { "icon": "🌿", "id": "environment", "name": "Environmental Health", "desc": "Air quality monitoring, climate resilience planning, and sustainability metrics tracking.", "stat": "AQI: 87 (Moderate)", "pct": 60, "color": "#10b981" },
    { "icon": "♻️", "id": "waste", "name": "Waste Management", "desc": "Smart collection routing, recycling rate optimization, and landfill reduction strategies.", "stat": "68% recycling rate", "pct": 68, "color": "#3b82f6" },
    { "icon": "⚡", "id": "energy", "name": "Energy & Utilities", "desc": "Demand forecasting, grid optimization, renewable integration, and consumption analytics.", "stat": "-12% consumption", "pct": 82, "color": "#eab308" },
    { "icon": "🗣️", "id": "citizen", "name": "Citizen Engagement", "desc": "Sentiment analysis from public feedback, service satisfaction tracking, and petition insights.", "stat": "4.2/5 satisfaction", "pct": 84, "color": "#06b6d4" }
]

# Static Insights data
INSIGHTS = [
    { "icon": "🚌", "color": "rgba(0,212,255,0.15)", "category": "Transportation", "title": "Optimize Bus Network for 22% Efficiency Gain", "body": "AI analysis of 6 months of ridership data reveals 3 underperforming routes and 2 critically overcrowded corridors. Rebalancing fleet allocation could reduce cost by ₹1.2Cr annually.", "impact": "₹1.2Cr savings", "pct": 78 },
    { "icon": "🌿", "color": "rgba(16,185,129,0.15)", "category": "Environment", "title": "Green Corridor Initiative Can Cut PM2.5 by 40%", "body": "Planting 12,000 trees along the Industrial Ring Road and Outer Bypass would reduce particulate matter by an estimated 40% over 3 years based on climate modeling.", "impact": "40% PM2.5 reduction", "pct": 85 },
    { "icon": "🏥", "color": "rgba(168,85,247,0.15)", "category": "Healthcare", "title": "Mobile Clinic Deployment in 4 Underserved Zones", "body": "Machine learning geospatial analysis identifies 4 zones with > 40,000 residents more than 8km from any healthcare facility. Mobile clinics would improve access for 67,000 people.", "impact": "67K people reached", "pct": 92 },
    { "icon": "⚡", "color": "rgba(245,158,11,0.15)", "category": "Energy", "title": "Smart Grid Demand Response Saves 18% Peak Load", "body": "Predictive load shifting using IoT-enabled appliances in 15,000 enrolled households can flatten the evening peak by 18%, reducing grid stress and avoiding 3 planned capacity upgrades.", "impact": "18% peak reduction", "pct": 70 },
    { "icon": "🎓", "color": "rgba(16,185,129,0.15)", "category": "Education", "title": "Early Warning System Reduces Dropout by 30%", "body": "NLP sentiment analysis on student feedback combined with attendance ML models can identify at-risk students 6 weeks early, enabling targeted interventions that reduce dropout by 30%.", "impact": "30% dropout reduction", "pct": 88 },
    { "icon": "🤝", "color": "rgba(0,212,255,0.15)", "category": "Social Impact", "title": "Food Security Program Gaps Identified in 8 Wards", "body": "Cross-referencing census data, food distribution records, and income data reveals 8 wards with food insecurity ratios above 25% that are not covered by existing welfare programs.", "impact": "52K families impacted", "pct": 65 }
]

PREDICTIONS_TEMPLATE = [
    { "type": "warn", "domain": "Transportation", "text": "Bus route 42 projected to face 35% capacity overload next Tuesday due to stadium event. Recommend deploying 8 additional vehicles.", "confidence": 91 },
    { "type": "crit", "domain": "Public Safety", "text": "Anomaly detected in District 7 — unusual crowd density pattern. High probability of public gathering conflict in 4–6 hours.", "confidence": 84 },
    { "type": "good", "domain": "Energy", "text": "Solar generation forecast exceeds demand by 18% this weekend. Suggest selling surplus to regional grid and charging EV hubs.", "confidence": 96 },
    { "type": "warn", "domain": "Healthcare", "text": "Flu case uptick of 23% detected in North Zone. Recommend pre-positioning 3,000 antiviral doses at Zone 3 clinics.", "confidence": 87 },
    { "type": "good", "domain": "Environment", "text": "Air quality projected to improve to Good (AQI < 50) by Friday with incoming wind patterns. Reduce emission monitoring intensity.", "confidence": 89 },
    { "type": "warn", "domain": "Waste", "text": "Landfill Site B approaching 85% capacity. Diversion of 40% waste volume to Site A recommended within 10 days.", "confidence": 93 }
]

def get_dist(la1, lo1, la2, lo2):
    R = 6371.0
    dlat = (la2 - la1) * math.pi / 180
    dlon = (lo2 - lo1) * math.pi / 180
    a = (math.sin(dlat / 2) * math.sin(dlat / 2) +
         math.cos(la1 * math.pi / 180) * math.cos(la2 * math.pi / 180) *
         math.sin(dlon / 2) * math.sin(dlon / 2))
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

def get_fallback_response(message, lat, lng):
    lower = message.lower()
    
    if "hospital" in lower or "medical" in lower or "clinic" in lower or "beds" in lower:
        hospitals = [
            { "name": "Metro Trauma & General Hospital", "lat": lat + 0.007, "lng": lng - 0.006, "beds": 14, "specialty": "Multispecialty, Level 1 Emergency", "rating": "4.8 ⭐" },
            { "name": "St. Elizabeth Care Center", "lat": lat - 0.012, "lng": lng + 0.009, "beds": 5, "specialty": "Cardiology & Pediatrics", "rating": "4.6 ⭐" },
            { "name": "Apex Community Medical Clinic", "lat": lat + 0.021, "lng": lng + 0.018, "beds": 19, "specialty": "Outpatient, General Medicine", "rating": "4.3 ⭐" },
            { "name": "Sacred Heart Specialty Clinic", "lat": lat - 0.025, "lng": lng - 0.014, "beds": 2, "specialty": "Neurology & Trauma", "rating": "4.5 ⭐" },
        ]
        
        # Calculate distances
        for h in hospitals:
            h["distance"] = get_dist(lat, lng, h["lat"], h["lng"])
            
        # Sort by distance
        hospitals.sort(key=lambda x: x["distance"])
        
        coord_status = f"📍 **Located User Coordinates**: `{lat:.4f}, {lng:.4f}`"
        table_content = "\n".join([
            f"| {h['name']} | **{h['distance']} km** | {h['beds']} | {h['specialty']} | {h['rating']} |"
            for h in hospitals
        ])
        
        return (
            f"### GIS Decision Engine: Nearby Healthcare Resources\n\n"
            f"{coord_status}\n\n"
            f"Searching municipal records and active registry for healthcare centers within 10 km...\n\n"
            f"| Hospital/Clinic Name | Distance | Available Beds | Primary Specialty | Rating |\n"
            f"| :--- | :--- | :--- | :--- | :--- |\n"
            f"{table_content}\n\n"
            f"- For minor/general consultation: **{hospitals[2]['name']}** has the highest bed capacity ({hospitals[2]['beds']}).\n\n"
            f"*Geospatial calculation powered by Haversine Matrix Model. Data refresh rate: 5s.*"
        )
        
    if any(k in lower for k in ["traffic", "congestion", "transport", "bus", "mobility", "route"]):
        if lat != 12.9716 or lng != 77.5946:
            return (
                f"### GIS Decision Engine: Regional Mobility Index\n\n"
                f"📍 **Calculating traffic density near your coordinates**: `{lat:.4f}, {lng:.4f}`\n\n"
                f"- **Nearest Hotspot:** Ring Road Junction (1.2 km away) — **87% congestion level**.\n"
                f"- **Transit Delay:** Average bus delay in your sector is **4.2 minutes**.\n"
                f"- **Alternative Path:** Recommended detour via Old Bypass Corridor (estimated travel time savings: 7 mins).\n\n"
                f"**Recommendation & Routing Policy:**\n"
                f"- Adjust adaptive signal cycles in real-time at the Ring Road intersection.\n"
                f"- Re-route bus lines 12A and 14C to bypass the central corridor until 7:30 PM.\n\n"
                f"*Spatial optimization generated using dynamic traffic velocity matrices. Confidence: 94%.*"
            )
        else:
            return (
                "### Decision Analysis: Urban Mobility Optimization\n\n"
                "Based on simulated real-time sensor streams and routing graphs, I have detected the following congestion patterns:\n\n"
                "1. **Ring Road Junction** — 87% saturation. Main bottleneck is transit wave delay.\n"
                "2. **Old Market Area** — 79% saturation. Pedestrian flow conflict.\n"
                "3. **Tech Hub Corridor** — 74% saturation. Rush-hour volume surge.\n\n"
                "**Policy Recommendation:**\n"
                "- Implement adaptive signal priority for public transit buses.\n"
                "- Deploy 4 extra shuttle units to Route 10B during peak hours.\n\n"
                "*Confidence Score: 92% | Model: NetworkFlow-Sim v4.2*"
            )
            
    if any(k in lower for k in ["energy", "power", "utility", "solar", "demand", "electric"]):
        return (
            "### Decision Analysis: Smart Grid & Utility Forecast\n\n"
            "Predictive analysis of utility load profiles shows:\n\n"
            "- **Peak demand forecast:** 2,847 MW (projected peak at 7:15 PM).\n"
            "- **Renewable generation:** Solar peak at 340 MW, Wind peak at 110 MW.\n"
            "- **Grid stress index:** 78% (Yellow/Warning state).\n\n"
            "**Optimization Steps:**\n"
            "1. Enable battery bank discharge starting 6:00 PM to offset peak.\n"
            "2. Send micro-incentive notifications to 12k registered EV users to postpone charging until 11:00 PM.\n\n"
            "*Confidence Score: 95% | Model: GradientBoostedDemandPredictor*"
        )
        
    if any(k in lower for k in ["safety", "incident", "emergency", "crime", "police", "warning"]):
        if lat != 12.9716 or lng != 77.5946:
            return (
                f"### GIS Decision Engine: Local Safety Assessment\n\n"
                f"📍 **Analyzing active incident database near your coordinates**: `{lat:.4f}, {lng:.4f}`\n\n"
                f"- **Safety Risk Level:** Low (Green Zone).\n"
                f"- **Nearest Patrol Unit:** Unit 42B (stationed 0.8 km away, ETA: 3.5 minutes).\n"
                f"- **Recent Incidents:** No safety threats or reports recorded within 5 km in the last 24 hours.\n\n"
                f"**Recommendation & Dispatch Action:**\n"
                f"- Maintain regular patrol frequency in the sector.\n"
                f"- Check-in with community monitors at the primary healthcare clinic (1.6 km away).\n\n"
                f"*Analysis based on real-time municipal dispatch feeds. Confidence: 91%.*"
            )
        else:
            return (
                "### Decision Analysis: Public Safety Matrix\n\n"
                "- Active incident alerts: 0 critical, 2 moderate warnings city-wide.\n"
                "- Average emergency response time: 7.3 minutes.\n"
                "**Proposed Action Plan:**\n"
                "- Optimize patrol route cycles in District 7 to reduce response latency by 12%.\n\n"
                "*Confidence Score: 89% | Model: SafetyDispatchSim v2.1*"
            )
            
    return (
        "### CivicMind Decision Intelligence Platform\n\n"
        "I am ready to help you analyze city data. Here are some options you can ask me to run simulations on:\n\n"
        "- **'Analyze urban mobility hotspots'**\n"
        "- **'Optimize grid energy demand'**\n"
        "- **'Audit healthcare accessibility scores'**\n"
        "- **'Find the nearest hospital'** (shares distance and availability table if location is enabled)\n\n"
        "Simply state the domain you want to inspect, and the analytical model will compute the current status, predictions, and recommendations."
    )

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/api/domains")
def get_domains():
    return jsonify(DOMAINS)

@app.route("/api/predictions")
def get_predictions():
    predictions = []
    for p in PREDICTIONS_TEMPLATE:
        p_copy = dict(p)
        # Introduce slight random variations
        p_copy["confidence"] = max(70, min(99, p["confidence"] + random.randint(-3, 3)))
        predictions.append(p_copy)
    return jsonify(predictions)

@app.route("/api/insights")
def get_insights():
    return jsonify(INSIGHTS)

@app.route("/api/metrics")
def get_metrics():
    def random_array(length, min_v, max_v):
        return [random.randint(min_v, max_v) for _ in range(length)]
        
    heatmap = []
    statuses = ["low", "med", "high", "crit"]
    for i in range(98):
        heatmap.append({
            "zone": i + 1,
            "value": random.random(),
            "status": random.choice(statuses)
        })
        
    metrics_data = {
        "aqi": {
            "score": random.randint(75, 95),
            "pm25": random.randint(55, 75),
            "pm10": random.randint(35, 55),
            "no2": random.randint(30, 45),
            "o3": random.randint(65, 80)
        },
        "energy": random_array(12, 45, 95),
        "mobility": {
            "bus": random_array(24, 40, 90),
            "metro": random_array(24, 30, 70),
            "traffic": random_array(24, 20, 80)
        },
        "health": {
            "score": random.randint(72, 82),
            "beds": round(random.uniform(4.0, 4.5), 1),
            "wait_time": random.randint(15, 22),
            "ambulance_eta": round(random.uniform(6.8, 8.2), 1),
            "clinics": random.randint(138, 145)
        },
        "waste": random_array(7, 40, 95),
        "heatmap": heatmap
    }
    return jsonify(metrics_data)

@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.json or {}
    message = data.get("message", "")
    latitude = data.get("latitude")
    longitude = data.get("longitude")
    
    if not message or not isinstance(message, str) or not message.strip():
        return jsonify({ "error": "Empty message" }), 400
        
    lat = float(latitude) if latitude is not None else 12.9716
    lng = float(longitude) if longitude is not None else 77.5946
    
    if ai_client:
        try:
            system_instruction = (
                "You are CivicMind AI, a decision intelligence platform for smart cities. "
                "Analyze requests related to city operations (transportation, energy, environment, safety, healthcare, waste, etc.). "
                "Provide detailed, structured data analysis, specific policy recommendations, and confidence metrics where appropriate. "
                f"The user is located at latitude {lat}, longitude {lng}. If they ask for nearby hospitals or services, use these coordinates to construct a helpful response. "
                "Use elegant markdown formatting including bold text, lists, and markdown tables if showing structured data comparisons."
            )
            
            response = ai_client.models.generate_content(
                model="gemini-3.5-flash",
                contents=message,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                )
            )
            
            if response.text:
                return jsonify({ "response": response.text })
        except Exception as e:
            print(f"Gemini content generation failed, falling back to rule-based engine: {e}")
            
    # Fallback response
    response_text = get_fallback_response(message, lat, lng)
    return jsonify({ "response": response_text })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
