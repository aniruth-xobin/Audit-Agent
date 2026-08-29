"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard, List, Settings, Key, Webhook, Activity, ChevronLeft, ChevronRight } from "lucide-react";

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`${collapsed ? 'w-20' : 'w-64'} bg-[#111113] border-r border-[#1f1f22] flex flex-col h-full shrink-0 transition-all duration-300 relative`}>
      <div className="h-16 flex items-center justify-between px-6 border-b border-[#1f1f22]">
        <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
          <Image src="/Favicon.png" alt="Xobin" width={28} height={28} className="rounded object-contain shrink-0" />
          {!collapsed && <span className="font-semibold text-[15px] tracking-tight">Xobin Audit</span>}
        </div>
      </div>
      
      <button 
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 bg-[#1f1f22] border border-[#27272a] rounded-full p-1 text-[#a1a1aa] hover:text-white z-10 transition-colors"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-6">
        <div>
          {!collapsed && <div className="px-3 mb-2 text-xs font-semibold text-[#52525b] uppercase tracking-wider">Dashboard</div>}
          <nav className="flex flex-col gap-1">
            <Link href="/" className="flex items-center gap-3 px-3 py-2 rounded-md bg-[#1f1f22] text-[#ededed] text-sm font-medium transition-colors" title="Overview">
              <LayoutDashboard size={18} className="shrink-0 text-emerald-500" />
              {!collapsed && <span>Overview</span>}
            </Link>
            <Link href="/sessions" className="flex items-center gap-3 px-3 py-2 rounded-md text-[#a1a1aa] hover:bg-[#1f1f22] hover:text-[#ededed] text-sm font-medium transition-colors" title="Sessions">
              <List size={18} className="shrink-0" />
              {!collapsed && <span>Sessions</span>}
            </Link>
          </nav>
        </div>

        <div>
          {!collapsed && <div className="px-3 mb-2 text-xs font-semibold text-[#52525b] uppercase tracking-wider">Developer</div>}
          <nav className="flex flex-col gap-1">
            <Link href="#" className="flex items-center gap-3 px-3 py-2 rounded-md text-[#a1a1aa] hover:bg-[#1f1f22] hover:text-[#ededed] text-sm font-medium transition-colors" title="API Keys">
              <Key size={18} className="shrink-0" />
              {!collapsed && <span>API Keys</span>}
            </Link>
            <Link href="#" className="flex items-center gap-3 px-3 py-2 rounded-md text-[#a1a1aa] hover:bg-[#1f1f22] hover:text-[#ededed] text-sm font-medium transition-colors" title="Webhooks">
              <Webhook size={18} className="shrink-0" />
              {!collapsed && <span>Webhooks</span>}
            </Link>
            <Link href="#" className="flex items-center gap-3 px-3 py-2 rounded-md text-[#a1a1aa] hover:bg-[#1f1f22] hover:text-[#ededed] text-sm font-medium transition-colors" title="Usage">
              <Activity size={18} className="shrink-0" />
              {!collapsed && <span>Usage</span>}
            </Link>
          </nav>
        </div>
        
        <div>
          {!collapsed && <div className="px-3 mb-2 text-xs font-semibold text-[#52525b] uppercase tracking-wider">Configure</div>}
          <nav className="flex flex-col gap-1">
            <Link href="/settings" className="flex items-center gap-3 px-3 py-2 rounded-md text-[#a1a1aa] hover:bg-[#1f1f22] hover:text-[#ededed] text-sm font-medium transition-colors" title="Settings">
              <Settings size={18} className="shrink-0" />
              {!collapsed && <span>Settings</span>}
            </Link>
          </nav>
        </div>
      </div>
      
      <div className="p-4 border-t border-[#1f1f22] overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">
            AR
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium truncate">Aniruth R</span>
              <span className="text-xs text-[#a1a1aa] truncate">aniruth.r@xobin.com</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
