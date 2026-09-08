"use client";
import React from "react";
import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, FileText, ShieldAlert, Zap, MessageSquare, Clock, Activity, AlertTriangle, Lightbulb, Layers, Filter, SlidersHorizontal, Check, ChevronLeft, ChevronDown, ChevronUp, Wrench } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

const CustomTick = ({ payload, x, y, textAnchor, stroke, radius }) => {
  const words = payload.value.split(' ');
  return (
    <g className="recharts-layer recharts-polar-angle-axis-tick">
      <text radius={radius} stroke={stroke} x={x} y={y} className="recharts-text recharts-polar-angle-axis-tick-value" textAnchor={textAnchor} fill="var(--text-muted)" fontSize={11}>
        {words.map((w, i) => <tspan x={x} dy={i === 0 ? 0 : 14} key={i}>{w}</tspan>)}
      </text>
    </g>
  );
};

function ScorecardsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const idParam = searchParams.get('id');
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState(null);
  const [turnMetrics, setTurnMetrics] = useState([]);
  const [toolCalls, setToolCalls] = useState([]);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [showTurns, setShowTurns] = useState(true);
  const [showTools, setShowTools] = useState(true);
  const [expandedTool, setExpandedTool] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeMode, setActiveMode] = useState('all');
  const filterRef = useRef(null);

  const [isSortOpen, setIsSortOpen] = useState(false);
  const [sortOption, setSortOption] = useState('newest');
  const sortRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (filterRef.current && !filterRef.current.contains(event.target)) setIsFilterOpen(false);
      if (sortRef.current && !sortRef.current.contains(event.target)) setIsSortOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/sessions?sort=${sortOption}&mode=${activeMode}`)
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setSessions(data);
          if (idParam) {
            const found = data.find(s => s.id === idParam);
            if (found) setActiveSession(found);
            else if (data.length > 0) setActiveSession(data[0]);
          } else if (data.length > 0) {
            setActiveSession(data[0]);
          }
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [sortOption, activeMode, idParam]);

  useEffect(() => {
    if (!activeSession) return;
    setLoadingMetrics(true);
    setTurnMetrics([]);
    setToolCalls([]);
    Promise.all([
      fetch('/api/scorecards/turns?sessionId=' + activeSession.id).then(r => r.json()),
      fetch('/api/scorecards/tools?sessionId=' + activeSession.id).then(r => r.json()),
    ]).then(([turnsData, toolsData]) => {
      setTurnMetrics(turnsData.data || []);
      setToolCalls(toolsData.data || []);
    }).catch(console.error).finally(() => setLoadingMetrics(false));
  }, [activeSession?.id]);

  const filteredSessions = sessions.filter(session => {
    return (session.candidate_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            session.id?.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  const handleFilterChange = (mode) => {
    setActiveMode(mode);
    setIsFilterOpen(false);
  };
  
  const handleSortChange = (opt) => {
    setSortOption(opt);
    setIsSortOpen(false);
  };

  const getRadarData = (session) => {
    if (session.radar_data && Array.isArray(session.radar_data) && session.radar_data.length > 0) return session.radar_data;
    // Fallback if empty
    return [
      { subject: 'Latency', A: 5 }, 
      { subject: 'Conversational Flow', A: 5 }, 
      { subject: 'Interruption', A: 5 }, 
      { subject: 'Context', A: 5 }, 
      { subject: 'Guardrails', A: 5 }
    ];
  };

  const getDeductions = (session) => {
    if (session.deductions && Array.isArray(session.deductions)) return session.deductions;
    return [];
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)] font-sans relative">
      
      {/* Left Pane - Session List */}
      <div className={`w-full lg:w-1/3 flex-col border border-[var(--border-color)] bg-[var(--bg-card)] rounded-lg shadow-sm lg:min-w-[320px] ${showMobileDetail ? "hidden lg:flex" : "flex"}`}>
        <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-card)] flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Audit Inbox</h2>
          
          <div className="relative flex items-center">
            <Search size={14} className="absolute left-2.5 text-[var(--text-muted)]" />
            <input 
              type="text" 
              placeholder="Search candidate or ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--bg-card-hover)] border border-[var(--border-color)] rounded pl-8 pr-3 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted-dark)] focus:outline-none focus:border-[var(--border-strong)] transition-colors" 
            />
          </div>

          <div className="flex items-center gap-2 mt-1">
            <div className="relative flex-1" ref={filterRef}>
              <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`w-full flex items-center justify-center gap-2 px-2 py-1.5 text-xs font-medium border rounded transition-colors ${activeMode !== 'all' ? 'bg-[var(--bg-active)] text-[var(--text-primary)] border-[var(--border-strong)]' : 'bg-[var(--bg-card-hover)] text-[var(--text-primary)] border-[var(--border-color)] hover:bg-[var(--bg-secondary)]'}`}
              >
                <Filter size={12} />
                Filters {activeMode !== 'all' && <span className="bg-[var(--chart-cyan)]/20 text-[var(--chart-cyan)] px-1.5 rounded-full text-[9px] ml-0.5">1</span>}
              </button>
              
              {isFilterOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-48 bg-[var(--bg-card-hover)] border border-[var(--border-color)] rounded-lg shadow-xl z-20 py-2">
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-[var(--text-muted-dark)] uppercase tracking-wider">Interview Mode</div>
                  {['all', 'guided', 'freeflow', 'roleplay'].map(mode => (
                    <button 
                      key={mode} onClick={() => handleFilterChange(mode)}
                      className="w-full text-left px-3 py-1.5 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] flex items-center justify-between transition-colors capitalize"
                    >
                      {mode} {activeMode === mode && <Check size={14} className="text-[var(--chart-cyan)]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative flex-1" ref={sortRef}>
              <button 
                onClick={() => setIsSortOpen(!isSortOpen)}
                className={`w-full flex items-center justify-center gap-2 px-2 py-1.5 text-xs font-medium border rounded transition-colors ${sortOption !== 'newest' ? 'bg-[var(--bg-active)] text-[var(--text-primary)] border-[var(--border-strong)]' : 'bg-[var(--bg-card-hover)] text-[var(--text-muted)] border-[var(--border-color)] hover:bg-[var(--bg-secondary)]'}`}
              >
                <SlidersHorizontal size={12} />
                Sort
              </button>
              
              {isSortOpen && (
                <div className="absolute top-full right-0 mt-1.5 w-48 bg-[var(--bg-card-hover)] border border-[var(--border-color)] rounded-lg shadow-xl z-20 py-2">
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-[var(--text-muted-dark)] uppercase tracking-wider">Sort By</div>
                  {[{k:'newest', l:'Newest'}, {k:'oldest', l:'Oldest'}, {k:'score_high', l:'Score: High to Low'}, {k:'score_low', l:'Score: Low to High'}].map(opt => (
                    <button 
                      key={opt.k} onClick={() => handleSortChange(opt.k)}
                      className="w-full text-left px-3 py-1.5 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] flex items-center justify-between transition-colors"
                    >
                      {opt.l} {sortOption === opt.k && <Check size={14} className="text-[var(--chart-cyan)]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
             <div className="p-8 text-center text-xs text-[var(--text-muted)] animate-pulse font-mono">Loading sessions...</div>
          ) : filteredSessions.map(session => {
            const dateObj = new Date(session.created_at);
            const started = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return (
            <div 
              key={session.id} 
              onClick={() => { setActiveSession(session); setShowMobileDetail(true); }}
              className={`p-4 border-b border-[var(--border-color)] cursor-pointer transition-colors ${activeSession?.id === session.id ? 'bg-[var(--bg-secondary)]/60 border-l-2 border-l-[var(--chart-cyan)]' : 'hover:bg-[var(--bg-secondary)]/30 border-l-2 border-l-transparent'}`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-semibold text-sm text-[var(--text-primary)]">{session.candidate_name || "Unknown"}</span>
                <span className={`text-[11px] font-bold ${session.overall_score >= 8 ? 'text-emerald-500' : session.overall_score >= 5 ? 'text-yellow-500' : 'text-rose-500'}`}>{session.overall_score ? session.overall_score.toFixed(1) : "0"} / 10</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] mb-2">
                <span className="text-[var(--chart-cyan)] capitalize">{session.interview_mode || "guided"}</span>
                <span>.</span>
                <span>{started}</span>
              </div>
              <div className="flex gap-2 mt-2">
                {session.flag === 'Clean' ? (
                  <span className="bg-[var(--bg-secondary)] text-[var(--text-muted)] px-1.5 py-0.5 rounded text-[9px] font-medium tracking-wide">CLEAN</span>
                ) : session.flag === 'Hallucination' ? (
                  <span className="bg-[var(--chart-purple)]/20 text-[var(--chart-purple)] px-1.5 py-0.5 rounded text-[9px] font-medium tracking-wide">HALLUCINATION</span>
                ) : session.flag === 'Silence' ? (
                  <span className="bg-[var(--chart-orange)]/20 text-[var(--chart-orange)] px-1.5 py-0.5 rounded text-[9px] font-medium tracking-wide uppercase">SILENCE</span>
                ) : (
                  <span className="bg-[#ef4444]/20 text-[#ef4444] px-1.5 py-0.5 rounded text-[9px] font-medium tracking-wide uppercase">{session.flag || "UNKNOWN"}</span>
                )}
                <span className="bg-[var(--bg-secondary)] text-[var(--text-muted)] px-1.5 py-0.5 rounded text-[9px] font-medium tracking-wide">
                   {session.duration_secs ? Math.round(session.duration_secs/60) + ' mins' : '0 mins'}
                </span>
              </div>
            </div>
          )})}
          {!loading && filteredSessions.length === 0 && (
            <div className="p-8 text-center text-xs text-[var(--text-muted-dark)]">No sessions match your filters.</div>
          )}
        </div>
      </div>

      {/* Right Pane - Detail View */}
      <div className={`flex-1 border border-[var(--border-color)] bg-[var(--bg-card)] rounded-lg shadow-sm flex-col ${showMobileDetail ? "flex" : "hidden lg:flex"}`}>
        {activeSession ? (
          <>
        {/* Detail Header */}
        <div className="p-6 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-card)]">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] mb-1">{activeSession.candidate_name || "Unknown"}</h1>
            <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
              <span className="font-mono text-[var(--text-muted-dark)]">{activeSession.id.substring(0,14)}...</span>
              <span>.</span>
              <span className="text-[var(--chart-cyan)] capitalize">{activeSession.interview_mode || "guided"}</span>
              <span>.</span>
              <span>{activeSession.duration_secs ? Math.round(activeSession.duration_secs/60) + ' mins' : '0 mins'}</span>
            </div>
          </div>
          <div className="flex flex-col items-end shrink-0 max-w-[160px] sm:max-w-none">
            <div className={`text-4xl font-bold tracking-tight ${activeSession.overall_score >= 8 ? 'text-emerald-500' : activeSession.overall_score >= 5 ? 'text-yellow-500' : 'text-rose-500'}`}>
              {activeSession.overall_score ? activeSession.overall_score.toFixed(1) : "0.0"}
            </div>
            <div className="text-[10px] text-[var(--text-muted-dark)] uppercase tracking-widest font-semibold mt-1 mb-3">Final Score</div>
            <button onClick={() => router.push('/transcripts?id=' + activeSession.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--chart-cyan)]/10 hover:bg-[var(--chart-cyan)]/20 text-[var(--chart-cyan)] rounded-md text-xs font-semibold transition-colors border border-[var(--chart-cyan)]/20 whitespace-nowrap">
              <FileText size={14} /> View Transcript
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar">
          
          <div className="bg-[var(--bg-card-hover)] border border-[var(--border-strong)] rounded-lg p-5">
            <h3 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2 flex items-center gap-2">
              <Lightbulb size={14} className="text-emerald-500" /> Overall Agent Insight
            </h3>
            <p className="text-sm text-[var(--text-primary)] leading-relaxed">
              {activeSession.overall_insight || "No overall insight available for this session."}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><div className="bg-[var(--bg-card-hover)] rounded-lg border border-[var(--border-color)] flex flex-col h-full"><div className="p-4 border-b border-[var(--border-color)] text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-2 shrink-0"><Activity size={14} /> Evaluation Matrix
              </div>
              <div className="w-full h-[440px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="78%" margin={{ top: 35, right: 55, bottom: 35, left: 55 }} data={getRadarData(activeSession)}>
                    <PolarGrid stroke="var(--border-strong)" />
                    <PolarAngleAxis dataKey="subject" tick={<CustomTick />} />
                    <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                    <Radar name="Score" dataKey="A" stroke="var(--chart-cyan)" fill="var(--chart-cyan)" fillOpacity={0.25} strokeWidth={2.5} dot={{ r: 4, fill: "var(--chart-cyan)" }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="bg-[var(--bg-card-hover)] rounded-lg border border-[var(--border-color)] flex flex-col h-[480px]"><div className="p-4 border-b border-[var(--border-color)] text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-2 shrink-0"><SlidersHorizontal size={14} /> Full Rubric Breakdown</div><div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto custom-scrollbar">
              
              {getRadarData(activeSession).map((r, i) => (
                <div key={i} className="bg-[var(--bg-card-hover)] rounded border border-[var(--border-color)] p-3 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[var(--bg-active)] rounded-md text-[var(--text-primary)]">
                      {r.subject === 'Latency' ? <Clock size={16} /> :
                       r.subject === 'Conversational Flow' ? <MessageSquare size={16} /> :
                       r.subject === 'Interruption' ? <Zap size={16} /> :
                       r.subject === 'Context' ? <Layers size={16} /> :
                       <ShieldAlert size={16} />}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-[var(--text-primary)]">{r.subject} Score</div>
                    </div>
                  </div>
                  <div className="font-mono font-medium text-[var(--chart-cyan)]">{r.A}/10</div>
                </div>
              ))}
            </div>
          </div>

          </div>
          <div className="bg-[var(--bg-card-hover)] rounded-lg border border-[var(--border-color)] p-6 mt-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <AlertTriangle size={16} className="text-yellow-500" /> Flagged Issues & Insights
            </h3>
            
            {getDeductions(activeSession).length > 0 ? (
              <div className="flex flex-col gap-4">
                {getDeductions(activeSession).map((deduction, i) => (
                  <div key={i} className="flex flex-col gap-3 p-4 bg-[var(--bg-secondary)]/40 border border-[var(--border-strong)] rounded-lg">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-strong)] pb-2">
                      <div className="flex items-center gap-3">
                        {deduction.turn_number ? (
                          <button
                            onClick={() => router.push(`/transcripts?id=${activeSession.id}&turn=${deduction.turn_number}`)}
                            className="font-mono text-xs font-bold text-[var(--chart-cyan)] bg-[var(--chart-cyan)]/10 hover:bg-[var(--chart-cyan)]/25 px-2.5 py-1 rounded-md border border-[var(--chart-cyan)]/20 hover:border-[var(--chart-cyan)]/50 transition-all cursor-pointer underline-offset-2 hover:underline"
                            title="Jump to transcript"
                          >
                            Turn {deduction.turn_number} ->
                          </button>
                        ) : (
                          <span className="font-mono text-xs font-bold text-[var(--chart-cyan)] bg-[var(--chart-cyan)]/10 px-2.5 py-1 rounded-md">{deduction.time || "General"}</span>
                        )}
                        <span className="text-sm font-semibold text-[var(--text-primary)]">{deduction.type}</span>
                      </div>
                      {deduction.metric && (
                        <span className="text-[11px] font-mono font-medium text-[var(--text-muted)] bg-[var(--bg-card)] border border-[var(--border-strong)] px-2.5 py-1 rounded-md shadow-sm">
                          {deduction.metric}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-[var(--text-primary)] pl-1 leading-relaxed">{deduction.reason}</p>
                    
                    {deduction.insight && (
                      <div className="flex gap-3 p-3.5 bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-md text-xs mt-1">
                        <Lightbulb size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-[var(--text-primary)] mb-1.5 block uppercase tracking-wider text-[10px]">Actionable Insight</span>
                          <span className="text-[var(--text-muted)] leading-relaxed">{deduction.insight}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-[var(--text-muted-dark)] py-8 text-center border border-dashed border-[var(--border-strong)] rounded-md bg-[var(--bg-secondary)]/20">
                No flagged issues detected. The voice agent performed perfectly!
              </div>
            )}
          </div>

          {/* Section A: Turn-by-Turn Metrics */}
          <div className="bg-[var(--bg-card-hover)] rounded-lg border border-[var(--border-color)] mt-2">
            <button onClick={() => setShowTurns(v => !v)} className="w-full flex items-center justify-between p-4 border-b border-[var(--border-color)] text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider hover:bg-[var(--bg-active)] transition-colors">
              <span className="flex items-center gap-2"><Clock size={14} /> Turn-by-Turn Metrics ({turnMetrics.length} turns)</span>
              {showTurns ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showTurns && (
              <div className="overflow-x-auto">
                {loadingMetrics ? (
                  <div className="text-xs text-[var(--text-muted)] p-6 text-center">Loading metrics...</div>
                ) : turnMetrics.length === 0 ? (
                  <div className="text-xs text-[var(--text-muted-dark)] p-6 text-center">No turn metrics for this session.</div>
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border-color)]">
                        <th className="text-left py-2 px-3">Turn</th>
                        <th className="text-right py-2 px-3">STT (ms)</th>
                        <th className="text-right py-2 px-3">LLM TTFT (ms)</th>
                        <th className="text-right py-2 px-3">TTS (ms)</th>
                        <th className="text-right py-2 px-3">Total (ms)</th>
                        <th className="text-center py-2 px-3">Barge-in</th>
                      </tr>
                    </thead>
                                        <tbody>
                      {turnMetrics.map((t, i) => {
                        const tot = (t.stt_latency_ms ?? 0) + (t.llm_ttft_ms ?? 0) + (t.tts_latency_ms ?? 0);
                        const baseStyle = "py-3 px-3 text-right font-mono text-[var(--text-muted)]";
                        const getBarColor = (ms) => ms > 3000 ? 'bg-rose-500' : ms > 2000 ? 'bg-yellow-500' : 'bg-[var(--chart-cyan)]';
                        const barWidth = Math.min((tot / 4000) * 100, 100);
                        
                        return (
                          <tr key={i} className={t.barge_in ? 'border-b border-[var(--border-color)]/50 bg-orange-500/5' : 'border-b border-[var(--border-color)]/50 hover:bg-[var(--bg-active)] transition-colors'}>
                            <td className="py-3 px-3 font-mono text-[var(--text-primary)] font-medium">
                                <button
                                  onClick={() => router.push(`/transcripts?id=${activeSession.id}&turn=${t.turn_index}`)}
                                  className="font-mono text-xs font-bold text-[var(--chart-cyan)] bg-[var(--chart-cyan)]/10 hover:bg-[var(--chart-cyan)]/25 px-2.5 py-1 rounded-md border border-[var(--chart-cyan)]/20 hover:border-[var(--chart-cyan)]/50 transition-all cursor-pointer underline-offset-2 hover:underline"
                                  title="Jump to transcript"
                                >
                                  {t.turn_index} ↗
                                </button>
                              </td>
                            <td className={baseStyle}>{t.stt_latency_ms ?? '-'}</td>
                            <td className={baseStyle}>{t.llm_ttft_ms ?? '-'}</td>
                            <td className={baseStyle}>{t.tts_latency_ms ?? '-'}</td>
                            <td className="py-3 px-3">
                              <div className="flex flex-col items-end gap-1.5 w-full">
                                <span className="font-mono font-medium text-[var(--text-primary)] leading-none">{tot || '-'}</span>
                                {tot > 0 && (
                                  <div className="w-[70px] h-1.5 bg-[var(--bg-card)] rounded-full overflow-hidden border border-[var(--border-color)]">
                                    <div className={`h-full rounded-full opacity-90 ${getBarColor(tot)}`} style={{ width: `${barWidth}%` }} />
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center">{t.barge_in ? <span className="text-orange-400 font-bold">Yes</span> : <span className="text-[var(--text-muted)]">-</span>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>

          {/* Section B: Tool Call Timeline */}
          <div className="bg-[var(--bg-card-hover)] rounded-lg border border-[var(--border-color)] mt-2 mb-6">
            <button onClick={() => setShowTools(v => !v)} className="w-full flex items-center justify-between p-4 border-b border-[var(--border-color)] text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider hover:bg-[var(--bg-active)] transition-colors">
              <span className="flex items-center gap-2"><Wrench size={14} /> Tool Call Timeline ({toolCalls.length} calls)</span>
              {showTools ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showTools && (
              <div className="overflow-x-auto">
                {loadingMetrics ? (
                  <div className="text-xs text-[var(--text-muted)] p-6 text-center">Loading tool calls...</div>
                ) : toolCalls.length === 0 ? (
                  <div className="text-xs text-[var(--text-muted-dark)] p-6 text-center">No tool calls recorded for this session.</div>
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border-color)]">
                        <th className="text-left py-2 px-3">Turn</th>
                        <th className="text-left py-2 px-3">Tool</th>
                        <th className="text-left py-2 px-3 w-3/5">Result Preview</th>
                        
                      </tr>
                    </thead>
                    <tbody>
                      {toolCalls.map((t, i) => {
                                                  let resultStr = String(t.result ?? '-');
                          // Clean up Python tuple/array stringification and internal tags
                          resultStr = resultStr.replace(/^\[.*?,\s*['"]/, '').replace(/['"]\]$/, '');
                          resultStr = resultStr.replace(/\[INTERNAL\]/g, '').replace(/\[Skill \d+ of \d+\]/g, '');
                          resultStr = resultStr.replace(/\\n/g, ' ').replace(/\n/g, ' ').trim();
                          if (resultStr.includes(' (')) {
                            resultStr = resultStr.split(' (')[0].trim();
                          }
                          
                          return (
                            <React.Fragment key={i}>
                              <tr className="border-b border-[var(--border-color)]/50 hover:bg-[var(--bg-active)] transition-colors">
                                <td className="py-3 px-3 font-mono text-[var(--text-primary)]">
                                  <button
                                    onClick={() => router.push(`/transcripts?id=${activeSession.id}&turn=${t.turn_index}`)}
                                    className="font-mono text-xs font-bold text-[var(--chart-cyan)] bg-[var(--chart-cyan)]/10 hover:bg-[var(--chart-cyan)]/25 px-2.5 py-1 rounded-md border border-[var(--chart-cyan)]/20 hover:border-[var(--chart-cyan)]/50 transition-all cursor-pointer underline-offset-2 hover:underline"
                                    title="Jump to transcript"
                                  >
                                    {t.turn_index} ↗
                                  </button>
                                </td>
                                <td className="py-3 px-3 truncate"><code className="bg-[var(--chart-cyan)]/10 text-[var(--chart-cyan)] px-2 py-1.5 rounded-md text-[11px] font-mono">{t.tool_name}</code></td>
                                <td className="py-3 px-3 text-[var(--text-muted)] truncate font-mono text-[11px]">{resultStr}</td>
                              </tr>
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                  </table>
                )}
              </div>
            )}
          </div>

        </div>
        </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-sm text-[var(--text-muted)]">
            {loading ? "Loading scorecards..." : "Select a session to view its scorecard."}
          </div>
        )}
      </div>
      
    </div>
  );
}

export default function ScorecardsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-[var(--text-primary)]">Loading...</div>}>
      <ScorecardsContent />
    </Suspense>
  );
}





