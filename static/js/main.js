// Global State Control Panel
let activeDomainId = "all";
let latitude = null;
let longitude = null;
let liveClock = "";
let refreshing = false;

// API Response Cache
let cachedDomains = [];
let cachedPredictions = [];
let cachedInsights = [];
let cachedMetrics = null;

// Simulation States
let deployingId = null;
let deployedAlerts = {};
let runningSimulationIndex = null;
let chatMessages = [
    {
        role: "assistant",
        content: `### CivicMind Decision Intelligence Platform\n\nWelcome! I am your AI policy simulator. Ask me to run predictive analysis or locate resources:\n\n* **"Find nearby hospitals"** (calculates distance based on your active GPS coordinates)\n* **"Analyze urban mobility hotspots"**\n* **"Optimize smart grid energy demand"**\n* **"Audit local public safety response"**`,
        timestamp: getCurrentTimeStr()
    }
];
let chatLoading = false;

// DOM Elements
const clockEl = document.getElementById("live-clock");
const coordsEl = document.getElementById("live-coords");
const recalculateBtn = document.getElementById("recalculate-btn");
const chartTabsContainer = document.getElementById("chart-tabs");
const chartLoader = document.getElementById("chart-loader");
const chartRenderArea = document.getElementById("chart-render-area");
const activeDomainTitle = document.getElementById("active-domain-title");
const alertsList = document.getElementById("alerts-list");
const sectorsList = document.getElementById("sectors-list");
const simulationsList = document.getElementById("simulations-list");
const tooltipEl = document.getElementById("chart-tooltip");

// Chat Elements
const chatMessagesContainer = document.getElementById("chat-messages-container");
const chatInputForm = document.getElementById("chat-input-form");
const chatInput = document.getElementById("chat-input");
const chatSubmitBtn = document.getElementById("chat-submit-btn");
const clearChatBtn = document.getElementById("clear-chat-btn");
const locationReqBtn = document.getElementById("location-req-btn");
const chatGpsLabel = document.getElementById("chat-gps-label");
const suggestionTray = document.getElementById("suggestion-tray");

// Helper: Get formatted current time
function getCurrentTimeStr() {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Request Location Access
function requestLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                latitude = position.coords.latitude;
                longitude = position.coords.longitude;
                updateLocationUI();
            },
            (error) => {
                console.warn("Geolocation permission denied or error:", error);
                // Default coordinates (City Center)
                latitude = 12.9716;
                longitude = 77.5946;
                updateLocationUI();
            }
        );
    } else {
        latitude = 12.9716;
        longitude = 77.5946;
        updateLocationUI();
    }
}

function updateLocationUI() {
    if (latitude && longitude) {
        const coordsStr = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        coordsEl.textContent = coordsStr;
        chatGpsLabel.textContent = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
        locationReqBtn.classList.add("bg-cyan-950", "border-cyan-800", "text-cyan-400");
    } else {
        coordsEl.textContent = "DEFAULT CENTRAL";
        chatGpsLabel.textContent = "GPS Off";
        locationReqBtn.classList.remove("bg-cyan-950", "border-cyan-800", "text-cyan-400");
    }
}

// Fetch Master Telemetry from API
async function fetchData(isManual = false) {
    if (isManual) {
        refreshing = true;
        recalculateBtn.querySelector("svg").classList.add("animate-spin");
        recalculateBtn.disabled = true;
    }
    
    try {
        const [domainsRes, predictionsRes, insightsRes, metricsRes] = await Promise.all([
            fetch("/api/domains"),
            fetch("/api/predictions"),
            fetch("/api/insights"),
            fetch("/api/metrics")
        ]);

        if (domainsRes.ok) cachedDomains = await domainsRes.json();
        if (predictionsRes.ok) cachedPredictions = await predictionsRes.json();
        if (insightsRes.ok) cachedInsights = await insightsRes.json();
        if (metricsRes.ok) cachedMetrics = await metricsRes.json();

        // Hydrate Core UI Elements
        updateStats();
        updateTabButtons();
        updateSectorsList();
        updateAlertsList();
        updateSimulationsList();
        renderActiveChart();

    } catch (err) {
        console.error("Error drawing telemetry streams:", err);
    } finally {
        if (isManual) {
            setTimeout(() => {
                refreshing = false;
                recalculateBtn.querySelector("svg").classList.remove("animate-spin");
                recalculateBtn.disabled = false;
            }, 600);
        }
    }
}

// Update Top Dashboard Stat Cards
function updateStats() {
    if (!cachedMetrics) return;
    
    // AQI
    document.getElementById("val-aqi").textContent = cachedMetrics.aqi.score;
    
    // Traffic
    const trafficSum = cachedMetrics.mobility.traffic.reduce((a, b) => a + b, 0);
    const trafficAvg = Math.round(trafficSum / cachedMetrics.mobility.traffic.length);
    document.getElementById("val-traffic").textContent = `${trafficAvg}%`;
    
    // Energy
    const maxEnergy = Math.max(...cachedMetrics.energy) * 20 + 1000;
    document.getElementById("val-energy").textContent = `${maxEnergy} MW`;
    
    // Ambulance
    document.getElementById("val-ambulance").textContent = `${cachedMetrics.health.ambulance_eta}m`;
    document.getElementById("sub-ambulance").textContent = `Wait-time: ${cachedMetrics.health.wait_time}m`;
}

// Update Interactive Sectors Matrix List
function updateSectorsList() {
    if (!cachedDomains.length) return;
    
    sectorsList.innerHTML = "";
    
    // Add Master System row
    const allActive = activeDomainId === "all" ? "active" : "";
    const masterRow = document.createElement("button");
    masterRow.className = `sector-row-btn ${allActive}`;
    masterRow.innerHTML = `
        <div class="sector-meta-left">
            <span class="sector-icon">🌐</span>
            <div class="sector-titles">
                <span class="sector-name">Unified Municipal Master</span>
                <span class="sector-desc">Overview of all active sensors</span>
            </div>
        </div>
        <span class="sector-stat-num" style="color: var(--clr-cyan)">ALL</span>
    `;
    masterRow.addEventListener("click", () => selectDomain("all"));
    sectorsList.appendChild(masterRow);
    
    // Add domains
    cachedDomains.forEach(domain => {
        const active = activeDomainId === domain.id ? "active" : "";
        const statValue = domain.stat.split(" ")[0];
        const row = document.createElement("button");
        row.className = `sector-row-btn ${active}`;
        row.innerHTML = `
            <div class="sector-meta-left">
                <span class="sector-icon">${domain.icon}</span>
                <div class="sector-titles">
                    <span class="sector-name">${domain.name}</span>
                    <span class="sector-desc">${domain.desc}</span>
                </div>
            </div>
            <div class="sector-meta-right">
                <span class="sector-stat-num">${statValue}</span>
                <div class="sector-bar-bg">
                    <div class="sector-bar-fill" style="width: ${domain.pct}%; background-color: ${domain.color}"></div>
                </div>
            </div>
        `;
        row.addEventListener("click", () => selectDomain(domain.id));
        sectorsList.appendChild(row);
    });
}

// Update dynamic tab buttons in the chart panel
function updateTabButtons() {
    if (!chartTabsContainer) return;
    
    chartTabsContainer.innerHTML = "";
    
    // Add Master System tab
    const masterActive = activeDomainId === "all" ? "active" : "";
    const masterBtn = document.createElement("button");
    masterBtn.className = `tab-btn ${masterActive}`;
    masterBtn.setAttribute("data-id", "all");
    masterBtn.textContent = "Master System";
    masterBtn.addEventListener("click", () => selectDomain("all"));
    chartTabsContainer.appendChild(masterBtn);
    
    const getShortName = (name) => {
        if (name.includes("Healthcare")) return "Health";
        if (name.includes("Environmental")) return "Environment";
        if (name.includes("Education")) return "Education";
        if (name.includes("Citizen")) return "Citizen";
        return name.split(" ")[0];
    };
    
    // Add tab buttons for all domains
    cachedDomains.forEach(domain => {
        const active = activeDomainId === domain.id ? "active" : "";
        const btn = document.createElement("button");
        btn.className = `tab-btn ${active}`;
        btn.setAttribute("data-id", domain.id);
        btn.textContent = getShortName(domain.name);
        btn.addEventListener("click", () => selectDomain(domain.id));
        chartTabsContainer.appendChild(btn);
    });
}

