import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export function ShelfHealthScore({ score = 67, label = "FAIR" }) {
  const data = [
    { name: "Score", value: score },
    { name: "Remaining", value: 100 - score },
  ];

  return (
    <Card className="h-full border-[#E2E8F0]">
      <CardHeader className="py-5 border-b border-[#E2E8F0]">
        <CardTitle className="text-[12px] font-bold tracking-wider text-[#0F172A] uppercase">SHELF HEALTH SCORE</CardTitle>
      </CardHeader>
      <CardContent className="p-6 flex flex-col items-center justify-center h-[calc(100%-61px)]">
        <div className="relative h-[200px] w-[200px] flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                innerRadius={75}
                outerRadius={95}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                stroke="none"
                cornerRadius={10}
              >
                <Cell fill="#4F46E5" /> {/* Indigo */}
                <Cell fill="#EEF2FF" /> {/* Light Indigo */}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-[44px] font-bold text-[#0F172A] leading-none tracking-tight">{score}</span>
            <span className="text-[13px] font-semibold text-[#64748B] mt-1">/100</span>
          </div>
        </div>
        <div className="mt-8 text-center flex flex-col gap-1">
          <h3 className="text-[18px] font-bold text-[#F59E0B] tracking-wide uppercase">{label}</h3>
          <p className="text-[13px] font-medium text-[#64748B]">Shelf Health Score</p>
        </div>
      </CardContent>
    </Card>
  );
}
