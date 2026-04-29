import { useState, useEffect } from "react";
import { Search, Filter, Trash2, Eye, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { getHistory, deleteHistoryItem, getFileUrl } from "../services/api";
import { Loader } from "../components/ui/Loader";
import { cn } from "../lib/utils";

function StatusBadge({ status }) {
  const colors = {
    "Excellent":       "bg-[#DCFCE7] text-[#16A34A] border-[#86EFAC]",
    "Good":            "bg-[#DCFCE7] text-[#16A34A] border-[#86EFAC]",
    "Needs Attention": "bg-[#FEF3C7] text-[#D97706] border-[#FCD34D]",
    "Critical":        "bg-[#FEE2E2] text-[#DC2626] border-[#FCA5A5]",
  };
  return (
    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded border", colors[status] || colors["Needs Attention"])}>
      {status}
    </span>
  );
}

export function History() {
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [page, setPage]         = useState(0);
  const [total, setTotal]       = useState(0);
  const [selected, setSelected] = useState(null); // detail modal
  const LIMIT = 10;

  const load = async () => {
    setLoading(true);
    try {
      const data = await getHistory(LIMIT, page * LIMIT);
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page]);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm("Delete this analysis?")) return;
    await deleteHistoryItem(id);
    load();
  };

  const mapItem = (item, idx) => {
    const score = item.shelf_score ?? 0;
    const alert = item.report?.overall_alert ?? "OK";
    let status = "Excellent";
    if (alert === "Critical" || score < 50) status = "Critical";
    else if (alert === "Warning" || score < 70) status = "Needs Attention";
    else if (score < 85) status = "Good";
    return {
      _id: item._id, idx: page * LIMIT + idx + 1,
      file: item.filename || "unknown.jpg",
      type: item.file_type || "image",
      time: item.created_at ? new Date(item.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—",
      score, occupancy: Math.round(item.report?.overall_occupancy ?? 0),
      empty: item.report?.total_empty_slots ?? 0, status,
      processed_image_url: item.processed_image_url,
      report: item.report,
    };
  };

  const filtered = items
    .map(mapItem)
    .filter(it => !search || it.file.toLowerCase().includes(search.toLowerCase()) || it.status.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col gap-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Analysis History</h1>
          <p className="text-sm text-[#64748B] mt-1">{total} total scan{total !== 1 ? "s" : ""} stored in database</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search files…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-9 w-52 rounded-lg border border-[#E2E8F0] pl-9 pr-4 text-sm focus:outline-none focus:border-[#4F46E5] transition-colors"
            />
          </div>
        </div>
      </div>

      <Card className="border-[#E2E8F0]">
        <CardHeader className="py-4 border-b border-[#E2E8F0]">
          <CardTitle className="text-[12px] font-bold tracking-wider text-[#0F172A] uppercase">All Analyses</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-[#94A3B8]">
              <p className="text-sm font-semibold">No analyses found</p>
              <p className="text-xs">Upload images to see results here</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  {["#", "File Name", "Date & Time", "Shelf Score", "Occupancy", "Empty Slots", "Status", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-[#64748B] uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(row => (
                  <tr
                    key={row._id}
                    className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC] cursor-pointer transition-colors"
                    onClick={() => setSelected(row)}
                  >
                    <td className="px-4 py-3 text-xs font-mono text-[#94A3B8]">{String(row.idx).padStart(2,"0")}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-[#334155]">{row.file}</p>
                      <p className="text-[10px] text-[#94A3B8] capitalize">{row.type}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#64748B]">{row.time}</td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold text-[#4F46E5]">{row.score}</span>
                      <span className="text-xs text-[#94A3B8]">/100</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#64748B] font-medium">{row.occupancy}%</td>
                    <td className="px-4 py-3 text-sm text-[#64748B] font-medium">{row.empty}</td>
                    <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelected(row)} className="p-1.5 rounded hover:bg-[#EEF2FF] text-[#94A3B8] hover:text-[#4F46E5] transition-colors">
                          <Eye className="h-4 w-4" />
                        </button>
                        {row._id && (
                          <a href={`http://localhost:8000/download/${row._id}/csv`} download onClick={e => e.stopPropagation()}>
                            <button className="p-1.5 rounded hover:bg-[#EEF2FF] text-[#94A3B8] hover:text-[#4F46E5] transition-colors">
                              <Download className="h-4 w-4" />
                            </button>
                          </a>
                        )}
                        <button onClick={(e) => handleDelete(row._id, e)} className="p-1.5 rounded hover:bg-[#FEE2E2] text-[#94A3B8] hover:text-[#EF4444] transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {total > LIMIT && (
            <div className="flex items-center justify-between px-4 py-4 border-t border-[#F1F5F9]">
              <p className="text-xs text-[#64748B]">
                Showing {page * LIMIT + 1}–{Math.min((page + 1) * LIMIT, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-1.5 rounded-lg border border-[#E2E8F0] disabled:opacity-40 hover:bg-[#F1F5F9] transition-colors"
                >
                  <ChevronLeft className="h-4 w-4 text-[#64748B]" />
                </button>
                <span className="text-xs font-medium text-[#64748B]">Page {page + 1} of {Math.ceil(total / LIMIT)}</span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={(page + 1) * LIMIT >= total}
                  className="p-1.5 rounded-lg border border-[#E2E8F0] disabled:opacity-40 hover:bg-[#F1F5F9] transition-colors"
                >
                  <ChevronRight className="h-4 w-4 text-[#64748B]" />
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-[#0F172A]/40 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="w-[480px] bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-[#E2E8F0] sticky top-0 bg-white z-10">
              <h2 className="font-bold text-[#0F172A]">{selected.file}</h2>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-[#F1F5F9] text-[#64748B]">✕</button>
            </div>
            <div className="p-6 flex flex-col gap-5">
              {selected.processed_image_url && (
                <img src={getFileUrl(selected.processed_image_url)} alt="result" className="w-full rounded-xl border border-[#E2E8F0]" />
              )}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Shelf Score", value: `${selected.score}/100`, color: "#4F46E5" },
                  { label: "Occupancy", value: `${selected.occupancy}%`, color: "#F59E0B" },
                  { label: "Empty Slots", value: selected.empty, color: "#EF4444" },
                  { label: "Status", value: selected.status, color: "#22C55E" },
                ].map((k, i) => (
                  <div key={i} className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <p className="text-[11px] font-bold text-[#64748B] uppercase">{k.label}</p>
                    <p className="text-xl font-bold mt-1" style={{ color: k.color }}>{k.value}</p>
                  </div>
                ))}
              </div>
              {selected.report?.rows?.map((row, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-[#334155]">Row {row.row_id} — {row.zone_label}</span>
                    <span className="text-xs font-bold text-[#4F46E5]">{row.occupancy_percent}%</span>
                  </div>
                  <div className="h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-[#4F46E5]" style={{ width: `${row.occupancy_percent}%` }} />
                  </div>
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                {selected._id && (
                  <>
                    <a href={`http://localhost:8000/download/${selected._id}/json`} download className="flex-1">
                      <Button variant="outline" className="w-full gap-2 text-xs"><Download className="h-3.5 w-3.5" /> JSON</Button>
                    </a>
                    <a href={`http://localhost:8000/download/${selected._id}/csv`} download className="flex-1">
                      <Button variant="outline" className="w-full gap-2 text-xs"><Download className="h-3.5 w-3.5" /> CSV</Button>
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
