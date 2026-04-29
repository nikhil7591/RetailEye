import { useState } from "react";
import { UploadCloud, ArrowLeftRight, Loader2, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { analyzeImage, getFileUrl } from "../services/api";
import { cn } from "../lib/utils";

function UploadSlot({ label, result, onFile, loading }) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (file) => { if (file && onFile) onFile(file); };

  const imageSrc = result?.processed_image_url ? getFileUrl(result.processed_image_url) : null;

  return (
    <Card className="border-[#E2E8F0] flex flex-col h-full">
      <CardHeader className="py-4 border-b border-[#E2E8F0] flex flex-row items-center justify-between">
        <CardTitle className="text-[12px] font-bold tracking-wider text-[#0F172A] uppercase">{label}</CardTitle>
        {result && (
          <span className="text-[10px] font-bold text-[#4F46E5] bg-[#EEF2FF] px-2 py-1 rounded">
            Score: {result.shelf_score}/100
          </span>
        )}
      </CardHeader>
      <CardContent className="flex-1 p-4 flex flex-col gap-3">
        {/* Image or drop zone */}
        <div
          className={cn(
            "flex-1 min-h-[260px] rounded-xl overflow-hidden transition-all",
            !imageSrc ? cn(
              "border-2 border-dashed flex items-center justify-center flex-col gap-3 cursor-pointer",
              isDragging ? "border-[#4F46E5] bg-[#EEF2FF]" : "border-[#C7D2FE] hover:border-[#4F46E5]"
            ) : "bg-[#0F172A] relative"
          )}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={e => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
          onClick={() => {
            if (!imageSrc) {
              const inp = document.createElement("input");
              inp.type = "file"; inp.accept = "image/*";
              inp.onchange = e => { if (e.target.files[0]) handleFile(e.target.files[0]); };
              inp.click();
            }
          }}
        >
          {loading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 text-[#4F46E5] animate-spin" />
              <p className="text-sm font-semibold text-[#64748B]">Analyzing…</p>
            </div>
          ) : imageSrc ? (
            <img src={imageSrc} alt={label} className="w-full h-full object-contain" />
          ) : (
            <>
              <UploadCloud className="h-8 w-8 text-[#4F46E5]" />
              <p className="text-sm font-semibold text-[#334155]">Upload {label}</p>
              <p className="text-xs text-[#94A3B8]">Drag & drop or click</p>
            </>
          )}
        </div>

        {/* Row stats */}
        {result?.report?.rows?.length > 0 && (
          <div className="flex flex-col gap-2">
            {result.report.rows.map((row, i) => {
              const occ = row.occupancy_percent ?? 0;
              const color = row.alert === "Critical" ? "#EF4444" : row.alert === "Warning" ? "#F59E0B" : "#22C55E";
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[11px] text-[#64748B] w-20 truncate shrink-0">{row.zone_label}</span>
                  <div className="flex-1 h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${occ}%`, backgroundColor: color }} />
                  </div>
                  <span className="text-[11px] font-bold w-8 text-right" style={{ color }}>{occ}%</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function BeforeAfter() {
  const [before, setBefore]       = useState(null);
  const [after, setAfter]         = useState(null);
  const [loadingBefore, setLB]    = useState(false);
  const [loadingAfter, setLA]     = useState(false);
  const [error, setError]         = useState(null);

  const handleBefore = async (file) => {
    setLB(true); setError(null);
    try { setBefore(await analyzeImage(file)); }
    catch (e) { setError(e.message); }
    finally { setLB(false); }
  };

  const handleAfter = async (file) => {
    setLA(true); setError(null);
    try { setAfter(await analyzeImage(file)); }
    catch (e) { setError(e.message); }
    finally { setLA(false); }
  };

  const scoreDiff = before && after ? (after.shelf_score - before.shelf_score) : null;
  const occDiff   = before && after
    ? ((after.report?.overall_occupancy ?? 0) - (before.report?.overall_occupancy ?? 0)).toFixed(1)
    : null;
  const emptyDiff = before && after
    ? ((after.report?.total_empty_slots ?? 0) - (before.report?.total_empty_slots ?? 0))
    : null;

  return (
    <div className="flex flex-col gap-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">Before / After Comparison</h1>
        <p className="text-sm text-[#64748B] mt-1">Compare two shelf states to measure improvement</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-[#FEE2E2] border border-[#FCA5A5]">
          <AlertCircle className="h-5 w-5 text-[#EF4444]" />
          <p className="text-sm text-[#DC2626]">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <UploadSlot label="Before" result={before} onFile={handleBefore} loading={loadingBefore} />
        <UploadSlot label="After"  result={after}  onFile={handleAfter}  loading={loadingAfter}  />
      </div>

      {/* Diff summary */}
      {before && after && (
        <Card className="border-[#E2E8F0]">
          <CardHeader className="py-4 border-b border-[#E2E8F0]">
            <CardTitle className="text-[12px] font-bold tracking-wider text-[#0F172A] uppercase flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4 text-[#4F46E5]" />
              Comparison Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-3 gap-6">
            {[
              { label: "Shelf Score Change", value: scoreDiff, unit: "pts", positive: scoreDiff > 0 },
              { label: "Occupancy Change", value: occDiff, unit: "%", positive: Number(occDiff) > 0 },
              { label: "Empty Slots Change", value: emptyDiff, unit: "", positive: emptyDiff < 0 },
            ].map((item, i) => (
              <div key={i} className="flex flex-col gap-1">
                <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wide">{item.label}</p>
                <p className={cn("text-3xl font-bold", item.positive ? "text-[#22C55E]" : item.value === 0 ? "text-[#64748B]" : "text-[#EF4444]")}>
                  {item.value > 0 ? "+" : ""}{item.value}{item.unit}
                </p>
                <p className="text-xs text-[#94A3B8]">
                  {item.positive ? "Improvement" : item.value === 0 ? "No change" : "Decline"}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
