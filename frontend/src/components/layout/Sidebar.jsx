import { Link, useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";
import { LayoutDashboard, History, FileText, Bell, Settings, Eye } from "lucide-react";

export function Sidebar() {
  const location = useLocation();

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "History", href: "/dashboard/history", icon: History },
    { name: "Reports", href: "/dashboard/reports", icon: FileText },
    { name: "Alerts", href: "/dashboard/alerts", icon: Bell },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen w-[260px] shrink-0 flex-col border-r border-[#E2E8F0] bg-[#FFFFFF]">
      <Link to="/" className="flex h-[72px] items-center px-6 hover:opacity-80 transition-opacity">
        <Eye className="h-6 w-6 text-[#4F46E5]" />
        <span className="ml-3 text-xl font-bold tracking-tight text-[#0F172A]">
          Retail<span className="text-[#4F46E5]">Eye</span>
        </span>
      </Link>

      <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-1 px-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "group flex items-center rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[#EEF2FF] text-[#4F46E5]"
                  : "text-[#334155] hover:bg-slate-50"
              )}
            >
              <item.icon
                className={cn(
                  "mr-3 h-[18px] w-[18px] flex-shrink-0 transition-colors",
                  isActive ? "text-[#4F46E5]" : "text-[#94A3B8] group-hover:text-[#334155]"
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </div>

      <div className="p-4 mb-2">
        <div className="rounded-xl bg-[#FFFFFF] p-4 border border-[#E2E8F0] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex flex-col">
          <span className="text-[11px] font-semibold text-[#94A3B8] mb-1.5">AI Status</span>
          <div className="flex items-center gap-2 mb-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22C55E]"></span>
            </span>
            <span className="text-sm font-bold text-[#22C55E]">LIVE</span>
          </div>
          <p className="text-[11px] text-[#94A3B8] leading-tight mb-3">All systems operational</p>
          <svg className="w-full h-6 text-[#EEF2FF]" viewBox="0 0 100 24" preserveAspectRatio="none">
            <path d="M0,24 L10,18 L20,20 L30,10 L40,15 L50,5 L60,12 L70,2 L80,8 L90,0 L100,6 L100,24 Z" fill="currentColor"/>
            <path d="M0,24 L10,18 L20,20 L30,10 L40,15 L50,5 L60,12 L70,2 L80,8 L90,0 L100,6" fill="none" stroke="#4F46E5" strokeWidth="1.5" vectorEffect="non-scaling-stroke"/>
          </svg>
        </div>
      </div>
    </div>
  );
}
