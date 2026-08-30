
"use client";
import { useState } from 'react';
import { 
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ComposedChart, Line, LineChart, PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  HelpCircle, Activity, Zap, ShieldAlert, CheckCircle, Clock, Database, ServerCrash, Terminal, HardDrive, DollarSign, Brain
} from 'lucide-react';

// --- MOCK DATA ---
const auditVolumeData = Array.from({ length: 120 }).map((_, i) => {
  const day = Math.floor(i / 4) + 1;
  const isSpike = Math.random() > 0.85;
  const isZero = Math.random() > 0.7; // Lots of zero gaps!
  
  let audits = 0;
  if (!isZero) {
     let baseAudits = 100 + (day * 10);
     const multiplier = isSpike ? (Math.random() * 2 + 1) : (Math.random() * 0.5 + 0.5);
     audits = Math.floor(baseAudits * multiplier);
  }
  
  return { 
    date: `Aug ${day.toString().padStart(2, '0')}`, 
    audits: audits, 
    cost: Number((audits * 0.04).toFixed(2)) 
  };
});

const tokenDistribution = [
  { name: 'Transcript Ingestion', value: 55, color: 'var(--chart-cyan)' }, 
  { name: 'Insight Generation', value: 30, color: 'var(--chart-purple)' }, 
  { name: 'System Context/Rules', value: 15, color: 'var(--chart-orange)' }  
];

const rubricFailures = [
  { name: 'Latency', value: 45, color: 'var(--chart-red)' },
  { name: 'Guardrails', value: 35, color: 'var(--chart-orange)' },
  { name: 'Context', value: 20, color: 'var(--chart-cyan)' },
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
    <div className="flex items-center gap-1.5 text-[var(--text-muted)] text-[11px] font-semibold uppercase tracking-widest mb-4">
      {title}
      <HelpCircle size={12} className="text-[var(--text-muted-dark)]" />
    </div>
  );
}


const CustomBar = (props) => {
  const { x, y, width, height } = props;
  const capY = height > 0 ? y : y - 1.5;
  return (
    <g>
      {height > 0 && <rect x={x} y={y} width={width} height={height} fill="url(#matrixPattern)" />}
      <rect x={x} y={capY} width={width} height={1.5} fill="var(--chart-cyan)" />
    </g>
  );
};


const formatXAxis = (tickItem) => {
  if (['Aug 01', 'Aug 05', 'Aug 10', 'Aug 15', 'Aug 20', 'Aug 25', 'Aug 30'].includes(tickItem)) {
    return tickItem;
  }
  return '';
};