// Update Active Predictive Alerts Log
function updateAlertsList() {
    if (!cachedPredictions.length) return;
    
    alertsList.innerHTML = "";
    
    cachedPredictions.forEach((p, idx) => {
        const isDeployed = deployedAlerts[idx];
        const isDeploying = deployingId === idx;
        
        let rowClass = "alert-row";
        let badgeClass = "alert-badge";
        let statusText = "Normal Vector";
        
        if (p.type === "crit") {
            rowClass += " alert-crit";
            badgeClass += " badge-crit";
            statusText = "Critical Anomaly";
        } else if (p.type === "warn") {
            rowClass += " alert-warn";
            badgeClass += " badge-warn";
            statusText = "Resource Constraint";
        } else {
            rowClass += " alert-good";
            badgeClass += " badge-good";
        }
        
        let buttonContent = "Apply Policy";
        let btnClass = "btn-apply-policy";
        let btnDisabled = "";
        
        if (isDeployed) {
            buttonContent = "✔️ Deployed";
            btnClass += " btn-success";
            btnDisabled = "disabled";
        } else if (isDeploying) {
            buttonContent = "🔄 Routing...";
            btnClass += " btn-running";
            btnDisabled = "disabled";
        }
        
        const row = document.createElement("div");
        row.className = rowClass;
        row.innerHTML = `
            <div class="alert-main-info">
                <div class="alert-meta-badges">
                    <span class="${badgeClass}">${statusText}</span>
                    <span class="alert-domain-label">${p.domain} Section</span>
                </div>
                <p class="alert-message">${p.text}</p>
            </div>
            <div class="alert-action-block">
                <div class="alert-confidence-box">
                    <span class="confidence-label">Confidence</span>
                    <span class="confidence-value">${p.confidence}%</span>
                </div>
                <button class="${btnClass}" ${btnDisabled} onclick="handleDeployAction(${idx})">
                    ${buttonContent}
                </button>
            </div>
        `;
        alertsList.appendChild(row);
    });
}

// Handle Policy Deployment Action
function handleDeployAction(index) {
    if (deployingId !== null) return;
    
    deployingId = index;
    updateAlertsList();
    
    setTimeout(() => {
        deployedAlerts[index] = true;
        deployingId = null;
        updateAlertsList();
    }, 1200);
}

// Update bottom simulations
function updateSimulationsList() {
    if (!cachedInsights.length) return;
    
    simulationsList.innerHTML = "";
    
    cachedInsights.forEach((insight, idx) => {
        const isSimulating = runningSimulationIndex === idx;
        const btnText = isSimulating ? "⚡ Simulating..." : "Run Simulation";
        const btnDisabled = isSimulating ? "disabled" : "";
        
        const card = document.createElement("div");
        card.className = "simulation-card";
        card.innerHTML = `
            <div>
                <div class="sim-header-row">
                    <span class="sim-category">
                        <span>${insight.icon}</span> ${insight.category}
                    </span>
                    <span class="sim-impact">${insight.impact}</span>
                </div>
                <h4 class="sim-title">${insight.title}</h4>
                <p class="sim-body">${insight.body}</p>
            </div>
            <div class="sim-action-shelf">
                <div class="sim-bar-bg">
                    <div class="sim-bar-fill" style="width: ${insight.pct}%; background-color: var(--clr-cyan)"></div>
                </div>
                <button class="btn-sim-run" ${btnDisabled} onclick="runSimulation(${idx})">
                    ${btnText}
                </button>
            </div>
        `;
        simulationsList.appendChild(card);
    });
}

// Handle Running Simulation
function runSimulation(index) {
    runningSimulationIndex = index;
    updateSimulationsList();
    
    setTimeout(() => {
        runningSimulationIndex = null;
        fetchData(); // pull fresh fluctuating parameters
    }, 1500);
}

// Filter Tab Trigger
function selectDomain(domainId) {
    activeDomainId = domainId;
    
    // Toggle active tab class
    const tabBtns = chartTabsContainer.querySelectorAll(".tab-btn");
    tabBtns.forEach(btn => {
        if (btn.getAttribute("data-id") === domainId) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });
    
    // Set Header title
    if (domainId === "all") {
        activeDomainTitle.textContent = "Smart City Systems Core Insights";
    } else {
        const domainObj = cachedDomains.find(d => d.id === domainId);
        activeDomainTitle.textContent = domainObj ? domainObj.name : "Analytical Matrix";
    }
    
    // Update sector matrix select state
    updateSectorsList();
    
    // Draw chart
    renderActiveChart();
}

