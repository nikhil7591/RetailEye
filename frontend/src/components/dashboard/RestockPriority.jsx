import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export function RestockPriority() {
  const data = [
    { name: "Row 3 — Dairy Zone", value: 21, color: "#EF4444" },
    { name: "Row 2 — Snacks Zone", value: 54, color: "#F59E0B" },
    { name: "Row 1 — Beverages", value: 87, color: "#22C55E" },
  ];

  return (
    <Card className="h-full border-[#E2E8F0]">
      <CardHeader className="py-5 border-b border-[#E2E8F0]">
        <CardTitle className="text-[12px] font-bold tracking-wider text-[#0F172A] uppercase">RESTOCK PRIORITY</CardTitle>
      </CardHeader>
      <CardContent className="p-6 flex items-center justify-center gap-6 sm:gap-8 h-[calc(100%-61px)]">
        
        <div className="relative h-36 w-36 sm:h-44 sm:w-44 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                innerRadius="65%"
                outerRadius="85%"
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl sm:text-4xl font-bold text-[#0F172A] leading-none">3</span>
            <span className="text-[11px] sm:text-[13px] font-semibold text-[#64748B] mt-0.5 sm:mt-1">Rows</span>
          </div>
        </div>

        <div className="flex flex-col gap-5 items-start justify-center">
          {data.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between gap-4 sm:gap-6 w-full text-xs font-semibold text-[#334155]">
              <div className="flex items-center gap-2.5">
                <div className="h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: item.color }}></div>
                <span>{item.name}</span>
              </div>
              <span className="text-[#64748B]">{item.value}%</span>
            </div>
          ))}
        </div>

      </CardContent>
    </Card>
  );
}
