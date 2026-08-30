
"use client";
import { useState } from 'react';
import { 
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ComposedChart, Line, LineChart, PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  HelpCircle, Activity, Zap, ShieldAlert, CheckCircle, Clock, Database, ServerCrash, Terminal, HardDrive, DollarSign, Brain
} from 'lucide-react';

// --- MOCK DATA ---
const auditVolumeData = [
  { date: 'Aug 01', audits: 420, cost: 16.80 },
  { date: 'Aug 05', audits: 510, cost: 20.40 },
  { date: 'Aug 10', audits: 390, cost: 15.60 },
  { date: 'Aug 15', audits: 605, cost: 24.20 },
  { date: 'Aug 20', audits: 850, cost: 34.00 },
  { date: 'Aug 25', audits: 1020, cost: 40.80 },
  { date: 'Aug 30', audits: 1250, cost: 50.00 }
];

const tokenDistribution = [
  { name: 'Transcript Ingestion', value: 24.0, color: '#00d8ff' }, // Prompt
  { name: 'Insight Generation', value: 12.0, color: '#a855f7' }, // Completion
  { name: 'System Context/Rules', value: 6.5, color: '#f97316' }  // System
];

const rubricFailures = [
  { subject: 'Latency', fails: 850 },
  { subject: 'Guardrails', fails: 620 },
  { subject: 'Context', fails: 410 },
  { subject: 'Flow', fails: 290 },
  { subject: 'Interruption', fails: 180 }
];

const latencyData = [
  { time: '10:00', p50: 1.2, p90: 2.1, p99: 3.5 },
  { time: '11:00', p50: 1.3, p90: 2.2, p99: 3.8 },
  { time: '12:00', p50: 1.5, p90: 2.8, p99: 4.5 }, // Spike
  { time: '13:00', p50: 1.2, p90: 2.0, p99: 3.2 },
  { time: '14:00', p50: 1.1, p90: 1.9, p99: 3.0 },
  { time: '15:00', p50: 1.2, p90: 2.1, p99: 3.4 }
];

const errorLogs = [
  { id: 'err_9f82', time: '12:45:02', level: 'CRITICAL', msg: 'ContextWindowExceeded: Transcript length (142k tokens) exceeds limit.', session: 'audit_7x92p' },
  { id: 'err_3a11', time: '12:30:15', level: 'WARN', msg: 'LLM_Timeout: Insight generation took > 15s. Retrying...', session: 'audit_2b45q' },
  { id: 'err_8c44', time: '11:15:44', level: 'ERROR', msg: 'JSON_Parse_Error: Failed to parse evaluator JSON output.', session: 'audit_5n11x' },
  { id: 'err_2d99', time: '10:05:12', level: 'WARN', msg: 'RateLimitHit: Gemini API requested backoff (429).', session: 'SYSTEM' },
];

function CardTitle({ title }) {
  return (
    <div className="flex items-center gap-1.5 text-[#a1a1aa] text-[11px] font-semibold uppercase tracking-widest mb-4">
      {title}
      <HelpCircle size={12} className="text-[#52525b]" />
    </div>
  );
}