// --- CUSTOM TOOLTIPS ---
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--bg-card-hover)] border border-[var(--border-strong)] p-3 rounded shadow-xl text-xs z-50">
        <p className="text-[var(--text-muted)] mb-2 font-semibold">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-[var(--text-primary)]">{entry.name}:</span>
            <span className="font-mono font-medium text-[var(--text-primary)]">{entry.name.includes('Cost') ? `$${entry.value.toFixed(2)}` : entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

import { useSettings } from '@/context/SettingsContext';

export default function UsagePage() { 
  const { chartStyle } = useSettings();
  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto pb-12 font-mono sm:font-sans">
      
      {/* Header */}
      <div className="flex flex-col gap-1 mb-2">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-xs text-[var(--text-muted)] font-medium tracking-wide uppercase">AI Interviews / Usage</div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Audit Operations</h1>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-card-hover)] border border-[var(--border-color)] rounded-md text-xs font-medium text-[var(--text-muted)]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            System Operational
          </div>
        </div>
      </div>
      
      {/* SVG Patterns for Consistency with Overview */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <pattern id="matrixPattern" x="0" y="0" width="3" height="3" patternUnits="userSpaceOnUse">
  <rect x="0" y="0" width="2" height="1" fill="var(--chart-cyan)" opacity="0.7" />
</pattern>
          {tokenDistribution.map((d, i) => (
            <pattern key={`patTok-${i}`} id={`patTok-${i}`} x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.5" fill={d.color} opacity="0.5" />
            </pattern>
          ))}
          {rubricFailures.map((d, i) => (
            <pattern key={`patRub-${i}`} id={`patRub-${i}`} x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.5" fill={d.color} opacity="0.5" />
            </pattern>
          ))}
        </defs>
      </svg>

      {/* Tier 1: KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-5 flex flex-col h-[180px]">
          <CardTitle title="Total Audits" />
          <div className="flex-1 flex items-center justify-center">
             <div className="flex flex-col items-center">
                <span className="text-[40px] font-medium text-[var(--chart-cyan)] tracking-tight">12,450</span>
                <span className="text-xs text-emerald-500 font-bold uppercase tracking-wider mt-1 bg-emerald-500/10 px-2 py-0.5 rounded">+12% WoW</span>
             </div>
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-5 flex flex-col h-[180px]">
          <CardTitle title="Eval Tokens" />
          <div className="flex-1 flex items-center justify-center">
             <div className="flex flex-col items-center">
                <span className="text-[40px] font-medium text-[var(--chart-purple)] tracking-tight">42.5<span className="text-[20px]">M</span></span>
                <span className="text-xs text-emerald-500 font-bold uppercase tracking-wider mt-1 bg-emerald-500/10 px-2 py-0.5 rounded">+5% WoW</span>
             </div>
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-5 flex flex-col h-[180px]">
          <CardTitle title="Avg Cost / Audit" />
          <div className="flex-1 flex items-center justify-center">
             <div className="flex flex-col items-center">
                <span className="text-[40px] font-medium text-[var(--chart-orange)] tracking-tight">$0.042</span>
                <span className="text-xs text-rose-500 font-bold uppercase tracking-wider mt-1 bg-rose-500/10 px-2 py-0.5 rounded">-2% WoW</span>
             </div>
          </div>
        </div>
        
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-5 flex flex-col h-[180px]">
          <CardTitle title="Flagged Sessions" />
          <div className="flex-1 flex items-center justify-center">
             <div className="flex flex-col items-center">
                <span className="text-[40px] font-medium text-[var(--chart-red)] tracking-tight">18.4%</span>
                <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-1">Requires Review</span>
             </div>
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-5 flex flex-col h-[180px]">
          <CardTitle title="Context Utilization" />
          <div className="flex-1 flex items-center justify-center">
             <div className="flex flex-col items-center">
                <span className="text-[40px] font-medium text-[var(--chart-cyan)] tracking-tight">64%</span>
                <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-1">Of LLM Window</span>
             </div>
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-5 flex flex-col h-[180px]">
          <CardTitle title="Pipeline Success Rate" />
          <div className="flex-1 flex items-center justify-center">
             <div className="flex flex-col items-center">
                <span className="text-[40px] font-medium text-[var(--chart-green)] tracking-tight">99.8%</span>
                <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-1">Uptime</span>
             </div>
          </div>
        </div>

      </div>
      
      {/* Tier 2: Primary Analytics */}
      <div className="mt-4 text-[13px] font-medium tracking-wide text-[var(--text-primary)] flex items-center gap-1.5">
        <Activity size={14} className="text-[var(--text-muted-dark)]" />
        Audit Analytics & Cost
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Large Chart: Volume vs Cost */}
        <div className="lg:col-span-8 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] flex flex-col h-[400px]">
          <div className="px-5 pt-5 pb-3">
             <CardTitle title="Audit Volume vs Evaluation Cost" />
          </div>
          <div className="flex-1 w-full pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={auditVolumeData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }} barCategoryGap={0} barGap={0}>
                <defs>
                  <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-cyan)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--chart-cyan)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorAudits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-purple)" stopOpacity={0.5}/>
                    <stop offset="95%" stopColor="var(--chart-purple)" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border-color)" vertical={false} horizontal={true} />
                <XAxis dataKey="date" stroke="var(--text-muted-dark)" tick={{fill: 'var(--text-muted-dark)', fontSize: 10}} axisLine={false} tickLine={{stroke: 'var(--border-color)'}} interval={19} tickMargin={12} />
                <YAxis stroke="var(--text-muted-dark)" tick={{fill: 'var(--text-muted-dark)', fontSize: 10}} axisLine={false} tickLine={false} ticks={[0, 200, 400, 600, 800, 1000, 1200, 1400]} />
                
                <RechartsTooltip content={<CustomTooltip />} cursor={{fill: 'var(--bg-secondary)', opacity: 0.4}} />
                <Bar dataKey="audits" name="Audits" fill="var(--chart-cyan)" shape={chartStyle === 'matrix' ? <CustomBar /> : undefined}  />
                
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column Stack for Donuts */}
        <div className="lg:col-span-4 flex flex-col gap-4 h-[400px]">
          
          {/* Token Distribution (Donut - Overview Style) */}
          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-5 flex flex-col flex-1">
            <CardTitle title="Token Distribution" />
            <div className="flex-1 flex items-center justify-center relative">
              <div className="w-[120px] h-[120px] shrink-0 absolute left-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={tokenDistribution} innerRadius={42} outerRadius={55} paddingAngle={4} dataKey="value" stroke="none" isAnimationActive={false}>
                      {tokenDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={chartStyle === 'matrix' ? `url(#patTok-${index})` : entry.color} stroke={entry.color} strokeWidth={1.5} fillOpacity={chartStyle === 'matrix' ? 1 : 0.8} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-2 text-[11px] w-full pl-[130px]">
                {tokenDistribution.map(item => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }}></div>
                      <span className="text-[var(--text-muted)]">{item.name}</span>
                    </div>
                    <span className="text-[var(--text-primary)] font-mono">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Rubric Failures (Donut - Overview Style) */}
          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-5 flex flex-col flex-1">
            <CardTitle title="Rubric Failure Distribution" />
            <div className="flex-1 flex items-center justify-center relative">
              <div className="w-[120px] h-[120px] shrink-0 absolute left-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={rubricFailures} innerRadius={42} outerRadius={55} paddingAngle={4} dataKey="value" stroke="none" isAnimationActive={false}>
                      {rubricFailures.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={chartStyle === 'matrix' ? `url(#patRub-${index})` : entry.color} stroke={entry.color} strokeWidth={1.5} fillOpacity={chartStyle === 'matrix' ? 1 : 0.8} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-2 text-[11px] w-full pl-[130px]">
                {rubricFailures.map(item => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }}></div>
                      <span className="text-[var(--text-muted)]">{item.name}</span>
                    </div>
                    <span className="text-[var(--text-primary)] font-mono">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Tier 3: Technical Deep Dive */}
      <div className="mt-4 text-[13px] font-medium tracking-wide text-[var(--text-primary)] flex items-center gap-1.5">
        <Terminal size={14} className="text-[var(--text-muted-dark)]" />
        System Logs & Processing
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Latency Line Chart */}
        <div className="lg:col-span-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] h-[300px] flex flex-col">
          <div className="px-5 pt-5 pb-3">
             <CardTitle title="Eval Processing Latency" />
          </div>
          <div className="flex-1 w-full pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={latencyData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid stroke="var(--border-color)" vertical={false} horizontal={true} />
                <XAxis dataKey="time" stroke="var(--text-muted-dark)" tick={{fill: 'var(--text-muted-dark)', fontSize: 10}} axisLine={false} tickLine={false} />
                <YAxis stroke="var(--text-muted-dark)" tick={{fill: 'var(--text-muted-dark)', fontSize: 10}} axisLine={false} tickLine={false} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="p99" name="P99 (s)" stroke="var(--chart-red)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="p90" name="P90 (s)" stroke="var(--chart-orange)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="p50" name="P50 (s)" stroke="var(--chart-cyan)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 pb-4">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-[var(--chart-red)] rounded-sm"></div><span className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider">P99</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-[var(--chart-orange)] rounded-sm"></div><span className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider">P90</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-[var(--chart-cyan)] rounded-sm"></div><span className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider">P50</span></div>
          </div>
        </div>

        {/* System Logs Table */}
        <div className="lg:col-span-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] h-[300px] flex flex-col overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-[var(--border-color)] flex items-center justify-between">
             <CardTitle title="Agent System Logs" />
             <button className="text-[10px] font-semibold text-[var(--chart-cyan)] hover:text-[var(--text-primary)] transition-colors uppercase tracking-wider -mt-4">View All</button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar px-5 pb-2">
            <table className="w-full text-left text-xs whitespace-nowrap mt-2">
              <thead className="bg-[var(--bg-card)] sticky top-0 z-10 border-b border-[var(--border-color)]">
                <tr className="text-[var(--text-muted-dark)] uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Time</th>
                  <th className="px-4 pb-3 font-semibold">Level</th>
                  <th className="px-4 pb-3 font-semibold w-full">Message</th>
                  <th className="pb-3 font-semibold text-right">Session ID</th>
                </tr>
              </thead>
              <tbody className="text-[var(--text-muted)]">
                {errorLogs.map((log, i) => (
                  <tr key={i} className="border-b border-[var(--border-color)]/50 last:border-0 hover:bg-[var(--bg-secondary)]/30 transition-colors h-12">
                    <td className="font-mono text-[var(--text-muted-dark)]">{log.time}</td>
                    <td className="px-4">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wide ${
                        log.level === 'CRITICAL' ? 'bg-[var(--chart-red)]/20 text-[var(--chart-red)]' : 
                        log.level === 'ERROR' ? 'bg-[var(--chart-orange)]/20 text-[var(--chart-orange)]' : 
                        'bg-[var(--chart-orange)]/20 text-[var(--chart-orange)]'
                      }`}>
                        {log.level}
                      </span>
                    </td>
                    <td className="px-4 font-mono text-[11px] text-[var(--text-primary)] whitespace-normal min-w-[250px]">
                      {log.msg}
                    </td>
                    <td className="font-mono text-[var(--text-muted-dark)] text-right">{log.session}</td>
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