// Chart Rendering Logic
function renderActiveChart() {
    if (!cachedMetrics) {
        chartLoader.style.display = "flex";
        chartRenderArea.innerHTML = "";
        return;
    }
    
    chartLoader.style.display = "none";
    chartRenderArea.innerHTML = "";
    
    if (activeDomainId === "all") {
        // Master System core Dashboard Layout (4 mini visual sections)
        chartRenderArea.className = "chart-content-area";
        const grid = document.createElement("div");
        grid.className = "grid-master-charts";
        
        // 1. Mobility Mini Chart
        const mobilityCard = document.createElement("div");
        mobilityCard.className = "mini-chart-card";
        mobilityCard.innerHTML = `
            <div class="mini-chart-header">
                <span class="mini-chart-title">
                    <span class="mini-chart-icon" style="color: var(--clr-cyan)">🚌</span>
                    Mobility Congestion Profiles
                </span>
                <span class="mini-chart-stat">Live Telemetry</span>
            </div>
            <div class="chart-svg-container" id="mini-mobility-chart"></div>
        `;
        grid.appendChild(mobilityCard);
        
        // 2. Energy Mini Chart
        const energyCard = document.createElement("div");
        energyCard.className = "mini-chart-card";
        energyCard.innerHTML = `
            <div class="mini-chart-header">
                <span class="mini-chart-title">
                    <span class="mini-chart-icon" style="color: var(--clr-amber)">⚡</span>
                    Smart Grid supply/demand
                </span>
                <span class="mini-chart-stat">12h Forecast</span>
            </div>
            <div class="chart-svg-container" id="mini-energy-chart"></div>
        `;
        grid.appendChild(energyCard);

        // 3. Environment Mini Chart
        const envCard = document.createElement("div");
        envCard.className = "mini-chart-card";
        envCard.innerHTML = `
            <div class="mini-chart-header">
                <span class="mini-chart-title">
                    <span class="mini-chart-icon" style="color: var(--clr-emerald)">🌿</span>
                    Environment: Particulates
                </span>
                <span class="mini-chart-stat" style="color: var(--clr-emerald)">AQI: ${cachedMetrics.aqi.score}</span>
            </div>
            <div class="pie-chart-flex" id="mini-env-chart"></div>
        `;
        grid.appendChild(envCard);

        // 4. Heatmap Mini Chart
        const mapCard = document.createElement("div");
        mapCard.className = "mini-chart-card";
        mapCard.innerHTML = `
            <div class="mini-chart-header">
                <span class="mini-chart-title">
                    <span class="mini-chart-icon" style="color: var(--clr-purple)">🗺️</span>
                    Geospatial Heatmap Grid
                </span>
                <span class="mini-chart-stat">98 active zones</span>
            </div>
            <div class="heatmap-scroll-container" id="mini-heatmap-chart"></div>
        `;
        grid.appendChild(mapCard);
        
        chartRenderArea.appendChild(grid);
        
        // Draw actual SVGs
        drawMiniMobilityChart("mini-mobility-chart");
        drawMiniEnergyChart("mini-energy-chart");
        drawMiniEnvChart("mini-env-chart");
        drawMiniHeatmapGrid("mini-heatmap-chart");
        
    } else if (activeDomainId === "mobility") {
        // Mobility Specific Deep-Dive Area Chart
        const desc = document.createElement("p");
        desc.className = "deep-dive-desc";
        desc.textContent = "Analyzing real-time sensor loops and smart corridor cameras. Peak traffic is active from 8 AM to 10 AM, and 5 PM to 7 PM. System recommendation is priority queue signals.";
        
        const container = document.createElement("div");
        container.className = "deep-dive-chart-container";
        container.id = "mobility-deep-chart";
        
        chartRenderArea.appendChild(desc);
        chartRenderArea.appendChild(container);
        
        drawMobilityDeepChart("mobility-deep-chart");
        
    } else if (activeDomainId === "safety") {
        // Safety Specific Deep-Dive Bar Chart + list
        const desc = document.createElement("p");
        desc.className = "deep-dive-desc";
        desc.textContent = "Emergency services optimization loops are running. Incident reporting frequency shows lower congestion rates in the central districts, while district 7 exhibits safety warnings.";
        
        const grid = document.createElement("div");
        grid.className = "grid-2-cols-split";
        
        const chartCol = document.createElement("div");
        chartCol.id = "safety-deep-chart";
        grid.appendChild(chartCol);
        
        const sideCol = document.createElement("div");
        sideCol.className = "deep-dive-sidebar";
        sideCol.innerHTML = `
            <div class="deep-sidebar-item">
                <span class="deep-sidebar-label" style="color: var(--clr-rose)">⚠️ Active Incidents</span>
                <p class="deep-sidebar-text">8 warnings triggered in the last hour. Main concentrations are in District 7.</p>
            </div>
            <div class="deep-sidebar-item">
                <span class="deep-sidebar-label" style="color: var(--clr-purple)">🚑 Dispatch Response</span>
                <p class="deep-sidebar-text">Active ambulance routing ETA is 7.2 minutes. Peak stress at 12:45.</p>
            </div>
            <div class="deep-sidebar-item">
                <span class="deep-sidebar-label" style="color: var(--clr-emerald)">🛡️ Patrol Cover</span>
                <p class="deep-sidebar-text">86% patrol coverage index currently optimized across active beats.</p>
            </div>
        `;
        grid.appendChild(sideCol);
        
        chartRenderArea.appendChild(desc);
        chartRenderArea.appendChild(grid);
        
        drawSafetyDeepChart("safety-deep-chart");
        
    } else if (activeDomainId === "health") {
        const desc = document.createElement("p");
        desc.className = "deep-dive-desc";
        desc.textContent = "Evaluating geospatial healthcare resources. Geographic zones 3-North and East represent high-risk medical deserts (>8km to clinics). Ambulances are pre-positioned to optimize ETA.";
        
        const grid = document.createElement("div");
        grid.className = "grid-2-cols-split";
        
        const chartCol = document.createElement("div");
        chartCol.id = "health-deep-chart";
        grid.appendChild(chartCol);
        
        const sideCol = document.createElement("div");
        sideCol.className = "deep-dive-sidebar";
        sideCol.innerHTML = `
            <div class="deep-sidebar-item">
                <span class="deep-sidebar-label" style="color: var(--clr-emerald)">🏥 Total Clinics</span>
                <p class="deep-sidebar-text">${cachedMetrics.health.clinics} active municipal facilities</p>
            </div>
            <div class="deep-sidebar-item">
                <span class="deep-sidebar-label" style="color: var(--clr-purple)">🕒 Emergency Dispatch ETA</span>
                <p class="deep-sidebar-text">Current ambulance response index is ${cachedMetrics.health.ambulance_eta} mins.</p>
            </div>
            <div class="deep-sidebar-item">
                <span class="deep-sidebar-label" style="color: var(--clr-indigo)">🛌 Bed Capacity</span>
                <p class="deep-sidebar-text">Available beds index is ${cachedMetrics.health.beds} score.</p>
            </div>
        `;
        grid.appendChild(sideCol);
        
        chartRenderArea.appendChild(desc);
        chartRenderArea.appendChild(grid);
        
        drawHealthDeepChart("health-deep-chart");
        
    } else if (activeDomainId === "environment") {
        const desc = document.createElement("p");
        desc.className = "deep-dive-desc";
        desc.textContent = `Monitoring high-frequency particulate count across key industrial ringways. Air Quality Index currently registers at ${cachedMetrics.aqi.score} (Moderate). Proposed green corridors aim to offset emissions by 40% over 3 years.`;
        
        const container = document.createElement("div");
        container.className = "deep-dive-chart-container";
        container.id = "environment-deep-chart";
        
        chartRenderArea.appendChild(desc);
        chartRenderArea.appendChild(container);
        
        drawEnvironmentDeepChart("environment-deep-chart");
        
    } else if (activeDomainId === "energy") {
        const desc = document.createElement("p");
        desc.className = "deep-dive-desc";
        desc.textContent = "Predictive analysis of smart grid peak load and renewable energy supply. Real-time battery bank storage discharge buffers grid stress during evening rush hours.";
        
        const container = document.createElement("div");
        container.className = "deep-dive-chart-container";
        container.id = "energy-deep-chart";
        
        chartRenderArea.appendChild(desc);
        chartRenderArea.appendChild(container);
        
        drawEnergyDeepChart("energy-deep-chart");
        
    } else if (activeDomainId === "waste") {
        const desc = document.createElement("p");
        desc.className = "deep-dive-desc";
        desc.textContent = "Smart waste management loops. Optimization of collection routing, sensor-enabled bin fill rate tracking, and regional landfill diversion policies.";
        
        const container = document.createElement("div");
        container.className = "deep-dive-chart-container";
        container.id = "waste-deep-chart";
        
        chartRenderArea.appendChild(desc);
        chartRenderArea.appendChild(container);
        
        drawWasteDeepChart("waste-deep-chart");
        
    } else if (activeDomainId === "education") {
        const desc = document.createElement("p");
        desc.className = "deep-dive-desc";
        desc.textContent = "Tracking lifelong learning participation, vocational education attendance, and school resource gap indexes across municipal zones.";
        
        const container = document.createElement("div");
        container.className = "deep-dive-chart-container";
        container.id = "education-deep-chart";
        
        chartRenderArea.appendChild(desc);
        chartRenderArea.appendChild(container);
        
        drawEducationDeepChart("education-deep-chart");
        
    } else if (activeDomainId === "citizen") {
        const desc = document.createElement("p");
        desc.className = "deep-dive-desc";
        desc.textContent = "Analyzing public sentiment from municipal feedback channels. Tracking public service response satisfaction scores across different departments.";
        
        const container = document.createElement("div");
        container.className = "deep-dive-chart-container";
        container.id = "citizen-deep-chart";
        
        chartRenderArea.appendChild(desc);
        chartRenderArea.appendChild(container);
        
        drawCitizenDeepChart("citizen-deep-chart");
        
    } else {
        // Fallback placeholder card for other metrics
        const card = document.createElement("div");
        card.className = "mini-chart-card";
        card.style.height = "250px";
        card.innerHTML = `
            <div style="text-align: center; margin: auto; padding: 1rem;">
                <span style="font-size: 2rem;">🗃️</span>
                <h4 style="margin-top: 1rem; color: var(--text-primary); font-family: var(--font-header);">Sector Telemetry Gauges Active</h4>
                <p style="font-size: 11px; margin-top: 0.5rem; color: var(--text-secondary);">No custom charts mapped for this domain yet. Live streams are analyzed by the Decision Engine in the background.</p>
            </div>
        `;
        chartRenderArea.appendChild(card);
    }
}

// ----------------------------------------------------
// Custom SVG Graphics Functions
// ----------------------------------------------------

