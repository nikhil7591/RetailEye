import { useState, useEffect } from "react";
import { Bell, CheckCircle2, AlertTriangle, XCircle, Eye } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { getHistory, getFileUrl } from "../services/api";
import { Loader } from "../components/ui/Loader";
import { cn } from "../lib/utils";

export function Alerts() {
  const [alerts, setAlerts]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [resolved, setResolved] = useState(new Set());
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getHistory(50);
        // Extract only critical + warning items as alerts
        const alertItems = (data.items || [])
          .filter(item => item.report?.overall_alert && item.report.overall_alert !== "OK")
          .map(item => ({
            _id: item._id,
            filename: item.filename,
            alert: item.report?.overall_alert,
            score: item.shelf_score ?? 0,
            occupancy: item.report?.overall_occupancy ?? 0,
            empty: item.report?.total_empty_slots ?? 0,
            rows: item.report?.rows ?? [],
            time: item.created_at ? new Date(item.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—",
            processed_image_url: item.processed_image_url,
          }));
        setAlerts(alertItems);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const markResolved = (id) => setResolved(prev => new Set([...prev, id]));

  const criticals = alerts.filter(a => a.alert === "Critical" && !resolved.has(a._id));
  const warnings  = alerts.filter(a => a.alert === "Warning" && !resolved.has(a._id));
  const resolvedList = alerts.filter(a => resolved.has(a._id));

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader /></div>;

  const AlertCard = ({ alert, level }) => (
    <div className={cn(
      "flex items-start gap-4 p-5 rounded-xl border transition-all",
      level === "Critical"
        ? "bg-[#FFF5F5] border-[#FCA5A5]"
        : "bg-[#FFFBEB] border-[#FCD34D]"
    )}>
      {level === "Critical"
        ? <XCircle className="h-5 w-5 text-[#EF4444] shrink-0 mt-0.5" />
        : <AlertTriangle className="h-5 w-5 text-[#F59E0B] shrink-0 mt-0.5" />}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-[#0F172A] truncate">{alert.filename}</p>
          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0",
            level === "Critical" ? "bg-[#FEE2E2] text-[#DC2626]" : "bg-[#FEF3C7] text-[#D97706]"
          )}>{level}</span>
        </div>
        <p className="text-xs text-[#64748B] mt-1">{alert.time}</p>
        <div className="flex items-center gap-4 mt-2 text-xs font-semibold">
          <span className="text-[#4F46E5]">Score: {alert.score}/100</span>
          <span className="text-[#F59E0B]">Occupancy: {Math.round(alert.occupancy)}%</span>
          <span className="text-[#EF4444]">Empty: {alert.empty}</span>
        </div>
      </div>
      <div className="flex flex-col gap-2 shrink-0">
        <button
          onClick={() => setSelected(alert)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-semibold text-[#64748B] hover:bg-[#F1F5F9] transition-colors"
        >
          <Eye className="h-3.5 w-3.5" /> View
        </button>
        <button
          onClick={() => markResolved(alert._id)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#22C55E] text-xs font-bold text-white hover:bg-[#16A34A] transition-colors"
        >
          <CheckCircle2 className="h-3.5 w-3.5" /> Resolve
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Alerts</h1>
          <p className="text-sm text-[#64748B] mt-1">
            {criticals.length} critical · {warnings.length} warnings requiring attention
          </p>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
          <Bell className="h-5 w-5 text-[#4F46E5]" />
          <span className="text-sm font-bold text-[#0F172A]">{criticals.length + warnings.length} active</span>
        </div>
      </div>

      {alerts.length === 0 ? (
        <Card className="border-[#E2E8F0]">
          <CardContent className="py-16 flex flex-col items-center gap-3 text-[#94A3B8]">
            <CheckCircle2 className="h-12 w-12 text-[#22C55E]" />
            <p className="text-sm font-semibold text-[#334155]">All Clear!</p>
            <p className="text-xs">No critical or warning alerts from your analyses</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {criticals.length > 0 && (
            <Card className="border-[#FCA5A5]">
              <CardHeader className="py-4 border-b border-[#FCA5A5]">
                <CardTitle className="text-[12px] font-bold tracking-wider uppercase text-[#DC2626] flex items-center gap-2">
                  <XCircle className="h-4 w-4" /> CRITICAL ALERTS ({criticals.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 flex flex-col gap-3">
                {criticals.map(a => <AlertCard key={a._id} alert={a} level="Critical" />)}
              </CardContent>
            </Card>
          )}

          {warnings.length > 0 && (
            <Card className="border-[#FCD34D]">
              <CardHeader className="py-4 border-b border-[#FCD34D]">
                <CardTitle className="text-[12px] font-bold tracking-wider uppercase text-[#D97706] flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> WARNINGS ({warnings.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 flex flex-col gap-3">
                {warnings.map(a => <AlertCard key={a._id} alert={a} level="Warning" />)}
              </CardContent>
            </Card>
          )}

          {resolvedList.length > 0 && (
            <Card className="border-[#E2E8F0] opacity-60">
              <CardHeader className="py-4 border-b border-[#E2E8F0]">
                <CardTitle className="text-[12px] font-bold tracking-wider uppercase text-[#94A3B8] flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> RESOLVED ({resolvedList.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                {resolvedList.map(a => (
                  <div key={a._id} className="flex items-center gap-3 py-2 border-b border-[#F1F5F9] last:border-0">
                    <CheckCircle2 className="h-4 w-4 text-[#22C55E]" />
                    <span className="text-sm text-[#64748B]">{a.filename}</span>
                    <span className="text-xs text-[#94A3B8] ml-auto">{a.time}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 z-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[#0F172A]">{selected.filename}</h2>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-[#F1F5F9]">✕</button>
            </div>
            {selected.processed_image_url && (
              <img src={getFileUrl(selected.processed_image_url)} alt="output" className="w-full rounded-xl mb-4 border border-[#E2E8F0]" />
            )}
            {selected.rows.map((row, i) => (
              <div key={i} className="mb-3">
                <div className="flex justify-between mb-1">
                  <span className="text-xs font-semibold text-[#334155]">Row {row.row_id} — {row.zone_label}</span>
                  <span className="text-xs font-bold text-[#4F46E5]">{row.occupancy_percent}%</span>
                </div>
                <div className="h-2 bg-[#F1F5F9] rounded-full">
                  <div className="h-full bg-[#EF4444] rounded-full" style={{ width: `${row.occupancy_percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
