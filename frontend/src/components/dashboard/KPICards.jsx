import { Card, CardContent } from "../ui/Card";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { Star, AlertCircle, Box, Hexagon } from "lucide-react";

const data1 = [{ value: 40 }, { value: 30 }, { value: 55 }, { value: 45 }, { value: 70 }, { value: 65 }, { value: 80 }];
const data2 = [{ value: 60 }, { value: 55 }, { value: 65 }, { value: 60 }, { value: 75 }, { value: 60 }, { value: 85 }];
const data3 = [{ value: 10 }, { value: 15 }, { value: 12 }, { value: 18 }, { value: 14 }, { value: 20 }, { value: 16 }];
const data4 = [{ value: 20 }, { value: 22 }, { value: 21 }, { value: 25 }, { value: 23 }, { value: 28 }, { value: 26 }];

export function KPICards({ metrics }) {
  if (!metrics) return null;

  const cards = [
    {
      title: "SHELF SCORE",
      value: `${metrics.shelfScore.value} /100`,
      subtitle: metrics.shelfScore.label,
      icon: Star,
      iconColor: "text-[#6366F1]",
      iconBg: "bg-[#EEF2FF]",
      chartColor: "#6366F1",
      chartData: data1,
      valueColor: "text-[#6366F1]"
    },
    {
      title: "OCCUPANCY",
      value: `${metrics.occupancy.value}%`,
      subtitle: metrics.occupancy.label,
      icon: AlertCircle,
      iconColor: "text-[#F59E0B]",
      iconBg: "bg-[#FEF3C7]",
      chartColor: "#F59E0B",
      chartData: data2,
      valueColor: "text-[#F59E0B]"
    },
    {
      title: "EMPTY SLOTS",
      value: metrics.emptySlots.value,
      subtitle: metrics.emptySlots.label,
      icon: Box,
      iconColor: "text-[#EF4444]",
      iconBg: "bg-[#FEE2E2]",
      chartColor: "#EF4444",
      chartData: data3,
      valueColor: "text-[#EF4444]"
    },
    {
      title: "PRODUCTS FOUND",
      value: metrics.productsFound.value,
      subtitle: metrics.productsFound.label,
      icon: Hexagon,
      iconColor: "text-[#22C55E]",
      iconBg: "bg-[#DCFCE7]",
      chartColor: "#22C55E",
      chartData: data4,
      valueColor: "text-[#22C55E]"
    },
  ];

  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card, i) => (
        <Card key={i} className="border-[#E2E8F0]">
          <CardContent className="p-6 flex flex-col h-full">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xs font-bold text-[#64748B] tracking-wider mb-2">{card.title} ⓘ</h3>
                <div className="flex items-baseline gap-1">
                  <span className={`text-4xl font-bold ${card.valueColor || "text-[#0F172A]"}`}>
                    {card.value.toString().split(' ')[0]}
                  </span>
                  {card.value.toString().includes(' ') && (
                    <span className="text-lg font-semibold text-[#64748B]">
                      {card.value.toString().split(' ')[1]}
                    </span>
                  )}
                </div>
                <p className="text-[13px] font-medium text-[#64748B] mt-1">{card.subtitle}</p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.iconBg}`}>
                <card.icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
            </div>
            
            <div className="mt-4 pt-2 h-14 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={card.chartData}>
                  <defs>
                    <linearGradient id={`kpiGradient-${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={card.chartColor} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={card.chartColor} stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={card.chartColor}
                    strokeWidth={2}
                    fill={`url(#kpiGradient-${i})`}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