function drawMiniMobilityChart(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Mobility traffic array (24 points, slice peak hours 6 to 22)
    const traffic = cachedMetrics.mobility.traffic.slice(6, 22);
    const dataPoints = traffic.map((val, idx) => ({ x: idx, y: val }));
    
    const width = container.clientWidth;
    const height = 110;
    
    // Create points path string
    const scaleX = width / (dataPoints.length - 1);
    const scaleY = (height - 20) / 100;
    
    let pathD = "";
    let areaD = `M 0 ${height - 10} `;
    
    dataPoints.forEach((pt, idx) => {
        const cx = idx * scaleX;
        const cy = height - 10 - (pt.y * scaleY);
        
        if (idx === 0) {
            pathD += `M ${cx} ${cy} `;
        } else {
            pathD += `L ${cx} ${cy} `;
        }
        areaD += `L ${cx} ${cy} `;
    });
    
    areaD += `L ${(dataPoints.length - 1) * scaleX} ${height - 10} Z`;
    
    container.innerHTML = `
        <svg class="chart-svg" width="100%" height="110">
            <defs>
                <linearGradient id="glow-mob" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stop-color="var(--clr-cyan)" stop-opacity="0.25"/>
                    <stop offset="95%" stop-color="var(--clr-cyan)" stop-opacity="0"/>
                </linearGradient>
            </defs>
            <path class="chart-area" d="${areaD}" fill="url(#glow-mob)"></path>
            <path class="chart-line" d="${pathD}" stroke="var(--clr-cyan)"></path>
        </svg>
    `;
}

function drawMiniEnergyChart(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const energy = cachedMetrics.energy; // 12 points
    const width = container.clientWidth;
    const height = 110;
    
    const barCount = energy.length;
    const padding = 6;
    const barWidth = (width - (padding * (barCount - 1))) / barCount;
    
    let svgContent = `<svg class="chart-svg" width="100%" height="110">`;
    
    energy.forEach((val, idx) => {
        const demand = val * 20 + 1000;
        const maxDemand = 2800; // max scale
        const barHeight = (val / 100) * (height - 20);
        const rx = idx * (barWidth + padding);
        const ry = height - 10 - barHeight;
        
        // Solar generation simulated
        const isSun = idx > 3 && idx < 9;
        const solarGenVal = val * (isSun ? 0.65 : 0.15);
        const solarHeight = (solarGenVal / 100) * (height - 20);
        const sry = height - 10 - solarHeight;
        
        // Demand bar (Amber)
        svgContent += `
            <rect class="chart-bar" x="${rx}" y="${ry}" width="${barWidth/2}" height="${barHeight}" fill="var(--clr-amber)" rx="2" 
                onmousemove="showTooltip(event, '${idx + 8} AM', 'Demand: ${demand} MW')" onmouseout="hideTooltip()"/>
        `;
        
        // Solar generation bar (Green)
        svgContent += `
            <rect class="chart-bar" x="${rx + (barWidth/2)}" y="${sry}" width="${barWidth/2}" height="${solarHeight}" fill="var(--clr-emerald)" rx="2"
                onmousemove="showTooltip(event, '${idx + 8} AM', 'Solar Gen: ${Math.round(solarGenVal * 20)} MW')" onmouseout="hideTooltip()"/>
        `;
    });
    
    svgContent += `</svg>`;
    container.innerHTML = svgContent;
}

function drawMiniEnvChart(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const pm25 = cachedMetrics.aqi.pm25;
    const pm10 = cachedMetrics.aqi.pm10;
    const no2 = cachedMetrics.aqi.no2;
    const o3 = cachedMetrics.aqi.o3;
    
    const total = pm25 + pm10 + no2 + o3;
    
    const data = [
        { label: "PM2.5", val: pm25, color: "var(--clr-rose)" },
        { label: "PM10", val: pm10, color: "var(--clr-amber)" },
        { label: "NO2", val: no2, color: "var(--clr-indigo)" },
        { label: "O3", val: o3, color: "var(--clr-emerald)" }
    ];
    
    // Draw visual Pie (Donut SVG)
    let cumulativePercent = 0;
    let pathAccumulator = "";
    
    function getCoordinatesForPercent(percent) {
        const x = Math.cos(2 * Math.PI * percent);
        const y = Math.sin(2 * Math.PI * percent);
        return [x, y];
    }
    
    data.forEach(item => {
        const percent = item.val / total;
        const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
        cumulativePercent += percent;
        const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
        
        const largeArcFlag = percent > 0.5 ? 1 : 0;
        
        // Scale to coordinates (cx: 30, cy: 30, r: 24)
        const sX = startX * 24 + 30;
        const sY = startY * 24 + 30;
        const eX = endX * 24 + 30;
        const eY = endY * 24 + 30;
        
        pathAccumulator += `
            <path d="M ${sX} ${sY} A 24 24 0 ${largeArcFlag} 1 ${eX} ${eY}" 
                fill="none" stroke="${item.color}" stroke-width="8" 
                onmousemove="showTooltip(event, '${item.label}', '${item.val} µg/m³')" onmouseout="hideTooltip()"/>
        `;
    });
    
    const pieSvg = `
        <div class="pie-chart-left">
            <svg class="chart-svg" viewBox="0 0 60 60" style="overflow: visible">
                ${pathAccumulator}
                <circle cx="30" cy="30" r="16" fill="var(--bg-card)"/>
            </svg>
        </div>
        <div class="pie-chart-right">
            ${data.map(item => `
                <div class="pie-legend-row">
                    <span class="flex-align"><span class="legend-color-dot" style="background-color: ${item.color}"></span>${item.label}</span>
                    <span class="pie-value">${item.val}</span>
                </div>
            `).join("")}
        </div>
    `;
    
    container.innerHTML = pieSvg;
}

function drawMiniHeatmapGrid(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const heatmap = cachedMetrics.heatmap;
    
    let html = `<div class="heatmap-grid">`;
    
    heatmap.forEach(cell => {
        let cellClass = "heatmap-cell";
        if (cell.status === "crit") cellClass += " cell-crit";
        else if (cell.status === "high") cellClass += " cell-high";
        else if (cell.status === "med") cellClass += " cell-med";
        else cellClass += " cell-low";
        
        html += `
            <div class="${cellClass}" 
                 title="Zone ${cell.zone} - Status: ${cell.status}"
                 onmousemove="showTooltip(event, 'Zone ${cell.zone}', 'State: ${cell.status.toUpperCase()}')" 
                 onmouseout="hideTooltip()">
            </div>
        `;
    });
    
    html += `</div>`;
    container.innerHTML = html;
}

