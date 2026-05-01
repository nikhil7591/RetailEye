import { useState, useRef } from "react";
import { UploadCloud, X, Loader2, CheckCircle2, AlertCircle, FileImage, Download } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { analyzeImage, getFileUrl, getDownloadUrl } from "../services/api";
import { cn } from "../lib/utils";

const MAX_FILES = 8;

function FileStatusBadge({ status }) {
  if (status === "done") return <span className="text-[10px] font-bold text-[#16A34A] bg-[#DCFCE7] px-2 py-0.5 rounded-full">Done</span>;
  if (status === "error") return <span className="text-[10px] font-bold text-[#DC2626] bg-[#FEE2E2] px-2 py-0.5 rounded-full">Failed</span>;
  if (status === "processing") return <span className="text-[10px] font-bold text-[#4F46E5] bg-[#EEF2FF] px-2 py-0.5 rounded-full animate-pulse">Analyzing…</span>;
  return <span className="text-[10px] font-bold text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded-full">Queued</span>;
}

export function BatchAnalysis() {
  const [files, setFiles] = useState([]); // { file, preview, status, result, error }
  const [running, setRunning] = useState(false);
  const fileRef = useRef(null);

  const addFiles = (newFiles) => {
    const toAdd = Array.from(newFiles).slice(0, MAX_FILES - files.length);
    const entries = toAdd.map(f => ({
      id: Math.random().toString(36).slice(2),
      file: f,
      name: f.name,
      preview: URL.createObjectURL(f),
      status: "queued",
      result: null,
      error: null,
    }));
    setFiles(prev => [...prev, ...entries]);
  };

  const removeFile = (id) => setFiles(prev => prev.filter(f => f.id !== id));
  const clearAll   = () => setFiles([]);

  const runBatch = async () => {
    setRunning(true);
    const queued = files.filter(f => f.status === "queued");
    for (const entry of queued) {
      setFiles(prev => prev.map(f => f.id === entry.id ? { ...f, status: "processing" } : f));
      try {
        const res = await analyzeImage(entry.file);
        setFiles(prev => prev.map(f => f.id === entry.id ? { ...f, status: "done", result: res } : f));
      } catch (err) {
        setFiles(prev => prev.map(f => f.id === entry.id ? { ...f, status: "error", error: err.message } : f));
      }
    }
    setRunning(false);
  };

  const done    = files.filter(f => f.status === "done");
  const failed  = files.filter(f => f.status === "error");
  const queued  = files.filter(f => f.status === "queued");

  return (
    <div className="flex flex-col gap-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Batch Analysis</h1>
          <p className="text-sm text-[#64748B] mt-1">Upload up to 8 images for simultaneous shelf analysis</p>
        </div>
        <div className="flex items-center gap-3">
          {files.length > 0 && (
            <Button variant="outline" onClick={clearAll} disabled={running} className="text-[#64748B] gap-2 text-xs">
              <X className="h-4 w-4" /> Clear All
            </Button>
          )}
          <Button
            onClick={queued.length > 0 ? runBatch : () => fileRef.current?.click()}
            disabled={running}
            className="gap-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white"
          >
            {running ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</> :
             queued.length > 0 ? <>Run Batch Analysis ({queued.length})</> : <><UploadCloud className="h-4 w-4" /> Add Files</>}
          </Button>
        </div>
      </div>

      {/* Drop zone */}
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all",
          files.length >= MAX_FILES ? "opacity-40 cursor-not-allowed" : "border-[#C7D2FE] hover:border-[#4F46E5] hover:bg-[#EEF2FF]/40"
        )}
        onClick={() => files.length < MAX_FILES && fileRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
      >
        <UploadCloud className="h-10 w-10 text-[#4F46E5] mb-3" />
        <p className="font-semibold text-[#334155]">
          {files.length >= MAX_FILES ? "Maximum 8 images reached" : `Drop images here · ${MAX_FILES - files.length} slots remaining`}
        </p>
        <p className="text-xs text-[#94A3B8] mt-1">JPG, PNG supported · Each max 50MB</p>
        <input ref={fileRef} type="file" className="hidden" multiple accept="image/*"
          onChange={e => addFiles(e.target.files)} />
      </div>

      {/* File grid */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {files.map(entry => (
            <Card key={entry.id} className="border-[#E2E8F0] overflow-hidden">
              <div className="relative aspect-video bg-[#0F172A]">
                <img src={entry.status === "done" && entry.result?.processed_image_url
                  ? getFileUrl(entry.result.processed_image_url) : entry.preview}
                  alt={entry.name} className="w-full h-full object-cover" />
                {entry.status === "processing" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#0F172A]/60">
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  </div>
                )}
                {!running && (
                  <button onClick={() => removeFile(entry.id)}
                    className="absolute top-1.5 right-1.5 p-1 rounded-full bg-[#0F172A]/60 text-white hover:bg-red-600 transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-[#334155] truncate max-w-[100px]">{entry.name}</p>
                  <FileStatusBadge status={entry.status} />
                </div>
                {entry.status === "done" && entry.result && (
                  <p className="text-[11px] text-[#64748B] mt-1">
                    Score: <span className="font-bold text-[#4F46E5]">{entry.result.shelf_score}/100</span>
                  </p>
                )}
                {entry.status === "error" && (
                  <p className="text-[10px] text-[#EF4444] mt-1 truncate">{entry.error}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary */}
      {done.length > 0 && (
        <Card className="border-[#E2E8F0]">
          <CardHeader className="py-4 border-b border-[#E2E8F0]">
            <CardTitle className="text-[12px] font-bold tracking-wider text-[#0F172A] uppercase">Batch Summary</CardTitle>
          </CardHeader>
          <CardContent className="p-5 overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] font-bold text-[#64748B] uppercase">
                  <th className="text-left pb-3">File</th>
                  <th className="text-center pb-3">Shelf Score</th>
                  <th className="text-center pb-3">Occupancy</th>
                  <th className="text-center pb-3">Empty Slots</th>
                  <th className="text-center pb-3">Alert</th>
                  <th className="text-right pb-3">Download</th>
                </tr>
              </thead>
              <tbody>
                {done.map(entry => {
                  const r = entry.result;
                  const occ = r.report?.overall_occupancy ?? 0;
                  const empty = r.report?.total_empty_slots ?? 0;
                  const alert = r.report?.overall_alert ?? "OK";
                  return (
                    <tr key={entry.id} className="border-t border-[#F1F5F9] hover:bg-[#F8FAFC]">
                      <td className="py-3 font-semibold text-[#334155]">{entry.name}</td>
                      <td className="py-3 text-center font-bold text-[#4F46E5]">{r.shelf_score}/100</td>
                      <td className="py-3 text-center text-[#64748B]">{occ}%</td>
                      <td className="py-3 text-center text-[#64748B]">{empty}</td>
                      <td className="py-3 text-center">
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full",
                          alert === "Critical" ? "bg-[#FEE2E2] text-[#DC2626]" :
                          alert === "Warning" ? "bg-[#FEF3C7] text-[#D97706]" : "bg-[#DCFCE7] text-[#16A34A]"
                        )}>{alert}</span>
                      </td>
                      <td className="py-3 text-right">
                        {r._id && (
                          <a href={getDownloadUrl(r._id, "csv")} download>
                            <button className="p-1.5 text-[#94A3B8] hover:text-[#4F46E5] transition-colors">
                              <Download className="h-4 w-4" />
                            </button>
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
