import { Bell, ChevronDown, Menu, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getNotifications } from "../../services/api";

export function Navbar({ onMenuToggle }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isDashboard = location.pathname === "/dashboard";
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [isLoadingNotifs, setIsLoadingNotifs] = useState(false);

  const formatRelativeTime = (iso) => {
    if (!iso) return "";
    const diffMs = Date.now() - new Date(iso).getTime();
    const diffMins = Math.max(1, Math.floor(diffMs / 60000));
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsLoadingNotifs(true);
      try {
        const data = await getNotifications(10);
        if (active) setNotifications(data.items || []);
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setIsLoadingNotifs(false);
      }
    };
    load();
    const intervalId = setInterval(load, 15000);
    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 flex h-[64px] md:h-[72px] w-full items-center justify-between bg-[#F8FAFC] px-4 md:px-6 pt-4 md:pt-6">
      
      {/* Left side — hamburger for mobile + contextual title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3 md:gap-5">
        {/* New Upload button — only shown when NOT on dashboard idle */}
        {isDashboard && (
          <button
            onClick={() => {
              // Dispatch custom event to tell Dashboard to reset to upload
              window.dispatchEvent(new CustomEvent("retaileye:new-upload"));
            }}
            className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-xs md:text-sm font-semibold hover:bg-[#4338CA] transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Upload</span>
          </button>
        )}

        <div className="relative" ref={notifRef}>
          <button
            className="relative text-[#64748B] hover:text-[#0F172A] transition-colors"
            onClick={() => setIsNotifOpen((open) => !open)}
            aria-haspopup="true"
            aria-expanded={isNotifOpen}
          >
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#4F46E5] text-[9px] font-bold text-white border-2 border-[#F8FAFC]">
              {notifications.length}
            </span>
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-3 w-72 sm:w-80 rounded-xl border border-[#E2E8F0] bg-white shadow-[0_10px_30px_-12px_rgba(15,23,42,0.35)]">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0]">
                <span className="text-xs font-bold tracking-wider text-[#0F172A] uppercase">Notifications</span>
                <span className="text-[10px] font-semibold text-[#64748B]">{notifications.length} new</span>
              </div>
              <div className="max-h-72 overflow-auto">
                {isLoadingNotifs && (
                  <div className="px-4 py-6 text-center text-xs text-[#94A3B8]">Loading...</div>
                )}
                {!isLoadingNotifs && notifications.length === 0 && (
                  <div className="px-4 py-6 text-center text-xs text-[#94A3B8]">No notifications</div>
                )}
                {!isLoadingNotifs && notifications.map((n) => (
                  <button
                    key={n.id}
                    className="w-full text-left px-4 py-3 border-b border-[#F1F5F9] last:border-b-0 hover:bg-[#F8FAFC]"
                    onClick={() => {
                      setIsNotifOpen(false);
                      navigate("/dashboard/alerts", { state: { selectedId: n.analysis_id } });
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-[#0F172A]">{n.title}</p>
                      <span className="text-[10px] text-[#94A3B8]">{formatRelativeTime(n.created_at)}</span>
                    </div>
                    <p className="text-xs text-[#64748B] mt-1">{n.body}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button className="flex items-center gap-2 md:gap-3 hover:opacity-80 transition-opacity">
          <img 
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=e2e8f0" 
            alt="Admin Avatar" 
            className="h-8 w-8 md:h-9 md:w-9 rounded-full border border-[#E2E8F0] bg-[#FFFFFF]"
          />
          <div className="hidden md:flex flex-col items-start">
            <span className="text-sm font-bold text-[#0F172A] leading-none">Admin</span>
            <span className="text-[11px] text-[#64748B] mt-1 leading-none">Retail Admin</span>
          </div>
          <ChevronDown className="h-4 w-4 text-[#94A3B8] hidden sm:block" />
        </button>
      </div>
    </header>
  );
}
