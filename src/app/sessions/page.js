"use client";
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { Search, Filter, SlidersHorizontal, HelpCircle, Check } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';

const auditData = Array.from({ length: 40 }).map(() => ({ val: 150 + Math.random() * 50 }));
const scoreData = Array.from({ length: 40 }).map(() => ({ val: 8 + Math.random() * 2 }));

function CardTitle({ title }) {
  return (
    <div className="flex items-center gap-1.5 text-[var(--text-muted)] text-[11px] font-semibold uppercase tracking-widest mb-4">
      {title}
      <HelpCircle size={12} className="text-[var(--text-muted-dark)]" />
    </div>
  );
}

export default function SessionsPage() {
  const router = useRouter();
  const { timeframe, autoRefresh } = useSettings();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
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
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchSessionsData = () => {
    let days = 'all';
    if (timeframe === 'Past 24 hours') days = '1';
    else if (timeframe === 'Past 5 days') days = '5';
    else if (timeframe === 'Past 7 days') days = '7';
    else if (timeframe === 'Past 30 days') days = '30';

    fetch(`/api/sessions?search=${encodeURIComponent(debouncedSearch)}&mode=${activeMode}&sort=${sortOption}&days=${days}`)
      .then(res => res.json())
      .then(data => {
        if (!data.error) setSessions(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    setLoading(true);
    fetchSessionsData();
  }, [debouncedSearch, activeMode, sortOption, timeframe]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchSessionsData, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, debouncedSearch, activeMode, sortOption, timeframe]);

  const handleSortChange = (opt) => {
    setSortOption(opt);
    setIsSortOpen(false);
  };

  const handleFilterChange = (mode) => {
    setActiveMode(mode);
    setIsFilterOpen(false);
  };

  const getSortLabel = () => {
    if (sortOption === 'newest') return 'Newest';
    if (sortOption === 'oldest') return 'Oldest';
    if (sortOption === 'score_high') return 'Score: High to Low';
    if (sortOption === 'score_low') return 'Score: Low to High';
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto pb-12 font-mono sm:font-sans h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div className="flex flex-col gap-1">
          <div className="text-xs text-[var(--text-muted)] font-medium tracking-wide uppercase">AI Interviews / Sessions</div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Sessions</h1>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-6 flex flex-col h-[260px]">
          <CardTitle title="Total Audits" />
          <div className="flex-1 flex flex-col items-center justify-center relative">
            <span className="text-[64px] font-medium text-[var(--chart-cyan)] tracking-tight mb-4">{sessions.length}</span>
            <div className="absolute bottom-0 w-full h-16">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={auditData}>
                  <Area type="linear" dataKey="val" stroke="var(--chart-cyan)" strokeWidth={1.5} fillOpacity={0.1} fill="var(--chart-cyan)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="absolute right-0 bottom-8 w-1.5 h-1.5 bg-[var(--chart-cyan)]"></div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-6 flex flex-col h-[260px]">
          <CardTitle title="Average Score" />
          <div className="flex-1 flex flex-col items-center justify-center relative">
            <span className="text-[64px] font-medium text-[var(--chart-cyan)] tracking-tight mb-4">
              {sessions.length > 0 ? (sessions.reduce((acc, curr) => acc + (curr.overall_score || 0), 0) / sessions.length).toFixed(1) : "0.0"}
            </span>
            <div className="absolute bottom-0 w-full h-16">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={scoreData}>
                  <Area type="linear" dataKey="val" stroke="var(--chart-cyan)" strokeWidth={1.5} fillOpacity={0.1} fill="var(--chart-cyan)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="absolute right-0 bottom-8 w-1.5 h-1.5 bg-[var(--chart-cyan)]"></div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="border border-[var(--border-color)] rounded-lg bg-[var(--bg-card)] flex flex-col flex-1 shadow-sm mt-2 min-h-[400px]">
        <div className="px-5 py-4 border-b border-[var(--border-color)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="font-semibold text-sm tracking-wide text-[var(--text-primary)]">Sessions</h2>
          <div className="flex flex-wrap items-center gap-2">
            
            <div className="relative" ref={filterRef}>
              <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium border rounded transition-colors ${activeMode !== 'all' ? 'bg-[var(--bg-active)] text-[var(--text-primary)] border-[var(--border-strong)]' : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-strong)] hover:bg-[var(--bg-active)]'}`}
              >
                <Filter size={14} />
                Filters {activeMode !== 'all' && <span className="bg-[var(--chart-cyan)]/20 text-[var(--chart-cyan)] px-1.5 rounded-full text-[10px] ml-1">1</span>}
              </button>
              
              {isFilterOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-[var(--bg-card-hover)] border border-[var(--border-color)] rounded-lg shadow-xl z-20 py-2">
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-[var(--text-muted-dark)] uppercase tracking-wider">Interview Mode</div>
                  
                  {['all', 'guided', 'freeflow', 'roleplay'].map(mode => (
                    <button 
                      key={mode} 
                      onClick={() => handleFilterChange(mode)}
                      className="w-full text-left px-3 py-2 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] flex items-center justify-between transition-colors capitalize"
                    >
                      {mode}
                      {activeMode === mode && <Check size={14} className="text-[var(--chart-cyan)]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative flex items-center">
              <Search size={14} className="absolute left-2.5 text-[var(--text-muted)]" />
              <input 
                type="text" 
                placeholder="Search candidates..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[var(--bg-card-hover)] border border-[var(--border-color)] rounded pl-8 pr-3 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted-dark)] focus:outline-none focus:border-[var(--border-strong)] w-48 transition-colors" 
              />
            </div>

            <div className="relative" ref={sortRef}>
              <button 
                onClick={() => setIsSortOpen(!isSortOpen)}
                className={`flex items-center justify-center px-2 py-1.5 text-xs font-medium border rounded transition-colors ${sortOption !== 'newest' ? 'bg-[var(--bg-active)] text-[var(--text-primary)] border-[var(--border-strong)]' : 'bg-[var(--bg-card-hover)] text-[var(--text-muted)] border-[var(--border-color)] hover:bg-[var(--bg-secondary)]'}`}
                title="Sort Sessions"
              >
                <SlidersHorizontal size={14} className="mr-1.5" />
                {getSortLabel()}
              </button>
              
              {isSortOpen && (
                <div className="absolute top-full left-0 md:left-auto md:right-0 mt-2 w-48 bg-[var(--bg-card-hover)] border border-[var(--border-color)] rounded-lg shadow-xl z-20 py-2">
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-[var(--text-muted-dark)] uppercase tracking-wider">Sort By</div>
                  
                  {[{k:'newest', l:'Newest'}, {k:'oldest', l:'Oldest'}, {k:'score_high', l:'Score: High to Low'}, {k:'score_low', l:'Score: Low to High'}].map(opt => (
                    <button 
                      key={opt.k} 
                      onClick={() => handleSortChange(opt.k)}
                      className="w-full text-left px-3 py-2 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] flex items-center justify-between transition-colors"
                    >
                      {opt.l}
                      {sortOption === opt.k && <Check size={14} className="text-[var(--chart-cyan)]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
          </div>
        </div>
        
        <div className="overflow-x-auto flex-1">
          {loading ? (
             <div className="flex items-center justify-center h-full min-h-[300px] text-[var(--text-muted)] animate-pulse font-mono">
               Fetching sessions...
             </div>
          ) : (
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="border-b border-[var(--border-color)] text-[var(--text-muted-dark)] uppercase tracking-wider font-semibold">
                <th className="px-5 py-3 font-semibold">Session ID</th>
                <th className="px-5 py-3 font-semibold">Candidate</th>
                <th className="px-5 py-3 font-semibold">Mode</th>
                <th className="px-5 py-3 font-semibold">Started</th>
                <th className="px-5 py-3 font-semibold">Duration</th>
                <th className="px-5 py-3 font-semibold">AI Score</th>
                <th className="px-5 py-3 font-semibold">Flags</th>
              </tr>
            </thead>
            <tbody className="text-[var(--text-muted)]">
              {sessions.length > 0 ? (
                sessions.map((session, i) => {
                  const dateObj = new Date(session.created_at);
                  const started = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  return (
                  <tr key={i} onClick={() => router.push('/scorecards?id=' + session.id)} className="border-b border-[var(--border-color)]/50 hover:bg-[var(--bg-secondary)]/30 transition-colors cursor-pointer">
                    <td className="px-5 py-3.5 font-mono text-[var(--text-primary)]">{session.id.substring(0,14)}...</td>
                    <td className="px-5 py-3.5">{session.candidate_name || "Unknown"}</td>
                    <td className="px-5 py-3.5 text-[var(--chart-cyan)] capitalize">{session.interview_mode || "guided"}</td>
                    <td className="px-5 py-3.5">{started}</td>
                    <td className="px-5 py-3.5">{session.duration_secs ? Math.round(session.duration_secs/60) + ' mins' : '0 mins'}</td>
                    <td className="px-5 py-3.5 font-mono text-[var(--text-primary)]">{session.overall_score ? session.overall_score.toFixed(1) + ' / 10' : 'N/A'}</td>
                    <td className="px-5 py-3.5">
                      {session.flag === 'Clean' ? (
                        <span className="bg-[var(--bg-secondary)] text-[var(--text-muted)] px-2 py-0.5 rounded text-[10px] font-medium tracking-wide">CLEAN</span>
                      ) : session.flag === 'Hallucination' ? (
                        <span className="bg-[var(--chart-purple)]/20 text-[var(--chart-purple)] px-2 py-0.5 rounded text-[10px] font-medium tracking-wide">HALLUCINATION</span>
                      ) : session.flag === 'Silence' ? (
                        <span className="bg-[var(--chart-orange)]/20 text-[var(--chart-orange)] px-2 py-0.5 rounded text-[10px] font-medium tracking-wide">SILENCE</span>
                      ) : (
                        <span className="bg-[#ef4444]/20 text-[#ef4444] px-2 py-0.5 rounded text-[10px] font-medium tracking-wide uppercase">{session.flag || 'UNKNOWN'}</span>
                      )}
                    </td>
                  </tr>
                )})
              ) : (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-[var(--text-muted-dark)]">No sessions match your search criteria.</td>
                </tr>
              )}
            </tbody>
          </table>
          )}
        </div>
        
        <div className="px-5 py-3 border-t border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--text-muted)]">
          <div>Showing {sessions.length > 0 ? 1 : 0} to {sessions.length} results</div>
          <div className="flex items-center gap-2">
            <button className="px-2.5 py-1 rounded border border-[var(--border-color)] bg-[var(--bg-card-hover)] hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-50" disabled>Previous</button>
            <button className="px-2.5 py-1 rounded border border-[var(--border-color)] bg-[var(--bg-card-hover)] hover:bg-[var(--bg-secondary)] transition-colors" disabled>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
