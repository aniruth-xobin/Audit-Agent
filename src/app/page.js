"use client";
import { AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { HelpCircle, Brain, Users } from 'lucide-react';

// Generate flat data with occasional sharp spikes
const generateSpikyData = (base, count, spikeFrequency, negative = false) => {
  return Array.from({ length: count }).map(() => {
    const isSpike = Math.random() < spikeFrequency;
    let spikeBase = base;
    if (isSpike) {
      spikeBase = negative ? base + (base * 0.8) : base - (base * 0.2);
    }
    return { val: spikeBase };
  });
};

const healthData = generateSpikyData(99.1, 40, 0.05);
const latencyData = generateSpikyData(1.2, 40, 0.08);
const minutesData = generateSpikyData(3746, 20, 0.02);
const hallucinationData = generateSpikyData(0.2, 40, 0.1, true); 
const interruptionData = generateSpikyData(3.4, 40, 0.15, true); 

const outcomesData = [
  { name: 'Completed', value: 41.7, color: 'var(--chart-cyan)' },
  { name: 'Flagged', value: 34.5, color: 'var(--chart-purple)' },
  { name: 'Dropped', value: 12.6, color: 'var(--chart-orange)' },
  { name: 'Other', value: 11.2, color: 'var(--chart-green)' },
];

const scoresData = [
  { name: 'Guided', value: 65, color: 'var(--chart-cyan)' },
  { name: 'Freeflow', value: 25, color: 'var(--chart-purple)' },
  { name: 'Roleplay', value: 10, color: 'var(--chart-orange)' },
];

const failuresData = [
  { name: 'Off-topic', value: 45, color: 'var(--chart-green)' },
  { name: 'Silence', value: 35, color: 'var(--chart-cyan)' },
  { name: 'Audio Issue', value: 20, color: 'var(--chart-orange)' },
];

const topCandidates = [
  { id: '1', name: 'sess_9xq...', score: '10 / 10' },
  { id: '2', name: 'sess_4ya...', score: '9 / 10' },
  { id: '3', name: 'sess_8po...', score: '9 / 10' },
  { id: '4', name: 'sess_5tt...', score: '8 / 10' },
  { id: '5', name: 'sess_3zz...', score: '8 / 10' },
  { id: '6', name: 'sess_1bc...', score: '7 / 10' },
  { id: '7', name: 'sess_2cc...', score: '7 / 10' },
];

function CardTitle({ title }) {
  return (
    <div className="flex items-center gap-1.5 text-[var(--text-muted)] text-[11px] font-semibold uppercase tracking-widest mb-4">
      {title}
      <HelpCircle size={12} className="text-[var(--text-muted-dark)]" />
    </div>
  );
}

import { useSettings } from '@/context/SettingsContext';

export default function Home() { 
  const { chartStyle } = useSettings();
  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto pb-12 font-mono sm:font-sans">
      <div className="flex flex-col gap-1 mb-2">
        <div className="text-xs text-[var(--text-muted)] font-medium tracking-wide uppercase">AI Interviews / Overview</div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Overview</h1>
      </div>
      
      {/* SVG Pattern Definitions for the Dot Matrix fill */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <pattern id="dotPatternHealth" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.5" fill="var(--chart-cyan)" opacity="0.3" />
          </pattern>
          <pattern id="dotPatternLatency" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.5" fill="var(--chart-purple)" opacity="0.3" />
          </pattern>
          <pattern id="dotPatternMins" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.5" fill="var(--chart-cyan)" opacity="0.3" />
          </pattern>
          <pattern id="dotPatternWarn" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.5" fill="var(--chart-orange)" opacity="0.3" />
          </pattern>
          
          {/* Pie Patterns */}
          {outcomesData.map((d, i) => (
            <pattern key={`patOut-${i}`} id={`patOut-${i}`} x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.5" fill={d.color} opacity="0.5" />
            </pattern>
          ))}
          {scoresData.map((d, i) => (
            <pattern key={`patScore-${i}`} id={`patScore-${i}`} x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.5" fill={d.color} opacity="0.5" />
            </pattern>
          ))}
          {failuresData.map((d, i) => (
            <pattern key={`patFail-${i}`} id={`patFail-${i}`} x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.5" fill={d.color} opacity="0.5" />
            </pattern>
          ))}
        </defs>
      </svg>
      
      {/* Row 1: 4 Columns (Core Metrics) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        
        {/* 1. System Health */}
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-5 flex flex-col h-[220px]">
          <CardTitle title="System Health" />
          <div className="flex-1 flex flex-col items-center justify-center relative">
            <span className="text-[40px] font-medium text-[var(--chart-cyan)] tracking-tight mb-4">99.1%</span>
            <div className="absolute bottom-0 w-full h-12">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={healthData}>
                  <Area type="linear" dataKey="val" stroke="var(--chart-cyan)" strokeWidth={1.5} fillOpacity={chartStyle === 'matrix' ? 1 : 0.15} fill={chartStyle === 'matrix' ? 'url(#dotPatternHealth)' : 'var(--chart-cyan)'} isAnimationActive={false} />
                  <Area type="step" dataKey="val" stroke="none" fill="none" dot={{ stroke: 'var(--chart-cyan)', fill: 'var(--chart-cyan)', r: 0, strokeWidth: 0 }} activeDot={false} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="absolute right-0 bottom-3 w-2 h-2 bg-[var(--chart-cyan)]"></div>
            </div>
          </div>
        </div>

        {/* 2. End-to-End Latency */}
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-5 flex flex-col h-[220px]">
          <CardTitle title="End-to-End Latency" />
          <div className="flex-1 flex flex-col items-center justify-center relative">
            <div className="flex items-baseline gap-1 text-[var(--chart-purple)] mb-4">
              <span className="text-[40px] font-medium tracking-tight">1.2</span>
              <span className="text-lg">s</span>
            </div>
            <div className="absolute bottom-0 w-full h-12">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={latencyData}>
                  <Area type="linear" dataKey="val" stroke="var(--chart-purple)" strokeWidth={1.5} fillOpacity={chartStyle === 'matrix' ? 1 : 0.15} fill={chartStyle === 'matrix' ? 'url(#dotPatternLatency)' : 'var(--chart-purple)'} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="absolute right-0 bottom-3 w-2 h-2 bg-[var(--chart-purple)]"></div>
            </div>
          </div>
        </div>
        
        {/* 3. Session Outcomes (Segmented Donut) */}
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-5 flex flex-col h-[220px]">
          <CardTitle title="Session Outcomes" />
          <div className="flex-1 flex items-center justify-center relative">
            <div className="w-[120px] h-[120px] shrink-0 absolute left-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={outcomesData} innerRadius={42} outerRadius={55} paddingAngle={4} dataKey="value" stroke="none" isAnimationActive={false}>
                    {outcomesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={chartStyle === 'matrix' ? `url(#patOut-${index})` : entry.color} stroke={entry.color} strokeWidth={1.5} fillOpacity={chartStyle === 'matrix' ? 1 : 0.8} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-2 text-[11px] w-full pl-[130px]">
              {outcomesData.map(item => (
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
        
        {/* 4. Top Candidates */}
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] flex flex-col h-[220px] overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-[var(--border-color)]">
            <CardTitle title="Top Candidates" />
            <div className="flex text-[10px] text-[var(--text-muted-dark)] uppercase font-bold mt-2">
              <div className="w-8">#</div>
              <div className="flex-1">Name</div>
              <div className="w-16 text-right">Score</div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-2">
            <table className="w-full text-xs text-left">
              <tbody className="text-[var(--text-muted)]">
                {topCandidates.map((c, i) => (
                  <tr key={c.id} className="border-b border-[var(--border-color)]/50 last:border-0 h-10">
                    <td className="w-8">{c.id}</td>
                    <td className="text-[var(--text-primary)]">{c.name}</td>
                    <td className="text-right font-mono text-[var(--chart-cyan)] w-16 whitespace-nowrap">{c.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Row 2: AI Quality Metrics */}
      <div className="mt-4 text-[13px] font-medium tracking-wide text-[var(--text-primary)] flex items-center gap-1.5">
        <Brain size={14} className="text-[var(--text-muted-dark)]" />
        AI Quality & Interactions
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* AI Hallucination Rate */}
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-5 flex flex-col h-[180px]">
          <CardTitle title="AI Hallucination Rate" />
          <div className="flex-1 flex flex-col items-center justify-center relative">
            <div className="flex items-baseline gap-1 text-[var(--chart-orange)] mb-4">
              <span className="text-[32px] font-medium tracking-tight">0.2</span>
              <span className="text-sm">%</span>
            </div>
            <div className="absolute bottom-0 w-full h-10">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hallucinationData}>
                  <Area type="linear" dataKey="val" stroke="var(--chart-orange)" strokeWidth={1.5} fillOpacity={chartStyle === 'matrix' ? 1 : 0.15} fill={chartStyle === 'matrix' ? 'url(#dotPatternWarn)' : 'var(--chart-orange)'} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="absolute right-0 bottom-1 w-1.5 h-1.5 bg-[var(--chart-orange)]"></div>
            </div>
          </div>
        </div>

        {/* User Interruptions */}
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-5 flex flex-col h-[180px]">
          <CardTitle title="Avg Interruptions" />
          <div className="flex-1 flex flex-col items-center justify-center relative">
            <div className="flex items-baseline gap-1 text-[var(--chart-orange)] mb-4">
              <span className="text-[32px] font-medium tracking-tight">3.4</span>
              <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider ml-1">Per Session</span>
            </div>
            <div className="absolute bottom-0 w-full h-10">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={interruptionData}>
                  <Area type="linear" dataKey="val" stroke="var(--chart-orange)" strokeWidth={1.5} fillOpacity={chartStyle === 'matrix' ? 1 : 0.15} fill={chartStyle === 'matrix' ? 'url(#dotPatternWarn)' : 'var(--chart-orange)'} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="absolute right-0 bottom-2 w-1.5 h-1.5 bg-[var(--chart-orange)]"></div>
            </div>
          </div>
        </div>
        
        {/* Turn Count */}
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-5 flex flex-col h-[180px]">
          <CardTitle title="Avg Conversation Turns" />
          <div className="flex-1 flex items-center justify-center">
             <div className="flex flex-col items-center">
                <span className="text-[40px] font-medium text-[var(--text-primary)] tracking-tight">42</span>
                <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-1">Dialogue Exchanges</span>
             </div>
          </div>
        </div>
        
        {/* Failure Reasons */}
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-5 flex flex-col h-[180px]">
          <CardTitle title="Top Failure Reasons" />
          <div className="flex-1 flex items-center justify-center relative">
            <div className="w-[90px] h-[90px] shrink-0 absolute left-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={failuresData} innerRadius={30} outerRadius={40} paddingAngle={4} dataKey="value" stroke="none" isAnimationActive={false}>
                    {failuresData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={chartStyle === 'matrix' ? `url(#patFail-${index})` : entry.color} stroke={entry.color} strokeWidth={1.5} fillOpacity={chartStyle === 'matrix' ? 1 : 0.8} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-1.5 text-[10px] w-full pl-[100px]">
              {failuresData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <span className="text-[var(--text-muted)] flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm" style={{backgroundColor: item.color}}></div> {item.name}</span>
                  <span className="text-[var(--text-primary)] font-mono">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Row 3: Participants */}
      <div className="mt-4 text-[13px] font-medium tracking-wide text-[var(--text-primary)] flex items-center gap-1.5">
        <Users size={14} className="text-[var(--text-muted-dark)]" />
        Participants
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Total Audit Minutes */}
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-5 flex flex-col h-[240px]">
          <CardTitle title="Audit Minutes" />
          <div className="flex-1 flex flex-col items-center justify-center relative">
            <div className="flex items-baseline gap-1 text-[var(--chart-cyan)] mb-4">
              <span className="text-[50px] font-medium tracking-tight">3,746</span>
              <span className="text-xl opacity-80">mins</span>
            </div>
            <div className="absolute bottom-0 w-full h-16">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={minutesData}>
                  <Area type="linear" dataKey="val" stroke="var(--chart-cyan)" strokeWidth={1} fillOpacity={chartStyle === 'matrix' ? 1 : 0.15} fill={chartStyle === 'matrix' ? 'url(#dotPatternMins)' : 'var(--chart-cyan)'} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="absolute right-0 bottom-4 w-2 h-2 bg-[var(--chart-cyan)]"></div>
            </div>
          </div>
        </div>
        
        {/* Minutes by Mode */}
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-5 flex flex-col h-[240px]">
          <CardTitle title="Minutes by Type" />
          <div className="flex-1 flex items-center justify-center">
            <div className="w-[150px] h-[150px] shrink-0 relative mr-8">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={scoresData} innerRadius={50} outerRadius={68} paddingAngle={4} dataKey="value" stroke="none" isAnimationActive={false}>
                    {scoresData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={chartStyle === 'matrix' ? `url(#patScore-${index})` : entry.color} stroke={entry.color} strokeWidth={1.5} fillOpacity={chartStyle === 'matrix' ? 1 : 0.8} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-4 text-xs w-[200px]">
              {scoresData.map((item, i) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.color }}></div>
                    <span className="text-[var(--text-muted)]">{item.name} audits</span>
                  </div>
                  <span className="text-[var(--text-primary)] font-mono">{Math.floor(item.value * 37.46)} mins</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
