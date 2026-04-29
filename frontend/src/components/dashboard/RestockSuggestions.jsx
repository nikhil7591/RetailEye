import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Milk, Coffee, Droplets } from "lucide-react";

export function RestockSuggestions({ items = [] }) {
  const suggestions = items.length ? items : [
    { text: "Restock Dairy zone immediately — 79% empty, critical priority", icon: Milk },
    { text: "Replenish Snacks Row before afternoon peak hours", icon: Coffee },
    { text: "Check Beverages supplier — 13% drop vs yesterday", icon: Droplets },
  ];

  return (
    <Card className="h-full border-[#E2E8F0]">
      <CardHeader className="py-5 border-b border-[#E2E8F0]">
        <CardTitle className="text-[12px] font-bold tracking-wider text-[#0F172A] uppercase">AI RESTOCK SUGGESTIONS</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-[#F1F5F9] flex flex-col h-[calc(100%-61px)]">
          {suggestions.map((item, idx) => (
            <div key={idx} className="flex items-center gap-4 p-5 py-6">
              <div className="flex h-[26px] w-[26px] items-center justify-center rounded-full border border-[#C7D2FE] text-[12px] font-bold text-[#4F46E5] bg-transparent shrink-0">
                {idx + 1}
              </div>
              <p className="font-medium text-[13px] text-[#334155] flex-1 leading-snug">
                {item.text}
              </p>
              <div className="text-[#94A3B8] shrink-0">
                {item.icon ? <item.icon className="h-5 w-5" strokeWidth={1.5} /> : <Milk className="h-5 w-5" strokeWidth={1.5} />}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