function drawMobilityDeepChart(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const width = container.clientWidth;
    const height = 280;
    
    // Draw area chart using SVG
    const bus = cachedMetrics.mobility.bus;
    const traffic = cachedMetrics.mobility.traffic;
    const metro = cachedMetrics.mobility.metro;
    
    const paddingX = 35;
    const paddingY = 30;
    const scaleX = (width - paddingX * 2) / (traffic.length - 1);
    const scaleY = (height - paddingY * 2) / 100;
    
    let gridlines = "";
    // Y-Axis grid lines
    for (let i = 0; i <= 4; i++) {
        const val = i * 25;
        const cy = height - paddingY - (val * scaleY);
        gridlines += `<line class="chart-gridline" x1="${paddingX}" y1="${cy}" x2="${width - paddingX}" y2="${cy}" />`;
        gridlines += `<text class="chart-axis-text" x="${paddingX - 10}" y="${cy + 3}" text-anchor="end">${val}%</text>`;
    }
    
    // X-Axis hours labels
    for (let i = 0; i < 24; i += 4) {
        const cx = paddingX + (i * scaleX);
        const timeStr = `${i.toString().padStart(2, '0')}:00`;
        gridlines += `<text class="chart-axis-text" x="${cx}" y="${height - paddingY + 16}" text-anchor="middle">${timeStr}</text>`;
    }
    
    // Area/Line strings
    let trafficLine = "";
    let trafficArea = `M ${paddingX} ${height - paddingY} `;
    
    let busLine = "";
    let busArea = `M ${paddingX} ${height - paddingY} `;
    
    let metroLine = "";
    
    for (let i = 0; i < 24; i++) {
        const cx = paddingX + (i * scaleX);
        
        // Traffic
        const cyT = height - paddingY - (traffic[i] * scaleY);
        if (i === 0) {
            trafficLine += `M ${cx} ${cyT} `;
        } else {
            trafficLine += `L ${cx} ${cyT} `;
        }
        trafficArea += `L ${cx} ${cyT} `;
        
        // Bus
        const cyB = height - paddingY - (bus[i] * scaleY);
        if (i === 0) {
            busLine += `M ${cx} ${cyB} `;
        } else {
            busLine += `L ${cx} ${cyB} `;
        }
        busArea += `L ${cx} ${cyB} `;
        
        // Metro
        const cyM = height - paddingY - (metro[i] * scaleY);
        if (i === 0) {
            metroLine += `M ${cx} ${cyM} `;
        } else {
            metroLine += `L ${cx} ${cyM} `;
        }
    }
    
    trafficArea += `L ${paddingX + (23 * scaleX)} ${height - paddingY} Z`;
    busArea += `L ${paddingX + (23 * scaleX)} ${height - paddingY} Z`;
    
    let interactionNodes = "";
    // Interaction circles
    for (let i = 0; i < 24; i += 2) {
        const cx = paddingX + (i * scaleX);
        const cyT = height - paddingY - (traffic[i] * scaleY);
        const cyB = height - paddingY - (bus[i] * scaleY);
        const cyM = height - paddingY - (metro[i] * scaleY);
        
        interactionNodes += `
            <circle class="chart-dot" cx="${cx}" cy="${cyT}" r="3" fill="#fff" stroke="var(--clr-rose)" stroke-width="1.5" 
                onmousemove="showTooltip(event, '${i.toString().padStart(2,'0')}:00', 'Traffic: ${traffic[i]}%')" onmouseout="hideTooltip()"/>
            <circle class="chart-dot" cx="${cx}" cy="${cyB}" r="3" fill="#fff" stroke="var(--clr-indigo)" stroke-width="1.5"
                onmousemove="showTooltip(event, '${i.toString().padStart(2,'0')}:00', 'Bus Flow: ${bus[i]}%')" onmouseout="hideTooltip()"/>
            <circle class="chart-dot" cx="${cx}" cy="${cyM}" r="3" fill="#fff" stroke="var(--clr-emerald)" stroke-width="1.5"
                onmousemove="showTooltip(event, '${i.toString().padStart(2,'0')}:00', 'Metro Flow: ${metro[i]}%')" onmouseout="hideTooltip()"/>
        `;
    }
    
    container.innerHTML = `
        <svg class="chart-svg" width="100%" height="280">
            <defs>
                <linearGradient id="glow-t" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stop-color="var(--clr-rose)" stop-opacity="0.15"/>
                    <stop offset="95%" stop-color="var(--clr-rose)" stop-opacity="0"/>
                </linearGradient>
                <linearGradient id="glow-b" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stop-color="var(--clr-indigo)" stop-opacity="0.15"/>
                    <stop offset="95%" stop-color="var(--clr-indigo)" stop-opacity="0"/>
                </linearGradient>
            </defs>
            ${gridlines}
            <path class="chart-area" d="${trafficArea}" fill="url(#glow-t)"></path>
            <path class="chart-area" d="${busArea}" fill="url(#glow-b)"></path>
            <path class="chart-line" d="${trafficLine}" stroke="var(--clr-rose)"></path>
            <path class="chart-line" d="${busLine}" stroke="var(--clr-indigo)"></path>
            <path class="chart-line" d="${metroLine}" stroke="var(--clr-emerald)" stroke-dasharray="0" stroke-width="2.5"></path>
            ${interactionNodes}
        </svg>
    `;
}

function drawSafetyDeepChart(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const width = container.clientWidth;
    const height = 290;
    
    const districts = [
        { name: "D1", incident: 3, response: 6.2 },
        { name: "D2", incident: 1, response: 5.1 },
        { name: "D3", incident: 4, response: 8.4 },
        { name: "D4", incident: 2, response: 4.8 },
        { name: "D5", incident: 6, response: 11.2 },
        { name: "D6", incident: 2, response: 5.5 },
        { name: "D7", incident: 8, response: 12.8 }
    ];
    
    const paddingX = 35;
    const paddingY = 30;
    const barCount = districts.length;
    const barWidth = ((width - paddingX * 2) / barCount) - 16;
    
    const maxVal = 14; // max scale
    const scaleY = (height - paddingY * 2) / maxVal;
    
    let gridlines = "";
    for (let i = 0; i <= 7; i++) {
        const val = i * 2;
        const cy = height - paddingY - (val * scaleY);
        gridlines += `<line class="chart-gridline" x1="${paddingX}" y1="${cy}" x2="${width - paddingX}" y2="${cy}" stroke-dasharray="2" />`;
        gridlines += `<text class="chart-axis-text" x="${paddingX - 10}" y="${cy + 3}" text-anchor="end">${val}</text>`;
    }
    
    let barsContent = "";
    districts.forEach((d, idx) => {
        const cx = paddingX + 8 + (idx * ((width - paddingX * 2) / barCount));
        
        // Incident bar
        const incHeight = d.incident * scaleY;
        const incY = height - paddingY - incHeight;
        
        // Response time bar
        const respHeight = d.response * scaleY;
        const respY = height - paddingY - respHeight;
        
        barsContent += `
            <rect class="chart-bar" x="${cx}" y="${incY}" width="${barWidth/2}" height="${incHeight}" fill="var(--clr-purple)" rx="2" 
                onmousemove="showTooltip(event, '${d.name}', 'Active Incidents: ${d.incident}')" onmouseout="hideTooltip()"/>
            <rect class="chart-bar" x="${cx + (barWidth/2) + 2}" y="${respY}" width="${barWidth/2}" height="${respHeight}" fill="var(--clr-rose)" rx="2"
                onmousemove="showTooltip(event, '${d.name}', 'Response ETA: ${d.response}m')" onmouseout="hideTooltip()"/>
            <text class="chart-axis-text" x="${cx + (barWidth/2)}" y="${height - paddingY + 16}" text-anchor="middle">${d.name}</text>
        `;
    });
    
    container.innerHTML = `
        <svg class="chart-svg" width="100%" height="290">
            ${gridlines}
            ${barsContent}
        </svg>
    `;
}

function drawHealthDeepChart(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const width = container.clientWidth;
    const height = 290;
    
    const data = [
        { name: "Mon", wait: 24, score: 72 },
        { name: "Tue", wait: 21, score: 75 },
        { name: "Wed", wait: 18, score: 76 },
        { name: "Thu", wait: 15, score: 79 },
        { name: "Fri", wait: 22, score: 74 },
        { name: "Sat", wait: 28, score: 70 },
        { name: "Sun", wait: 20, score: 76 }
    ];
    
    const paddingX = 35;
    const paddingY = 30;
    const scaleX = (width - paddingX * 2) / (data.length - 1);
    const scaleY = (height - paddingY * 2) / 100;
    
    let gridlines = "";
    for (let i = 0; i <= 4; i++) {
        const val = i * 25;
        const cy = height - paddingY - (val * scaleY);
        gridlines += `<line class="chart-gridline" x1="${paddingX}" y1="${cy}" x2="${width - paddingX}" y2="${cy}" />`;
        gridlines += `<text class="chart-axis-text" x="${paddingX - 10}" y="${cy + 3}" text-anchor="end">${val}</text>`;
    }
    
    data.forEach((d, i) => {
        const cx = paddingX + (i * scaleX);
        gridlines += `<text class="chart-axis-text" x="${cx}" y="${height - paddingY + 16}" text-anchor="middle">${d.name}</text>`;
    });
    
    let waitLine = "";
    let scoreLine = "";
    
    data.forEach((d, i) => {
        const cx = paddingX + (i * scaleX);
        const cyWait = height - paddingY - (d.wait * scaleY);
        const cyScore = height - paddingY - (d.score * scaleY);
        
        if (i === 0) {
            waitLine += `M ${cx} ${cyWait} `;
            scoreLine += `M ${cx} ${cyScore} `;
        } else {
            waitLine += `L ${cx} ${cyWait} `;
            scoreLine += `L ${cx} ${cyScore} `;
        }
    });
    
    let interactionNodes = "";
    data.forEach((d, i) => {
        const cx = paddingX + (i * scaleX);
        const cyWait = height - paddingY - (d.wait * scaleY);
        const cyScore = height - paddingY - (d.score * scaleY);
        
        interactionNodes += `
            <circle class="chart-dot" cx="${cx}" cy="${cyWait}" r="3.5" fill="#fff" stroke="var(--clr-purple)" stroke-width="2" 
                onmousemove="showTooltip(event, '${d.name}', 'Avg Wait: ${d.wait}m')" onmouseout="hideTooltip()"/>
            <circle class="chart-dot" cx="${cx}" cy="${cyScore}" r="3.5" fill="#fff" stroke="var(--clr-emerald)" stroke-width="2"
                onmousemove="showTooltip(event, '${d.name}', 'Access Score: ${d.score}%')" onmouseout="hideTooltip()"/>
        `;
    });
    
    container.innerHTML = `
        <svg class="chart-svg" width="100%" height="290">
            ${gridlines}
            <path class="chart-line" d="${waitLine}" stroke="var(--clr-purple)" stroke-width="2.5"></path>
            <path class="chart-line" d="${scoreLine}" stroke="var(--clr-emerald)" stroke-width="2.5"></path>
            ${interactionNodes}
        </svg>
    `;
}

