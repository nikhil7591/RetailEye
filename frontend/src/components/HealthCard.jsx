/**
 * HealthCard — Overall shelf health overview with occupancy ring and key stats.
 */
export default function HealthCard({ data }) {
  if (!data) return null;

  const { overall_occupancy, overall_alert, total_products_detected, total_empty_slots } = data;

  const alertConfig = {
    OK:       { color: "text-emerald-500", ring: "border-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/30", icon: "✓", label: "Healthy" },
    Warning:  { color: "text-amber-500",   ring: "border-amber-400",   bg: "bg-amber-50 dark:bg-amber-900/30",     icon: "⚠", label: "Warning" },
    Critical: { color: "text-red-500",     ring: "border-red-400",     bg: "bg-red-50 dark:bg-red-900/30",         icon: "✗", label: "Critical" },
  };

  const cfg = alertConfig[overall_alert] || alertConfig.OK;

  return (
    <div id="health-card" className="glass-card flex h-full flex-col items-center justify-center gap-6">
      {/* Occupancy ring */}
      <div className={`health-ring flex h-36 w-36 items-center justify-center rounded-full border-4 ${cfg.ring}`}>
        <div className="text-center">
          <span className={`text-4xl font-extrabold ${cfg.color}`}>
            {overall_occupancy}
          </span>
          <span className={`text-lg font-bold ${cfg.color}`}>%</span>
          <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-0.5">Occupancy</p>
        </div>
      </div>

      {/* Alert badge */}
      <span className={`badge ${overall_alert === "OK" ? "badge-ok" : overall_alert === "Warning" ? "badge-warning" : "badge-critical"}`}>
        {cfg.icon} {cfg.label}
      </span>

      {/* Stat boxes */}
      <div className="grid w-full grid-cols-3 gap-3">
        <div className="rounded-xl bg-slate-100/80 px-3 py-3 text-center dark:bg-slate-700/40">
          <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">{total_products_detected}</p>
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Products</p>
        </div>
        <div className="rounded-xl bg-slate-100/80 px-3 py-3 text-center dark:bg-slate-700/40">
          <p className="text-2xl font-bold text-red-500">{total_empty_slots}</p>
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Empty</p>
        </div>
        <div className={`rounded-xl px-3 py-3 text-center ${cfg.bg}`}>
          <p className={`text-2xl font-bold ${cfg.color}`}>{cfg.icon}</p>
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</p>
        </div>
      </div>
    </div>
  );
}
