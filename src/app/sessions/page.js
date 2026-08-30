"use client";
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { Search, Filter, SlidersHorizontal, HelpCircle, Check, ArrowDown, ArrowUp } from 'lucide-react';

const mockSessions = [
  { id: 'audit_1f8a6a...', candidate: 'Aniruth R', mode: 'Roleplay', started: '2 hours ago', duration: '12 mins', score: '9 / 10', flag: 'Clean', latency: '850ms', scoreNum: 9 },
  { id: 'audit_2f5093...', candidate: 'Jane Doe', mode: 'Guided', started: '2 hours ago', duration: '8 mins', score: '8 / 10', flag: 'Clean', latency: '920ms', scoreNum: 8 },
  { id: 'audit_8332eb...', candidate: 'John Smith', mode: 'Freeflow', started: '3 hours ago', duration: '15 mins', score: '4 / 10', flag: 'Hallucination', latency: '1.2s', scoreNum: 4 },
  { id: 'audit_49257a...', candidate: 'Alice Johnson', mode: 'Roleplay', started: '3 hours ago', duration: '10 mins', score: '10 / 10', flag: 'Clean', latency: '780ms', scoreNum: 10 },
  { id: 'audit_7npjfb...', candidate: 'Michael Brown', mode: 'Guided', started: '5 hours ago', duration: '9 mins', score: '8 / 10', flag: 'Clean', latency: '890ms', scoreNum: 8 },
  { id: 'audit_baa59d...', candidate: 'Sarah Williams', mode: 'Freeflow', started: '5 hours ago', duration: '2 mins', score: '1 / 10', flag: 'Silence', latency: '---', scoreNum: 1 },
  { id: 'audit_7181d3...', candidate: 'David Lee', mode: 'Roleplay', started: '5 hours ago', duration: '16 mins', score: '9 / 10', flag: 'Clean', latency: '810ms', scoreNum: 9 },
];

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
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState({ Roleplay: false, Guided: false, Freeflow: false });
  const filterRef = useRef(null);

  // Sort State
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [sortOption, setSortOption] = useState('Newest');
  const sortRef = useRef(null);

  // Close dropdowns when clicking outside
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
    // Search check
    const matchesSearch = session.candidate.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          session.mode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          session.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filter check (if no filters active, show all)
    const matchesFilter = hasActiveFilters ? activeFilters[session.mode] : true;

    return matchesSearch && matchesFilter;
  });

  // Sort Logic
  if (sortOption === 'Score: High to Low') {
    filteredSessions.sort((a, b) => b.scoreNum - a.scoreNum);
  } else if (sortOption === 'Score: Low to High') {
    filteredSessions.sort((a, b) => a.scoreNum - b.scoreNum);
  }

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto pb-12 font-mono sm:font-sans h-full">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div className="flex flex-col gap-1">
          <div className="text-xs text-[var(--text-muted)] font-medium tracking-wide uppercase">AI Interviews / Sessions</div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Sessions</h1>
        </div>
        {/* Buttons moved to Global Header component */}
      </div>
      
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Total Audits */}
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-6 flex flex-col h-[260px]">
          <CardTitle title="Total Audits" />
          <div className="flex-1 flex flex-col items-center justify-center relative">
            <span className="text-[64px] font-medium text-[var(--chart-cyan)] tracking-tight mb-4">199</span>
            <div className="absolute bottom-0 w-full h-16">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={auditData}>
                  <Area type="linear" dataKey="val" stroke="var(--chart-cyan)" strokeWidth={1.5} fillOpacity={0.1} fill="var(--chart-cyan)" isAnimationActive={false} />
                  <Area type="step" dataKey="val" stroke="none" fill="none" dot={{ stroke: 'var(--chart-cyan)', fill: 'var(--chart-cyan)', r: 0, strokeWidth: 0 }} activeDot={false} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="absolute right-0 bottom-8 w-1.5 h-1.5 bg-[var(--chart-cyan)]"></div>
            </div>
          </div>
        </div>

        {/* Average Score */}
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-6 flex flex-col h-[260px]">
          <CardTitle title="Average Score" />
          <div className="flex-1 flex flex-col items-center justify-center relative">
            <span className="text-[64px] font-medium text-[var(--chart-cyan)] tracking-tight mb-4">8.4</span>
            <div className="absolute bottom-0 w-full h-16">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={scoreData}>
                  <Area type="linear" dataKey="val" stroke="var(--chart-cyan)" strokeWidth={1.5} fillOpacity={0.1} fill="var(--chart-cyan)" isAnimationActive={false} />
                  <Area type="step" dataKey="val" stroke="none" fill="none" dot={{ stroke: 'var(--chart-cyan)', fill: 'var(--chart-cyan)', r: 0, strokeWidth: 0 }} activeDot={false} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="absolute right-0 bottom-8 w-1.5 h-1.5 bg-[var(--chart-cyan)]"></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Sessions Table Section */}
      <div className="border border-[var(--border-color)] rounded-lg bg-[var(--bg-card)] flex flex-col flex-1 shadow-sm mt-2 min-h-[400px]">
        {/* Table Header Controls */}
        <div className="px-5 py-4 border-b border-[var(--border-color)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="font-semibold text-sm tracking-wide text-[var(--text-primary)]">Sessions</h2>
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Filter Dropdown Container */}
            <div className="relative" ref={filterRef}>
              <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium border rounded transition-colors ${hasActiveFilters ? 'bg-[var(--bg-active)] text-[var(--text-primary)] border-[var(--border-strong)]' : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-strong)] hover:bg-[var(--bg-active)]'}`}
              >
                <Filter size={14} />
                Filters {hasActiveFilters && <span className="bg-[var(--chart-cyan)]/20 text-[var(--chart-cyan)] px-1.5 rounded-full text-[10px] ml-1">{Object.values(activeFilters).filter(Boolean).length}</span>}
              </button>
              
              {isFilterOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-[var(--bg-card-hover)] border border-[var(--border-color)] rounded-lg shadow-xl z-20 py-2">
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-[var(--text-muted-dark)] uppercase tracking-wider">Interview Mode</div>
                  
                  {['Roleplay', 'Guided', 'Freeflow'].map(mode => (
                    <button 
                      key={mode} 
                      onClick={() => toggleFilter(mode)}
                      className="w-full text-left px-3 py-2 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] flex items-center justify-between transition-colors"
                    >
                      {mode}
                      {activeFilters[mode] && <Check size={14} className="text-[var(--chart-cyan)]" />}
                    </button>
                  ))}
                  
                  {hasActiveFilters && (
                    <div className="border-t border-[var(--border-color)] mt-2 pt-2 px-2">
                      <button 
                        onClick={() => setActiveFilters({ Roleplay: false, Guided: false, Freeflow: false })}
                        className="w-full text-center px-3 py-1.5 text-xs text-[var(--text-muted-dark)] hover:text-[var(--text-primary)] transition-colors"
                      >
                        Clear Filters
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="relative flex items-center">
              <Search size={14} className="absolute left-2.5 text-[var(--text-muted)]" />
              <input 
                type="text" 
                placeholder="Search sessions..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[var(--bg-card-hover)] border border-[var(--border-color)] rounded pl-8 pr-3 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted-dark)] focus:outline-none focus:border-[var(--border-strong)] w-48 transition-colors" 
              />
            </div>

            {/* Sort Dropdown Container */}
            <div className="relative" ref={sortRef}>
              <button 
                onClick={() => setIsSortOpen(!isSortOpen)}
                className={`flex items-center justify-center px-2 py-1.5 text-xs font-medium border rounded transition-colors ${sortOption !== 'Newest' ? 'bg-[var(--bg-active)] text-[var(--text-primary)] border-[var(--border-strong)]' : 'bg-[var(--bg-card-hover)] text-[var(--text-muted)] border-[var(--border-color)] hover:bg-[var(--bg-secondary)]'}`}
                title="Sort Sessions"
              >
                <SlidersHorizontal size={14} className="mr-1.5" />
                Sort
              </button>
              
              {isSortOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-[var(--bg-card-hover)] border border-[var(--border-color)] rounded-lg shadow-xl z-20 py-2">
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-[var(--text-muted-dark)] uppercase tracking-wider">Sort By</div>
                  
                  {['Newest', 'Score: High to Low', 'Score: Low to High'].map(option => (
                    <button 
                      key={option} 
                      onClick={() => { setSortOption(option); setIsSortOpen(false); }}
                      className="w-full text-left px-3 py-2 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] flex items-center justify-between transition-colors"
                    >
                      {option}
                      {sortOption === option && <Check size={14} className="text-[var(--chart-cyan)]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
          </div>
        </div>
        
        {/* Table Data */}
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="border-b border-[var(--border-color)] text-[var(--text-muted-dark)] uppercase tracking-wider font-semibold">
                <th className="px-5 py-3 font-semibold">Session ID</th>
                <th className="px-5 py-3 font-semibold">Candidate</th>
                <th className="px-5 py-3 font-semibold">Mode</th>
                <th className="px-5 py-3 font-semibold">Started &darr;</th>
                <th className="px-5 py-3 font-semibold">Duration</th>
                <th className="px-5 py-3 font-semibold">AI Score</th>
                <th className="px-5 py-3 font-semibold">Flags</th>
                <th className="px-5 py-3 font-semibold text-right">Avg Latency</th>
              </tr>
            </thead>
            <tbody className="text-[var(--text-muted)]">
              {filteredSessions.length > 0 ? (
                filteredSessions.map((session, i) => (
                  <tr key={i} onClick={() => router.push('/scorecards?id=' + session.id.replace('...', ''))} className="border-b border-[var(--border-color)]/50 hover:bg-[var(--bg-secondary)]/30 transition-colors cursor-pointer">
                    <td className="px-5 py-3.5 font-mono text-[var(--text-primary)]">{session.id}</td>
                    <td className="px-5 py-3.5">{session.candidate}</td>
                    <td className="px-5 py-3.5 text-[var(--chart-cyan)]">{session.mode}</td>
                    <td className="px-5 py-3.5">{session.started}</td>
                    <td className="px-5 py-3.5">{session.duration}</td>
                    <td className="px-5 py-3.5 font-mono text-[var(--text-primary)]">{session.score}</td>
                    <td className="px-5 py-3.5">
                      {session.flag === 'Clean' ? (
                        <span className="bg-[var(--bg-secondary)] text-[var(--text-muted)] px-2 py-0.5 rounded text-[10px] font-medium tracking-wide">CLEAN</span>
                      ) : session.flag === 'Hallucination' ? (
                        <span className="bg-[var(--chart-purple)]/20 text-[var(--chart-purple)] px-2 py-0.5 rounded text-[10px] font-medium tracking-wide">HALLUCINATION</span>
                      ) : (
                        <span className="bg-[var(--chart-orange)]/20 text-[var(--chart-orange)] px-2 py-0.5 rounded text-[10px] font-medium tracking-wide">SILENCE</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-[var(--text-muted)]">
                      {session.latency}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="px-5 py-12 text-center text-[var(--text-muted-dark)]">No sessions match your search criteria.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        <div className="px-5 py-3 border-t border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--text-muted)]">
          <div>Showing {filteredSessions.length > 0 ? 1 : 0} to {filteredSessions.length} of {hasActiveFilters ? filteredSessions.length : 199} results</div>
          <div className="flex items-center gap-2">
            <button className="px-2.5 py-1 rounded border border-[var(--border-color)] bg-[var(--bg-card-hover)] hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-50" disabled>Previous</button>
            <button className="px-2.5 py-1 rounded border border-[var(--border-color)] bg-[var(--bg-card-hover)] hover:bg-[var(--bg-secondary)] transition-colors">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}


