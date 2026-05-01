import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { getHeatmapStats } from "../../services/api";

/**
 * Heatmap shows per-row occupancy history across recent scans.
 * Columns = recent scans (oldest → newest), Rows = shelf rows.
 * Falls back to current report rows if heatmap API has no data yet.
 */
export function Heatmap({ rows = [] }) {
  const [heatData, setHeatData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getHeatmapStats(8)
      .then((data) => { if (!cancelled) setHeatData(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const getColor = (occupancy) => {
    if (occupancy >= 70) return "bg-[#4ADE80]";
    if (occupancy >= 40) return "bg-[#FBBF24]";
    return "bg-[#F87171]";
  };

  // Use heatmap API data if available, otherwise fall back to current rows
  const heatRows = heatData?.rows?.length ? heatData.rows : null;
  const scanCount = heatData?.scan_count ?? 0;

  // If no history at all, show current report rows as single-column
  if (!heatRows && rows.length === 0) {
    return (
      <Card className="h-full border-[#E2E8F0]">
        <CardHeader className="py-5 border-b border-[#E2E8F0]">
          <CardTitle className="text-[12px] font-bold tracking-wider text-[#0F172A] uppercase">SHELF HEATMAP</CardTitle>
        </CardHeader>
        <CardContent className="p-6 flex items-center justify-center h-[calc(100%-61px)]">
          <p className="text-sm text-[#94A3B8]">No data — run an analysis first</p>
        </CardContent>
      </Card>
    );
  }

  // Determine the max number of columns (scans)
  const maxCols = heatRows
    ? Math.max(...heatRows.map((r) => r.history?.length ?? 0), 1)
    : 1;

  const displayRows = heatRows ?? rows.map((r) => ({
    row_id: r.row_id ?? 0,
    row_display: r.row_display ?? (r.row_id ?? 0) + 1,
    zone_label: r.zone_label ?? "Row",
    history: [r.occupancy_percent ?? 0],
    avg_occupancy: r.occupancy_percent ?? 0,
  }));

  return (
    <Card className="h-full border-[#E2E8F0]">
      <CardHeader className="py-5 border-b border-[#E2E8F0]">
        <CardTitle className="text-[12px] font-bold tracking-wider text-[#0F172A] uppercase">
          SHELF HEATMAP
          {scanCount > 0 && (
            <span className="ml-2 text-[10px] font-semibold text-[#94A3B8] normal-case">
              ({scanCount} scan{scanCount !== 1 ? "s" : ""})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 pb-5 flex flex-col justify-between h-[calc(100%-61px)]">

        <div className="flex">
          {/* Row Labels */}
          <div className="flex flex-col justify-between pr-3 py-0.5 text-[10px] font-semibold text-[#64748B] shrink-0">
            {displayRows.map((r) => (
              <span key={`r-${r.row_id}`} className="h-5 flex items-center whitespace-nowrap">
                Row {r.row_display ?? r.row_id + 1}
              </span>
            ))}
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-hidden">
            <div
              className="grid gap-1.5 h-full"
              style={{ gridTemplateColumns: `repeat(${maxCols}, minmax(0, 1fr))` }}
            >
              {displayRows.map((r) => {
                const hist = r.history ?? [];
                // Pad with nulls if this row has fewer entries
                const cells = Array.from({ length: maxCols }, (_, i) =>
                  i < hist.length ? hist[i] : null
                );
                return cells.map((val, ci) => (
                  <div
                    key={`cell-${r.row_id}-${ci}`}
                    className={`h-5 w-full rounded-[3px] ${val != null ? getColor(val) : "bg-[#F1F5F9]"}`}
                    title={val != null ? `${val}% occupancy` : "No data"}
                  />
                ));
              })}
            </div>
          </div>
        </div>

        {/* Column Labels */}
        {maxCols > 1 && (
          <div className="flex ml-11 mt-2">
            <div
              className="grid gap-1.5 w-full"
              style={{ gridTemplateColumns: `repeat(${maxCols}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: maxCols }, (_, i) => (
                <span key={`c-${i}`} className="text-center text-[9px] font-semibold text-[#94A3B8]">
                  {i === 0 ? "Oldest" : i === maxCols - 1 ? "Latest" : ""}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="mt-6 flex flex-col gap-2">
          <div className="h-2 w-full rounded-full bg-gradient-to-r from-[#4ADE80] via-[#FBBF24] to-[#F87171]"></div>
          <div className="flex justify-between text-[10px] font-semibold text-[#64748B]">
            <span>Always Stocked</span>
            <span>Chronically Empty</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
