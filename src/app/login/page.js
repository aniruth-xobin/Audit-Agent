"use client";
import Image from "next/image";
import { Activity, ShieldAlert, FileText } from "lucide-react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col lg:flex-row bg-[#09090b] font-sans">
      
      {/* Left Pane - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 lg:p-24 relative z-10 bg-[#0a0a0a] border-r border-[#1f1f22]">
        <div className="w-full max-w-sm flex flex-col items-center sm:items-start gap-8">
          
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <Image 
              src="/favicon.png" 
              alt="Xobin Logo" 
              width={40} 
              height={40} 
              className="rounded-md"
            />
            <span className="text-2xl font-bold tracking-tight text-[#ededed]">
              Audit Agent
            </span>
          </div>

          <div className="flex flex-col gap-2 w-full text-center sm:text-left">
            <h1 className="text-3xl font-bold text-[#ededed] tracking-tight">
              Welcome back
            </h1>
            <p className="text-[#a1a1aa]">
              Sign in to access your AI interview analytics and telemetry.
            </p>
          </div>

          {/* Login Button - Matching LiveKit Design */}
          <button 
            className="w-full mt-6 flex items-center gap-3 bg-transparent hover:bg-cyan-900/30 text-cyan-400 py-3 px-6 rounded border border-cyan-800 hover:border-cyan-700 font-normal transition-colors"
            onClick={() => signIn('google', { callbackUrl: '/' })}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0">
              <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"></path>
            </svg>
            <span className="flex-1 text-center pr-5 text-[16px]">Continue with Google</span>
          </button>
          
          <p className="text-xs text-[#52525b] text-center w-full mt-4">
            Secured by Xobin Workspace SSO. Only authorized organization members may access this dashboard.
          </p>
        </div>
      </div>

      {/* Right Pane - Professional Corporate Theme */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-[#09090b] items-center justify-center">
        {/* Subtle dot pattern background */}
        <div className="absolute inset-0 opacity-[0.15]">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dotGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="#ffffff" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dotGrid)" />
          </svg>
        </div>
        
        {/* Very subtle background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#09090b] via-[#09090b] to-[#1e1b4b]/20"></div>

        {/* Professional Feature Card */}
        <div className="relative z-10 w-full max-w-md flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-3xl font-bold text-white tracking-tight">Enterprise Telemetry</h2>
            <p className="text-[#a1a1aa] leading-relaxed">
              Monitor, audit, and evaluate AI agent sessions in real-time with absolute trust and transparency.
            </p>
          </div>

          <div className="flex flex-col gap-4 mt-4">
            <div className="bg-[#111113] border border-[#27272a] rounded-xl p-5 flex items-start gap-4 shadow-lg">
              <div className="p-2 bg-[#1f1f22] rounded-lg">
                <Activity size={20} className="text-[#00d8ff]" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-[#ededed] font-medium">Pipeline Latency</h3>
                <p className="text-sm text-[#71717a] mt-1">Track exact millisecond delays across STT, LLM, and TTS models per conversational turn.</p>
              </div>
            </div>

            <div className="bg-[#111113] border border-[#27272a] rounded-xl p-5 flex items-start gap-4 shadow-lg">
              <div className="p-2 bg-[#1f1f22] rounded-lg">
                <ShieldAlert size={20} className="text-[#f97316]" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-[#ededed] font-medium">Guardrail Analytics</h3>
                <p className="text-sm text-[#71717a] mt-1">Automatically identify hallucinations, prompt injections, and off-topic deviations.</p>
              </div>
            </div>

            <div className="bg-[#111113] border border-[#27272a] rounded-xl p-5 flex items-start gap-4 shadow-lg">
              <div className="p-2 bg-[#1f1f22] rounded-lg">
                <FileText size={20} className="text-[#a855f7]" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-[#ededed] font-medium">Objective Evaluation</h3>
                <p className="text-sm text-[#71717a] mt-1">Generate comprehensive scorecards and transcripts for every candidate interaction instantly.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
}

