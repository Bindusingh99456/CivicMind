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
    
    // Tab filtering btns
    const tabBtns = chartTabsContainer.querySelectorAll(".tab-btn");
    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            selectDomain(btn.getAttribute("data-id"));
        });
    });
    
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