function drawEnvironmentDeepChart(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const width = container.clientWidth;
    const height = 280;
    
    const basePm25 = cachedMetrics.aqi.pm25;
    const basePm10 = cachedMetrics.aqi.pm10;
    const baseNo2 = cachedMetrics.aqi.no2;
    
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const pm25 = [basePm25 + 5, basePm25, basePm25 - 8, basePm25 - 2, basePm25 + 12, basePm25 + 1, basePm25 - 4];
    const pm10 = [basePm10 - 2, basePm10, basePm10 - 5, basePm10 + 2, basePm10 + 8, basePm10 - 3, basePm10 - 6];
    const no2 = [baseNo2 + 4, baseNo2, baseNo2 - 6, baseNo2 - 1, baseNo2 + 10, baseNo2, baseNo2 - 3];
    
    const paddingX = 35;
    const paddingY = 30;
    const scaleX = (width - paddingX * 2) / (days.length - 1);
    
    const maxVal = Math.max(...pm25, ...pm10, ...no2, 100);
    const scaleY = (height - paddingY * 2) / maxVal;
    
    let gridlines = "";
    const gridStep = maxVal / 4;
    for (let i = 0; i <= 4; i++) {
        const val = Math.round(i * gridStep);
        const cy = height - paddingY - (val * scaleY);
        gridlines += `<line class="chart-gridline" x1="${paddingX}" y1="${cy}" x2="${width - paddingX}" y2="${cy}" />`;
        gridlines += `<text class="chart-axis-text" x="${paddingX - 10}" y="${cy + 3}" text-anchor="end">${val}</text>`;
    }
    
    days.forEach((day, i) => {
        const cx = paddingX + (i * scaleX);
        gridlines += `<text class="chart-axis-text" x="${cx}" y="${height - paddingY + 16}" text-anchor="middle">${day}</text>`;
    });
    
    let pm25Line = "";
    let pm25Area = `M ${paddingX} ${height - paddingY} `;
    let pm10Line = "";
    let pm10Area = `M ${paddingX} ${height - paddingY} `;
    let no2Line = "";
    
    days.forEach((day, i) => {
        const cx = paddingX + (i * scaleX);
        const cyPm25 = height - paddingY - (pm25[i] * scaleY);
        const cyPm10 = height - paddingY - (pm10[i] * scaleY);
        const cyNo2 = height - paddingY - (no2[i] * scaleY);
        
        if (i === 0) {
            pm25Line += `M ${cx} ${cyPm25} `;
            pm10Line += `M ${cx} ${cyPm10} `;
            no2Line += `M ${cx} ${cyNo2} `;
        } else {
            pm25Line += `L ${cx} ${cyPm25} `;
            pm10Line += `L ${cx} ${cyPm10} `;
            no2Line += `L ${cx} ${cyNo2} `;
        }
        pm25Area += `L ${cx} ${cyPm25} `;
        pm10Area += `L ${cx} ${cyPm10} `;
    });
    
    pm25Area += `L ${paddingX + (6 * scaleX)} ${height - paddingY} Z`;
    pm10Area += `L ${paddingX + (6 * scaleX)} ${height - paddingY} Z`;
    
    let interactionNodes = "";
    days.forEach((day, i) => {
        const cx = paddingX + (i * scaleX);
        const cyPm25 = height - paddingY - (pm25[i] * scaleY);
        const cyPm10 = height - paddingY - (pm10[i] * scaleY);
        const cyNo2 = height - paddingY - (no2[i] * scaleY);
        
        interactionNodes += `
            <circle class="chart-dot" cx="${cx}" cy="${cyPm25}" r="3" fill="#fff" stroke="var(--clr-rose)" stroke-width="1.5" 
                onmousemove="showTooltip(event, '${day}', 'PM2.5: ${pm25[i]} µg/m³')" onmouseout="hideTooltip()"/>
            <circle class="chart-dot" cx="${cx}" cy="${cyPm10}" r="3" fill="#fff" stroke="var(--clr-amber)" stroke-width="1.5"
                onmousemove="showTooltip(event, '${day}', 'PM10: ${pm10[i]} µg/m³')" onmouseout="hideTooltip()"/>
            <circle class="chart-dot" cx="${cx}" cy="${cyNo2}" r="3" fill="#fff" stroke="var(--clr-cyan)" stroke-width="1.5"
                onmousemove="showTooltip(event, '${day}', 'NO2: ${no2[i]} ppb')" onmouseout="hideTooltip()"/>
        `;
    });
    
    container.innerHTML = `
        <svg class="chart-svg" width="100%" height="280">
            <defs>
                <linearGradient id="glow-pm25" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stop-color="var(--clr-rose)" stop-opacity="0.15"/>
                    <stop offset="95%" stop-color="var(--clr-rose)" stop-opacity="0"/>
                </linearGradient>
                <linearGradient id="glow-pm10" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stop-color="var(--clr-amber)" stop-opacity="0.15"/>
                    <stop offset="95%" stop-color="var(--clr-amber)" stop-opacity="0"/>
                </linearGradient>
            </defs>
            ${gridlines}
            <path class="chart-area" d="${pm25Area}" fill="url(#glow-pm25)"></path>
            <path class="chart-area" d="${pm10Area}" fill="url(#glow-pm10)"></path>
            <path class="chart-line" d="${pm25Line}" stroke="var(--clr-rose)"></path>
            <path class="chart-line" d="${pm10Line}" stroke="var(--clr-amber)"></path>
            <path class="chart-line" d="${no2Line}" stroke="var(--clr-cyan)"></path>
            ${interactionNodes}
        </svg>
    `;
}

