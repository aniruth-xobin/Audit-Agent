"use client";
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Play, Pause, SkipBack, SkipForward, BarChart2, Volume2, Maximize2, ChevronLeft } from 'lucide-react';

function TranscriptsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const idParam = searchParams.get('id');
  const turnParam = searchParams.get('turn') ? parseInt(searchParams.get('turn'), 10) : null;
  const [highlightedIdx, setHighlightedIdx] = useState(null);
  const highlightRefs = useRef({});
  
  const [sessions, setSessions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Fetch all sessions for sidebar
  useEffect(() => {
    fetch('/api/sessions?sort=newest')
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setSessions(data);
          
          // Select initial session
          if (idParam) {
            const found = data.find(s => s.id === idParam);
            if (found) setActiveSession(found);
            else if (data.length > 0) setActiveSession(data[0]);
          } else if (data.length > 0) {
            setActiveSession(data[0]);
          }
        }
        setLoadingSessions(false);
      })
      .catch(err => {
        console.error(err);
        setLoadingSessions(false);
      });
  }, [idParam]);

  // Fetch transcript for active session
  useEffect(() => {
    if (!activeSession) return;
    setLoadingTranscript(true);
    fetch(`/api/transcripts?sessionId=${activeSession.id}`)
      .then(res => res.json())
      .then(data => {
        if (!data.error) setTranscript(data);
        else setTranscript([]);
        setLoadingTranscript(false);
      })
      .catch(err => {
        console.error(err);
        setTranscript([]);
        setLoadingTranscript(false);
      });
  }, [activeSession]);

  // Scroll to highlighted turn when transcript loads
  useEffect(() => {
    if (!turnParam || transcript.length === 0) return;
    const agentMessages = transcript.map((m, i) => ({ ...m, idx: i })).filter(m => m.role === 'ai');
    const target = agentMessages[turnParam - 1];
    if (target) {
      setHighlightedIdx(target.idx);
      setTimeout(() => {
        const el = highlightRefs.current[target.idx];
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [transcript, turnParam]);

  const filteredSessions = sessions.filter(s => 
    s.candidate_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)] font-sans relative">
      
      {/* Left Pane - Session List */}
      <div className={`w-full lg:w-1/3 flex-col border border-[var(--border-color)] bg-[var(--bg-card)] rounded-lg shadow-sm overflow-hidden lg:min-w-[320px] ${showMobileDetail ? "hidden lg:flex" : "flex"}`}>
        <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-card)]">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Audit Inbox</h2>
          <div className="relative flex items-center">
            <Search size={14} className="absolute left-2.5 text-[var(--text-muted)]" />
            <input 
              type="text" 
              placeholder="Search sessions..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--bg-card-hover)] border border-[var(--border-color)] rounded pl-8 pr-3 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted-dark)] focus:outline-none focus:border-[var(--border-strong)] transition-colors" 
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loadingSessions ? (
            <div className="p-8 text-center text-xs text-[var(--text-muted)] animate-pulse font-mono">Loading sessions...</div>
          ) : filteredSessions.length > 0 ? (
            filteredSessions.map(session => (
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
                  <span>{session.duration_secs ? Math.round(session.duration_secs/60) + ' mins' : '0 mins'}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-xs text-[var(--text-muted)]">No sessions found.</div>
          )}
        </div>
      </div>

      {/* Right Pane - Transcript View */}
      <div className={`flex-1 border border-[var(--border-color)] bg-[var(--bg-card)] rounded-lg shadow-sm flex-col relative overflow-hidden ${showMobileDetail ? "flex" : "hidden lg:flex"}`}>
        
        {activeSession ? (
          <>
            {/* Header */}
            <div className="p-6 border-b border-[var(--border-color)] bg-[var(--bg-card)] z-10 relative">
              {showMobileDetail && (
                <button onClick={() => setShowMobileDetail(false)} className="lg:hidden mb-4 flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                  <ChevronLeft size={16} /> Back to Transcripts
                </button>
              )}
              <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-[var(--text-primary)] mb-1">{activeSession.candidate_name || "Unknown"}</h1>
                <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                  <span className="font-mono text-[var(--text-muted-dark)]">{activeSession.id}</span>
                  <span>.</span>
                  <span className="text-[var(--chart-cyan)] capitalize">{activeSession.interview_mode || "guided"}</span>
                </div>
              </div>
              <div>
                <button onClick={() => router.push('/scorecards?id=' + activeSession.id)} className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card-hover)] border border-[var(--border-strong)] hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-md text-xs font-semibold transition-colors">
                  <BarChart2 size={14} /> Back to Scorecard
                </button>
              </div>
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar">
              {loadingTranscript ? (
                <div className="flex-1 flex items-center justify-center text-xs font-mono text-[var(--text-muted)] animate-pulse">Loading transcript...</div>
              ) : transcript.length > 0 ? (
                transcript.map((msg, idx) => {
                  const role = msg.role; // 'ai' or 'user' or 'system'
                  return (
                  <div
                    key={idx}
                    ref={el => { highlightRefs.current[idx] = el; }}
                    className={['flex gap-4 max-w-[85%] transition-all duration-700', highlightedIdx === idx ? 'ring-2 ring-sky-400/60 bg-sky-400/5 rounded-xl px-2 -mx-2 shadow-lg shadow-sky-400/10' : '', role === 'human' ? 'self-end flex-row-reverse' : role === 'system' ? 'self-center w-full max-w-full justify-center' : 'self-start'].join(' ')}>
                    
                    {role !== 'system' && (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${role === 'ai' ? 'bg-[var(--chart-cyan)]/20 text-[var(--chart-cyan)]' : 'bg-[var(--bg-active)] text-[var(--text-primary)]'}`}>
                        {role === 'ai' ? 'AI' : (activeSession?.candidate_name ? activeSession.candidate_name.substring(0, 2).toUpperCase() : 'US')}
                      </div>
                    )}
                    
                    {role === 'system' ? (
                      <div className="px-4 py-2 bg-[var(--chart-orange)]/10 border border-[var(--chart-orange)]/30 text-[var(--chart-orange)] text-xs font-medium rounded-lg flex items-center gap-2">
                        {msg.text}
                      </div>
                    ) : (
                      <div className={`flex flex-col gap-1 ${role === 'human' ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted-dark)]">
                          <span className="font-semibold text-[var(--text-muted)]">{role === 'ai' ? 'Agent' : (activeSession?.candidate_name || 'User')}</span>
                        </div>
                        <div className={`p-4 rounded-xl text-sm leading-relaxed ${role === 'human' ? 'bg-[var(--bg-active)] text-[var(--text-primary)] rounded-tr-none' : 'bg-[var(--bg-card-hover)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-tl-none'}`}>
                          {msg.text}
                        </div>
                      </div>
                    )}
                    
                  </div>
                )})
              ) : (
                <div className="flex-1 flex items-center justify-center text-sm text-[var(--text-muted)]">No transcript data available for this session.</div>
              )}
            </div>


          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-sm text-[var(--text-muted)]">
            {loadingSessions ? "Loading..." : "Select a session to view transcript."}
          </div>
        )}

      </div>
      
    </div>
  );
}

export default function TranscriptsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-[var(--text-primary)] font-mono">Loading Transcripts...</div>}>
      <TranscriptsContent />
    </Suspense>
  );
}


