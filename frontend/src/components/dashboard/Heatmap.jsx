import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";

export function Heatmap() {
  const rows = [5, 4, 3, 2, 1];
  const cols = [1, 2, 3, 4, 5, 6, 7, 8];

  const getColor = (r, c) => {
    // Generate gradient colors: Green (left/top) to Red (right/bottom)
    // Actually, image is Green left, Yellow middle, Red right. 
    // Wait, the prompt says "Green on the left / top, yellow in the middle, red on the right / bottom"
    if (c <= 3) return "bg-[#4ADE80]"; // Green
    if (c <= 6) return "bg-[#FBBF24]"; // Yellow
    return "bg-[#F87171]"; // Red
  };

  return (
    <Card className="h-full border-[#E2E8F0]">
      <CardHeader className="py-5 border-b border-[#E2E8F0]">
        <CardTitle className="text-[12px] font-bold tracking-wider text-[#0F172A] uppercase">SHELF HEATMAP</CardTitle>
      </CardHeader>
      <CardContent className="p-6 pb-5 flex flex-col justify-between h-[calc(100%-61px)]">
        
        <div className="flex">
          {/* Row Labels */}
          <div className="flex flex-col justify-between pr-4 py-1 text-[10px] font-semibold text-[#64748B]">
            {rows.map((r) => <span key={`r-${r}`} className="h-5 flex items-center">Row {r}</span>)}
          </div>
          
          {/* Grid */}
          <div className="flex-1">
            <div className="grid grid-cols-8 gap-1.5 h-full">
              {rows.map((r) => 
                cols.map((c) => (
                  <div
                    key={`cell-${r}-${c}`}
                    className={`h-5 w-full rounded-[3px] ${getColor(r, c)}`}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Col Labels */}
        <div className="flex ml-11 mt-2">
          <div className="grid grid-cols-8 gap-1.5 w-full">
            {cols.map((c) => (
              <span key={`c-${c}`} className="text-center text-[10px] font-semibold text-[#64748B]">
                Col {c}
              </span>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-col gap-2">
          <div className="h-2 w-full rounded-full bg-gradient-to-r from-[#4ADE80] via-[#FBBF24] to-[#F87171]"></div>
          <div className="flex justify-between text-[10px] font-semibold text-[#64748B]">
            <span>Always Stocked</span>
            <span>Chronically Empty</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
