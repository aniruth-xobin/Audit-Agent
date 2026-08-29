export default function Header() {
  return (
    <header className="h-16 flex items-center justify-between px-8 border-b border-[#1f1f22] bg-[#09090b]">
      <div className="flex items-center gap-2 text-sm text-[#a1a1aa]">
        <span className="font-medium text-[#ededed]">AI Interviews</span>
        <span>/</span>
        <span>Overview</span>
      </div>
      <div className="flex items-center gap-4">
        <button className="text-sm font-medium bg-[#ededed] text-black px-4 py-1.5 rounded hover:bg-[#d4d4d8] transition-colors">
          Export Report
        </button>
      </div>
    </header>
  );
}
