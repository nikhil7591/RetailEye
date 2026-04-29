/**
 * RowBreakdownTable — Per-row shelf data with progress bars and alert badges.
 */
export default function RowBreakdownTable({ rows }) {
  if (!rows || rows.length === 0) return null;

  const barColor = (alert) => {
    if (alert === "OK") return "bg-emerald-500";
    if (alert === "Warning") return "bg-amber-500";
    return "bg-red-500";
  };

  const badgeClass = (alert) => {
    if (alert === "OK") return "badge badge-ok";
    if (alert === "Warning") return "badge badge-warning";
    return "badge badge-critical";
  };

  return (
    <div id="row-breakdown" className="glass-card overflow-x-auto !p-0">
      <div className="px-6 pt-5 pb-3">
        <h3 className="text-base font-bold tracking-tight">Row Breakdown</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">Per-row occupancy and product details</p>
      </div>
      <table className="data-table w-full">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700">
            <th>Row</th>
            <th>Zone</th>
            <th className="min-w-[160px]">Occupancy</th>
            <th>Products</th>
            <th>Empty</th>
            <th>Alert</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const products = (row.products || [])
              .map((p) => `${p.name}${p.quantity > 1 ? ` ×${p.quantity}` : ""}`)
              .join(", ");

            return (
              <tr key={row.row_id}>
                <td className="font-semibold">Row {row.row_id + 1}</td>
                <td>
                  <span className="inline-block rounded-lg bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
                    {row.zone_label}
                  </span>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="progress-bar flex-1">
                      <div
                        className={`progress-fill ${barColor(row.alert)}`}
                        style={{ width: `${Math.min(row.occupancy_percent, 100)}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-xs font-semibold">
                      {row.occupancy_percent}%
                    </span>
                  </div>
                </td>
                <td className="max-w-[200px] truncate text-xs">{products || "—"}</td>
                <td className="text-center font-semibold">{row.empty_slots}</td>
                <td>
                  <span className={badgeClass(row.alert)}>{row.alert}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
