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
  Users
} from "lucide-react";
import { Metrics, Domain } from "../types";

interface DashboardGridProps {
  metrics: Metrics | null;
  activeDomainId: string;
  domains: Domain[];
  onSelectDomain: (id: string) => void;
}

export default function DashboardGrid({ metrics, activeDomainId, domains, onSelectDomain }: DashboardGridProps) {
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
              {activeDomainId === "all" ? "Smart City Systems Core Insights" : `${domains.find(d => d.id === activeDomainId)?.name || "Analytical Matrix"}`}
            </h3>
          </div>
          <div className="flex gap-1.5">
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

            {/* Chart 4: Heatmap Simulation */}
            <div className="bg-slate-950/30 border border-slate-800/60 rounded-xl p-4 flex flex-col justify-between">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-mono font-medium text-slate-300 flex items-center gap-1.5">
                  <span className="p-1 rounded bg-purple-500/10 text-purple-400">🗺️</span>
                  Geospatial Grid Sector Heatmap
                </span>
                <span className="text-[10px] font-mono text-purple-400">Zone-Specific Matrix</span>
              </div>
              <div className="grid grid-cols-14 gap-1 p-1 bg-slate-950/80 rounded-lg max-h-[140px] overflow-hidden">
                {metrics.heatmap.map((cell, i) => (
                  <div
                    key={i}
                    title={`Zone ${cell.zone} - Status: ${cell.status}`}
                    className={`aspect-square rounded-[2px] transition-all duration-300 hover:scale-125 hover:z-10 ${
                      cell.status === "crit" ? "bg-rose-600 shadow-[0_0_4px_rgba(239,68,68,0.4)]" :
                      cell.status === "high" ? "bg-amber-500" :
                      cell.status === "med" ? "bg-cyan-500/80" : "bg-emerald-600/40"
                    }`}
                  />
                ))}
              </div>
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
      </div>
    </div>
  );
}
