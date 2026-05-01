import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/Table";
import { Badge } from "../ui/Badge";
import { Download, Eye } from "lucide-react";
import { Button } from "../ui/Button";

export function RecentTable({ data = [] }) {
  const getBadgeVariant = (status) => {
    switch (status) {
      case "Needs Attention": return "warning";
      case "Critical": return "critical";
      case "Good": return "success";
      case "Excellent": return "success";
      default: return "outline";
    }
  };

  const getBadgeColor = (status) => {
    switch (status) {
      case "Needs Attention": return "text-[#F59E0B] border-[#F59E0B] bg-[#FEF3C7]";
      case "Critical": return "text-[#EF4444] border-[#EF4444] bg-[#FEE2E2]";
      case "Good": return "text-[#22C55E] border-[#22C55E] bg-[#DCFCE7]";
      case "Excellent": return "text-[#22C55E] border-[#22C55E] bg-[#DCFCE7]";
      default: return "text-[#64748B] border-[#E2E8F0] bg-white";
    }
  }

  return (
    <Card className="h-full flex flex-col overflow-hidden border-[#E2E8F0]">
      <CardHeader className="py-5 border-b border-[#E2E8F0] flex flex-row items-center justify-between">
        <CardTitle className="text-[12px] font-bold tracking-wider text-[#0F172A] uppercase">RECENT ANALYSIS</CardTitle>
        <Button variant="outline" size="sm" className="h-[34px] px-2 sm:px-4 text-xs font-semibold text-[#4F46E5] border-[#E0E7FF] bg-[#FFFFFF] hover:bg-[#EEF2FF] shadow-sm rounded-lg flex items-center justify-center">
          <Download className="sm:mr-2 h-3.5 w-3.5" />
          <span className="hidden sm:inline">Export Report</span>
        </Button>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow className="bg-[#FFFFFF] hover:bg-[#FFFFFF] border-b border-[#E2E8F0]">
              <TableHead className="w-10 sm:w-12 h-10 text-[11px] font-bold text-[#64748B]">#</TableHead>
              <TableHead className="h-10 text-[11px] font-bold text-[#64748B]">File Name</TableHead>
              <TableHead className="h-10 text-[11px] font-bold text-[#64748B] whitespace-nowrap">Date & Time</TableHead>
              <TableHead className="h-10 text-center text-[11px] font-bold text-[#64748B]">Shelf Score</TableHead>
              <TableHead className="h-10 text-center text-[11px] font-bold text-[#64748B]">Occupancy</TableHead>
              <TableHead className="h-10 text-center text-[11px] font-bold text-[#64748B]">Empty Slots</TableHead>
              <TableHead className="h-10 text-center text-[11px] font-bold text-[#64748B]">Status</TableHead>
              <TableHead className="h-10 text-right text-[11px] font-bold text-[#64748B]">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((analysis) => (
              <TableRow key={analysis.id} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC]">
                <TableCell className="font-semibold text-[#334155] text-xs h-12">{analysis.id}</TableCell>
                <TableCell className="font-semibold text-[#334155] text-xs h-12 max-w-[120px] sm:max-w-none truncate">{analysis.file}</TableCell>
                <TableCell className="text-[#64748B] font-medium text-xs h-12 whitespace-nowrap">{analysis.time}</TableCell>
                <TableCell className="text-center font-semibold text-[#334155] text-xs h-12 whitespace-nowrap">{analysis.score}/100</TableCell>
                <TableCell className="text-center font-semibold text-[#64748B] text-xs h-12">{analysis.occupancy}%</TableCell>
                <TableCell className="text-center font-semibold text-[#64748B] text-xs h-12">{analysis.empty}</TableCell>
                <TableCell className="text-center h-12">
                  <div className={`inline-flex items-center justify-center border px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide min-w-[100px] ${getBadgeColor(analysis.status)}`}>
                    {analysis.status}
                  </div>
                </TableCell>
                <TableCell className="text-right h-12">
                  <button className="p-1.5 text-[#94A3B8] hover:text-[#0F172A] transition-colors rounded-md hover:bg-[#F1F5F9]">
                    <Eye className="h-4 w-4" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
