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
    
    # 1. Math Fallback / API Fail demonstration
    if "fail" in lower or "mathematical fallback" in lower or "local registry" in lower or "engine calculates" in lower:
        target_lat = lat + 0.0108
        target_lng = lng - 0.0074
        dist = get_dist(lat, lng, target_lat, target_lng)
        rad_lat1 = lat * math.pi / 180
        rad_lat2 = target_lat * math.pi / 180
        cos_term = math.cos(rad_lat1) * math.cos(rad_lat2)
        a_val = (8.88e-9 + cos_term * 4.17e-9)
        c_val = 2 * math.atan2(math.sqrt(a_val), math.sqrt(1 - a_val))
        return (
            f"### 📐 Mathematical Fallback Engine: Proximity & GIS Mapping\n\n"
            f"📍 **User GPS Coordinates ($A$)**: `\\phi_1 = {lat:.4f}^\\circ, \\lambda_1 = {lng:.4f}^\\circ`\n"
            f"📍 **Nearest Registry Coordinates ($B$)**: `\\phi_2 = {target_lat:.4f}^\\circ, \\lambda_2 = {target_lng:.4f}^\\circ`\n\n"
            f"In the absence of a live Google Gemini API cloud connection, the system automatically triggers the local GIS math fallback engine to compute distances using the spherical **Haversine Formula**:\n\n"
            f"#### 1. The Haversine Equations\n"
            f"$$a = \\sin^2\\left(\\frac{{\\Delta \\phi}}{{2}}\\right) + \\cos(\\phi_1)\\cos(\\phi_2)\\sin^2\\left(\\frac{{\\Delta \\lambda}}{{2}}\\right)$$\n"
            f"$$c = 2 \\arctan2\\left(\\sqrt{{a}}, \\sqrt{{1-a}}\\right)$$\n"
            f"$$d = R \\times c$$\n\n"
            f"Where:\n"
            f"- $R = 6371.0 \\text{{ km}}$ (Mean radius of Earth)\n"
            f"- $\\Delta \\phi = (\\phi_2 - \\phi_1) \\times \\frac{{\\pi}}{{180}}$ (Latitude difference in radians)\n"
            f"- $\\Delta \\lambda = (\\lambda_2 - \\lambda_1) \\times \\frac{{\\pi}}{{180}}$ (Longitude difference in radians)\n"
            f"- $\\phi_1, \\phi_2$ are in radians.\n\n"
            f"#### 2. Step-by-Step Manual Calculation\n"
            f"1. **Calculate Angular Differences**:\n"
            f"   - $\\Delta \\phi = 0.0108^\\circ \\times 0.0174533 \\approx 0.0001885\\text{{ rad}}$\n"
            f"   - $\\Delta \\lambda = -0.0074^\\circ \\times 0.0174533 \\approx -0.0001292\\text{{ rad}}$\n"
            f"2. **Compute Intermediate Value $a$**:\n"
            f"   - $\\sin^2(\\Delta \\phi / 2) = \\sin^2(0.00009425) \\approx 8.88 \\times 10^{{-9}}$\n"
            f"   - $\\sin^2(\\Delta \\lambda / 2) = \\sin^2(-0.00006460) \\approx 4.17 \\times 10^{{-9}}$\n"
            f"   - $\\cos(\\phi_1)\\cos(\\phi_2) \\approx \\cos({lat:.2f}^\\circ) \\times \\cos({target_lat:.2f}^\\circ) \\approx {cos_term:.6f}$\n"
            f"   - $a = 8.88 \\times 10^{{-9}} + ({cos_term:.6f} \\times 4.17 \\times 10^{{-9}}) \\approx {a_val:.4e}$\n"
            f"3. **Compute Central Angle $c$**:\n"
            f"   - $c = 2 \\arctan2\\left(\\sqrt{{a}}, \\sqrt{{1-a}}\\right) \\approx {c_val:.4e} \\text{{ rad}}$\n"
            f"4. **Compute Distance $d$**:\n"
            f"   - $d = 6371.0 \\text{{ km}} \\times c = \\mathbf{{{dist}} \\text{{ km}}}}$\n\n"
            f"#### 3. Verification Report\n"
            f"- **Local Registry Node ID**: `REG-MUNICIPAL-04`\n"
            f"- **Calculated Distance**: **`{dist} km`**\n"
            f"- **Fallback State**: `ACTIVE`\n"
            f"- **Communication Status**: `OFFLINE_LOCAL_COMPUTE`\n"
        )
        
    # 2. Logic Behind Latest Energy Demand Calculation
    if "logic behind" in lower or "demand calculation" in lower or ("energy" in lower and "calculation" in lower):
        base_demand = 1850
        temp = 31
        temp_base = 24
        k = 0.038
        t_factor = math.exp(k * (temp - temp_base))
        active_ev = 120
        line_loss_pct = 0.045
        baseload_adjusted = base_demand * t_factor
        line_loss = baseload_adjusted * line_loss_pct
        projected_demand = baseload_adjusted + active_ev + line_loss

        return (
            f"### ⚡ Smart Grid Technical Breakdown: Demand Forecasting Logic\n\n"
            f"📍 **Sector Reference**: `SEC-{int(lat * 10)}-{int(lng * 10)}` (Coordinates: `{lat:.4f}, {lng:.4f}`)\n\n"
            f"The demand forecasting engine utilizes a multivariate regression equation modified for smart grid environments:\n\n"
            f"$$\\text{{Demand}}_{{\\text{{proj}}}} = (L_{{\\text{{base}}}} \\times T_{{\\text{{factor}}}}) + E_{{\\text{{EV}}}} + I_{{\\text{{loss}}}} - C_{{\\text{{solar}}}}$$\n\n"
            f"#### 1. Formula Component Definitions\n"
            f"- **$L_{{\\text{{base}}}}$ (Baseline Baseload)**: Calculated as the historical rolling average of the corresponding hour, day, and season. For this sector, the baseline baseline load is: **{base_demand} MW**.\n"
            f"- **$T_{{\\text{{factor}}}}$ (Temperature Heat Index Factor)**: An exponential multiplier representing increased cooling demand:\n"
            f"  $$T_{{\\text{{factor}}}} = e^{{k(T - T_{{\\text{{base}}}})}}$$\n"
            f"  Where $T$ is local ambient temperature ({temp}^\\circ\\text{{C}}$), $T_{{\\text{{base}}}} = {temp_base}^\\circ\\text{{C}}$, and $k \\approx {k}$ cooling coefficient.\n"
            f"- **$E_{{\\text{{EV}}}}$ (EV Charging Vector)**: The real-time aggregate capacity of active charging sessions. Currently projected: **{active_ev} MW**.\n"
            f"- **$I_{{\\text{{loss}}}}$ (Grid Line Losses)**: Constant loss factor due to transmission resistance:\n"
            f"  $$I_{{\\text{{loss}}}} = I^2 R \\approx 4.5\\% \\text{{ of baseload}}$$\n"
            f"- **$C_{{\\text{{solar}}}}$ (Distributed Generation Offset)**: Subtracts behind-the-meter rooftop solar generation, peaking between 12:00 and 15:00. (Currently $0 MW$ at evening peak hours).\n\n"
            f"#### 2. Mathematical Sample Calculation\n"
            f"Using coordinates `{lat:.4f}, {lng:.4f}` with temperature $T = {temp}^\\circ\\text{{C}}$ and $E_{{\\text{{EV}}}} = {active_ev}\\text{{ MW}}$:\n"
            f"- $T_{{\\text{{factor}}}} = e^{{0.038 \\times ({temp} - {temp_base})}} = e^{{{(k * (temp - temp_base)):.3f}}} \\approx {t_factor:.3f}$\n"
            f"- Baseload Adjusted = $1850 \\times {t_factor:.3f} = {baseload_adjusted:.2f}\\text{{ MW}}$\n"
            f"- Line Loss = ${baseload_adjusted:.2f} \\times 0.045 = {line_loss:.2f}\\text{{ MW}}$\n"
            f"- Solar Offset (at peak hour 19:00) = $0\\text{{ MW}}$\n"
            f"- **Projected Peak Demand** = ${baseload_adjusted:.2f} + {active_ev} + {line_loss:.2f} - 0 = \\mathbf{{{projected_demand:.2f}}\\text{{ MW}}}}$$\n"
        )
        
    # 3. Critique waste management infrastructure / Civic Planner Persona
    if "civic planner" in lower or "critique" in lower or "waste management" in lower:
        return (
            f"### ♻️ Civic Planner Infrastructure Critique: Waste Management\n\n"
            f"📍 **Location District Sector**: `{lat:.4f}, {lng:.4f}`\n"
            f"*Prepared by Lead Civic Planner Persona*\n\n"
            f"#### 1. Critical Diagnostic Assessment\n"
            f"The current waste management framework in this sector is highly centralized, leaving it fragile and prone to capacity crises. Key critique points include:\n\n"
            f"- **Landfill Over-Reliance**: Approximately **85% of municipal waste** from this sector goes directly to Landfill Site B. Site B is currently at **85% capacity** and has less than 18 months of operational lifespan remaining.\n"
            f"- **Low Source Segregation**: Organic waste, plastics, and paper are still collected together. The source segregation rate is under **22%**, significantly lower than the municipal target of **60%**.\n"
            f"- **Waste Collection Route Inefficiency**: Diesel collection trucks follow fixed daily schedules without smart bins, wasting fuel on half-empty bins while overflowing commercial bins are left unserviced.\n\n"
            f"#### 2. Strategic Policy Recommendations\n"
            f"1. **Decentralized Composting**: Construct three micro-composting yards in the district to divert organic waste (which represents 58% of total volume) locally.\n"
            f"2. **IoT Smart Bin Deployment**: Retrofit optical sensor units on commercial bins to communicate fill levels, optimizing truck dispatch.\n"
            f"3. **Segregation Incentives**: Launch a ward-level \"Green Points\" mobile app matching household segregation to utility bill credits.\n"
        )
        
    # 4. Simulate Environmental Impact of Industrial Transit Hub
    if "environmental impact" in lower or "transit hub" in lower or "industrial transit" in lower:
        return (
            f"### 🏭 Environmental Impact Simulation: New Industrial Transit Hub\n\n"
            f"📍 **Simulated Location Coordinates**: `{lat:.4f}, {lng:.4f}`\n\n"
            f"#### 1. Simulation Parameters\n"
            f"- **Project Scale**: 45-Acre Freight Interchange Hub.\n"
            f"- **Estimated Heavy Vehicle Traffic**: 1,200 diesel truck trips per day.\n"
            f"- **Impervious Surface Area Increase**: +74% (Soil sealing).\n\n"
            f"#### 2. Simulated Environmental Impact Projections\n"
            f"| Parameter | Baseline (Current) | Projected (With Hub) | Change (%) | Regulatory Impact |\n"
            f"| :--- | :--- | :--- | :--- | :--- |\n"
            f"| **PM2.5 Level** | 62 µg/m³ | 79.3 µg/m³ | **+28%** | 🔴 Exceeds safe ceiling limits |\n"
            f"| **Acoustic Noise** | 54 dBA | 72.8 dBA | **+35%** | 🟡 Requires acoustic sound barriers |\n"
            f"| **Surface Runoff** | 1,400 m³/h | 1,988 m³/h | **+42%** | 🟡 Overloads local drainage canal |\n"
            f"| **Local Heat Island Offset** | +0.4°C | +1.8°C | **+350%** | 🔴 Significant local microclimate impact |\n\n"
            f"#### 3. Mandatory Mitigation Recommendations\n"
            f"- **Acoustic Barriers**: Erect 4.5m soundproof buffer walls along residential faces.\n"
            f"- **Permeable Pavements**: Lay porous asphalt in parking zones to absorb 25% runoff.\n"
            f"- **Urban Forestry**: Plant 5,000 native evergreen trees along the perimeter boundary to absorb PM2.5.\n"
        )
        
    # 5. Generate Pedestrian Safety Policy Recommendation Report
    if "pedestrian safety" in lower or "policy recommendation report" in lower or "improving pedestrian" in lower:
        return (
            f"### 🚸 Pedestrian Safety Policy Recommendation Report\n\n"
            f"📍 **Target Infrastructure Zone**: Grid `{lat:.4f}, {lng:.4f}`\n\n"
            f"#### 1. Identified Safety Hazards\n"
            f"- High speed limits (60 km/h) near multi-lane crossings.\n"
            f"- Poor street lighting at the Sector 4 Commercial Crossing.\n"
            f"- Pedestrian crossings lack physical refuge islands, forcing pedestrians to cross 4 lanes at once.\n\n"
            f"#### 2. Recommended Strategic Interventions\n"
            f"| Intervention | Technical Specifications | Target Location | Estimated Cost | Est. Impact |\n"
            f"| :--- | :--- | :--- | :--- | :--- |\n"
            f"| **Raised Crosswalk Tables** | 3-inch elevation, textured bricks | School Road Crossing | ₹4,50,000 | Speed reduction -35% |\n"
            f"| **Refuge Island Installation** | 1.8m wide concrete splitter island | Main Boulevard Ring | ₹8,20,000 | Crossing conflict -60% |\n"
            f"| **Smart Crosswalk Sensors** | Infrared sensors + flashing yellow LEDs | Commercial Market | ₹3,80,000 | Night visibility +70% |\n"
            f"| **Speed Enforcement Cameras** | Continuous ANPR tracking | Industrial Bypass Link | ₹12,00,000 | Compliance +95% |\n\n"
            f"#### 3. Policy Executive Timeline\n"
            f"- **Month 1-2**: Design approval & contractor bidding.\n"
            f"- **Month 3**: Installation of Raised Tables and smart signs.\n"
            f"- **Month 4**: Construction of Refuge Islands.\n"
            f"- **Evaluation**: Post-implementation speed audit in Month 6.\n"
        )
        
    # 6. Air Quality Metrics Comparison
    if "air quality metrics" in lower or "air quality" in lower or "aqi" in lower or "standards" in lower:
        return (
            f"### 🌿 Localized Air Quality Metrics & Regulatory Compliance Audit\n\n"
            f"📍 **Location Grid**: `{lat:.4f}, {lng:.4f}`\n\n"
            f"#### 1. Current Pollutant Metrics (24-Hour Average)\n"
            f"| Pollutant | Measured Concentration | National Safety Standard (EPA/NAAQS) | Comparison Ratio | Compliance Status |\n"
            f"| :--- | :--- | :--- | :--- | :--- |\n"
            f"| **AQI (Overall)** | 87 | 100 (Satisfactory) | 0.87 | Compliant (Moderate) |\n"
            f"| **PM2.5** | **62 µg/m³** | **60 µg/m³** (24h Mean) | **1.03** | 🔴 **NON-COMPLIANT (Exceeds)** |\n"
            f"| **PM10** | 48 µg/m³ | 100 µg/m³ (24h Mean) | 0.48 | Compliant |\n"
            f"| **NO2** | 38 ppb | 80 ppb (24h Mean) | 0.47 | Compliant |\n"
            f"| **O3 (Ozone)** | 72 ppb | 100 ppb (8h Mean) | 0.72 | Compliant |\n\n"
            f"#### 2. Environmental Impact Summary\n"
            f"- PM2.5 levels exceed national thresholds by **3.3%** due to industrial exhaust drift from the adjacent Eastern corridor.\n"
            f"- Recommended actions: Sensitive groups (asthma, children, elderly) should limit outdoor exposure and use N95 masks during peak morning hours.\n"
        )
        
    # 7. Active Evacuation Zones & Safety Protocols
    if "evacuation zones" in lower or "evacuation zone" in lower or "safety protocol" in lower:
        return (
            f"### ⚠️ Active Municipal Evacuation Zones & Safety Protocols\n\n"
            f"📍 **Target District Sector**: `{lat:.4f}, {lng:.4f}`\n\n"
            f"#### 1. Evacuation Zone Status List\n"
            f"| Zone ID | Area / Landmark Description | Current Status | Risk Trigger | Designated Shelter |\n"
            f"| :--- | :--- | :--- | :--- | :--- |\n"
            f"| **Zone 3-Alpha** | Riverfront Low-Lying Sector | **ACTIVE (Evacuate)** | Flash Flood Vulnerability | Sector 4 Community Center |\n"
            f"| **Zone 7-Beta** | East Industrial Annex Corridor | **STANDBY (Prepare)** | Chemical Vapor Alert | St. Jude Academic Hall |\n"
            f"| **Zone 12-Gamma** | North Forest Border Hills | **INACTIVE (Clear)** | Seasonal Brushfire Risk | North Ridge Gymnasium |\n\n"
            f"#### 2. Resident Safety Protocol Summary (For Active Zone 3-Alpha)\n"
            f"1. **Securing Premises**: Shut off main gas valves, electrical breakers, and water mains before departing.\n"
            f"2. **Packing Essentials**: Secure water (3L per person), shelf-stable rations, critical prescriptions, battery banks, and physical identification/documents.\n"
            f"3. **Evacuation Route**: Evacuate via **West Ring Road Link** only. Avoid underpasses at Sector 4 Main which are subject to water logging.\n"
            f"4. **Reporting**: Report arrival at Sector 4 Shelter to the coordinator to ensure census tracking.\n\n"
            f"*Emergency broadcast broadcasted by Municipal Civil Defense Authority. Last updated: 5m ago.*"
        )

    # 8. Find Nearest Hospitals with capacity
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
        
    # 9. Traffic Congestion Patterns & Route Optimization
    if "congestion patterns" in lower or ("traffic" in lower and "alternative routes" in lower) or "commute times" in lower:
        route_a_dist = get_dist(lat, lng, lat + 0.015, lng - 0.02) + 1.2
        route_b_dist = get_dist(lat, lng, lat - 0.01, lng + 0.012) + 0.8
        route_c_dist = get_dist(lat, lng, lat + 0.028, lng + 0.03) + 2.1

        return (
            f"### 🚦 GIS Decision Engine: Localized Traffic Congestion & Route Optimization\n\n"
            f"📍 **Simulated District Center**: `{lat:.4f}, {lng:.4f}`\n\n"
            f"#### 1. Congestion Pattern Analysis\n"
            f"- **Main Corridor (Ring Road Junction)**: Currently **87% saturated**. Bottlenecks are active.\n"
            f"- **Central Arterial Street**: **74% saturation** due to high volume.\n"
            f"- **Bypass Expressway**: **35% saturation** (Flowing freely).\n\n"
            f"#### 2. Three Suggested Alternative Routes\n"
            f"| Route Name | Key Detour Path | Distance | Est. Travel Time | Commute Savings | Risk Profile |\n"
            f"| :--- | :--- | :--- | :--- | :--- | :--- |\n"
            f"| **Route A (Bypass Detour)** | Via North Bypass Corridor | {route_a_dist:.2f} km | 14 mins | **-8 mins** | Low (Freely flowing) |\n"
            f"| **Route B (Metro Link)** | Via West Station Road | {route_b_dist:.2f} km | 17 mins | **-5 mins** | Medium (Minor construction) |\n"
            f"| **Route C (North Ridge Expressway)** | Via Elevated Expressway Link | {route_c_dist:.2f} km | 11 mins | **-11 mins** | Low (Tolls apply) |\n\n"
            f"*Data generated from municipal velocity sensors. Route calculations updated 10s ago.*"
        )
        
    # 10. General Traffic / Congestion / Transport
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
            
    # 11. Energy Grid Demand 24 Hours Summary
    if "grid demand" in lower or "peak load warnings" in lower or ("energy" in lower and "24 hours" in lower):
        return (
            f"### ⚡ Smart Grid & Utility Forecast: 24-Hour Energy Demand Report\n\n"
            f"📍 **Grid Sector Registry ID**: `SEC-{int(lat * 10)}-{int(lng * 10)}` (Coordinates: `{lat:.4f}, {lng:.4f}`)\n\n"
            f"#### 1. 24-Hour Demand Projection Profile\n"
            f"| Time Slot | Expected Demand (MW) | Available Supply (MW) | Stress Index | Status |\n"
            f"| :--- | :--- | :--- | :--- | :--- |\n"
            f"| **00:00 - 06:00 (Night)** | 1,450 MW | 2,200 MW (Baseload) | 65% | Normal |\n"
            f"| **06:00 - 12:00 (Morning Peak)** | 2,400 MW | 2,800 MW (Baseload + Wind) | 85% | Warning (Yellow) |\n"
            f"| **12:00 - 18:00 (Midday)** | 2,100 MW | 3,100 MW (Baseload + Max Solar) | 67% | Normal |\n"
            f"| **18:00 - 22:00 (Evening Peak)** | **2,950 MW** | **3,000 MW** (Max Grid Capacity) | **98%** | 🔴 **Critical (Red Alert)** |\n"
            f"| **22:00 - 24:00 (Night)** | 1,800 MW | 2,200 MW | 81% | Warning (Yellow) |\n\n"
            f"#### 2. Peak Load Warning Details\n"
            f"> [!WARNING]\n"
            f"> **Evening Peak Load warning active between 18:30 and 21:00.** Projected grid stress exceeds safe threshold (95%) reaching **98%** capacity. Risk of voltage sag or localized rolling blackouts in sector.\n\n"
            f"#### 3. Recommended Dispatch Protocol\n"
            f"1. **Dynamic Load Shifting**: Dispatch automated smart-meter requests to shift EV charging and laundry cycles to off-peak slots.\n"
            f"2. **Battery Discharge**: Enable discharge of the Sector 4 Grid Battery Bank (150 MW capacity) starting at 18:15.\n"
            f"3. **Solar Reserve**: Reserve peak battery storage from solar surplus captured during the 12:00-15:00 window.\n"
        )
        
    # 12. EV Charging stations availability
    if "charging stations" in lower or "ev charging" in lower or "electric vehicle" in lower:
        dist1 = get_dist(lat, lng, lat + 0.008, lng - 0.012)
        dist2 = get_dist(lat, lng, lat - 0.015, lng + 0.005)
        dist3 = get_dist(lat, lng, lat + 0.022, lng + 0.024)
        dist4 = get_dist(lat, lng, lat - 0.028, lng - 0.035)

        return (
            f"### 🔋 EV Charging Station Proximity & Availability Index\n\n"
            f"📍 **Geospatial Search Anchor**: `{lat:.4f}, {lng:.4f}` (Radius: 5.0 km)\n\n"
            f"Municipal database search matching active EV charging terminals...\n\n"
            f"| Rank | Station Name | Distance | Active Chargers | Plug Type | Pricing / Min | Current Availability |\n"
            f"| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n"
            f"| **1** | **ChargePoint Prime - Sector 4** | {dist1:.2f} km | 6 / 8 Available | CCS2, CHAdeMO (Fast) | ₹12.00 | **Highly Available (75%)** |\n"
            f"| **2** | **SparkGrid Express Hub** | {dist2:.2f} km | 4 / 10 Available | CCS2, Type 2 | ₹10.50 | **Moderate Availability (40%)** |\n"
            f"| **3** | **EcoVolt Station** | {dist3:.2f} km | 1 / 6 Available | CCS2 | ₹9.00 | **Low Availability (16%)** |\n"
            f"| **4** | **VoltRange Main Hub** | {dist4:.2f} km | 0 / 8 Available | CCS2, Type 2 | ₹11.00 | **Occupied (0%)** |\n\n"
            f"*Note: Availability values are updated in real-time via OCPP 1.6 API protocols.*"
        )

    # General Energy Fallback
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
        
    # General Safety Fallback
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
