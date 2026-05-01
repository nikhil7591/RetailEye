import { useState, useEffect } from "react";
import { BarChart2, Download, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { getStats, getHistory, getDownloadUrl } from "../services/api";
import { Loader } from "../components/ui/Loader";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

export function Reports() {
  const [stats, setStats]   = useState(null);
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, h] = await Promise.all([getStats(), getHistory(20)]);
        setStats(s);
        setItems(h.items || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader /></div>;

  // Build chart data from history items
  const chartData = items
    .slice()
    .reverse()
    .map((item, i) => ({
      name: `Scan ${i + 1}`,
      score: item.shelf_score ?? 0,
      occupancy: Math.round(item.report?.overall_occupancy ?? 0),
      empty: item.report?.total_empty_slots ?? 0,
    }));

  const kpis = [
    { label: "Total Scans", value: stats?.total_scans ?? 0, color: "#4F46E5", icon: BarChart2 },
    { label: "Avg Shelf Score", value: `${stats?.avg_shelf_score ?? 0}/100`, color: "#4F46E5", icon: TrendingUp },
    { label: "Avg Occupancy", value: `${stats?.avg_occupancy ?? 0}%`, color: "#F59E0B", icon: TrendingUp },
    { label: "Total Empty Slots Found", value: stats?.total_empty_slots ?? 0, color: "#EF4444", icon: TrendingDown },
    { label: "Total Products Found", value: stats?.total_products_found ?? 0, color: "#22C55E", icon: TrendingUp },
    { label: "Last Alert Status", value: stats?.recent_alert ?? "—", color: stats?.recent_alert === "Critical" ? "#EF4444" : stats?.recent_alert === "Warning" ? "#F59E0B" : "#22C55E", icon: BarChart2 },
  ];

  return (
    <div className="flex flex-col gap-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Reports & Analytics</h1>
          <p className="text-sm text-[#64748B] mt-1">Aggregated insights across all shelf analyses</p>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi, i) => (
          <Card key={i} className="border-[#E2E8F0]">
            <CardContent className="p-5">
              <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wide mb-2">{kpi.label}</p>
              <p className="text-2xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      {chartData.length > 0 ? (
        <div className="grid grid-cols-2 gap-6">
          <Card className="border-[#E2E8F0]">
            <CardHeader className="py-4 border-b border-[#E2E8F0]">
              <CardTitle className="text-[12px] font-bold tracking-wider text-[#0F172A] uppercase">Shelf Score Over Time</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94A3B8" }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#94A3B8" }} />
                    <Tooltip contentStyle={{ border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: 12 }} />
                    <Area type="monotone" dataKey="score" stroke="#4F46E5" strokeWidth={2.5} fill="url(#scoreGradient)" dot={{ r: 4, fill: "#4F46E5", stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }} name="Shelf Score" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#E2E8F0]">
            <CardHeader className="py-4 border-b border-[#E2E8F0]">
              <CardTitle className="text-[12px] font-bold tracking-wider text-[#0F172A] uppercase">Occupancy & Empty Slots</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94A3B8" }} />
                    <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} />
                    <Tooltip contentStyle={{ border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: 12 }} />
                    <Bar dataKey="occupancy" fill="#4F46E5" radius={[4,4,0,0]} name="Occupancy %" />
                    <Bar dataKey="empty" fill="#EF4444" radius={[4,4,0,0]} name="Empty Slots" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="border-[#E2E8F0]">
          <CardContent className="py-16 flex flex-col items-center gap-2 text-[#94A3B8]">
            <BarChart2 className="h-12 w-12" />
            <p className="text-sm font-semibold">No data yet</p>
            <p className="text-xs">Run some analyses to see charts here</p>
          </CardContent>
        </Card>
      )}

      {/* Reports Table */}
      {items.length > 0 && (
        <Card className="border-[#E2E8F0]">
          <CardHeader className="py-4 border-b border-[#E2E8F0]">
            <CardTitle className="text-[12px] font-bold tracking-wider text-[#0F172A] uppercase">Downloadable Reports</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  {["File", "Date", "Score", "Alert", "Download"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-[#64748B] uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 text-sm font-semibold text-[#334155]">{item.filename}</td>
                    <td className="px-4 py-3 text-xs text-[#64748B]">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-[#4F46E5]">{item.shelf_score}/100</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.report?.overall_alert === "Critical" ? "bg-[#FEE2E2] text-[#DC2626]" :
                        item.report?.overall_alert === "Warning" ? "bg-[#FEF3C7] text-[#D97706]" : "bg-[#DCFCE7] text-[#16A34A]"
                      }`}>{item.report?.overall_alert ?? "OK"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <a href={getDownloadUrl(item._id, "json")} download>
                          <button className="text-[10px] font-bold px-2 py-1 rounded border border-[#E2E8F0] hover:bg-[#EEF2FF] text-[#4F46E5] transition-colors">
                            JSON
                          </button>
                        </a>
                        <a href={getDownloadUrl(item._id, "csv")} download>
                          <button className="text-[10px] font-bold px-2 py-1 rounded border border-[#E2E8F0] hover:bg-[#EEF2FF] text-[#4F46E5] transition-colors">
                            CSV
                          </button>
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
