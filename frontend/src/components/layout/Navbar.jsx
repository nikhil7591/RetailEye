import { Bell, ChevronDown, Plus } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const isDashboard = location.pathname === "/";

  return (
    <header className="sticky top-0 z-40 flex h-[72px] w-full items-center justify-between bg-[#F8FAFC] px-6 pt-6">
      
      {/* Left side — contextual title or empty */}
      <div className="flex items-center gap-4">
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-5">
        {/* New Upload button — only shown when NOT on dashboard idle */}
        {isDashboard && (
          <button
            onClick={() => {
              // Dispatch custom event to tell Dashboard to reset to upload
              window.dispatchEvent(new CustomEvent("retaileye:new-upload"));
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-semibold hover:bg-[#4338CA] transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            New Upload
          </button>
        )}

        <button className="relative text-[#64748B] hover:text-[#0F172A] transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#4F46E5] text-[9px] font-bold text-white border-2 border-[#F8FAFC]">
            3
          </span>
        </button>

        <button className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <img 
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=e2e8f0" 
            alt="Admin Avatar" 
            className="h-9 w-9 rounded-full border border-[#E2E8F0] bg-[#FFFFFF]"
          />
          <div className="hidden md:flex flex-col items-start">
            <span className="text-sm font-bold text-[#0F172A] leading-none">Admin</span>
            <span className="text-[11px] text-[#64748B] mt-1 leading-none">Retail Admin</span>
          </div>
          <ChevronDown className="h-4 w-4 text-[#94A3B8]" />
        </button>
      </div>
    </header>
  );
}