function drawEnergyDeepChart(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const width = container.clientWidth;
    const height = 280;
    
    const energy = cachedMetrics.energy;
    const paddingX = 55;
    const paddingY = 30;
    const scaleX = (width - paddingX * 2) / (energy.length - 1);
    
    const maxVal = 3000;
    const scaleY = (height - paddingY * 2) / maxVal;
    
    let gridlines = "";
    for (let i = 0; i <= 4; i++) {
        const val = i * 750;
        const cy = height - paddingY - (val * scaleY);
        gridlines += `<line class="chart-gridline" x1="${paddingX}" y1="${cy}" x2="${width - paddingX}" y2="${cy}" />`;
        gridlines += `<text class="chart-axis-text" x="${paddingX - 10}" y="${cy + 3}" text-anchor="end">${val} MW</text>`;
    }
    
    energy.forEach((val, i) => {
        const cx = paddingX + (i * scaleX);
        gridlines += `<text class="chart-axis-text" x="${cx}" y="${height - paddingY + 16}" text-anchor="middle">${i + 8} AM</text>`;
    });
    
    let demandLine = "";
    let solarLine = "";
    
    energy.forEach((val, i) => {
        const cx = paddingX + (i * scaleX);
        const demand = val * 20 + 1000;
        const isSun = i > 3 && i < 9;
        const solarGen = val * (isSun ? 0.65 : 0.15) * 20;
        
        const cyD = height - paddingY - (demand * scaleY);
        const cyS = height - paddingY - (solarGen * scaleY);
        
        if (i === 0) {
            demandLine += `M ${cx} ${cyD} `;
            solarLine += `M ${cx} ${cyS} `;
        } else {
            demandLine += `L ${cx} ${cyD} `;
            solarLine += `L ${cx} ${cyS} `;
        }
    });
    
    let interactionNodes = "";
    energy.forEach((val, i) => {
        const cx = paddingX + (i * scaleX);
        const demand = val * 20 + 1000;
        const isSun = i > 3 && i < 9;
        const solarGen = Math.round(val * (isSun ? 0.65 : 0.15) * 20);
        
        const cyD = height - paddingY - (demand * scaleY);
        const cyS = height - paddingY - (solarGen * scaleY);
        
        interactionNodes += `
            <circle class="chart-dot" cx="${cx}" cy="${cyD}" r="3.5" fill="#fff" stroke="var(--clr-amber)" stroke-width="2" 
                onmousemove="showTooltip(event, '${i + 8} AM', 'Demand: ${demand} MW')" onmouseout="hideTooltip()"/>
            <circle class="chart-dot" cx="${cx}" cy="${cyS}" r="3.5" fill="#fff" stroke="var(--clr-emerald)" stroke-width="2"
                onmousemove="showTooltip(event, '${i + 8} AM', 'Solar Gen: ${solarGen} MW')" onmouseout="hideTooltip()"/>
        `;
    });
    
    container.innerHTML = `
        <svg class="chart-svg" width="100%" height="280">
            ${gridlines}
            <path class="chart-line" d="${demandLine}" stroke="var(--clr-amber)" stroke-width="2.5"></path>
            <path class="chart-line" d="${solarLine}" stroke="var(--clr-emerald)" stroke-width="2.5"></path>
            ${interactionNodes}
        </svg>
    `;
}

function drawWasteDeepChart(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const width = container.clientWidth;
    const height = 280;
    
    const sectors = [
        { name: "North", val: cachedMetrics.waste[0] || 62 },
        { name: "South", val: cachedMetrics.waste[1] || 74 },
        { name: "East", val: cachedMetrics.waste[2] || 58 },
        { name: "West", val: cachedMetrics.waste[3] || 69 },
        { name: "Central", val: cachedMetrics.waste[4] || 81 },
        { name: "Metro", val: cachedMetrics.waste[5] || 65 },
        { name: "Suburbs", val: cachedMetrics.waste[6] || 55 }
    ];
    
    const paddingX = 40;
    const paddingY = 30;
    const barCount = sectors.length;
    const barWidth = ((width - paddingX * 2) / barCount) - 16;
    const scaleY = (height - paddingY * 2) / 100;
    
    let gridlines = "";
    for (let i = 0; i <= 4; i++) {
        const val = i * 25;
        const cy = height - paddingY - (val * scaleY);
        gridlines += `<line class="chart-gridline" x1="${paddingX}" y1="${cy}" x2="${width - paddingX}" y2="${cy}" />`;
        gridlines += `<text class="chart-axis-text" x="${paddingX - 10}" y="${cy + 3}" text-anchor="end">${val}%</text>`;
    }
    
    let barsContent = "";
    sectors.forEach((s, idx) => {
        const cx = paddingX + 8 + (idx * ((width - paddingX * 2) / barCount));
        
        const recHeight = s.val * scaleY;
        const recY = height - paddingY - recHeight;
        
        const landVal = 100 - s.val;
        const landHeight = landVal * scaleY;
        const landY = height - paddingY - landHeight;
        
        barsContent += `
            <rect class="chart-bar" x="${cx}" y="${recY}" width="${barWidth/2}" height="${recHeight}" fill="var(--clr-cyan)" rx="2" 
                onmousemove="showTooltip(event, '${s.name} Sector', 'Recycling: ${s.val}%')" onmouseout="hideTooltip()"/>
            <rect class="chart-bar" x="${cx + (barWidth/2) + 2}" y="${landY}" width="${barWidth/2}" height="${landHeight}" fill="var(--clr-rose)" rx="2"
                onmousemove="showTooltip(event, '${s.name} Sector', 'Landfill: ${landVal}%')" onmouseout="hideTooltip()"/>
            <text class="chart-axis-text" x="${cx + (barWidth/2)}" y="${height - paddingY + 16}" text-anchor="middle">${s.name}</text>
        `;
    });
    
    container.innerHTML = `
        <svg class="chart-svg" width="100%" height="280">
            ${gridlines}
            ${barsContent}
        </svg>
    `;
}

function drawEducationDeepChart(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const width = container.clientWidth;
    const height = 280;
    
    const data = [
        { zone: "Zone A", completion: 82, attendance: 75 },
        { zone: "Zone B", completion: 88, attendance: 82 },
        { zone: "Zone C", completion: 64, attendance: 60 },
        { zone: "Zone D", completion: 78, attendance: 70 },
        { zone: "Zone E", completion: 94, attendance: 88 },
        { zone: "Zone F", completion: 80, attendance: 78 }
    ];
    
    const paddingX = 40;
    const paddingY = 30;
    const barCount = data.length;
    const barWidth = ((width - paddingX * 2) / barCount) - 16;
    const scaleY = (height - paddingY * 2) / 100;
    
    let gridlines = "";
    for (let i = 0; i <= 4; i++) {
        const val = i * 25;
        const cy = height - paddingY - (val * scaleY);
        gridlines += `<line class="chart-gridline" x1="${paddingX}" y1="${cy}" x2="${width - paddingX}" y2="${cy}" />`;
        gridlines += `<text class="chart-axis-text" x="${paddingX - 10}" y="${cy + 3}" text-anchor="end">${val}%</text>`;
    }
    
    let barsContent = "";
    data.forEach((d, idx) => {
        const cx = paddingX + 8 + (idx * ((width - paddingX * 2) / barCount));
        
        const compHeight = d.completion * scaleY;
        const compY = height - paddingY - compHeight;
        
        const attHeight = d.attendance * scaleY;
        const attY = height - paddingY - attHeight;
        
        barsContent += `
            <rect class="chart-bar" x="${cx}" y="${compY}" width="${barWidth/2}" height="${compHeight}" fill="var(--clr-amber)" rx="2" 
                onmousemove="showTooltip(event, '${d.zone}', 'Completion Rate: ${d.completion}%')" onmouseout="hideTooltip()"/>
            <rect class="chart-bar" x="${cx + (barWidth/2) + 2}" y="${attY}" width="${barWidth/2}" height="${attHeight}" fill="var(--clr-indigo)" rx="2"
                onmousemove="showTooltip(event, '${d.zone}', 'Vocational Attendance: ${d.attendance}%')" onmouseout="hideTooltip()"/>
            <text class="chart-axis-text" x="${cx + (barWidth/2)}" y="${height - paddingY + 16}" text-anchor="middle">${d.zone}</text>
        `;
    });
    
    container.innerHTML = `
        <svg class="chart-svg" width="100%" height="280">
            ${gridlines}
            ${barsContent}
        </svg>
    `;
}

