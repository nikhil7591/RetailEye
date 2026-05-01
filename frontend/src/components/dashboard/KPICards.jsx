import { Card, CardContent } from "../ui/Card";
import { AreaChart, Area, ResponsiveContainer, YAxis } from "recharts";
import { Star, AlertCircle, Box, Hexagon } from "lucide-react";

export function KPICards({ metrics, historyItems = [] }) {
  if (!metrics) return null;

  const history = historyItems.slice().reverse();
  const scoreData = history.map((i) => ({ value: i.shelf_score ?? 0 }));
  const occData = history.map((i) => ({ value: Math.round(i.report?.overall_occupancy ?? 0) }));
  const emptyData = history.map((i) => ({ value: i.report?.total_empty_slots ?? 0 }));
  const prodData = history.map((i) => ({ value: i.report?.total_products_detected ?? 0 }));

  const cards = [
    {
      title: "SHELF SCORE",
      value: `${metrics.shelfScore.value} /100`,
      subtitle: metrics.shelfScore.label,
      icon: Star,
      iconColor: "text-[#6366F1]",
      iconBg: "bg-[#EEF2FF]",
      chartColor: "#6366F1",
      chartData: scoreData,
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
      chartData: occData,
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
      chartData: emptyData,
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
      chartData: prodData,
      valueColor: "text-[#22C55E]"
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-6 xl:grid-cols-4">
      {cards.map((card, i) => (
        <Card key={i} className="border-[#E2E8F0]">
          <CardContent className="p-3 sm:p-6 flex flex-col h-full">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-2 sm:gap-0 relative">
              <div className="min-w-0 pr-8 sm:pr-0">
                <h3 className="text-[10px] sm:text-xs font-bold text-[#64748B] tracking-wider mb-1 sm:mb-2 leading-tight">{card.title} <span className="hidden sm:inline">ⓘ</span></h3>
                <div className="flex items-baseline gap-1 flex-wrap">
                  <span className={`text-xl sm:text-4xl font-bold ${card.valueColor || "text-[#0F172A]"}`}>
                    {card.value.toString().split(' ')[0]}
                  </span>
                  {card.value.toString().includes(' ') && (
                    <span className="text-sm sm:text-lg font-semibold text-[#64748B]">
                      {card.value.toString().split(' ')[1]}
                    </span>
                  )}
                </div>
                <p className="text-[10px] sm:text-[13px] font-medium text-[#64748B] mt-0.5 sm:mt-1 leading-tight">{card.subtitle}</p>
              </div>
              <div className={`absolute top-0 right-0 sm:relative flex h-7 w-7 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl shrink-0 ${card.iconBg}`}>
                <card.icon className={`h-3.5 w-3.5 sm:h-5 sm:w-5 ${card.iconColor}`} />
              </div>
            </div>
            
            <div className="mt-4 pt-2 h-14 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={card.chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`kpiGradient-${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={card.chartColor} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={card.chartColor} stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={card.chartColor}
                    strokeWidth={2.5}
                    fill={`url(#kpiGradient-${i})`}
                    dot={false}
                    isAnimationActive={true}
                    baseValue="0"
                  />
                  <YAxis hide domain={i < 2 ? [0, 100] : [0, "auto"]} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
