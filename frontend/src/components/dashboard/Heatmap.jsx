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
    if (occupancy >= 80) return "bg-[#22C55E]"; // Green
    if (occupancy >= 60) return "bg-[#84CC16]"; // Light green
    if (occupancy >= 40) return "bg-[#FBBF24]"; // Yellow
    if (occupancy >= 20) return "bg-[#F97316]"; // Orange
    return "bg-[#EF4444]"; // Red
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

  // Always show a minimum of 5 columns to maintain the matrix visual even with 1 scan
  const actualCols = heatRows
    ? Math.max(...heatRows.map((r) => r.history?.length ?? 0), 1)
    : 1;
  const maxCols = Math.max(actualCols, 5);

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

        <div className="flex w-full mt-2">
          {/* Row Labels */}
          <div className="flex flex-col justify-start pr-4 py-0.5 text-[11px] font-semibold text-[#64748B] shrink-0 gap-[2px]">
            {displayRows.map((r) => (
              <span key={`r-${r.row_id}`} className="h-8 sm:h-10 flex items-center justify-end whitespace-nowrap">
                Row {r.row_display ?? r.row_id + 1}
              </span>
            ))}
          </div>

          {/* Grid Area with Axes */}
          <div className="flex-1 overflow-hidden">
            <div className="w-full border-l-2 border-b-2 border-slate-200">
              <div
                className="grid gap-[2px] p-[2px] bg-white"
                style={{ gridTemplateColumns: `repeat(${maxCols}, 1fr)` }}
              >
                {displayRows.map((r) => {
                  const hist = r.history ?? [];
                  const cells = Array.from({ length: maxCols }, (_, i) => {
                    const offset = maxCols - actualCols;
                    const dataIndex = i - offset;
                    return dataIndex >= 0 && dataIndex < hist.length ? hist[dataIndex] : null;
                  });
                  return cells.map((val, ci) => (
                    <div
                      key={`cell-${r.row_id}-${ci}`}
                      className={`h-8 sm:h-10 w-full transition-all hover:opacity-80 relative group ${
                        val != null ? getColor(val) : ""
                      }`}
                      style={val == null ? {
                        background: "repeating-linear-gradient(45deg, #f8fafc, #f8fafc 5px, #f1f5f9 5px, #f1f5f9 10px)"
                      } : {}}
                    >
                      {/* Tooltip */}
                      {val != null && (
                        <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-[#0F172A] text-white text-[10px] py-1 px-2 rounded whitespace-nowrap pointer-events-none z-10 transition-opacity">
                          {val}%
                        </div>
                      )}
                    </div>
                  ));
                })}
              </div>
            </div>

            {/* Column Labels (X-Axis) */}
            <div
              className="grid gap-[2px] w-full mt-2 ml-[2px]"
              style={{ gridTemplateColumns: `repeat(${maxCols}, 1fr)` }}
            >
              {Array.from({ length: maxCols }, (_, i) => {
                const offset = maxCols - actualCols;
                const isDataPoint = i >= offset;
                const scanIndex = i - offset + 1;
                
                return (
                  <span key={`c-${i}`} className="text-center text-[10px] font-medium text-[#94A3B8]">
                    {isDataPoint ? `T-${actualCols - scanIndex + 1}` : ""}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-col gap-2">
          <div className="h-2 sm:h-2.5 w-full rounded-full bg-gradient-to-r from-[#22C55E] via-[#FBBF24] to-[#EF4444]"></div>
          <div className="flex justify-between text-[10px] font-semibold text-[#64748B]">
            <span>Always Stocked</span>
            <span>Chronically Empty</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
