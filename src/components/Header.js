"use client";
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, RefreshCcw, Clock, Check } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();
  const isSessions = pathname === '/sessions';
  
  const [isTimeOpen, setIsTimeOpen] = useState(false);
  const [timeframe, setTimeframe] = useState('Past 24 hours');
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
    <header className="h-16 flex items-center justify-between px-8 border-b border-[#1f1f22] bg-[#09090b] z-50">
      <div className="flex items-center gap-2 text-sm text-[#a1a1aa]">
        <span className="font-medium text-[#ededed]">AI Interviews</span>
        <span>/</span>
        <span className="capitalize">{isSessions ? 'Sessions' : 'Overview'}</span>
      </div>
      
      <div className="flex items-center gap-2 relative">
        <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[#a1a1aa] bg-[#111113] border border-[#1f1f22] rounded hover:bg-[#1f1f22] transition-colors">
          <RefreshCcw size={12} />
          Auto-refresh off
        </button>
        
        <div className="relative" ref={timeRef}>
          <button 
            onClick={() => setIsTimeOpen(!isTimeOpen)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[#ededed] bg-[#111113] border border-[#1f1f22] rounded hover:bg-[#1f1f22] transition-colors"
          >
            <Clock size={12} />
            {timeframe}
            <ChevronDown size={14} className="text-[#a1a1aa] ml-1" />
          </button>
          
          {isTimeOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-[#111113] border border-[#1f1f22] rounded-lg shadow-xl z-50 py-1.5">
              {['Past 24 hours', 'Past 5 days', 'Past 7 days', 'Past 30 days'].map(tf => (
                <button 
                  key={tf} 
                  onClick={() => { setTimeframe(tf); setIsTimeOpen(false); }}
                  className="w-full text-left px-4 py-2 text-xs text-[#a1a1aa] hover:bg-[#1f1f22] hover:text-[#ededed] flex items-center justify-between transition-colors"
                >
                  {tf}
                  {timeframe === tf && <Check size={14} className="text-[#00d8ff]" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
