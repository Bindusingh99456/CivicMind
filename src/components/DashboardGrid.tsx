import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ComposedChart
} from "recharts";
import { 
  Activity, 
  Wind, 
  TrendingUp, 
  Clock, 
  Zap, 
  Map, 
  ShieldAlert, 
  HeartHandshake, 
  Trash2,
  Users,
  RefreshCw,
  Loader2
} from "lucide-react";
import { Metrics, Domain } from "../types";

interface DashboardGridProps {
  metrics: Metrics | null;
  activeDomainId: string;
  domains: Domain[];
  onSelectDomain: (id: string) => void;
  selectedZoneId: number | null;
  onSelectZoneId: (id: number | null) => void;
  projectionData: any[] | null;
  projecting: boolean;
  projectionError: string | null;
  runProjectionForecast: (policy: string, sector: string, funding: number) => Promise<void>;
  latitude: number | null;
  longitude: number | null;
  transitDisruption: number;
  greenInitiative: number;
  tempOffset: number;
}

export default function DashboardGrid({
  metrics,
  activeDomainId,
  domains,
  onSelectDomain,
  selectedZoneId,
  onSelectZoneId,
  projectionData,
  projecting,
  projectionError,
  runProjectionForecast,
  latitude,
  longitude,
  transitDisruption,
  greenInitiative,
  tempOffset
}: DashboardGridProps) {
  const [viewMode, setViewMode] = React.useState<"heatmap" | "blueprint">("heatmap");
  if (!metrics) {
    return (
      <div className="flex flex-col items-center justify-center h-[580px] bg-slate-900/60 border border-slate-800 rounded-xl">
        <div className="relative flex h-8 w-8 animate-spin">
          <div className="absolute h-full w-full rounded-full border-4 border-slate-800"></div>
          <div className="absolute h-full w-full rounded-full border-4 border-t-cyan-500"></div>
        </div>
        <p className="mt-4 text-xs font-mono text-slate-400">PULLING LIVE SENSOR STREAM...</p>
      </div>
    );
  }

  // Formatting mobility profiles
  const mobilityData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i.toString().padStart(2, "0")}:00`,
    Traffic: metrics.mobility.traffic[i] || 50,
    Bus: metrics.mobility.bus[i] || 40,
    Metro: metrics.mobility.metro[i] || 60,
  }));

  // Formatting grid energy profile (Last 12 hours)
  const energyData = Array.from({ length: 12 }, (_, i) => {
    const demand = metrics.energy[i] || 70;
    const solarGen = Math.floor(demand * (i > 3 && i < 9 ? 0.65 : 0.15));
    return {
      time: `${i + 8} AM`,
      "Grid Demand (MW)": demand * 20 + 1000,
      "Solar Generation (MW)": solarGen * 20,
    };
  });

  // Formatting waste profile (7 sectors)
  const wasteData = [
    { sector: "North", "Recycled %": metrics.waste[0] || 62, "Landfill %": 100 - (metrics.waste[0] || 62) },
    { sector: "South", "Recycled %": metrics.waste[1] || 74, "Landfill %": 100 - (metrics.waste[1] || 74) },
    { sector: "East", "Recycled %": metrics.waste[2] || 58, "Landfill %": 100 - (metrics.waste[2] || 58) },
    { sector: "West", "Recycled %": metrics.waste[3] || 69, "Landfill %": 100 - (metrics.waste[3] || 69) },
    { sector: "Central", "Recycled %": metrics.waste[4] || 81, "Landfill %": 100 - (metrics.waste[4] || 81) },
    { sector: "Metro", "Recycled %": metrics.waste[5] || 65, "Landfill %": 100 - (metrics.waste[5] || 65) },
    { sector: "Suburbs", "Recycled %": metrics.waste[6] || 55, "Landfill %": 100 - (metrics.waste[6] || 55) },
  ];

  // Formatting environmental data
  const envPieData = [
    { name: "PM2.5", value: metrics.aqi.pm25, color: "#f43f5e" },
    { name: "PM10", value: metrics.aqi.pm10, color: "#f59e0b" },
    { name: "NO2", value: metrics.aqi.no2, color: "#3b82f6" },
    { name: "O3", value: metrics.aqi.o3, color: "#10b981" },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-950/95 border border-slate-800 p-3 rounded-lg shadow-xl font-mono text-xs">
          <p className="text-slate-400 mb-1.5">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="flex justify-between gap-4">
              <span>{entry.name}:</span>
              <span className="font-bold">{entry.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Overview stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-4 flex items-center gap-3.5 shadow-md">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Wind className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-500">Air Quality Index</div>
            <div className="text-2xl font-sans font-semibold text-slate-100 mt-0.5">{metrics.aqi.score}</div>
            <div className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 mt-0.5">
              <span>● Good to Moderate</span>
            </div>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-4 flex items-center gap-3.5 shadow-md">
          <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-500">Avg Traffic Flow</div>
            <div className="text-2xl font-sans font-semibold text-slate-100 mt-0.5">
              {Math.round(mobilityData.reduce((acc, curr) => acc + curr.Traffic, 0) / 24)}%
            </div>
            <div className="text-[10px] font-mono text-cyan-400 flex items-center gap-1 mt-0.5">
              <span>Stable Velocity Matrix</span>
            </div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-4 flex items-center gap-3.5 shadow-md">
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-500">Grid Peak Demand</div>
            <div className="text-2xl font-sans font-semibold text-slate-100 mt-0.5">
              {Math.max(...energyData.map(e => e["Grid Demand (MW)"]))} MW
            </div>
            <div className="text-[10px] font-mono text-amber-400 flex items-center gap-1 mt-0.5">
              <span>78% capacity state</span>
            </div>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-4 flex items-center gap-3.5 shadow-md">
          <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-500">Ambulance ETA</div>
            <div className="text-2xl font-sans font-semibold text-slate-100 mt-0.5">{metrics.health.ambulance_eta}m</div>
            <div className="text-[10px] font-mono text-purple-400 flex items-center gap-1 mt-0.5">
              <span>Wait-time: {metrics.health.wait_time}m</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Main Chart Container based on active Domain */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-4 border-b border-slate-800/60 pb-3">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5" />
              Dynamic Simulation Screen
            </span>
            <h3 className="font-sans font-semibold text-base text-slate-100 mt-0.5">
              {activeDomainId === "all" ? "Smart City Systems Core Insights" : activeDomainId === "projection" ? "🔮 What-If Policy Simulation Sandbox" : `${domains.find(d => d.id === activeDomainId)?.name || "Analytical Matrix"}`}
            </h3>
          </div>
          <div className="flex flex-wrap gap-1.5 justify-end max-w-full">
            <button
              onClick={() => onSelectDomain("all")}
              className={`px-2.5 py-1 rounded-md text-[10px] font-mono uppercase transition-colors duration-200 border ${
                activeDomainId === "all"
                  ? "bg-slate-950 border-cyan-800 text-cyan-400"
                  : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              Master System
            </button>
            <button
              onClick={() => onSelectDomain("projection")}
              className={`px-2.5 py-1 rounded-md text-[10px] font-mono uppercase transition-colors duration-200 border ${
                activeDomainId === "projection"
                  ? "bg-gradient-to-r from-cyan-950 to-indigo-950 border-indigo-500 text-cyan-300 font-bold shadow-md shadow-indigo-500/10"
                  : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              🔮 AI Sandbox
            </button>
            {domains.map((d) => {
              const getShortName = (name: string) => {
                if (name.includes("Healthcare")) return "Health";
                if (name.includes("Environmental")) return "Environment";
                if (name.includes("Education")) return "Education";
                if (name.includes("Citizen")) return "Citizen";
                return name.split(" ")[0];
              };
              return (
                <button
                  key={d.id}
                  onClick={() => onSelectDomain(d.id)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-mono uppercase transition-colors duration-200 border ${
                    activeDomainId === d.id
                      ? "bg-slate-950 border-cyan-800 text-cyan-400"
                      : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {getShortName(d.name)}
                </button>
              );
            })}
          </div>
        </div>

        {/* DOMAIN RENDERING */}
        {activeDomainId === "all" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[400px] overflow-y-auto pr-1">
            {/* Chart 1: Mobility */}
            <div className="bg-slate-950/30 border border-slate-800/60 rounded-xl p-4 flex flex-col justify-between">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-mono font-medium text-slate-300 flex items-center gap-1.5">
                  <span className="p-1 rounded bg-cyan-500/10 text-cyan-400">🚌</span>
                  Mobility Congestion Profiles (24h)
                </span>
                <span className="text-[10px] font-mono text-slate-500">Live Telemetry</span>
              </div>
              <div className="h-[140px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mobilityData.slice(6, 22)}>
                    <defs>
                      <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="hour" stroke="#475569" fontSize={9} tickLine={false} />
                    <YAxis stroke="#475569" fontSize={9} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="Traffic" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorTraffic)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Energy */}
            <div className="bg-slate-950/30 border border-slate-800/60 rounded-xl p-4 flex flex-col justify-between">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-mono font-medium text-slate-300 flex items-center gap-1.5">
                  <span className="p-1 rounded bg-amber-500/10 text-amber-400">⚡</span>
                  Smart Grid Supply-Demand Wave
                </span>
                <span className="text-[10px] font-mono text-slate-500">12h Forecast</span>
              </div>
              <div className="h-[140px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={energyData}>
                    <XAxis dataKey="time" stroke="#475569" fontSize={9} tickLine={false} />
                    <YAxis stroke="#475569" fontSize={9} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="Grid Demand (MW)" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Solar Generation (MW)" fill="#10b981" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Air Quality Breakdown */}
            <div className="bg-slate-950/30 border border-slate-800/60 rounded-xl p-4 flex flex-col justify-between">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-mono font-medium text-slate-300 flex items-center gap-1.5">
                  <span className="p-1 rounded bg-emerald-500/10 text-emerald-400">🌿</span>
                  Environment: Particulate Breakdown
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">AQI: {metrics.aqi.score}</span>
              </div>
              <div className="flex items-center gap-2 h-[140px] w-full">
                <div className="w-[45%] h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={envPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={25}
                        outerRadius={45}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {envPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-[55%] space-y-1.5 font-mono text-[10px] text-slate-400">
                  <div className="flex justify-between border-b border-slate-800/40 pb-1">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500"></span>PM 2.5</span>
                    <span className="font-semibold text-slate-200">{metrics.aqi.pm25} µg/m³</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/40 pb-1">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span>PM 10</span>
                    <span className="font-semibold text-slate-200">{metrics.aqi.pm10} µg/m³</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/40 pb-1">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span>NO₂</span>
                    <span className="font-semibold text-slate-200">{metrics.aqi.no2} ppb</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>O₃</span>
                    <span className="font-semibold text-slate-200">{metrics.aqi.o3} ppb</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Chart 4: Heatmap Simulation & Inspector */}
            <div className="bg-slate-950/30 border border-slate-800/60 rounded-xl p-4 flex flex-col justify-between lg:col-span-2">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-mono font-medium text-slate-300 flex items-center gap-1.5">
                  <span className="p-1 rounded bg-purple-500/10 text-purple-400">🗺️</span>
                  Geospatial Grid Sector Map & Diagnostics
                </span>
                <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setViewMode("heatmap")}
                    className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase transition-all ${
                      viewMode === "heatmap" ? "bg-slate-800 text-cyan-400 font-bold" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Heatmap
                  </button>
                  <button
                    onClick={() => setViewMode("blueprint")}
                    className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase transition-all ${
                      viewMode === "blueprint" ? "bg-slate-800 text-cyan-400 font-bold" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Blueprint
                  </button>
                </div>
              </div>

              {viewMode === "blueprint" ? (() => {
                  const animSpeed = Math.max(1, 10 - Math.round(transitDisruption / 10));
                  const strokeColor = transitDisruption > 50 ? "#f43f5e" : "#06b6d4";
                  return (
                    <div className="relative w-full h-[300px] bg-slate-950 border border-slate-850 rounded-lg overflow-hidden shadow-inner flex items-center justify-center mt-2">
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:24px_24px] opacity-40"></div>
                      <svg viewBox="0 0 800 400" className="w-full h-full text-slate-500 font-mono select-none relative z-10">
                        <g transform="translate(60, 60)" opacity="0.3" className="stroke-cyan-500">
                          <circle cx="0" cy="0" r="25" fill="none" strokeWidth="1" />
                          <line x1="0" y1="-30" x2="0" y2="30" strokeWidth="1.5" />
                          <line x1="-30" y1="0" x2="30" y2="0" strokeWidth="1.5" />
                          <text x="-4" y="-34" fontSize="8" fill="#00d4ff" stroke="none">N</text>
                        </g>

                        <rect x="500" y="80" width="180" height="120" rx="10" fill="#022c22" fillOpacity="0.3" stroke="#10b981" strokeWidth="1" strokeDasharray="3 3" />
                        <text x="590" y="140" fill="#10b981" fontSize="10" textAnchor="middle" opacity="0.7">🌳 GREEN CANOPY (+{greenInitiative}%)</text>

                        <rect x="80" y="240" width="220" height="110" rx="8" fill="#1e1b4b" fillOpacity="0.25" stroke="#6366f1" strokeWidth="1" strokeDasharray="3 3" />
                        <text x="190" y="300" fill="#6366f1" fontSize="10" textAnchor="middle" opacity="0.6">🏭 INDUSTRIAL DISTRICT</text>

                        <path d="M 0 100 Q 200 130 400 200 T 800 220" fill="none" stroke="#1d4ed8" strokeWidth="18" opacity="0.3" />
                        <path d="M 0 100 Q 200 130 400 200 T 800 220" fill="none" stroke="#1e40af" strokeWidth="2" opacity="0.5" strokeDasharray="5 5" />
                        <text x="350" y="150" fill="#3b82f6" fontSize="9" opacity="0.6" transform="rotate(12 350 150)">MUNICIPAL CANAL</text>

                        <path d="M 100 0 L 100 400" fill="none" stroke="#334155" strokeWidth="4" />
                        <path d="M 100 0 L 100 400" fill="none" stroke={strokeColor} strokeWidth="1.5" strokeDasharray="8 12">
                          <animate attributeName="stroke-dashoffset" values="100;0" dur={`${animSpeed}s`} repeatCount="indefinite" />
                        </path>
                        
                        <path d="M 100 200 C 300 80, 500 80, 700 200 C 500 320, 300 320, 100 200" fill="none" stroke="#334155" strokeWidth="6" />
                        <path d="M 100 200 C 300 80, 500 80, 700 200 C 500 320, 300 320, 100 200" fill="none" stroke="#00d4ff" strokeWidth="2" strokeDasharray="12 18">
                          <animate attributeName="stroke-dashoffset" values="200;0" dur={`${animSpeed * 1.5}s`} repeatCount="indefinite" />
                        </path>

                        <path d="M 0 200 L 800 200" fill="none" stroke="#334155" strokeWidth="4" />
                        <path d="M 0 200 L 800 200" fill="none" stroke={strokeColor} strokeWidth="1.5" strokeDasharray="10 15">
                          <animate attributeName="stroke-dashoffset" values="0;150" dur={`${animSpeed * 0.8}s`} repeatCount="indefinite" />
                        </path>

                        {/* Interactive Sector Pins */}
                        <g className="cursor-pointer" onClick={() => onSelectDomain("mobility")}>
                          <circle cx="280" cy="140" r="14" fill="#0f172a" stroke="#00d4ff" strokeWidth="2" />
                          <text x="280" y="143" fontSize="10" textAnchor="middle">🚌</text>
                          <rect x="250" y="105" width="60" height="15" rx="3" fill="#020617" stroke="#1e293b" strokeWidth="1" />
                          <text x="280" y="115" fontSize="7" fill="#00d4ff" textAnchor="middle" fontWeight="bold">MOBILITY</text>
                        </g>

                        <g className="cursor-pointer" onClick={() => onSelectDomain("energy")}>
                          <circle cx="450" cy="270" r="14" fill="#0f172a" stroke="#eab308" strokeWidth="2" />
                          <text x="450" y="273" fontSize="10" textAnchor="middle">⚡</text>
                          <rect x="420" y="235" width="60" height="15" rx="3" fill="#020617" stroke="#1e293b" strokeWidth="1" />
                          <text x="450" y="245" fontSize="7" fill="#eab308" textAnchor="middle" fontWeight="bold">POWER GRID</text>
                        </g>

                        <g className="cursor-pointer" onClick={() => onSelectDomain("safety")}>
                          <circle cx="200" cy="240" r="14" fill="#0f172a" stroke="#a855f7" strokeWidth="2" />
                          <text x="200" y="243" fontSize="10" textAnchor="middle">🛡️</text>
                          <rect x="170" y="205" width="60" height="15" rx="3" fill="#020617" stroke="#1e293b" strokeWidth="1" />
                          <text x="200" y="215" fontSize="7" fill="#a855f7" textAnchor="middle" fontWeight="bold">SAFETY</text>
                        </g>

                        <g className="cursor-pointer" onClick={() => onSelectDomain("environment")}>
                          <circle cx="560" cy="160" r="14" fill="#0f172a" stroke="#10b981" strokeWidth="2" />
                          <text x="560" y="163" fontSize="10" textAnchor="middle">🌿</text>
                          <rect x="530" y="125" width="60" height="15" rx="3" fill="#020617" stroke="#1e293b" strokeWidth="1" />
                          <text x="560" y="135" fontSize="7" fill="#10b981" textAnchor="middle" fontWeight="bold">ENV HEALTH</text>
                        </g>

                        <g className="cursor-pointer" onClick={() => onSelectDomain("health")}>
                          <circle cx="680" cy="220" r="14" fill="#0f172a" stroke="#22c55e" strokeWidth="2" />
                          <text x="680" y="223" fontSize="10" textAnchor="middle">🏥</text>
                          <rect x="650" y="185" width="60" height="15" rx="3" fill="#020617" stroke="#1e293b" strokeWidth="1" />
                          <text x="680" y="195" fontSize="7" fill="#22c55e" textAnchor="middle" fontWeight="bold">HEALTH</text>
                        </g>

                        <g transform="translate(200, 240)">
                          <circle cx="0" cy="0" r="28" fill="none" stroke="#f43f5e" strokeWidth="1.5" opacity="0.8">
                            <animate attributeName="r" values="14;35" dur="1.8s" repeatCount="indefinite" />
                            <animate attributeName="opacity" values="0.8;0" dur="1.8s" repeatCount="indefinite" />
                          </circle>
                        </g>
                        <path d="M 200 240 L 230 290 L 320 290" fill="none" stroke="#f43f5e" strokeWidth="1" opacity="0.6" strokeDasharray="3 3" />
                        <g transform="translate(325, 280)">
                          <rect width="90" height="20" rx="3" fill="#991b1b" fillOpacity="0.8" stroke="#ef4444" strokeWidth="1" />
                          <text x="45" y="12" fill="#fecdd3" fontSize="6.5" textAnchor="middle" fontWeight="bold">D7 CROWD HAZARD</text>
                        </g>

                        <text x="400" y="30" fill="#00d4ff" fontSize="11" textAnchor="middle" fontWeight="bold" letterSpacing="2">CIVICMIND DIGITAL TWIN MAP</text>
                        <text x="400" y="42" fill="#475569" fontSize="7" textAnchor="middle">COORDINATES: {latitude ? latitude.toFixed(4) : "12.9716"}°N, {longitude ? longitude.toFixed(4) : "77.5946"}°E</text>
                      </svg>
                      
                      <div className="absolute bottom-2 right-2 bg-slate-950/90 border border-slate-800 p-2 rounded text-[8px] font-mono text-slate-400 space-y-0.5 backdrop-blur-sm z-20 select-text">
                        <div className="text-cyan-400 font-bold uppercase mb-0.5">Telemetry Feed</div>
                        <div>• Active Nodes: <strong className="text-slate-200">5 Pins</strong></div>
                        <div>• Grid status: <strong className="text-emerald-400">Normal</strong></div>
                        <div>• Traffic index: <strong className="text-rose-400">{transitDisruption}% delay</strong></div>
                      </div>
                    </div>
                  );
              })() : (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-2">
                  {/* Heatmap Grid (3 columns) */}
                  <div className="md:col-span-3 bg-slate-950/40 p-3 rounded-lg border border-slate-850">
                    <div className="grid gap-1 p-1" style={{ gridTemplateColumns: "repeat(14, minmax(0, 1fr))" }}>
                      {metrics.heatmap.map((cell: any, i) => (
                        <button
                          key={i}
                          onClick={() => onSelectZoneId(cell.zone)}
                          title={`Zone ${cell.zone} - Status: ${cell.status}`}
                          className={`aspect-square rounded-[2px] cursor-pointer transition-all duration-300 hover:scale-125 hover:z-10 focus:outline-none ${
                            selectedZoneId === cell.zone ? "ring-2 ring-cyan-400 scale-110 z-10" : ""
                          } ${
                            cell.status === "crit" ? "bg-rose-600 shadow-[0_0_4px_rgba(239,68,68,0.4)]" :
                            cell.status === "high" ? "bg-amber-500" :
                            cell.status === "med" ? "bg-cyan-500/85" : "bg-emerald-600/40"
                          }`}
                        />
                      ))}
                    </div>
                  <div className="flex justify-between mt-3 text-[9px] font-mono text-slate-500">
                    <span>Low Risk</span>
                    <div className="flex gap-2">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-600/40"></span>Low</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-cyan-500/85"></span>Med</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-500"></span>High</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-rose-600"></span>Crit</span>
                    </div>
                  </div>
                </div>
                {/* Inspector (2 columns) */}
                <div className="md:col-span-2 flex flex-col justify-center">
                  {selectedZoneId && metrics.heatmap.find((h: any) => h.zone === selectedZoneId) ? (() => {
                    const zone = metrics.heatmap.find((h: any) => h.zone === selectedZoneId)! as any;
                    return (
                      <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg space-y-2 font-mono text-[11px] text-slate-300">
                        <div className="flex justify-between border-b border-slate-850 pb-1.5 items-center">
                          <span className="font-bold text-cyan-400">📡 SECTOR NODE-{zone.zone.toString().padStart(2, "0")}</span>
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                            zone.status === "crit" ? "bg-rose-950/80 text-rose-400 border border-rose-800" :
                            zone.status === "high" ? "bg-amber-950/80 text-amber-400 border border-amber-800" :
                            zone.status === "med" ? "bg-cyan-950/80 text-cyan-400 border border-cyan-800" :
                            "bg-emerald-950/80 text-emerald-400 border border-emerald-800"
                          }`}>
                            {zone.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-slate-400">
                          <div>
                            <span>Population:</span>
                            <p className="font-semibold text-slate-200">{zone.population ? zone.population.toLocaleString() : "5,420"} /km²</p>
                          </div>
                          <div>
                            <span>Local AQI:</span>
                            <p className="font-semibold text-slate-200">{zone.localAqi || "48"}</p>
                          </div>
                        </div>
                        <div className="bg-slate-950/60 p-2 rounded border border-slate-850">
                          <span className="text-slate-500 block uppercase font-mono text-[8px] tracking-wider">Active Anomaly Status</span>
                          <p className={`font-semibold mt-0.5 ${zone.status === "crit" ? "text-rose-400" : "text-slate-300"}`}>
                            {zone.anomaly || "Normal Operations"}
                          </p>
                        </div>
                        <div className="text-slate-400">
                          <span className="text-slate-500 block uppercase font-mono text-[8px]">Emergency Directive</span>
                          <p className="mt-0.5 leading-normal text-[10px]">
                            {zone.status === "crit" 
                              ? "Deploying localized priority mitigation. Rerouting traffic nodes and power distribution channels immediately."
                              : zone.status === "high"
                              ? "Flagged for monitoring. Smart signaling priority recommended during peak hours."
                              : "No intervention needed. Keep monitoring telemetry feed."
                            }
                          </p>
                        </div>
                      </div>
                    );
                  })() : (
                    <div className="h-full border border-dashed border-slate-800 rounded-lg flex flex-col items-center justify-center p-4 text-center text-slate-500 text-[10px] font-sans">
                      <span>Click any sector grid cell in the heatmap matrix to inspect localized analytics & emergency dispatch directives.</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

        {/* Mobility Deep-dive */}
        {activeDomainId === "mobility" && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed font-sans max-w-4xl">
              Analyzing real-time sensor loops and smart corridor cameras. Peak traffic is active from 8 AM to 10 AM, and 5 PM to 7 PM. System recommendation is priority queue signals.
            </p>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mobilityData}>
                  <defs>
                    <linearGradient id="colorMobilityTraffic" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorMobilityBus" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="hour" stroke="#475569" fontSize={10} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
                  <Area type="monotone" name="Auto Congestion" dataKey="Traffic" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorMobilityTraffic)" />
                  <Area type="monotone" name="Bus Capacity" dataKey="Bus" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorMobilityBus)" />
                  <Line type="monotone" name="Metro Density" dataKey="Metro" stroke="#10b981" strokeWidth={2.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Safety Deep-dive */}
        {activeDomainId === "safety" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Emergency services optimization loops are running. Incident reporting frequency shows lower congestion rates in the central districts, while district 7 exhibits safety warnings.
              </p>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { district: "D1", incident: 3, response: 6.2 },
                    { district: "D2", incident: 1, response: 5.1 },
                    { district: "D3", incident: 4, response: 8.4 },
                    { district: "D4", incident: 2, response: 4.8 },
                    { district: "D5", incident: 6, response: 11.2 },
                    { district: "D6", incident: 2, response: 5.5 },
                    { district: "D7", incident: 8, response: 12.8 },
                  ]}>
                    <XAxis dataKey="district" stroke="#475569" fontSize={10} tickLine={false} />
                    <YAxis stroke="#475569" fontSize={10} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar name="Active Incidents" dataKey="incident" fill="#a855f7" radius={[2, 2, 0, 0]} />
                    <Bar name="Response ETA (min)" dataKey="response" fill="#f43f5e" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="space-y-3.5 bg-slate-950/40 p-4 border border-slate-800/80 rounded-xl">
              <span className="text-[10px] uppercase font-mono tracking-wider text-rose-400 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" /> Safety Dispatch Queue
              </span>
              <div className="space-y-2.5 font-mono text-[11px]">
                <div className="flex flex-col border-b border-slate-800/50 pb-2">
                  <span className="text-rose-400">● District 7 Alert</span>
                  <span className="text-slate-400 text-[10px] mt-0.5">High probability gathering warning</span>
                  <span className="text-[9px] text-slate-500 mt-1">Disp ETA: 3.5m | Patrol Unit 42B</span>
                </div>
                <div className="flex flex-col border-b border-slate-800/50 pb-2">
                  <span className="text-amber-400">● Zone 3 Traffic Congestion</span>
                  <span className="text-slate-400 text-[10px] mt-0.5">Ring road bottleneck priority signals</span>
                  <span className="text-[9px] text-slate-500 mt-1">Disp ETA: 7.2m | Patrol Unit 12C</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-emerald-400">● Safe Sector D1 - D3</span>
                  <span className="text-slate-400 text-[10px] mt-0.5">Normal continuous sweeps</span>
                  <span className="text-[9px] text-slate-500 mt-1">Regular grid sweeps: active</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Health Deep-dive */}
        {activeDomainId === "health" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Evaluating geospatial healthcare resources. Geographic zones 3-North and East represent high-risk medical deserts (&gt;8km to clinics). Ambulances are pre-positioned to optimize ETA.
              </p>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[
                    { name: "Mon", wait: 24, score: 72 },
                    { name: "Tue", wait: 21, score: 75 },
                    { name: "Wed", wait: 18, score: 76 },
                    { name: "Thu", wait: 15, score: 79 },
                    { name: "Fri", wait: 22, score: 74 },
                    { name: "Sat", wait: 28, score: 70 },
                    { name: "Sun", wait: 20, score: 76 },
                  ]}>
                    <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} />
                    <YAxis stroke="#475569" fontSize={10} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Line name="Avg Wait Time (m)" type="monotone" dataKey="wait" stroke="#a855f7" strokeWidth={2.5} />
                    <Line name="Municipal Access Score" type="monotone" dataKey="score" stroke="#22c55e" strokeWidth={2.5} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="space-y-4 bg-slate-950/40 p-4 border border-slate-800/80 rounded-xl font-mono text-[11px]">
              <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-400 flex items-center gap-1">
                <HeartHandshake className="w-3.5 h-3.5" /> Healthcare Registry
              </span>
              <div className="space-y-2">
                <div className="flex justify-between border-b border-slate-800/40 pb-1.5">
                  <span className="text-slate-400">Total Clinics</span>
                  <span className="text-slate-200 font-semibold">{metrics.health.clinics} active</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/40 pb-1.5">
                  <span className="text-slate-400">Ambulance ETA</span>
                  <span className="text-slate-200 font-semibold">{metrics.health.ambulance_eta} mins</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/40 pb-1.5">
                  <span className="text-slate-400">Clinical Wait Time</span>
                  <span className="text-slate-200 font-semibold">{metrics.health.wait_time} mins</span>
                </div>
                <div className="flex justify-between pb-1.5">
                  <span className="text-slate-400">Available Beds Index</span>
                  <span className="text-slate-200 font-semibold">{metrics.health.beds} score</span>
                </div>
              </div>
              <p className="text-[9px] text-slate-500 leading-normal border-t border-slate-800/50 pt-2">
                *Active Geolocation queries analyze medical facility metrics directly around user GPS targets.*
              </p>
            </div>
          </div>
        )}

        {/* Environmental Deep-dive */}
        {activeDomainId === "environment" && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed font-sans max-w-4xl">
              Monitoring high-frequency particulate count across key industrial ringways. Air Quality Index currently registers at **{metrics.aqi.score}** (Moderate). Proposed green corridors aim to offset emissions by 40% over 3 years.
            </p>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[
                  { day: "Mon", PM25: metrics.aqi.pm25 + 5, PM10: metrics.aqi.pm10 - 2, NO2: metrics.aqi.no2 + 4 },
                  { day: "Tue", PM25: metrics.aqi.pm25, PM10: metrics.aqi.pm10, NO2: metrics.aqi.no2 },
                  { day: "Wed", PM25: metrics.aqi.pm25 - 8, PM10: metrics.aqi.pm10 - 5, NO2: metrics.aqi.no2 - 6 },
                  { day: "Thu", PM25: metrics.aqi.pm25 - 2, PM10: metrics.aqi.pm10 + 2, NO2: metrics.aqi.no2 - 1 },
                  { day: "Fri", PM25: metrics.aqi.pm25 + 12, PM10: metrics.aqi.pm10 + 8, NO2: metrics.aqi.no2 + 10 },
                  { day: "Sat", PM25: metrics.aqi.pm25 + 1, PM10: metrics.aqi.pm10 - 3, NO2: metrics.aqi.no2 },
                  { day: "Sun", PM25: metrics.aqi.pm25 - 4, PM10: metrics.aqi.pm10 - 6, NO2: metrics.aqi.no2 - 3 },
                ]}>
                  <defs>
                    <linearGradient id="colorPM25" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPM10" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" stroke="#475569" fontSize={10} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
                  <Area type="monotone" name="PM2.5 (µg/m³)" dataKey="PM25" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorPM25)" />
                  <Area type="monotone" name="PM10 (µg/m³)" dataKey="PM10" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorPM10)" />
                  <Line type="monotone" name="NO₂ (ppb)" dataKey="NO2" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Energy Deep-dive */}
        {activeDomainId === "energy" && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed font-sans max-w-4xl">
              Predictive analysis of smart grid peak load and renewable energy supply. Real-time battery bank storage discharge buffers grid stress during evening rush hours.
            </p>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={energyData}>
                  <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
                  <Area type="monotone" name="Grid Demand (MW)" dataKey="Grid Demand (MW)" stroke="#f59e0b" strokeWidth={2} fillOpacity={0.15} fill="#f59e0b" />
                  <Area type="monotone" name="Solar Generation (MW)" dataKey="Solar Generation (MW)" stroke="#10b981" strokeWidth={2} fillOpacity={0.15} fill="#10b981" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Waste Deep-dive */}
        {activeDomainId === "waste" && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed font-sans max-w-4xl">
              Smart waste management loops. Optimization of collection routing, sensor-enabled bin fill rate tracking, and regional landfill diversion policies.
            </p>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={wasteData}>
                  <XAxis dataKey="sector" stroke="#475569" fontSize={10} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
                  <Bar name="Recycled %" dataKey="Recycled %" fill="#06b6d4" radius={[2, 2, 0, 0]} />
                  <Bar name="Landfill %" dataKey="Landfill %" fill="#f43f5e" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Education Deep-dive */}
        {activeDomainId === "education" && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed font-sans max-w-4xl">
              Tracking lifelong learning participation, vocational education attendance, and school resource gap indexes across municipal zones.
            </p>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { zone: "Zone A", completion: 82, attendance: 75 },
                  { zone: "Zone B", completion: 88, attendance: 82 },
                  { zone: "Zone C", completion: 64, attendance: 60 },
                  { zone: "Zone D", completion: 78, attendance: 70 },
                  { zone: "Zone E", completion: 94, attendance: 88 },
                  { zone: "Zone F", completion: 80, attendance: 78 }
                ]}>
                  <XAxis dataKey="zone" stroke="#475569" fontSize={10} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
                  <Bar name="Completion Rate %" dataKey="completion" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                  <Bar name="Vocational Attendance %" dataKey="attendance" fill="#6366f1" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Citizen Deep-dive */}
        {activeDomainId === "citizen" && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed font-sans max-w-4xl">
              Analyzing public sentiment from municipal feedback channels. Tracking public service response satisfaction scores across different departments.
            </p>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={[
                  { name: "Transit", rating: 4.1, eta: 12 },
                  { name: "Safety", rating: 3.8, eta: 7 },
                  { name: "Health", rating: 4.4, eta: 18 },
                  { name: "Energy", rating: 4.3, eta: 15 },
                  { name: "Waste", rating: 3.9, eta: 22 },
                  { name: "Citizen", rating: 4.2, eta: 10 }
                ]}>
                  <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
                  <Bar name="Satisfaction Score ⭐ (out of 5)" dataKey="rating" fill="#06b6d4" radius={[2, 2, 0, 0]} />
                  <Line name="Avg Response ETA (mins)" type="monotone" dataKey="eta" stroke="#f43f5e" strokeWidth={2.5} dot={true} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* AI Projection Sandbox */}
        {activeDomainId === "projection" && (() => {
          const [policyInput, setPolicyInput] = React.useState("");
          const [selectedSector, setSelectedSector] = React.useState("Urban Mobility");
          const [fundingVal, setFundingVal] = React.useState(15);
          
          const handleForecastSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            if (!policyInput.trim()) return;
            runProjectionForecast(policyInput, selectedSector, fundingVal);
          };

          return (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Left Column: Form */}
              <div className="lg:col-span-2 bg-slate-950/40 border border-slate-800 p-5 rounded-xl space-y-4">
                <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 block border-b border-slate-800 pb-2">
                  Simulation Parameters
                </span>
                <form onSubmit={handleForecastSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-slate-400">Policy Intervention Statement:</label>
                    <textarea
                      value={policyInput}
                      onChange={(e) => setPolicyInput(e.target.value)}
                      placeholder="Describe the policy proposal (e.g. Subsidize 1,000 household solar backup panels and offset diesel generators during peak hours...)"
                      rows={4}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600 transition-colors"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-slate-400">Target Municipal Sector:</label>
                    <select
                      value={selectedSector}
                      onChange={(e) => setSelectedSector(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-600"
                    >
                      <option value="Urban Mobility">Urban Mobility</option>
                      <option value="Smart Grid Energy">Smart Grid Energy</option>
                      <option value="Environmental Health">Environmental Health</option>
                      <option value="Healthcare Access">Healthcare Access</option>
                      <option value="Public Safety">Public Safety</option>
                      <option value="Waste Management">Waste Management</option>
                      <option value="Education & Learning">Education & Learning</option>
                      <option value="Citizen Engagement">Citizen Engagement</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-slate-400">Allocated Funding:</span>
                      <span className="text-cyan-400 font-bold">₹{fundingVal} Cr</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={fundingVal}
                      onChange={(e) => setFundingVal(Number(e.target.value))}
                      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={projecting || !policyInput.trim()}
                    className="w-full py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-40 text-slate-950 font-bold text-xs font-mono uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {projecting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Calculating AI Scenarios...
                      </>
                    ) : (
                      <>
                        🔮 Run 5-Year AI Forecast
                      </>
                    )}
                  </button>
                </form>

                {/* Preset Scenarios */}
                <div className="space-y-2 pt-2 border-t border-slate-850">
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">Demo Sandbox Interventions</span>
                  <div className="grid grid-cols-1 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setPolicyInput("Deploy 150 automated electric transit shuttles and establish dedicated express bus lanes to bypass Ring Road traffic.");
                        setSelectedSector("Urban Mobility");
                        setFundingVal(25);
                      }}
                      className="px-2.5 py-1.5 bg-slate-900 hover:bg-cyan-950 border border-slate-800 rounded text-[10px] text-left text-slate-300 hover:text-cyan-400 transition-colors truncate"
                    >
                      🚌 Electric Shuttle Fleet & Express Lanes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPolicyInput("Construct 3 regional grid battery storage facilities (50MW capacity each) loaded by daylight solar offsets.");
                        setSelectedSector("Smart Grid Energy");
                        setFundingVal(40);
                      }}
                      className="px-2.5 py-1.5 bg-slate-900 hover:bg-cyan-950 border border-slate-800 rounded text-[10px] text-left text-slate-300 hover:text-cyan-400 transition-colors truncate"
                    >
                      ⚡ Smart Grid Battery Storage Units
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPolicyInput("Plant 10,000 broad-leaf urban trees in Zone 3 and install 50 high-efficiency particulate scrubbers.");
                        setSelectedSector("Environmental Health");
                        setFundingVal(12);
                      }}
                      className="px-2.5 py-1.5 bg-slate-900 hover:bg-cyan-950 border border-slate-800 rounded text-[10px] text-left text-slate-300 hover:text-cyan-400 transition-colors truncate"
                    >
                      🌿 Green Canopy & Particulate Scrubbers
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Charts & Cards */}
              <div className="lg:col-span-3 space-y-4">
                {projecting ? (
                  <div className="flex flex-col items-center justify-center h-[350px] bg-slate-950/20 border border-slate-800 rounded-xl">
                    <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mb-3" />
                    <p className="text-xs font-mono text-slate-400 tracking-wider">COMPILING DYNAMIC MARKOV CHAINS & LLM MODEL VECTORS...</p>
                  </div>
                ) : projectionError ? (
                  <div className="flex flex-col items-center justify-center h-[350px] bg-slate-950/20 border border-slate-800 rounded-xl text-rose-400 text-xs font-mono p-4 text-center">
                    <span>❌ {projectionError}</span>
                    <button
                      onClick={() => runProjectionForecast(policyInput, selectedSector, fundingVal)}
                      className="mt-3 px-3 py-1.5 border border-rose-800 bg-rose-950/20 rounded hover:bg-rose-950/40 text-slate-200 transition-colors"
                    >
                      Retry Simulation
                    </button>
                  </div>
                ) : projectionData ? (
                  <div className="space-y-4">
                    {/* Forecast Chart */}
                    <div className="bg-slate-955/20 p-4 border border-slate-800 rounded-xl">
                      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block mb-2">5-Year Impact Trajectory Chart</span>
                      <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={projectionData}>
                            <XAxis dataKey="year" stroke="#475569" fontSize={10} tickLine={false} />
                            <YAxis stroke="#475569" fontSize={10} tickLine={false} domain={[0, 100]} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
                            <Line name="Sector Metric Score" type="monotone" dataKey="primaryMetric" stroke="#00d4ff" strokeWidth={2.5} dot={{ r: 4 }} />
                            <Line name="Economic Return Rate %" type="monotone" dataKey="economicEfficiency" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                            <Line name="Public Approval Index" type="monotone" dataKey="publicApproval" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Timeline Reasoning Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                      {projectionData.map((d, i) => (
                        <div key={i} className="bg-slate-950/40 border border-slate-850 p-2.5 rounded-lg flex flex-col justify-between space-y-1 hover:border-slate-700 transition-colors">
                          <div className="flex justify-between items-center border-b border-slate-850 pb-1">
                            <span className="text-xs font-bold text-slate-100 font-mono">{d.year}</span>
                            <span className="text-[9px] font-mono text-cyan-400">Score: {d.primaryMetric}</span>
                          </div>
                          <p className="text-[9px] text-slate-400 leading-snug">{d.rationale}</p>
                          <div className="text-[8px] font-mono text-slate-500 flex justify-between pt-1 border-t border-slate-900">
                            <span>Eco: {d.economicEfficiency}%</span>
                            <span>Appr: {d.publicApproval}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[350px] border border-dashed border-slate-800 rounded-xl p-6 text-center text-slate-500 font-sans">
                    <span className="text-xl mb-2">🔮</span>
                    <span className="text-xs max-w-sm leading-relaxed">
                      Input your policy action statements on the left and trigger the simulation. Google Gemini AI will project a structured 5-year municipal dataset to graph the outcome.
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
