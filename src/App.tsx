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
  Database
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
  
  // Simulation states
  const [deployingId, setDeployingId] = useState<number | null>(null);
  const [deployedAlerts, setDeployedAlerts] = useState<Record<number, boolean>>({});
  const [runningSimulationIndex, setRunningSimulationIndex] = useState<number | null>(null);

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
  const fetchData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [domainsRes, predictionsRes, insightsRes, metricsRes] = await Promise.all([
        fetch("/api/domains"),
        fetch("/api/predictions"),
        fetch("/api/insights"),
        fetch("/api/metrics")
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

    return () => {
      clearInterval(clockInterval);
      clearInterval(metricsInterval);
    };
  }, []);

  const handleDeployAction = (index: number) => {
    if (deployingId !== null) return;
    setDeployingId(index);
    setTimeout(() => {
      setDeployingId(null);
      setDeployedAlerts(prev => ({ ...prev, [index]: true }));
    }, 1200);
  };

  const runSimulation = (index: number) => {
    setRunningSimulationIndex(index);
    setTimeout(() => {
      setRunningSimulationIndex(null);
      fetchData(); // pull fresh fluctuating parameters
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

            <div className="flex items-center gap-1.5 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              <span>
                GPS:{" "}
                <strong className="text-slate-200">
                  {latitude ? `${latitude.toFixed(4)}, ${longitude?.toFixed(4)}` : "DEFAULT CENTRAL"}
                </strong>
              </span>
            </div>

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
