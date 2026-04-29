/**
 * RestockList — Priority restock list sorted by urgency.
 */
export default function RestockList({ priority, rows }) {
  if (!priority || priority.length === 0) {
    return (
      <div id="restock-list" className="glass-card flex flex-col items-center justify-center py-10">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <p className="font-semibold text-emerald-700 dark:text-emerald-400">All shelves stocked!</p>
        <p className="mt-1 text-xs text-slate-500">No restocking needed right now.</p>
      </div>
    );
  }

  // Determine criticality from the rows data
  const rowMap = {};
  (rows || []).forEach((r) => {
    rowMap[r.row_id] = r;
  });

  return (
    <div id="restock-list" className="glass-card">
      <h3 className="mb-1 text-base font-bold tracking-tight">Restock Priority</h3>
      <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
        Sorted by urgency — critical first
      </p>

      <ol className="space-y-2">
        {priority.map((item, idx) => {
          // Extract row number from the priority string (e.g. "Row 3 - Dairy Zone (18%)")
          const rowNumMatch = item.match(/Row\s+(\d+)/i);
          const rowNum = rowNumMatch ? parseInt(rowNumMatch[1], 10) : null;
          const rowData = rowNum !== null ? rowMap[rowNum - 1] : null;
          const isCritical = rowData?.alert === "Critical";

          return (
            <li
              key={idx}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-colors ${
                isCritical
                  ? "border-l-4 border-red-400 border-t-red-100 border-r-red-100 border-b-red-100 bg-red-50/60 dark:border-t-red-900/30 dark:border-r-red-900/30 dark:border-b-red-900/30 dark:bg-red-900/20"
                  : "border-amber-200 bg-amber-50/60 dark:border-amber-800/30 dark:bg-amber-900/20"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-xs font-bold shadow-sm dark:bg-slate-700">
                  {idx + 1}
                </span>
                <span className="text-sm font-medium">{item}</span>
              </div>
              <span
                className={`badge text-[10px] ${isCritical ? "badge-critical" : "badge-warning"}`}
              >
                {isCritical ? "RESTOCK NOW" : "LOW STOCK"}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
