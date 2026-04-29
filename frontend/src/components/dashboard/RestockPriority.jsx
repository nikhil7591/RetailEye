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
      <CardContent className="p-6 flex items-center justify-between h-[calc(100%-61px)]">
        
        <div className="relative h-28 w-28 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                innerRadius={35}
                outerRadius={50}
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
            <span className="text-xl font-bold text-[#0F172A] leading-none">3</span>
            <span className="text-[10px] font-semibold text-[#64748B] mt-0.5">Rows</span>
          </div>
        </div>

        <div className="flex flex-col gap-5 flex-1 ml-6">
          {data.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs font-semibold text-[#334155]">
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
