import { useState, useRef } from "react";
import { UploadCloud, CheckCircle2, AlertCircle, Loader2, Download, RotateCcw, Eye, ZoomIn, ZoomOut } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { analyzeImage, analyzeVideo, getFileUrl, getDownloadUrl, BASE_URL } from "../services/api";
import { cn } from "../lib/utils";

const CATEGORY_COLORS = {
  Beverages: "#4F46E5", Snacks: "#22C55E", Dairy: "#F59E0B",
  "Personal Care": "#EF4444", "Empty Slot": "#94A3B8", Other: "#8B5CF6",
};

function ProgressSteps({ state }) {
  const steps = [
    { key: "uploading", label: "Upload" },
    { key: "processing", label: "AI Analysis" },
    { key: "done", label: "Results" },
  ];
  const activeIdx = state === "done" ? 2 : state === "processing" ? 1 : state === "uploading" ? 0 : -1;
  return (
    <div className="flex items-center gap-0 mt-4">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center">
          <div className={cn(
            "flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold border-2 transition-colors",
            i <= activeIdx ? "bg-[#4F46E5] border-[#4F46E5] text-white" : "bg-white border-[#E2E8F0] text-[#94A3B8]"
          )}>
            {i < activeIdx ? "✓" : i + 1}
          </div>
          <span className={cn("ml-1.5 text-[11px] font-semibold", i <= activeIdx ? "text-[#4F46E5]" : "text-[#94A3B8]")}>
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <div className={cn("w-10 h-0.5 mx-2", i < activeIdx ? "bg-[#4F46E5]" : "bg-[#E2E8F0]")} />
          )}
        </div>
      ))}
    </div>
  );
}