function drawCitizenDeepChart(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const width = container.clientWidth;
    const height = 280;
    
    const departments = [
        { name: "Transit", rating: 4.1, eta: 12 },
        { name: "Safety", rating: 3.8, eta: 7 },
        { name: "Health", rating: 4.4, eta: 18 },
        { name: "Energy", rating: 4.3, eta: 15 },
        { name: "Waste", rating: 3.9, eta: 22 },
        { name: "Citizen", rating: 4.2, eta: 10 }
    ];
    
    const paddingX = 40;
    const paddingY = 30;
    const barCount = departments.length;
    const barWidth = ((width - paddingX * 2) / barCount) - 16;
    const scaleY = (height - paddingY * 2) / 5;
    
    let gridlines = "";
    for (let i = 0; i <= 5; i++) {
        const cy = height - paddingY - (i * scaleY);
        gridlines += `<line class="chart-gridline" x1="${paddingX}" y1="${cy}" x2="${width - paddingX}" y2="${cy}" />`;
        gridlines += `<text class="chart-axis-text" x="${paddingX - 10}" y="${cy + 3}" text-anchor="end">${i}.0 ⭐</text>`;
    }
    
    let barsContent = "";
    departments.forEach((d, idx) => {
        const cx = paddingX + 8 + (idx * ((width - paddingX * 2) / barCount));
        
        const ratHeight = d.rating * scaleY;
        const ratY = height - paddingY - ratHeight;
        
        const etaHeight = (d.eta / 25) * (height - paddingY * 2);
        const etaY = height - paddingY - etaHeight;
        
        barsContent += `
            <rect class="chart-bar" x="${cx}" width="${barWidth}" height="${ratHeight}" y="${ratY}" fill="var(--clr-cyan)" rx="2" 
                onmousemove="showTooltip(event, '${d.name} Dept', 'Satisfaction: ${d.rating}/5.0 ⭐')" onmouseout="hideTooltip()"/>
            <circle class="chart-dot" cx="${cx + barWidth/2}" cy="${etaY}" r="4" fill="#fff" stroke="var(--clr-rose)" stroke-width="2.5"
                onmousemove="showTooltip(event, '${d.name} Dept', 'Average Response: ${d.eta} mins')" onmouseout="hideTooltip()"/>
            <text class="chart-axis-text" x="${cx + (barWidth/2)}" y="${height - paddingY + 16}" text-anchor="middle">${d.name}</text>
        `;
    });
    
    container.innerHTML = `
        <svg class="chart-svg" width="100%" height="280">
            ${gridlines}
            ${barsContent}
        </svg>
    `;
}

// Global Tooltip Management
function showTooltip(event, title, content) {
    tooltipEl.style.display = "block";
    tooltipEl.innerHTML = `
        <div class="tooltip-header">${title}</div>
        <div class="tooltip-row">
            <span class="tooltip-val">${content}</span>
        </div>
    `;
    
    // Position tooltip slightly offset from cursor
    const x = event.pageX + 15;
    const y = event.pageY - 40;
    tooltipEl.style.left = `${x}px`;
    tooltipEl.style.top = `${y}px`;
}

function hideTooltip() {
    tooltipEl.style.display = "none";
}

// ----------------------------------------------------
// AI Chat Terminal Controls
// ----------------------------------------------------

// Hydrate Chat History DOM
function renderChat() {
    chatMessagesContainer.innerHTML = "";
    
    chatMessages.forEach(msg => {
        const wrapClass = msg.role === "user" ? "wrapper-user" : "wrapper-assistant";
        const bubbleClass = msg.role === "user" ? "chat-bubble-user" : "chat-bubble-assistant";
        
        const wrapper = document.createElement("div");
        wrapper.className = `chat-bubble-wrapper ${wrapClass} animate-fade-in`;
        
        // Parse content using marked
        const parsedContent = typeof marked !== 'undefined' ? marked.parse(msg.content) : msg.content;
        
        wrapper.innerHTML = `
            <div class="chat-bubble ${bubbleClass}">
                <div class="markdown-content">${parsedContent}</div>
                <div class="chat-bubble-time">${msg.timestamp}</div>
            </div>
        `;
        
        chatMessagesContainer.appendChild(wrapper);
    });
    
    if (chatLoading) {
        const loadingWrapper = document.createElement("div");
        loadingWrapper.className = "chat-bubble-wrapper wrapper-assistant animate-fade-in";
        loadingWrapper.innerHTML = `
            <div class="chat-bubble chat-bubble-assistant">
                <div class="chat-bubble-loader">
                    <span class="spinner-accent" style="display: inline-block; width: 12px; height: 12px; border: 2px solid transparent; border-top-color: var(--clr-cyan); border-radius: 50%; animation: rotate 1s linear infinite; margin-right: 0.25rem;"></span>
                    <span>Simulating decision matrices...</span>
                </div>
            </div>
        `;
        chatMessagesContainer.appendChild(loadingWrapper);
    }
    
    // Auto Scroll to bottom
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
}

// Send Message
async function handleSendMessage(text) {
    if (!text.trim() || chatLoading) return;
    
    const userMsg = {
        role: "user",
        content: text,
        timestamp: getCurrentTimeStr()
    };
    
    chatMessages.push(userMsg);
    chatInput.value = "";
    chatLoading = true;
    renderChat();
    
    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: text,
                latitude: latitude,
                longitude: longitude
            })
        });
        
        if (!response.ok) {
            throw new Error("Failed to communicate with decision server.");
        }
        
        const data = await response.json();
        
        const aiMsg = {
            role: "assistant",
            content: data.response,
            timestamp: getCurrentTimeStr()
        };
        
        chatMessages.push(aiMsg);
    } catch (err) {
        const errorMsg = {
            role: "assistant",
            content: `❌ **Error:** ${err.message || "Something went wrong while simulating decision analysis."}`,
            timestamp: getCurrentTimeStr()
        };
        chatMessages.push(errorMsg);
    } finally {
        chatLoading = false;
        renderChat();
    }
}

// ----------------------------------------------------
// UI Bindings & Initialization
// ----------------------------------------------------

function initChatSuggestions() {
    const suggestions = [
        "Find nearest hospital",
        "Analyze traffic congestion",
        "Optimize grid demand",
        "Audit public safety"
    ];
    
    suggestionTray.innerHTML = "";
    suggestions.forEach(s => {
        const btn = document.createElement("button");
        btn.className = "suggestion-pill";
        btn.textContent = s;
        btn.addEventListener("click", () => handleSendMessage(s));
        suggestionTray.appendChild(btn);
    });
}

// Setup Event Listeners
function setupEvents() {
    // Recalculate Btn
    recalculateBtn.addEventListener("click", () => fetchData(true));
    
    // Chat Submit Form
    chatInputForm.addEventListener("submit", (e) => {
        e.preventDefault();
        handleSendMessage(chatInput.value);
    });
    
    // Clear Chat
    clearChatBtn.addEventListener("click", () => {
        chatMessages = [
            {
                role: "assistant",
                content: `### CivicMind Decision Intelligence Platform\n\nWelcome! I am your AI policy simulator. Ask me to run predictive analysis or locate resources:\n\n* **"Find nearby hospitals"** (calculates distance based on your active GPS coordinates)\n* **"Analyze urban mobility hotspots"**\n* **"Optimize smart grid energy demand"**\n* **"Audit local public safety response"**`,
                timestamp: getCurrentTimeStr()
            }
        ];
        renderChat();
    });
    
    // Req Location GPS
    locationReqBtn.addEventListener("click", requestLocation);
    
    // Window Resize Chart Adaptability
    window.addEventListener("resize", () => {
        renderActiveChart();
    });
}

// Initial Sync
function init() {
    // Setup time clock
    setInterval(() => {
        const d = new Date();
        liveClock = d.toLocaleTimeString([], { hour12: false });
        clockEl.textContent = liveClock;
    }, 1000);
    
    // Setup events
    setupEvents();
    
    // Setup Chat
    initChatSuggestions();
    renderChat();
    
    // Grab Location
    requestLocation();
    
    // Fetch initial API data
    fetchData();
    
    // Continuous dynamic updates (Every 12s)
    setInterval(() => {
        fetchData();
    }, 12000);
}

// Fire up dashboard when page loads
window.addEventListener("DOMContentLoaded", init);