// --- CUSTOM TOOLTIPS ---
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#111113] border border-[#27272a] p-3 rounded shadow-xl text-xs">
        <p className="text-[#a1a1aa] mb-2 font-semibold">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-[#ededed]">{entry.name}:</span>
            <span className="font-mono font-medium text-white">{entry.name.includes('Cost') ? `$${entry.value.toFixed(2)}` : entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function UsagePage() {
  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto pb-12 font-mono sm:font-sans">
      
      {/* Header */}
      <div className="flex flex-col gap-1 mb-2">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-xs text-[#a1a1aa] font-medium tracking-wide uppercase">AI Interviews / Usage</div>
            <h1 className="text-2xl font-bold tracking-tight text-[#ededed]">Audit Operations</h1>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#111113] border border-[#1f1f22] rounded-md text-xs font-medium text-[#a1a1aa]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            System Operational
          </div>
        </div>
      </div>
      
      {/* SVG Patterns for Consistency with Overview */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <pattern id="patPat" width="4" height="4" patternUnits="userSpaceOnUse">
            <rect width="4" height="4" fill="none" />
            <circle cx="2" cy="2" r="1" fill="currentColor" />
          </pattern>
        </defs>
      </svg>

      {/* Tier 1: KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
        <div className="rounded-lg border border-[#1f1f22] bg-[#0a0a0a] p-5 flex flex-col h-[180px]">
          <CardTitle title="Total Audits" />
          <div className="flex-1 flex items-center justify-center">
             <div className="flex flex-col items-center">
                <span className="text-[40px] font-medium text-[#00d8ff] tracking-tight">12,450</span>
                <span className="text-xs text-emerald-500 font-bold uppercase tracking-wider mt-1 bg-emerald-500/10 px-2 py-0.5 rounded">+12% WoW</span>
             </div>
          </div>
        </div>

        <div className="rounded-lg border border-[#1f1f22] bg-[#0a0a0a] p-5 flex flex-col h-[180px]">
          <CardTitle title="Eval Tokens" />
          <div className="flex-1 flex items-center justify-center">
             <div className="flex flex-col items-center">
                <span className="text-[40px] font-medium text-[#a855f7] tracking-tight">42.5<span className="text-[20px]">M</span></span>
                <span className="text-xs text-emerald-500 font-bold uppercase tracking-wider mt-1 bg-emerald-500/10 px-2 py-0.5 rounded">+5% WoW</span>
             </div>
          </div>
        </div>

        <div className="rounded-lg border border-[#1f1f22] bg-[#0a0a0a] p-5 flex flex-col h-[180px]">
          <CardTitle title="Avg Cost / Audit" />
          <div className="flex-1 flex items-center justify-center">
             <div className="flex flex-col items-center">
                <span className="text-[40px] font-medium text-[#f97316] tracking-tight">$0.042</span>
                <span className="text-xs text-rose-500 font-bold uppercase tracking-wider mt-1 bg-rose-500/10 px-2 py-0.5 rounded">-2% WoW</span>
             </div>
          </div>
        </div>
        
        <div className="rounded-lg border border-[#1f1f22] bg-[#0a0a0a] p-5 flex flex-col h-[180px]">
          <CardTitle title="Flagged Sessions" />
          <div className="flex-1 flex items-center justify-center">
             <div className="flex flex-col items-center">
                <span className="text-[40px] font-medium text-[#ef4444] tracking-tight">18.4%</span>
                <span className="text-xs text-[#a1a1aa] uppercase tracking-wider mt-1">Requires Review</span>
             </div>
          </div>
        </div>

        <div className="rounded-lg border border-[#1f1f22] bg-[#0a0a0a] p-5 flex flex-col h-[180px]">
          <CardTitle title="Context Utilization" />
          <div className="flex-1 flex items-center justify-center">
             <div className="flex flex-col items-center">
                <span className="text-[40px] font-medium text-[#3b82f6] tracking-tight">64%</span>
                <span className="text-xs text-[#a1a1aa] uppercase tracking-wider mt-1">Of LLM Window</span>
             </div>
          </div>
        </div>

        <div className="rounded-lg border border-[#1f1f22] bg-[#0a0a0a] p-5 flex flex-col h-[180px]">
          <CardTitle title="Pipeline Success Rate" />
          <div className="flex-1 flex items-center justify-center">
             <div className="flex flex-col items-center">
                <span className="text-[40px] font-medium text-[#10b981] tracking-tight">99.8%</span>
                <span className="text-xs text-[#a1a1aa] uppercase tracking-wider mt-1">Uptime</span>
             </div>
          </div>
        </div>

      </div>
      
      {/* Tier 2: Primary Analytics */}
      <div className="mt-4 text-[13px] font-medium tracking-wide text-[#ededed] flex items-center gap-1.5">
        <Activity size={14} className="text-[#52525b]" />
        Audit Analytics & Cost
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Large Chart: Volume vs Cost */}
        <div className="lg:col-span-6 rounded-lg border border-[#1f1f22] bg-[#0a0a0a] flex flex-col h-[350px]">
          <div className="px-5 pt-5 pb-3">
             <CardTitle title="Audit Volume vs Evaluation Cost" />
          </div>
          <div className="flex-1 w-full pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={auditVolumeData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d8ff" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00d8ff" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f22" vertical={false} />
                <XAxis dataKey="date" stroke="#52525b" tick={{fill: '#52525b', fontSize: 10}} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" stroke="#52525b" tick={{fill: '#52525b', fontSize: 10}} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="#52525b" tick={{fill: '#52525b', fontSize: 10}} axisLine={false} tickLine={false} />
                <RechartsTooltip content={<CustomTooltip />} cursor={{fill: '#1f1f22', opacity: 0.4}} />
                <Bar yAxisId="left" dataKey="audits" name="Audits" fill="#27272a" radius={[4, 4, 0, 0]} />
                <Area yAxisId="right" type="monotone" dataKey="cost" name="Est Cost" stroke="#00d8ff" strokeWidth={2} fillOpacity={1} fill="url(#colorCost)" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Medium Chart: Token Breakdown */}
        <div className="lg:col-span-3 rounded-lg border border-[#1f1f22] bg-[#0a0a0a] flex flex-col h-[350px]">
          <div className="px-5 pt-5 pb-3">
             <CardTitle title="Token Distribution (Millions)" />
          </div>
          <div className="flex-1 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={tokenDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={4} dataKey="value" stroke="none"
                >
                  {tokenDistribution.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={entry.color} stroke={entry.color} strokeWidth={1} />
                  ))}
                </Pie>
                <RechartsTooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col">
              <span className="text-xl font-bold text-white font-mono">42.5M</span>
              <span className="text-[9px] text-[#52525b] uppercase tracking-wider">Total</span>
            </div>
          </div>
          <div className="px-5 pb-5 flex flex-col gap-2">
            {tokenDistribution.map(item => (
              <div key={item.name} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                  <span className="text-[#a1a1aa]">{item.name}</span>
                </div>
                <span className="font-mono text-[#ededed]">{item.value.toFixed(1)}M</span>
              </div>
            ))}
          </div>
        </div>

        {/* Medium Chart: Rubric Failures */}
        <div className="lg:col-span-3 rounded-lg border border-[#1f1f22] bg-[#0a0a0a] flex flex-col h-[350px]">
          <div className="px-5 pt-5 pb-3">
             <CardTitle title="Rubric Failure Distribution" />
          </div>
          <div className="flex-1 w-full pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rubricFailures} layout="vertical" margin={{ top: 0, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f22" horizontal={true} vertical={false} />
                <XAxis type="number" stroke="#52525b" tick={{fill: '#52525b', fontSize: 10}} axisLine={false} tickLine={false} />
                <YAxis dataKey="subject" type="category" stroke="#a1a1aa" tick={{fill: '#a1a1aa', fontSize: 10}} axisLine={false} tickLine={false} />
                <RechartsTooltip content={<CustomTooltip />} cursor={{fill: '#1f1f22', opacity: 0.4}} />
                <Bar dataKey="fails" name="Failed Sessions" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={14}>
                  {rubricFailures.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : index === 1 ? '#f97316' : '#27272a'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Tier 3: Technical Deep Dive */}
      <div className="mt-4 text-[13px] font-medium tracking-wide text-[#ededed] flex items-center gap-1.5">
        <Terminal size={14} className="text-[#52525b]" />
        System Logs & Processing
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Latency Line Chart */}
        <div className="lg:col-span-1 rounded-lg border border-[#1f1f22] bg-[#0a0a0a] h-[300px] flex flex-col">
          <div className="px-5 pt-5 pb-3">
             <CardTitle title="Eval Processing Latency" />
          </div>
          <div className="flex-1 w-full pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={latencyData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f22" vertical={false} />
                <XAxis dataKey="time" stroke="#52525b" tick={{fill: '#52525b', fontSize: 10}} axisLine={false} tickLine={false} />
                <YAxis stroke="#52525b" tick={{fill: '#52525b', fontSize: 10}} axisLine={false} tickLine={false} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="p99" name="P99 (s)" stroke="#ef4444" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="p90" name="P90 (s)" stroke="#f97316" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="p50" name="P50 (s)" stroke="#00d8ff" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 pb-4">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-[#ef4444] rounded-sm"></div><span className="text-[10px] text-[#a1a1aa] font-medium uppercase tracking-wider">P99</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-[#f97316] rounded-sm"></div><span className="text-[10px] text-[#a1a1aa] font-medium uppercase tracking-wider">P90</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-[#00d8ff] rounded-sm"></div><span className="text-[10px] text-[#a1a1aa] font-medium uppercase tracking-wider">P50</span></div>
          </div>
        </div>

        {/* System Logs Table */}
        <div className="lg:col-span-2 rounded-lg border border-[#1f1f22] bg-[#0a0a0a] h-[300px] flex flex-col overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-[#1f1f22] flex items-center justify-between">
             <CardTitle title="Agent System Logs" />
             <button className="text-[10px] font-semibold text-[#00d8ff] hover:text-white transition-colors uppercase tracking-wider -mt-4">View All</button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar px-5 pb-2">
            <table className="w-full text-left text-xs whitespace-nowrap mt-2">
              <thead className="bg-[#0a0a0a] sticky top-0 z-10 border-b border-[#1f1f22]">
                <tr className="text-[#52525b] uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Time</th>
                  <th className="px-4 pb-3 font-semibold">Level</th>
                  <th className="px-4 pb-3 font-semibold w-full">Message</th>
                  <th className="pb-3 font-semibold text-right">Session ID</th>
                </tr>
              </thead>
              <tbody className="text-[#a1a1aa]">
                {errorLogs.map((log, i) => (
                  <tr key={i} className="border-b border-[#1f1f22]/50 last:border-0 hover:bg-[#1f1f22]/30 transition-colors h-12">
                    <td className="font-mono text-[#52525b]">{log.time}</td>
                    <td className="px-4">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wide ${
                        log.level === 'CRITICAL' ? 'bg-[#ef4444]/20 text-[#ef4444]' : 
                        log.level === 'ERROR' ? 'bg-[#f97316]/20 text-[#f97316]' : 
                        'bg-[#eab308]/20 text-[#eab308]'
                      }`}>
                        {log.level}
                      </span>
                    </td>
                    <td className="px-4 font-mono text-[11px] text-[#ededed] whitespace-normal min-w-[250px]">
                      {log.msg}
                    </td>
                    <td className="font-mono text-[#52525b] text-right">{log.session}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
