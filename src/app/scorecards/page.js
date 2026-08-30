
"use client";
import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, FileText, ShieldAlert, Zap, MessageSquare, Clock, Activity, AlertTriangle, Lightbulb, Layers, Filter, SlidersHorizontal, Check, ChevronLeft } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

const mockSessions = [
  { 
    id: 'audit_1f8a6a', candidate: 'Aniruth R', mode: 'Roleplay', started: '2 hours ago', duration: '12 mins', 
    score: 8.5, flag: 'Clean', latency: '850ms', scoreNum: 8.5,
    radar: [ { subject: 'Latency', A: 9 }, { subject: 'Conversational Flow', A: 8 }, { subject: 'Interruption', A: 9 }, { subject: 'Context', A: 8 }, { subject: 'Guardrails', A: 10 } ],
    overallInsight: 'Agent performed exceptionally well, maintaining a highly professional tone. Only minor latency spikes detected during complex multi-intent questions, but conversational flow remained largely uninterrupted.',
    deductions: [ 
      { 
        time: '04:12', 
        type: 'Latency Spike',
        reason: 'Slight delay in response handling when processing a complex multi-intent query.',
        insight: 'The underlying LLM (gemini-1.5-flash) experienced high TTFT. Pre-fetching or optimizing the prompt could reduce this bottleneck.',
        metric: 'Actual: 1450ms | Target: <1000ms'
      } 
    ]
  },
  { 
    id: 'audit_8332eb', candidate: 'John Smith', mode: 'Freeflow', started: '3 hours ago', duration: '15 mins', 
    score: 4.2, flag: 'Hallucination', latency: '1.2s', scoreNum: 4.2,
    radar: [ { subject: 'Latency', A: 6 }, { subject: 'Conversational Flow', A: 5 }, { subject: 'Interruption', A: 4 }, { subject: 'Context', A: 7 }, { subject: 'Guardrails', A: 2 } ],
    overallInsight: 'Poor overall performance. The agent hallucinated critical company policies and failed to handle user interruptions. Immediate recalibration of the RAG context and VAD thresholds is recommended.',
    deductions: [ 
      { 
        time: '02:45', 
        type: 'Hallucination',
        reason: 'Agent invented a non-existent company policy regarding refund windows.',
        insight: 'The agent failed to ground its response in the provided RAG context. Recommend tightening the system prompt temperature.',
        metric: 'Confidence Score: 89% (False Positive)'
      },
      { 
        time: '11:20', 
        type: 'Interruption Failure',
        reason: 'Failed to handle dual-intent interruption gracefully.',
        insight: 'The VAD (Voice Activity Detection) threshold is too high, causing the agent to ignore user interruptions under 50dB.',
        metric: 'Interruption Latency: 2.1s'
      }
    ]
  },
  { 
    id: 'audit_7npjfb', candidate: 'Michael Brown', mode: 'Guided', started: '5 hours ago', duration: '9 mins', 
    score: 9.2, flag: 'Clean', latency: '890ms', scoreNum: 9.2,
    radar: [ { subject: 'Latency', A: 9 }, { subject: 'Conversational Flow', A: 10 }, { subject: 'Interruption', A: 9 }, { subject: 'Context', A: 9 }, { subject: 'Guardrails', A: 10 } ],
    overallInsight: 'Flawless execution. The agent adhered strictly to the guided path, handled all safety checks perfectly, and maintained near-zero conversational latency.',
    deductions: []
  },
  { 
    id: 'audit_baa59d', candidate: 'Sarah Williams', mode: 'Freeflow', started: '5 hours ago', duration: '2 mins', 
    score: 1.0, flag: 'Silence', latency: '---', scoreNum: 1.0,
    radar: [ { subject: 'Latency', A: 1 }, { subject: 'Conversational Flow', A: 1 }, { subject: 'Interruption', A: 1 }, { subject: 'Context', A: 1 }, { subject: 'Guardrails', A: 1 } ],
    overallInsight: 'Critical failure. The agent crashed and failed to respond after the first conversational turn. Needs immediate engineering review.',
    deductions: [ 
      { 
        time: '00:45', 
        type: 'Pipeline Silence',
        reason: 'Agent stopped generating audio completely after the first turn.',
        insight: 'Cartesia TTS socket disconnected unexpectedly. Ensure the application has robust WebSocket reconnection logic.',
        metric: 'Silence Duration: >30s'
      } 
    ]
  }
];

function ScorecardsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const idParam = searchParams.get('id');
  const [showMobileDetail, setShowMobileDetail] = useState(false);
    const [activeSession, setActiveSession] = useState(() => {
    return mockSessions.find(s => s.id === idParam) || mockSessions[0];
  });
  
  useEffect(() => {
    if (idParam) {
      const found = mockSessions.find(s => s.id === idParam);
      if (found) setActiveSession(found);
    }
  }, [idParam]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState({ Roleplay: false, Guided: false, Freeflow: false });
  const filterRef = useRef(null);

  const [isSortOpen, setIsSortOpen] = useState(false);
  const [sortOption, setSortOption] = useState('Newest');
  const sortRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (filterRef.current && !filterRef.current.contains(event.target)) setIsFilterOpen(false);
      if (sortRef.current && !sortRef.current.contains(event.target)) setIsSortOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleFilter = (mode) => {
    setActiveFilters(prev => ({ ...prev, [mode]: !prev[mode] }));
  };
  
  const hasActiveFilters = Object.values(activeFilters).some(Boolean);

  let filteredSessions = mockSessions.filter(session => {
    const matchesSearch = session.candidate.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          session.mode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          session.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = hasActiveFilters ? activeFilters[session.mode] : true;
    return matchesSearch && matchesFilter;
  });

  if (sortOption === 'Score: High to Low') {
    filteredSessions.sort((a, b) => b.scoreNum - a.scoreNum);
  } else if (sortOption === 'Score: Low to High') {
    filteredSessions.sort((a, b) => a.scoreNum - b.scoreNum);
  }

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
                className={`w-full flex items-center justify-center gap-2 px-2 py-1.5 text-xs font-medium border rounded transition-colors ${hasActiveFilters ? 'bg-[var(--bg-active)] text-[var(--text-primary)] border-[var(--border-strong)]' : 'bg-[var(--bg-card-hover)] text-[var(--text-primary)] border-[var(--border-color)] hover:bg-[var(--bg-secondary)]'}`}
              >
                <Filter size={12} />
                Filters {hasActiveFilters && <span className="bg-[var(--chart-cyan)]/20 text-[var(--chart-cyan)] px-1.5 rounded-full text-[9px] ml-0.5">{Object.values(activeFilters).filter(Boolean).length}</span>}
              </button>
              
              {isFilterOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-48 bg-[var(--bg-card-hover)] border border-[var(--border-color)] rounded-lg shadow-xl z-20 py-2">
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-[var(--text-muted-dark)] uppercase tracking-wider">Interview Mode</div>
                  {['Roleplay', 'Guided', 'Freeflow'].map(mode => (
                    <button 
                      key={mode} onClick={() => toggleFilter(mode)}
                      className="w-full text-left px-3 py-1.5 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] flex items-center justify-between transition-colors"
                    >
                      {mode} {activeFilters[mode] && <Check size={14} className="text-[var(--chart-cyan)]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative flex-1" ref={sortRef}>
              <button 
                onClick={() => setIsSortOpen(!isSortOpen)}
                className={`w-full flex items-center justify-center gap-2 px-2 py-1.5 text-xs font-medium border rounded transition-colors ${sortOption !== 'Newest' ? 'bg-[var(--bg-active)] text-[var(--text-primary)] border-[var(--border-strong)]' : 'bg-[var(--bg-card-hover)] text-[var(--text-muted)] border-[var(--border-color)] hover:bg-[var(--bg-secondary)]'}`}
              >
                <SlidersHorizontal size={12} />
                Sort
              </button>
              
              {isSortOpen && (
                <div className="absolute top-full right-0 mt-1.5 w-48 bg-[var(--bg-card-hover)] border border-[var(--border-color)] rounded-lg shadow-xl z-20 py-2">
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-[var(--text-muted-dark)] uppercase tracking-wider">Sort By</div>
                  {['Newest', 'Score: High to Low', 'Score: Low to High'].map(option => (
                    <button 
                      key={option} onClick={() => { setSortOption(option); setIsSortOpen(false); }}
                      className="w-full text-left px-3 py-1.5 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] flex items-center justify-between transition-colors"
                    >
                      {option} {sortOption === option && <Check size={14} className="text-[var(--chart-cyan)]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredSessions.map(session => (
            <div 
              key={session.id} 
              onClick={() => { setActiveSession(session); setShowMobileDetail(true); }}
              className={`p-4 border-b border-[var(--border-color)] cursor-pointer transition-colors ${activeSession.id === session.id ? 'bg-[var(--bg-secondary)]/60 border-l-2 border-l-[var(--chart-cyan)]' : 'hover:bg-[var(--bg-secondary)]/30 border-l-2 border-l-transparent'}`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-semibold text-sm text-[var(--text-primary)]">{session.candidate}</span>
                <span className={`text-[11px] font-bold ${session.score >= 8 ? 'text-emerald-500' : session.score >= 5 ? 'text-yellow-500' : 'text-rose-500'}`}>{session.score} / 10</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] mb-2">
                <span className="text-[var(--chart-cyan)]">{session.mode}</span>
                <span>.</span>
                <span>{session.started}</span>
              </div>
              <div className="flex gap-2 mt-2">
                {session.flag === 'Clean' ? (
                  <span className="bg-[var(--bg-secondary)] text-[var(--text-muted)] px-1.5 py-0.5 rounded text-[9px] font-medium tracking-wide">CLEAN</span>
                ) : session.flag === 'Hallucination' ? (
                  <span className="bg-[var(--chart-purple)]/20 text-[var(--chart-purple)] px-1.5 py-0.5 rounded text-[9px] font-medium tracking-wide">HALLUCINATION</span>
                ) : (
                  <span className="bg-[var(--chart-orange)]/20 text-[var(--chart-orange)] px-1.5 py-0.5 rounded text-[9px] font-medium tracking-wide uppercase">{session.flag}</span>
                )}
                <span className="bg-[var(--bg-secondary)] text-[var(--text-muted)] px-1.5 py-0.5 rounded text-[9px] font-medium tracking-wide">{session.latency}</span>
              </div>
            </div>
          ))}
          {filteredSessions.length === 0 && (
            <div className="p-8 text-center text-xs text-[var(--text-muted-dark)]">No sessions match your filters.</div>
          )}
        </div>
      </div>

      {/* Right Pane - Detail View */}
      <div className={`flex-1 border border-[var(--border-color)] bg-[var(--bg-card)] rounded-lg shadow-sm flex-col ${showMobileDetail ? "flex" : "hidden lg:flex"}`}>
        {/* Detail Header */}
        <div className="p-6 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-card)]">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] mb-1">{activeSession.candidate}</h1>
            <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
              <span className="font-mono text-[var(--text-muted-dark)]">{activeSession.id}</span>
              <span>.</span>
              <span className="text-[var(--chart-cyan)]">{activeSession.mode}</span>
              <span>.</span>
              <span>{activeSession.duration}</span>
            </div>
          </div>
          <div className="flex flex-col items-end shrink-0 max-w-[160px] sm:max-w-none">
            <div className={`text-4xl font-bold tracking-tight ${activeSession.score >= 8 ? 'text-emerald-500' : activeSession.score >= 5 ? 'text-yellow-500' : 'text-rose-500'}`}>
              {activeSession.score}
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
              {activeSession.overallInsight}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-auto lg:h-[400px]">
            <div className="bg-[var(--bg-card-hover)] rounded-lg border border-[var(--border-color)] flex flex-col h-full">
              <div className="p-4 border-b border-[var(--border-color)] text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-2">
                <Activity size={14} /> Evaluation Matrix
              </div>
              <div className="flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={activeSession.radar}>
                    <PolarGrid stroke="var(--border-strong)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                    <Radar name="Score" dataKey="A" stroke="var(--chart-cyan)" fill="var(--chart-cyan)" fillOpacity={0.2} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar">
              <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">Full Rubric Breakdown</div>
              
              <div className="bg-[var(--bg-card-hover)] rounded border border-[var(--border-color)] p-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[var(--bg-active)] rounded-md text-[var(--text-primary)]"><Clock size={16} /></div>
                  <div>
                    <div className="text-sm font-medium text-[var(--text-primary)]">Latency Score</div>
                    <div className="text-[11px] text-[var(--text-muted)]">Avg Response Time</div>
                  </div>
                </div>
                <div className="font-mono font-medium text-[var(--chart-cyan)]">{activeSession.radar.find(r => r.subject === 'Latency').A}/10</div>
              </div>

              <div className="bg-[var(--bg-card-hover)] rounded border border-[var(--border-color)] p-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[var(--bg-active)] rounded-md text-[var(--text-primary)]"><MessageSquare size={16} /></div>
                  <div>
                    <div className="text-sm font-medium text-[var(--text-primary)]">Conversational Flow</div>
                    <div className="text-[11px] text-[var(--text-muted)]">Turn-taking & coherence</div>
                  </div>
                </div>
                <div className="font-mono font-medium text-[var(--chart-cyan)]">{activeSession.radar.find(r => r.subject === 'Conversational Flow').A}/10</div>
              </div>

              <div className="bg-[var(--bg-card-hover)] rounded border border-[var(--border-color)] p-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[var(--bg-active)] rounded-md text-[var(--text-primary)]"><Zap size={16} /></div>
                  <div>
                    <div className="text-sm font-medium text-[var(--text-primary)]">Interruption</div>
                    <div className="text-[11px] text-[var(--text-muted)]">Handling user cut-offs</div>
                  </div>
                </div>
                <div className="font-mono font-medium text-[var(--chart-cyan)]">{activeSession.radar.find(r => r.subject === 'Interruption').A}/10</div>
              </div>

              <div className="bg-[var(--bg-card-hover)] rounded border border-[var(--border-color)] p-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[var(--bg-active)] rounded-md text-[var(--text-primary)]"><Layers size={16} /></div>
                  <div>
                    <div className="text-sm font-medium text-[var(--text-primary)]">Context Retention</div>
                    <div className="text-[11px] text-[var(--text-muted)]">Memory & topic adherence</div>
                  </div>
                </div>
                <div className="font-mono font-medium text-[var(--chart-cyan)]">{activeSession.radar.find(r => r.subject === 'Context').A}/10</div>
              </div>

              <div className="bg-[var(--bg-card-hover)] rounded border border-[var(--border-color)] p-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[var(--bg-active)] rounded-md text-[var(--text-primary)]"><ShieldAlert size={16} /></div>
                  <div>
                    <div className="text-sm font-medium text-[var(--text-primary)]">Guardrails</div>
                    <div className="text-[11px] text-[var(--text-muted)]">Hallucination & Safety check</div>
                  </div>
                </div>
                <div className="font-mono font-medium text-[var(--chart-cyan)]">{activeSession.radar.find(r => r.subject === 'Guardrails').A}/10</div>
              </div>

            </div>
          </div>

          <div className="bg-[var(--bg-card-hover)] rounded-lg border border-[var(--border-color)] p-6 mt-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <AlertTriangle size={16} className="text-yellow-500" /> Flagged Issues & Insights
            </h3>
            
            {activeSession.deductions.length > 0 ? (
              <div className="flex flex-col gap-4">
                {activeSession.deductions.map((deduction, i) => (
                  <div key={i} className="flex flex-col gap-3 p-4 bg-[var(--bg-secondary)]/40 border border-[var(--border-strong)] rounded-lg">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-strong)] pb-2">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-[var(--chart-cyan)] bg-[var(--chart-cyan)]/10 px-2.5 py-1 rounded-md">{deduction.time}</span>
                        <span className="text-sm font-semibold text-[var(--text-primary)]">{deduction.type}</span>
                      </div>
                      <span className="text-[11px] font-mono font-medium text-[var(--text-muted)] bg-[var(--bg-card)] border border-[var(--border-strong)] px-2.5 py-1 rounded-md shadow-sm">
                        {deduction.metric}
                      </span>
                    </div>
                    
                    <p className="text-sm text-[var(--text-primary)] pl-1 leading-relaxed">{deduction.reason}</p>
                    
                    <div className="flex gap-3 p-3.5 bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-md text-xs mt-1">
                      <Lightbulb size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-[var(--text-primary)] mb-1.5 block uppercase tracking-wider text-[10px]">Actionable Insight</span>
                        <span className="text-[var(--text-muted)] leading-relaxed">{deduction.insight}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-[var(--text-muted-dark)] py-8 text-center border border-dashed border-[var(--border-strong)] rounded-md bg-[var(--bg-secondary)]/20">
                No flagged issues detected. The voice agent performed perfectly!
              </div>
            )}
          </div>

        </div>
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
