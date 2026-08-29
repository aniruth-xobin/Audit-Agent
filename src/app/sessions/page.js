"use client";
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react';

const mockSessions = [
  { id: 'sess_9xq2pf...', date: 'Aug 29, 2026', duration: '12m 4s', health: '98%', status: 'Completed', score: 9 },
  { id: 'sess_4ya8mz...', date: 'Aug 29, 2026', duration: '8m 22s', health: '95%', status: 'Completed', score: 8 },
  { id: 'sess_1bc7kk...', date: 'Aug 29, 2026', duration: '14m 51s', health: '72%', status: 'Flagged', score: 4 },
  { id: 'sess_8po3ww...', date: 'Aug 28, 2026', duration: '10m 10s', health: '99%', status: 'Completed', score: 10 },
  { id: 'sess_5tt9qa...', date: 'Aug 28, 2026', duration: '9m 5s', health: '94%', status: 'Completed', score: 8 },
  { id: 'sess_3zz1ll...', date: 'Aug 27, 2026', duration: '11m 30s', health: '91%', status: 'Completed', score: 7 },
  { id: 'sess_9aa2qq...', date: 'Aug 27, 2026', duration: '2m 14s', health: '45%', status: 'Dropped', score: 1 },
  { id: 'sess_7bb3ww...', date: 'Aug 26, 2026', duration: '16m 45s', health: '97%', status: 'Completed', score: 9 },
];

export default function SessionsPage() {
  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-12 h-full">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">Sessions</h1>
        <p className="text-[#a1a1aa] text-sm">View and filter all historical AI Audit Agent sessions.</p>
      </div>
      
      <div className="border border-[#1f1f22] rounded-lg bg-[#111113] flex flex-col flex-1 shadow-sm">
        <div className="px-6 py-4 border-b border-[#1f1f22] flex items-center justify-between bg-[#111113]">
          <h2 className="font-semibold text-[15px] uppercase tracking-wider text-[#a1a1aa]">All Sessions</h2>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Filter sessions..." 
              className="bg-[#09090b] border border-[#1f1f22] rounded px-3 py-1.5 text-sm outline-none focus:border-emerald-500/50 transition-colors placeholder:text-[#52525b]"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-[#1f1f22] text-[#52525b] text-[11px] font-semibold uppercase tracking-wider">
                <th className="px-6 py-3">Session ID</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Duration</th>
                <th className="px-6 py-3">System Health</th>
                <th className="px-6 py-3">AI Score</th>
                <th className="px-6 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {mockSessions.map((session, i) => (
                <tr key={i} className="border-b border-[#1f1f22] hover:bg-[#1f1f22]/30 transition-colors cursor-pointer group">
                  <td className="px-6 py-3 font-mono text-emerald-500 group-hover:text-emerald-400">{session.id}</td>
                  <td className="px-6 py-3 text-[#a1a1aa]">{session.date}</td>
                  <td className="px-6 py-3 text-[#a1a1aa] flex items-center gap-1.5">
                    <Clock size={14} className="text-[#52525b]" />
                    {session.duration}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1 bg-[#1f1f22] rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${parseInt(session.health) > 90 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                          style={{ width: session.health }}
                        ></div>
                      </div>
                      <span className="text-xs font-medium text-[#a1a1aa]">{session.health}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 font-medium text-[#ededed]">{session.score} / 10</td>
                  <td className="px-6 py-3 text-right">
                    {session.status === 'Completed' ? (
                      <span className="text-emerald-500 text-xs font-medium flex items-center justify-end gap-1.5">
                        <CheckCircle2 size={12} />
                        {session.status}
                      </span>
                    ) : session.status === 'Dropped' ? (
                      <span className="text-red-500 text-xs font-medium flex items-center justify-end gap-1.5">
                        <AlertCircle size={12} />
                        {session.status}
                      </span>
                    ) : (
                      <span className="text-amber-500 text-xs font-medium flex items-center justify-end gap-1.5">
                        <AlertCircle size={12} />
                        {session.status}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