export function SingleAnalysis() {
  const [state, setState]       = useState("idle"); // idle|uploading|processing|done|error
  const [progress, setProgress] = useState(0);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState(null);
  const [zoom, setZoom]         = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const fileRef = useRef(null);
  const scrollContainerRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    setState("uploading");
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      const isVideo = file.type.startsWith("video/");
      const fn = isVideo ? analyzeVideo : analyzeImage;
      const res = await fn(file, (p) => {
        setProgress(p);
        if (p >= 50) setState("processing");
      });
      setProgress(100);
      setResult(res);
      setState("done");
    } catch (err) {
      setError(err.message);
      setState("error");
    }
  };

  const reset = () => { setState("idle"); setResult(null); setError(null); setZoom(1); };

  const reportRows  = result?.report?.rows ?? [];
  const imageSrc    = result?.processed_image_url ? getFileUrl(result.processed_image_url) : null;
  const shelfScore  = result?.shelf_score ?? 0;

  return (
    <div className="flex flex-col gap-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Single Analysis</h1>
          <p className="text-sm text-[#64748B] mt-1">Upload one shelf image or video for AI-powered analysis</p>
        </div>
        {state !== "idle" && (
          <Button variant="outline" onClick={reset} className="gap-2 text-[#64748B]">
            <RotateCcw className="h-4 w-4" /> New Analysis
          </Button>
        )}
      </div>

      {/* Upload Zone */}
      {state === "idle" && (
        <div
          className={cn(
            "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 sm:p-14 text-center transition-all cursor-pointer",
            isDragging ? "border-[#4F46E5] bg-[#EEF2FF]" : "border-[#C7D2FE] bg-[#EEF2FF]/30 hover:border-[#4F46E5]"
          )}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
          onClick={() => fileRef.current?.click()}
        >
          <UploadCloud className="h-14 w-14 text-[#4F46E5] mb-4" />
          <h2 className="text-lg font-bold text-[#0F172A]">Drag & Drop your shelf image or video</h2>
          <p className="text-sm text-[#64748B] mt-2">or click to browse files</p>
          <p className="text-xs text-[#94A3B8] mt-4">Supports JPG, PNG, MP4 · Max 100MB</p>
          <input ref={fileRef} type="file" className="hidden" accept="image/*,video/mp4"
            onChange={(e) => { if (e.target.files[0]) handleFile(e.target.files[0]); }} />
        </div>
      )}

      {/* Progress state */}
      {(state === "uploading" || state === "processing") && (
        <Card className="border-[#E2E8F0]">
          <CardContent className="p-8 flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 text-[#4F46E5] animate-spin" />
            <h2 className="text-base font-bold text-[#0F172A]">
              {state === "uploading" ? "Uploading your image..." : "AI is analyzing your shelf..."}
            </h2>
            <p className="text-sm text-[#64748B]">
              {state === "uploading" ? "Sending to RetailEye servers" : "Detecting products · Identifying brands"}
            </p>
            <div className="w-full max-w-md bg-[#E2E8F0] rounded-full h-2.5">
              <div className="h-full bg-[#4F46E5] rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <ProgressSteps state={state} />
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {state === "error" && (
        <Card className="border-[#FCA5A5]">
          <CardContent className="p-8 flex flex-col items-center gap-3">
            <AlertCircle className="h-10 w-10 text-[#EF4444]" />
            <h2 className="text-base font-bold text-[#0F172A]">Analysis Failed</h2>
            <p className="text-sm text-[#64748B]">{error}</p>
            <Button onClick={reset} className="mt-2">Try Again</Button>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {state === "done" && result && (
        <div className="flex flex-col gap-6">
          {/* Score banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 p-4 sm:p-5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
            <div className="flex items-center gap-4 w-full sm:w-auto flex-1">
              <CheckCircle2 className="h-8 w-8 text-[#22C55E] shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#64748B]">Analysis Complete</p>
                <p className="text-xs text-[#94A3B8] mt-0.5">{result.report?.timestamp ? new Date(result.report.timestamp).toLocaleString() : "Just now"}</p>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-6 sm:gap-8 border-t sm:border-t-0 border-[#E2E8F0] pt-4 sm:pt-0">
              <div className="text-left sm:text-right">
                <p className="text-2xl sm:text-3xl font-bold text-[#4F46E5]">{shelfScore}<span className="text-sm sm:text-base text-[#94A3B8] font-normal">/100</span></p>
                <p className="text-[10px] sm:text-xs font-semibold text-[#64748B] mt-0.5">Shelf Score</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
              {result.report_json_url && (
                <a href={result._id ? getDownloadUrl(result._id, "json") : `${BASE_URL}${result.report_json_url}`} download>
                  <Button variant="outline" size="sm" className="gap-1 text-xs"><Download className="h-3.5 w-3.5" /> JSON</Button>
                </a>
              )}
              {result.report_csv_url && (
                <a href={result._id ? getDownloadUrl(result._id, "csv") : `${BASE_URL}${result.report_csv_url}`} download>
                  <Button variant="outline" size="sm" className="gap-1 text-xs"><Download className="h-3.5 w-3.5" /> CSV</Button>
                </a>
              )}
              </div>
            </div>
          </div>

          {/* Image + row breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Annotated Image */}
            <div className="lg:col-span-7">
              <Card className="border-[#E2E8F0] h-full">
                <CardHeader className="py-4 border-b border-[#E2E8F0] flex flex-row items-center justify-between">
                  <CardTitle className="text-[12px] font-bold tracking-wider text-[#0F172A] uppercase">Annotated Output</CardTitle>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))} className="p-1.5 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#64748B]"><ZoomOut className="h-4 w-4"/></button>
                    <span className="text-xs font-mono text-[#64748B] w-10 text-center">{Math.round(zoom * 100)}%</span>
                    <button onClick={() => setZoom(z => Math.min(z + 0.25, 4))} className="p-1.5 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#64748B]"><ZoomIn className="h-4 w-4"/></button>
                    {zoom !== 1 && (
                      <button onClick={() => setZoom(1)} className="ml-1 px-2 py-1 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#64748B] text-[10px] font-semibold">Reset</button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div
                    ref={scrollContainerRef}
                    className="overflow-auto rounded-xl bg-[#0F172A] border border-[#1E293B] max-h-[420px]"
                    style={{ cursor: zoom > 1 ? (isPanning ? "grabbing" : "grab") : "default" }}
                    onWheel={(e) => {
                      if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        setZoom(z => Math.min(Math.max(z + (e.deltaY < 0 ? 0.15 : -0.15), 0.5), 4));
                      }
                    }}
                    onMouseDown={(e) => {
                      if (zoom > 1 && e.button === 0) {
                        setIsPanning(true);
                        setPanStart({ x: e.clientX + scrollContainerRef.current.scrollLeft, y: e.clientY + scrollContainerRef.current.scrollTop });
                      }
                    }}
                    onMouseMove={(e) => {
                      if (isPanning && scrollContainerRef.current) {
                        scrollContainerRef.current.scrollLeft = panStart.x - e.clientX;
                        scrollContainerRef.current.scrollTop = panStart.y - e.clientY;
                      }
                    }}
                    onMouseUp={() => setIsPanning(false)}
                    onMouseLeave={() => setIsPanning(false)}
                  >
                    <img
                      src={imageSrc}
                      alt="Annotated shelf"
                      draggable={false}
                      style={{
                        width: `${zoom * 100}%`,
                        display: "block",
                        userSelect: "none",
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Row Breakdown */}
            <div className="lg:col-span-5">
              <Card className="border-[#E2E8F0] h-full">
                <CardHeader className="py-4 border-b border-[#E2E8F0]">
                  <CardTitle className="text-[12px] font-bold tracking-wider text-[#0F172A] uppercase">Row Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="p-5 flex flex-col gap-5">
                  {reportRows.length === 0 ? (
                    <p className="text-sm text-[#94A3B8] text-center py-6">No row data</p>
                  ) : reportRows.map((row, i) => {
                    const occ = row.occupancy_percent ?? 0;
                    const barColor = row.alert === "Critical" ? "#EF4444" : row.alert === "Warning" ? "#F59E0B" : "#22C55E";
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold text-[#334155]">Row {row.row_display ?? row.row_id + 1} — {row.zone_label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold" style={{ color: barColor }}>{occ}%</span>
                            <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide",
                              row.alert === "Critical" ? "bg-[#FEE2E2] text-[#DC2626]" :
                              row.alert === "Warning" ? "bg-[#FEF3C7] text-[#D97706]" : "bg-[#DCFCE7] text-[#16A34A]"
                            )}>{row.alert}</span>
                          </div>
                        </div>
                        <div className="h-2.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${occ}%`, backgroundColor: barColor }} />
                        </div>
                        {row.products?.length > 0 && (
                          <p className="text-[10px] text-[#94A3B8] mt-1">
                            {row.products.slice(0, 3).map(p => `${p.name} (${p.quantity})`).join(" · ")}
                          </p>
                        )}
                      </div>
                    );
                  })}

                  {/* Restock priority */}
                  {result.report?.restock_priority?.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-[#F1F5F9]">
                      <p className="text-[11px] font-bold text-[#0F172A] uppercase tracking-wide mb-3">Restock Priority</p>
                      {result.report.restock_priority.map((item, i) => (
                        <div key={i} className="flex items-start gap-2 mb-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[#C7D2FE] text-[10px] font-bold text-[#4F46E5] shrink-0">{i+1}</span>
                          <p className="text-xs text-[#334155]">{item}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Shelf Score", value: `${shelfScore}/100`, color: "#4F46E5" },
              { label: "Occupancy", value: `${result.report?.overall_occupancy ?? 0}%`, color: "#F59E0B" },
              { label: "Empty Slots", value: result.report?.total_empty_slots ?? 0, color: "#EF4444" },
              { label: "Products Found", value: result.report?.total_products_detected ?? 0, color: "#22C55E" },
            ].map((kpi, i) => (
              <Card key={i} className="border-[#E2E8F0]">
                <CardContent className="p-5">
                  <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-2">{kpi.label}</p>
                  <p className="text-3xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
