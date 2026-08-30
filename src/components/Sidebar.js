"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, List, Settings, AlignLeft, BarChart2, Activity, ChevronLeft, ChevronRight } from "lucide-react";

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside className={`${collapsed ? 'w-20' : 'w-64'} bg-[var(--bg-card-hover)] border-r border-[var(--border-color)] flex flex-col h-full shrink-0 transition-all duration-300 relative z-50`}>
      <div className="h-16 flex items-center justify-between px-6 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
          <Image src="/Favicon.png" alt="Xobin" width={28} height={28} className="rounded object-contain shrink-0" />
          {!collapsed && <span className="font-semibold text-[15px] tracking-tight">Xobin Audit</span>}
        </div>
      </div>
      
      <button 
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-full p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] z-10 transition-colors"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-6">
        <div>
          {!collapsed && <div className="px-3 mb-2 text-xs font-semibold text-[var(--text-muted-dark)] uppercase tracking-wider">Dashboard</div>}
          <nav className="flex flex-col gap-1">
            <Link 
              href="/" 
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${pathname === '/' ? 'bg-[var(--bg-card)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]'}`} 
              title="Overview"
            >
              <LayoutDashboard size={18} className={`shrink-0 ${pathname === '/' ? 'text-emerald-500' : ''}`} />
              {!collapsed && <span>Overview</span>}
            </Link>
            <Link 
              href="/sessions" 
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${pathname === '/sessions' ? 'bg-[var(--bg-card)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]'}`} 
              title="Sessions"
            >
              <List size={18} className={`shrink-0 ${pathname === '/sessions' ? 'text-emerald-500' : ''}`} />
              {!collapsed && <span>Sessions</span>}
            </Link>
          </nav>
        </div>

        <div>
          {!collapsed && <div className="px-3 mb-2 text-xs font-semibold text-[var(--text-muted-dark)] uppercase tracking-wider">Evaluation</div>}
          <nav className="flex flex-col gap-1">
            <Link href="/scorecards" className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${pathname === '/scorecards' ? 'bg-[var(--bg-card)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]'}`} title="Scorecards">
              <BarChart2 size={18} className={`shrink-0 ${pathname === '/scorecards' ? 'text-emerald-500' : ''}`} />
              {!collapsed && <span>Scorecards</span>}
            </Link>
            <Link href="/transcripts" className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${pathname === '/transcripts' ? 'bg-[var(--bg-card)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]'}`} title="Transcripts">
              <AlignLeft size={18} className="shrink-0" />
              {!collapsed && <span>Transcripts</span>}
            </Link>
            <Link href="/usage" className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${pathname === '/usage' ? 'bg-[var(--bg-card)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]'}`} title="Usage">
              <Activity size={18} className="shrink-0" />
              {!collapsed && <span>Usage</span>}
            </Link>
          </nav>
        </div>
        
        <div>
          {!collapsed && <div className="px-3 mb-2 text-xs font-semibold text-[var(--text-muted-dark)] uppercase tracking-wider">Configure</div>}
          <nav className="flex flex-col gap-1">
            <Link href="/settings" className="flex items-center gap-3 px-3 py-2 rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)] text-sm font-medium transition-colors" title="UI Settings">
              <Settings size={18} className="shrink-0" />
              {!collapsed && <span>UI Settings</span>}
            </Link>
          </nav>
        </div>
      </div>
      
      <div className="p-4 border-t border-[var(--border-color)] overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">
            AR
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium truncate">Aniruth R</span>
              <span className="text-xs text-[var(--text-muted)] truncate">aniruth.r@xobin.com</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
