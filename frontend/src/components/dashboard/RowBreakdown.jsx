import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Badge } from "../ui/Badge";

export function RowBreakdown({ rows = [] }) {
  const getColors = (status) => {
    switch(status) {
      case "CRIT": return { bar: "bg-[#EF4444]", text: "text-[#EF4444]", badge: "critical" };
      case "WARN": return { bar: "bg-[#F59E0B]", text: "text-[#F59E0B]", badge: "warning" };
      default: return { bar: "bg-[#22C55E]", text: "text-[#64748B]", badge: "success" };
    }
  };

  return (
    <Card className="h-full border-[#E2E8F0]">
      <CardHeader className="py-5 border-b border-[#E2E8F0]">
        <CardTitle className="text-[11px] font-bold tracking-wider text-[#0F172A] uppercase">ROW BREAKDOWN ⓘ</CardTitle>
      </CardHeader>
      <CardContent className="p-6 flex flex-col overflow-y-auto custom-scrollbar h-[calc(100%-61px)]">
        <div className="flex flex-col w-full gap-5">
          {rows.map((row, idx) => {
            const colors = getColors(row.status);
            return (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-[#334155] w-24 truncate">{row.category}</span>
                <div className="flex-1 mx-4 h-2.5 rounded-full bg-[#F1F5F9] overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${colors.bar}`} 
                    style={{ width: `${row.occupancy}%` }} 
                  />
                </div>
                <div className="flex items-center gap-3 w-20 justify-end">
                  <span className={`text-[13px] font-bold ${colors.text}`}>{row.occupancy}%</span>
                  <Badge 
                    variant={colors.badge} 
                    className="w-10 justify-center text-[9px] uppercase h-5 px-0 tracking-wider"
                  >
                    {row.status}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
