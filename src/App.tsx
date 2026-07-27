import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShieldAlert, 
  Sparkles, 
  Activity, 
  MapPin, 
  Clock, 
  Play, 
  CheckCircle, 
  RefreshCw,
  Info,
  Layers,
  Database,
  Terminal
} from "lucide-react";
import CivicMindChat from "./components/CivicMindChat";
import DashboardGrid from "./components/DashboardGrid";
import { Domain, Insight, Prediction, Metrics } from "./types";

export default function App() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  
  const [activeDomainId, setActiveDomainId] = useState<string>("all");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [liveClock, setLiveClock] = useState<string>("");
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showGpsMenu, setShowGpsMenu] = useState<boolean>(false);
  
  // Scenario states
  const [tempOffset, setTempOffset] = useState<number>(0);
  const [transitDisruption, setTransitDisruption] = useState<number>(0);
  const [greenInitiative, setGreenInitiative] = useState<number>(0);
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);

  // Console state
  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString([], { hour12: false })}] SYSTEM: Initializing CivicMind GIS Decision Engine...`,
    `[${new Date().toLocaleTimeString([], { hour12: false })}] SYSTEM: Telemetry nodes resolved at 98 geographic coordinates.`,
    `[${new Date().toLocaleTimeString([], { hour12: false })}] SYSTEM: Connected to AI Reasoning Engine (Gemini 2.5 Flash).`,
    `[${new Date().toLocaleTimeString([], { hour12: false })}] SYSTEM: Standby for operator command.`
  ]);

  const logMessage = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false });
    setConsoleLogs(prev => [...prev.slice(-99), `[${timestamp}] ${msg}`]);
  };

  const applyMacroPreset = (name: string, tOff: number, dis: number, green: number) => {
    setTempOffset(tOff);
    setTransitDisruption(dis);
    setGreenInitiative(green);
    logMessage(`MACRO PRESET: Triggered '${name}' (Thermal: ${tOff > 0 ? "+" + tOff : tOff}°C, Disruption: ${dis}%, Canopy: ${green}%)`);
    fetchData(true, latitude, longitude, tOff, dis, green);
  };
  
  // Simulation states
  const [deployingId, setDeployingId] = useState<number | null>(null);
  const [deployedAlerts, setDeployedAlerts] = useState<Record<number, boolean>>({});
  const [runningSimulationIndex, setRunningSimulationIndex] = useState<number | null>(null);
  const [isCrisisMode, setIsCrisisMode] = useState<boolean>(false);

  const [projectionData, setProjectionData] = useState<any[] | null>(null);
  const [projecting, setProjecting] = useState<boolean>(false);
  const [projectionError, setProjectionError] = useState<string | null>(null);

  const runProjectionForecast = async (policyText: string, sector: string, funding: number) => {
    setProjecting(true);
    setProjectionError(null);
    logMessage(`FORECAST STARTED: Simulating 5-year trend for policy in '${sector}' sector...`);
    try {
      const response = await fetch("/api/projection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policy: policyText,
          sector: sector,
          funding: funding,
          latitude: latitude,
          longitude: longitude
        })
      });
      if (!response.ok) {
        throw new Error("Failed to compile AI projection models.");
      }
      const data = await response.json();
      setProjectionData(data);
      logMessage(`FORECAST SUCCESS: 5-year simulation generated. Graphing vectors now.`);
    } catch (err: any) {
      setProjectionError(err.message || "Simulation error");
      logMessage(`FORECAST ERROR: Simulation failed. Falling back to default matrices.`);
    } finally {
      setProjecting(false);
    }
  };

  // Grab location
  const requestLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
        },
        (error) => {
          console.warn("Geolocation permission denied/error:", error);
          // Default center if blocked
          setLatitude(12.9716);
          setLongitude(77.5946);
        }
      );
    } else {
      setLatitude(12.9716);
      setLongitude(77.5946);
    }
  };

  // Fetch telemetry
  const fetchData = async (
    isManual = false,
    lat: number | null = latitude,
    lng: number | null = longitude,
    tOffset = tempOffset,
    disruption = transitDisruption,
    green = greenInitiative
  ) => {
    if (isManual) setRefreshing(true);
    const query = lat !== null && lng !== null
      ? `?latitude=${lat}&longitude=${lng}&tempOffset=${tOffset}&disruption=${disruption}&greenCover=${green}`
      : `?tempOffset=${tOffset}&disruption=${disruption}&greenCover=${green}`;
    try {
      const [domainsRes, predictionsRes, insightsRes, metricsRes] = await Promise.all([
        fetch(`/api/domains${query}`),
        fetch(`/api/predictions${query}`),
        fetch(`/api/insights${query}`),
        fetch(`/api/metrics${query}`)
      ]);

      if (domainsRes.ok) setDomains(await domainsRes.json());
      if (predictionsRes.ok) setPredictions(await predictionsRes.json());
      if (insightsRes.ok) setInsights(await insightsRes.json());
      if (metricsRes.ok) setMetrics(await metricsRes.json());
    } catch (err) {
      console.error("Error drawing telemetry streams:", err);
    } finally {
      if (isManual) {
        setTimeout(() => setRefreshing(false), 600);
      }
    }
  };

  useEffect(() => {
    // Initial fetches
    fetchData();
    requestLocation();

    // Live clock update
    const clockInterval = setInterval(() => {
      const d = new Date();
      setLiveClock(d.toLocaleTimeString([], { hour12: false }));
    }, 1000);

    // Continuous dynamic metrics updates (Every 12s)
    const metricsInterval = setInterval(() => {
      fetchData();
    }, 12000);

    // Continuous dynamic system logs (Every 8s) to show active background simulation
    const logsInterval = setInterval(() => {
      const logs = [
        "SYS: Streaming municipal sensor channels... Status: Optimal",
        "SYS: Connected to Gemini 2.5 Flash model instance.",
        "GIS: Mapping haversine coordinates for District Sub-grid 14.",
        "GRID: Power substation 12B report - active load balanced.",
        "TRANSIT: Recalculating transit corridors throughput velocity.",
        "ENV: Scanning Particulate PM2.5 sensors in Zone 3.",
        "API: Cache buffers clear. Standby for query."
      ];
      const randomLog = logs[Math.floor(Math.random() * logs.length)];
      logMessage(randomLog);
    }, 8000);

    return () => {
      clearInterval(clockInterval);
      clearInterval(metricsInterval);
      clearInterval(logsInterval);
    };
  }, []);

  // Trigger telemetry fetch when GPS state resolves or changes
  useEffect(() => {
    if (latitude !== null && longitude !== null) {
      fetchData(false, latitude, longitude);
    }
  }, [latitude, longitude]);

  const handleDeployAction = (index: number) => {
    if (deployingId !== null) return;
    setDeployingId(index);
    const alert = predictions[index];
    const alertDomain = alert ? alert.domain : "General";
    logMessage(`DISPATCH STARTED: Deploying automated relief mitigation policy to ${alertDomain} Sector.`);
    setTimeout(() => {
      setDeployingId(null);
      setDeployedAlerts(prev => ({ ...prev, [index]: true }));
      logMessage(`DISPATCH SUCCESS: Alert node successfully mitigated. Telemetry stabilizing.`);
    }, 1200);
  };

  const runSimulation = (index: number) => {
    setRunningSimulationIndex(index);
    const simulatedModels = [
      "Urban Mobility Optimizer",
      "Smart Grid Peak Load Dispatch",
      "Healthcare Resource Balancer"
    ];
    const modelName = simulatedModels[index] || "General Core Solver";
    logMessage(`SIMULATION STARTED: Initiating calculations in '${modelName}' model...`);
    setTimeout(() => {
      setRunningSimulationIndex(null);
      fetchData(); // pull fresh fluctuating parameters
      logMessage(`SIMULATION SUCCESS: Model recalculation completed. Telemetry buffers updated.`);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Header Panel */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-600 text-slate-950 shadow-lg shadow-cyan-500/10">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-sans font-bold text-lg text-slate-100 tracking-tight">CivicMind AI</h1>
                <span className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-800 text-cyan-400 uppercase tracking-widest">
                  DECISION ENGINE
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                <Database className="w-3.5 h-3.5 text-cyan-500" />
                Dual-Mode Analytical Control Console (Express Server + Gemini LLM)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
              <Clock className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
              <span>TIME: <strong className="text-slate-200">{liveClock || "SYNCING..."}</strong></span>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowGpsMenu(!showGpsMenu)}
                className="flex items-center gap-1.5 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-cyan-600 transition-colors text-left"
              >
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                <span>
                  GPS:{" "}
                  <strong className="text-slate-200 font-mono">
                    {latitude ? `${latitude.toFixed(4)}, ${longitude?.toFixed(4)}` : "DEFAULT CENTRAL"}
                  </strong>
                </span>
              </button>

              {showGpsMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-2xl z-50 space-y-3 backdrop-blur-md bg-opacity-95">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-sans font-bold text-xs text-slate-200">Simulate Location</span>
                    <button 
                      onClick={() => setShowGpsMenu(false)}
                      className="text-slate-500 hover:text-slate-300 text-xs font-bold"
                    >
                      ×
                    </button>
                  </div>

                  {/* Preset Locations */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Presets</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => {
                          setLatitude(12.9716);
                          setLongitude(77.5946);
                          setShowGpsMenu(false);
                          fetchData(true, 12.9716, 77.5946);
                        }}
                        className="px-2 py-1 bg-slate-950 hover:bg-cyan-950 hover:text-cyan-400 border border-slate-800 rounded text-[10px] text-left transition-all"
                      >
                        🇮🇳 Bengaluru
                      </button>
                      <button
                        onClick={() => {
                          setLatitude(40.7128);
                          setLongitude(-74.0060);
                          setShowGpsMenu(false);
                          fetchData(true, 40.7128, -74.0060);
                        }}
                        className="px-2 py-1 bg-slate-950 hover:bg-cyan-950 hover:text-cyan-400 border border-slate-800 rounded text-[10px] text-left transition-all"
                      >
                        🇺🇸 New York
                      </button>
                      <button
                        onClick={() => {
                          setLatitude(51.5074);
                          setLongitude(-0.1278);
                          setShowGpsMenu(false);
                          fetchData(true, 51.5074, -0.1278);
                        }}
                        className="px-2 py-1 bg-slate-950 hover:bg-cyan-950 hover:text-cyan-400 border border-slate-800 rounded text-[10px] text-left transition-all"
                      >
                        🇬🇧 London
                      </button>
                      <button
                        onClick={() => {
                          setLatitude(35.6762);
                          setLongitude(139.6503);
                          setShowGpsMenu(false);
                          fetchData(true, 35.6762, 139.6503);
                        }}
                        className="px-2 py-1 bg-slate-950 hover:bg-cyan-950 hover:text-cyan-400 border border-slate-800 rounded text-[10px] text-left transition-all"
                      >
                        🇯🇵 Tokyo
                      </button>
                      <button
                        onClick={() => {
                          setLatitude(-33.8688);
                          setLongitude(151.2093);
                          setShowGpsMenu(false);
                          fetchData(true, -33.8688, 151.2093);
                        }}
                        className="px-2 py-1 bg-slate-950 hover:bg-cyan-950 hover:text-cyan-400 border border-slate-800 rounded text-[10px] text-left transition-all col-span-2"
                      >
                        🇦🇺 Sydney
                      </button>
                    </div>
                  </div>

                  {/* Manual Inputs */}
                  <div className="space-y-2 pt-1 border-t border-slate-800">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Custom Coordinates</span>
                    <div className="flex gap-2">
                      <div className="flex-1 space-y-1">
                        <label className="text-[9px] font-mono text-slate-400">Lat</label>
                        <input
                          type="number"
                          step="0.0001"
                          value={latitude || 12.9716}
                          onChange={(e) => setLatitude(Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] font-mono text-slate-200 focus:outline-none focus:border-cyan-600"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="text-[9px] font-mono text-slate-400">Lng</label>
                        <input
                          type="number"
                          step="0.0001"
                          value={longitude || 77.5946}
                          onChange={(e) => setLongitude(Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] font-mono text-slate-200 focus:outline-none focus:border-cyan-600"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowGpsMenu(false);
                        fetchData(true, latitude, longitude);
                      }}
                      className="w-full py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-sans font-bold text-xs rounded transition-colors"
                    >
                      Apply Coordinates
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                const newMode = !isCrisisMode;
                setIsCrisisMode(newMode);
                if (newMode) {
                  setTransitDisruption(85);
                  setTempOffset(8);
                  setGreenInitiative(10);
                  logMessage("⚠️ [ALARM] CRISIS CONTROL PROTOCOL ACTIVATED: Spiking municipal telemetry constraints.");
                  if ('speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
                    const utterance = new SpeechSynthesisUtterance("System high alert. Commencing emergency dispatch protocols for District 7 anomaly.");
                    utterance.rate = 1.0;
                    utterance.pitch = 0.9;
                    window.speechSynthesis.speak(utterance);
                  }
                  fetchData(true, latitude, longitude, 8, 85, 10);
                } else {
                  setTransitDisruption(24);
                  setTempOffset(2);
                  setGreenInitiative(45);
                  logMessage("🛡️ [RESOLVED] Crisis resolved. Normalizing system parameters to baseline vectors.");
                  if ('speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
                    const utterance = new SpeechSynthesisUtterance("Crisis resolved. Resetting system parameters to standard operating vectors.");
                    utterance.rate = 1.05;
                    window.speechSynthesis.speak(utterance);
                  }
                  fetchData(true, latitude, longitude, 2, 24, 45);
                }
              }}
              className={`p-1.5 rounded-lg border font-mono font-bold text-xs transition-all flex items-center gap-1 px-2.5 uppercase ${
                isCrisisMode 
                  ? "bg-rose-950 border-rose-600 text-rose-400 animate-pulse shadow-lg shadow-rose-600/30" 
                  : "bg-slate-800 border-slate-700 text-slate-400 hover:border-rose-800 hover:text-rose-400"
              }`}
              title="Trigger Mock Crisis Protocol"
            >
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <span>{isCrisisMode ? "CRISIS ACTIVE" : "CRISIS OFF"}</span>
            </button>

            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:border-cyan-600 text-slate-300 hover:text-cyan-400 transition-colors disabled:opacity-50"
              title="Recalculate Matrices"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-cyan-400" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Core View Area */}
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        
        {/* Upper Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Dashboard Left Side: Metrics Grid & Analytics (Two-thirds Column) */}
          <div className="lg:col-span-2 space-y-6">
            <DashboardGrid 
              metrics={metrics} 
              activeDomainId={activeDomainId} 
              domains={domains}
              onSelectDomain={setActiveDomainId}
              selectedZoneId={selectedZoneId}
              onSelectZoneId={setSelectedZoneId}
              projectionData={projectionData}
              projecting={projecting}
              projectionError={projectionError}
              runProjectionForecast={runProjectionForecast}
              latitude={latitude}
              longitude={longitude}
              transitDisruption={transitDisruption}
              greenInitiative={greenInitiative}
              tempOffset={tempOffset}
            />

            {/* Live Predictions Alerts */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4 border-b border-slate-800/60 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                  <h3 className="font-sans font-semibold text-sm text-slate-100 tracking-wider uppercase">
                    Active Predictive Alerts Log
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-slate-500">Auto-Refreshes Live</span>
              </div>

              <div className="space-y-3 max-h-[290px] overflow-y-auto pr-1">
                {predictions.map((p, index) => {
                  const isDeployed = deployedAlerts[index];
                  const isDeploying = deployingId === index;
                  return (
                    <div
                      key={index}
                      className={`p-3.5 rounded-xl border transition-all duration-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
                        p.type === "crit"
                          ? "bg-rose-950/20 border-rose-900/50 hover:bg-rose-950/30"
                          : p.type === "warn"
                          ? "bg-amber-950/15 border-amber-900/40 hover:bg-amber-950/25"
                          : "bg-emerald-950/10 border-emerald-900/30 hover:bg-emerald-950/20"
                      }`}
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[9px] uppercase font-mono px-2 py-0.5 rounded font-bold ${
                              p.type === "crit"
                                ? "bg-rose-500/10 text-rose-400 border border-rose-800"
                                : p.type === "warn"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-800"
                                : "bg-emerald-500/10 text-emerald-400 border border-emerald-800"
                            }`}
                          >
                            {p.type === "crit" ? "Critical Anomaly" : p.type === "warn" ? "Resource Constraint" : "Normal Vector"}
                          </span>
                          <span className="text-xs font-semibold text-slate-200">
                            {p.domain} Section
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-sans leading-normal">
                          {p.text}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-0 border-slate-800/40 pt-2 md:pt-0">
                        <div className="font-mono text-right">
                          <div className="text-[9px] text-slate-500 uppercase">Confidence</div>
                          <div className="text-xs font-bold text-slate-300">{p.confidence}%</div>
                        </div>

                        <button
                          onClick={() => handleDeployAction(index)}
                          disabled={isDeployed || isDeploying}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all duration-200 border ${
                            isDeployed
                              ? "bg-emerald-950/30 border-emerald-800 text-emerald-400"
                              : isDeploying
                              ? "bg-slate-950 border-cyan-800 text-cyan-400 cursor-wait"
                              : "bg-slate-900 border-slate-700 hover:border-cyan-600 text-slate-300 hover:text-cyan-400"
                          }`}
                        >
                          {isDeployed ? (
                            <>
                              <CheckCircle className="w-3.5 h-3.5" />
                              Deployed
                            </>
                          ) : isDeploying ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              Routing...
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5" />
                              Apply Policy
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Dashboard Right Side: AI Assistant & Sector Metrics Selector (One-third Column) */}
          <div className="space-y-6">
            {/* AI Assistant Chat Panel */}
            <CivicMindChat 
              latitude={latitude} 
              longitude={longitude} 
              requestLocation={requestLocation} 
            />

            {/* Dynamic Scenario Simulator Panel */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800/60 pb-3 justify-between">
                <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-cyan-400 animate-pulse" /> Scenario Simulation Controls
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-400">ACTIVE</span>
              </div>
              
              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                Adjust the sliders below to simulate macro-level municipal stressors and initiatives. Telemetry charts will update instantly.
              </p>

              {/* Macro Presets */}
              <div className="space-y-1.5 pb-2 border-b border-slate-800/60">
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">Macro Presets</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => applyMacroPreset("Heatwave Peak", 10, 15, 0)}
                    className="px-2 py-1.5 bg-slate-950 hover:bg-amber-955/20 border border-slate-800 hover:border-amber-800/80 rounded text-[10px] text-left transition-all font-mono text-slate-300"
                  >
                    ⚡ Heatwave Peak
                  </button>
                  <button
                    onClick={() => applyMacroPreset("Monsoon/Strike", -4, 75, 20)}
                    className="px-2 py-1.5 bg-slate-950 hover:bg-cyan-955/20 border border-slate-800 hover:border-cyan-800/80 rounded text-[10px] text-left transition-all font-mono text-slate-300"
                  >
                    🌀 Monsoon/Strike
                  </button>
                  <button
                    onClick={() => applyMacroPreset("Eco-Recovery", -2, 0, 90)}
                    className="px-2 py-1.5 bg-slate-950 hover:bg-emerald-955/20 border border-slate-800 hover:border-emerald-800/80 rounded text-[10px] text-left transition-all font-mono text-slate-300"
                  >
                    🌳 Eco-Recovery
                  </button>
                  <button
                    onClick={() => applyMacroPreset("Grid Crisis", 12, 40, 0)}
                    className="px-2 py-1.5 bg-slate-950 hover:bg-rose-955/20 border border-slate-800 hover:border-rose-800/80 rounded text-[10px] text-left transition-all font-mono text-slate-300"
                  >
                    ⚠️ Grid Crisis
                  </button>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                {/* Temperature Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Thermal Offset:</span>
                    <span className={`font-bold ${tempOffset > 0 ? "text-amber-400" : tempOffset < 0 ? "text-cyan-400" : "text-slate-300"}`}>
                      {tempOffset > 0 ? `+${tempOffset}` : tempOffset}°C
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-15"
                    max="15"
                    value={tempOffset}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setTempOffset(val);
                      fetchData(true, latitude, longitude, val, transitDisruption, greenInitiative);
                    }}
                    className="w-full h-1 bg-slate-850 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                  <span className="text-[9px] text-slate-500 block leading-none font-mono">Simulates Heatwaves/Coldfronts (Grid Load Impact)</span>
                </div>

                {/* Disruption Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Transit Disruption:</span>
                    <span className={`font-bold ${transitDisruption > 0 ? "text-rose-400" : "text-slate-300"}`}>
                      {transitDisruption}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={transitDisruption}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setTransitDisruption(val);
                      fetchData(true, latitude, longitude, tempOffset, val, greenInitiative);
                    }}
                    className="w-full h-1 bg-slate-855 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                  <span className="text-[9px] text-slate-500 block leading-none font-mono">Simulates strikes/closures (Congestion & ETA Impact)</span>
                </div>

                {/* Green Initiative Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Urban Canopy Cover:</span>
                    <span className={`font-bold ${greenInitiative > 0 ? "text-emerald-400" : "text-slate-300"}`}>
                      +{greenInitiative}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={greenInitiative}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setGreenInitiative(val);
                      fetchData(true, latitude, longitude, tempOffset, transitDisruption, val);
                    }}
                    className="w-full h-1 bg-slate-860 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                  <span className="text-[9px] text-slate-500 block leading-none font-mono">Simulates tree planting (AQI & Health Improvement)</span>
                </div>
              </div>
            </div>

            {/* Interactive Domain Sector list */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
              <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 flex items-center gap-1.5 mb-2">
                <Layers className="w-4 h-4" /> System Sectors Matrix
              </span>
              <p className="text-xs text-slate-400 mb-4 font-sans leading-relaxed">
                Click any sector domain to isolate its analytical dashboard telemetry and view system gauges.
              </p>

              <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-1">
                <button
                  onClick={() => setActiveDomainId("all")}
                  className={`p-3 rounded-lg border text-left transition-all duration-200 flex items-center justify-between ${
                    activeDomainId === "all"
                      ? "bg-slate-950 border-cyan-800/80 shadow-md"
                      : "bg-slate-900/60 border-slate-800/60 hover:bg-slate-850 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm">🌐</span>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-200">Unified Municipal Master</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Overview of all active sensors</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold">ALL</span>
                </button>

                {domains.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setActiveDomainId(d.id)}
                    className={`p-3 rounded-lg border text-left transition-all duration-200 flex items-center justify-between ${
                      activeDomainId === d.id
                        ? "bg-slate-950 border-cyan-800/80 shadow-md"
                        : "bg-slate-900/60 border-slate-800/60 hover:bg-slate-850 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm">{d.icon}</span>
                      <div className="truncate pr-2">
                        <h4 className="text-xs font-semibold text-slate-200 truncate">{d.name}</h4>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{d.desc}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0">
                      <span className="text-[10px] font-mono text-slate-300 font-bold">{d.stat.split(" ")[0]}</span>
                      <div className="w-12 bg-slate-800 h-1 rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full bg-cyan-500 rounded-full"
                          style={{ width: `${d.pct}%` }}
                        />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Simulation Plans (Full Width Bottom Shelf) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-800/60 pb-3 justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
              <Info className="w-4 h-4" /> Recommended Policy Simulation Models
            </span>
            <span className="text-[10px] font-mono text-slate-500">Simulate Action Outcomes</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {insights.map((insight, index) => {
              const isSimulating = runningSimulationIndex === index;
              return (
                <div
                  key={index}
                  className="bg-slate-950/50 p-4 border border-slate-800 rounded-xl flex flex-col justify-between hover:border-cyan-800/60 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase text-cyan-400 flex items-center gap-1">
                        <span>{insight.icon}</span>
                        {insight.category}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                        {insight.impact}
                      </span>
                    </div>

                    <h4 className="text-xs font-semibold text-slate-200 leading-snug">
                      {insight.title}
                    </h4>

                    <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                      {insight.body}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-900 flex items-center justify-between">
                    <div className="w-3/5 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-500 rounded-full"
                        style={{ width: `${insight.pct}%` }}
                      />
                    </div>
                    
                    <button
                      onClick={() => runSimulation(index)}
                      disabled={isSimulating}
                      className="px-2.5 py-1 text-[10px] font-mono tracking-wider text-cyan-400 border border-cyan-800/60 rounded-md bg-cyan-950/20 hover:bg-cyan-950/40 hover:border-cyan-600 transition-colors flex items-center gap-1 disabled:opacity-40"
                    >
                      {isSimulating ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          Running...
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3" />
                          Simulate
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Municipal Dispatch Log Console */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400 animate-pulse" />
              <h3 className="font-sans font-semibold text-xs text-slate-100 tracking-wider uppercase">
                Municipal Dispatch Log Console
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest">CONSOLE ONLINE</span>
            </div>
          </div>

          <div 
            className="bg-slate-950 p-4 rounded-lg border border-slate-850 h-[150px] overflow-y-auto font-mono text-[10px] text-cyan-500/90 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800"
            ref={(el) => {
              if (el) el.scrollTop = el.scrollHeight;
            }}
          >
            {consoleLogs.map((log, i) => {
              let color = "text-cyan-500/90";
              if (log.includes("DISPATCH SUCCESS") || log.includes("SIMULATION SUCCESS")) {
                color = "text-emerald-400 font-semibold";
              } else if (log.includes("STARTED") || log.includes("Triggered")) {
                color = "text-amber-400";
              } else if (log.includes("SYSTEM")) {
                color = "text-slate-500";
              }
              return (
                <div key={i} className={`${color} leading-relaxed`}>
                  {log}
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between text-[9px] font-mono text-slate-500">
            <span>Buffer: Active (keeping last 100 entries)</span>
            <button 
              onClick={() => {
                setConsoleLogs([`[${new Date().toLocaleTimeString([], { hour12: false })}] SYSTEM: Console logs cleared by operator.`]);
              }}
              className="text-slate-500 hover:text-cyan-400 transition-colors uppercase tracking-wider text-[8px] bg-slate-950 px-2 py-1 rounded border border-slate-850"
            >
              Clear Console
            </button>
          </div>
        </div>
      </main>

      {/* Control Console Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-2">
          <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
            © CivicMind Decision Intelligence Control Network
          </p>
          <p className="text-[10px] text-slate-600 font-sans">
            Powered by Node.js, Express, React, Tailwind CSS v4, Recharts, and Google Gemini AI. Fully client-safe server proxy.
          </p>
        </div>
      </footer>
    </div>
  );
}
