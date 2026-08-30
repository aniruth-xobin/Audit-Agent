
"use client";
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Play, Pause, SkipBack, SkipForward, BarChart2, Volume2, Maximize2 } from 'lucide-react';

const mockSessions = [
  { id: 'audit_1f8a6a', candidate: 'Aniruth R', mode: 'Roleplay', score: 8.5, duration: '12 mins' },
  { id: 'audit_8332eb', candidate: 'John Smith', mode: 'Freeflow', score: 4.2, duration: '15 mins' },
  { id: 'audit_7npjfb', candidate: 'Michael Brown', mode: 'Guided', score: 9.2, duration: '9 mins' },
  { id: 'audit_baa59d', candidate: 'Sarah Williams', mode: 'Freeflow', score: 1.0, duration: '2 mins' }
];

const mockTranscripts = {
  'audit_1f8a6a': [
    { speaker: 'Agent', role: 'ai', time: '00:00', text: 'Hello Aniruth! I see you are calling about upgrading your plan. How can I assist you today?' },
    { speaker: 'User', role: 'human', time: '00:15', text: 'Yeah, I want to upgrade but what are the exact costs?' },
    { speaker: 'Agent', role: 'ai', time: '00:18', text: 'Our Pro plan is $20 a month and includes unlimited audit credits.' },
    { speaker: 'User', role: 'human', time: '00:25', text: 'Wait, what if I decide to cancel halfway through the month?' },
    { speaker: 'Agent', role: 'ai', time: '00:29', text: 'If you cancel midway, your plan will remain active until the end of the billing cycle, and you will not be charged again.' },
    { speaker: 'User', role: 'human', time: '00:45', text: 'Okay, sounds fair. Let\'s do it.' }
  ],
  'audit_8332eb': [
    { speaker: 'Agent', role: 'ai', time: '00:00', text: 'Hi John, how can I help you?' },
    { speaker: 'User', role: 'human', time: '00:05', text: 'I want a refund for my last purchase.' },
    { speaker: 'Agent', role: 'ai', time: '00:08', text: 'Absolutely! We offer a 90-day no-questions-asked refund window for all items.' },
    { speaker: 'System', role: 'system', time: '02:45', text: 'FLAG: Hallucination. (Actual policy is 30 days)' },
    { speaker: 'User', role: 'human', time: '00:15', text: 'Oh wait, actually I just need—' },
    { speaker: 'Agent', role: 'ai', time: '00:16', text: 'Please provide your order number so I can process that 90-day refund immediately.' },
    { speaker: 'System', role: 'system', time: '11:20', text: 'FLAG: Failed to handle interruption.' }
  ]
};

function TranscriptsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const idParam = searchParams.get('id');
  
  const [activeSession, setActiveSession] = useState(() => {
    return mockSessions.find(s => s.id === idParam) || mockSessions[0];
  });
  
  useEffect(() => {
    if (idParam) {
      const found = mockSessions.find(s => s.id === idParam);
      if (found) setActiveSession(found);
    }
  }, [idParam]);

  const transcript = mockTranscripts[activeSession.id] || [
    { speaker: 'Agent', role: 'ai', time: '00:00', text: 'Transcript data not available for this session.' }
  ];

  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)] font-sans">
      
      {/* Left Pane - Session List */}
      <div className="w-1/3 flex flex-col border border-[#1f1f22] bg-[#0a0a0a] rounded-lg shadow-sm overflow-hidden min-w-[320px]">
        <div className="p-4 border-b border-[#1f1f22] bg-[#0a0a0a]">
          <h2 className="text-sm font-semibold text-[#ededed] mb-3">Audit Inbox</h2>
          <div className="relative flex items-center">
            <Search size={14} className="absolute left-2.5 text-[#a1a1aa]" />
            <input 
              type="text" 
              placeholder="Search sessions..." 
              className="w-full bg-[#111113] border border-[#1f1f22] rounded pl-8 pr-3 py-1.5 text-xs text-[#ededed] placeholder:text-[#52525b] focus:outline-none focus:border-[#27272a] transition-colors" 
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {mockSessions.map(session => (
            <div 
              key={session.id} 
              onClick={() => setActiveSession(session)}
              className={`p-4 border-b border-[#1f1f22] cursor-pointer transition-colors ${activeSession.id === session.id ? 'bg-[#1f1f22]/60 border-l-2 border-l-[#00d8ff]' : 'hover:bg-[#1f1f22]/30 border-l-2 border-l-transparent'}`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-semibold text-sm text-[#ededed]">{session.candidate}</span>
                <span className={`text-[11px] font-bold ${session.score >= 8 ? 'text-emerald-500' : session.score >= 5 ? 'text-yellow-500' : 'text-rose-500'}`}>{session.score} / 10</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[#a1a1aa] mb-2">
                <span className="text-[#00d8ff]">{session.mode}</span>
                <span>.</span>
                <span>{session.duration}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Pane - Transcript View */}
      <div className="flex-1 border border-[#1f1f22] bg-[#0a0a0a] rounded-lg shadow-sm flex flex-col relative overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-[#1f1f22] flex items-center justify-between bg-[#0a0a0a] z-10 relative">
          <div>
            <h1 className="text-xl font-bold text-[#ededed] mb-1">{activeSession.candidate}</h1>
            <div className="flex items-center gap-3 text-xs text-[#a1a1aa]">
              <span className="font-mono text-[#52525b]">{activeSession.id}</span>
              <span>.</span>
              <span className="text-[#00d8ff]">{activeSession.mode}</span>
            </div>
          </div>
          <div>
            <button onClick={() => router.push('/scorecards?id=' + activeSession.id)} className="flex items-center gap-2 px-4 py-2 bg-[#111113] border border-[#27272a] hover:bg-[#1f1f22] text-[#ededed] rounded-md text-xs font-semibold transition-colors">
              <BarChart2 size={14} /> Back to Scorecard
            </button>
          </div>
        </div>

        {/* Chat Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar pb-32">
          {transcript.map((msg, idx) => (
            <div key={idx} className={`flex gap-4 max-w-[85%] ${msg.role === 'human' ? 'self-end flex-row-reverse' : msg.role === 'system' ? 'self-center w-full max-w-full justify-center' : 'self-start'}`}>
              
              {msg.role !== 'system' && (
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${msg.role === 'ai' ? 'bg-[#00d8ff]/20 text-[#00d8ff]' : 'bg-[#27272a] text-[#ededed]'}`}>
                  {msg.role === 'ai' ? 'AI' : 'US'}
                </div>
              )}
              
              {msg.role === 'system' ? (
                <div className="px-4 py-2 bg-[#f97316]/10 border border-[#f97316]/30 text-[#f97316] text-xs font-medium rounded-lg flex items-center gap-2">
                  <span className="font-mono">{msg.time}</span> {msg.text}
                </div>
              ) : (
                <div className={`flex flex-col gap-1 ${msg.role === 'human' ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2 text-[11px] text-[#52525b]">
                    <span className="font-semibold text-[#a1a1aa]">{msg.speaker}</span>
                    <span className="font-mono">{msg.time}</span>
                  </div>
                  <div className={`p-4 rounded-xl text-sm leading-relaxed ${msg.role === 'human' ? 'bg-[#27272a] text-[#ededed] rounded-tr-none' : 'bg-[#111113] border border-[#1f1f22] text-[#ededed] rounded-tl-none'}`}>
                    {msg.text}
                  </div>
                </div>
              )}
              
            </div>
          ))}
        </div>

        {/* Bottom Audio Player Dock */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-[#0a0a0a]/95 backdrop-blur-md border-t border-[#1f1f22] flex items-center gap-6 z-20">
          <div className="flex items-center gap-4 shrink-0">
            <button className="text-[#a1a1aa] hover:text-white transition-colors"><SkipBack size={18} fill="currentColor" /></button>
            <button onClick={() => setIsPlaying(!isPlaying)} className="w-10 h-10 rounded-full bg-[#00d8ff] text-black flex items-center justify-center hover:bg-[#00b0d0] transition-colors shadow-[0_0_15px_rgba(0,216,255,0.3)]">
              {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
            </button>
            <button className="text-[#a1a1aa] hover:text-white transition-colors"><SkipForward size={18} fill="currentColor" /></button>
          </div>
          
          <div className="flex-1 flex items-center gap-3">
            <span className="text-[10px] font-mono text-[#a1a1aa]">00:15</span>
            <div className="flex-1 h-1.5 bg-[#1f1f22] rounded-full overflow-hidden relative cursor-pointer">
              <div className="absolute top-0 left-0 h-full bg-[#00d8ff] w-[15%]"></div>
            </div>
            <span className="text-[10px] font-mono text-[#a1a1aa]">{activeSession.duration}</span>
          </div>
          
          <div className="flex items-center gap-4 shrink-0 text-[#a1a1aa]">
            <Volume2 size={16} className="cursor-pointer hover:text-white" />
            <Maximize2 size={16} className="cursor-pointer hover:text-white" />
          </div>
        </div>

      </div>
      
    </div>
  );
}

export default function TranscriptsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-[#ededed]">Loading Transcripts...</div>}>
      <TranscriptsContent />
    </Suspense>
  );
}
