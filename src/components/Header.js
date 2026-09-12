"use client";
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, RefreshCcw, Clock, Check, Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useSettings } from '../context/SettingsContext';

export default function Header() {
  const pathname = usePathname();
  const isSessions = pathname === '/sessions';
  const { isMobileMenuOpen, setIsMobileMenuOpen, timeframe, setTimeframe, autoRefresh, setAutoRefresh } = useSettings();
  
  const [isTimeOpen, setIsTimeOpen] = useState(false);
  const timeRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (timeRef.current && !timeRef.current.contains(event.target)) {
        setIsTimeOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="h-16 flex items-center justify-between px-8 border-b border-[var(--border-color)] bg-[var(--bg-main)] z-50">
      <div className="flex items-center gap-3">
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"><Menu size={20} /></button>
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <span className="font-medium text-[var(--text-primary)]">AI Interviews</span>
          <span>/</span>
          <span className="capitalize">{isSessions ? 'Sessions' : 'Overview'}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-1 sm:gap-4 relative">
        <button 
          onClick={() => setAutoRefresh(!autoRefresh)}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium border rounded transition-colors ${autoRefresh ? 'text-[var(--chart-cyan)] bg-[var(--chart-cyan)]/10 border-[var(--chart-cyan)]/30 hover:bg-[var(--chart-cyan)]/20' : 'text-[var(--text-muted)] bg-[var(--bg-card-hover)] border-[var(--border-color)] hover:bg-[var(--bg-secondary)]'}`}
        >
          <RefreshCcw size={12} className={autoRefresh ? 'animate-spin' : ''} style={autoRefresh ? { animationDuration: '3s' } : {}} />
          <span className="hidden sm:inline">Auto-refresh {autoRefresh ? 'on' : 'off'}</span>
        </button>
        
        <div className="relative" ref={timeRef}>
          <button 
            onClick={() => setIsTimeOpen(!isTimeOpen)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] bg-[var(--bg-card-hover)] border border-[var(--border-color)] rounded hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <Clock size={12} />
            {timeframe}
            <ChevronDown size={14} className="text-[var(--text-muted)] ml-1" />
          </button>
          
          {isTimeOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--bg-card-hover)] border border-[var(--border-color)] rounded-lg shadow-xl z-50 py-1.5">
              {['Past 24 hours', 'Past 5 days', 'Past 7 days', 'Past 30 days', 'All Time'].map(tf => (
                <button 
                  key={tf} 
                  onClick={() => { setTimeframe(tf); setIsTimeOpen(false); }}
                  className="w-full text-left px-4 py-2 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] flex items-center justify-between transition-colors"
                >
                  {tf}
                  {timeframe === tf && <Check size={14} className="text-[var(--chart-cyan)]" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
