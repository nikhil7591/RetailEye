import { useRef, useState } from "react";
import { UploadCloud, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

export function DragDropUpload({ onUpload, state = "idle", progress = 0, error = null }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = (file) => {
    if (!file || state === "uploading" || state === "processing") return;
    if (onUpload) onUpload(file);
  };

  const onDragOver  = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onDrop      = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) handleFile(e.dataTransfer.files[0]);
  };

  const isActive = state === "uploading" || state === "processing";

  return (
    <div
      className={cn(
        "flex h-full w-full min-h-[200px] flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-200 cursor-pointer",
        isDragging
          ? "border-[#4F46E5] bg-[#EEF2FF] scale-[1.02]"
          : state === "done"
          ? "border-[#22C55E] bg-[#F0FDF4]"
          : state === "error"
          ? "border-[#EF4444] bg-[#FEF2F2]"
          : "border-[#C7D2FE] bg-[#EEF2FF]/30 hover:border-[#4F46E5] hover:bg-[#EEF2FF]/60"
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => !isActive && fileInputRef.current?.click()}
    >
      {/* Icon */}
      {state === "done" ? (
        <CheckCircle2 className="h-10 w-10 text-[#22C55E] mb-3" />
      ) : state === "error" ? (
        <AlertCircle className="h-10 w-10 text-[#EF4444] mb-3" />
      ) : isActive ? (
        <Loader2 className="h-10 w-10 text-[#4F46E5] animate-spin mb-3" />
      ) : (
        <UploadCloud className="h-10 w-10 text-[#4F46E5] mb-3" />
      )}

      {/* Title */}
      {state === "done" ? (
        <>
          <h3 className="text-sm font-bold text-[#16A34A] uppercase tracking-wide">ANALYSIS COMPLETE</h3>
          <p className="text-xs text-[#15803D] mt-1">Results are shown in the dashboard</p>
        </>
      ) : state === "error" ? (
        <>
          <h3 className="text-sm font-bold text-[#DC2626] uppercase tracking-wide">UPLOAD FAILED</h3>
          <p className="text-xs text-[#EF4444] mt-1 max-w-[200px]">{error || "An error occurred"}</p>
          <p className="text-xs text-[#64748B] mt-2">Click to try again</p>
        </>
      ) : state === "uploading" ? (
        <>
          <h3 className="text-sm font-bold text-[#4F46E5] uppercase tracking-wide">UPLOADING...</h3>
          <div className="w-full mt-3 bg-[#C7D2FE] rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-[#4F46E5] rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-[#64748B] mt-2">{progress}% uploaded</p>
        </>
      ) : state === "processing" ? (
        <>
          <h3 className="text-sm font-bold text-[#4F46E5] uppercase tracking-wide">AI PROCESSING...</h3>
          <p className="text-xs text-[#64748B] mt-1">AI analyzing shelf layout</p>
          <div className="w-full mt-3 bg-[#C7D2FE] rounded-full h-2 overflow-hidden">
            <div className="h-full bg-[#4F46E5] rounded-full animate-pulse" style={{ width: "70%" }} />
          </div>
        </>
      ) : (
        <>
          <h3 className="text-sm font-bold text-[#1E293B] uppercase tracking-wide">DRAG & DROP</h3>
          <p className="text-sm text-[#64748B] mt-1">Shelf image or video here</p>
          <p className="mt-4 text-[10px] text-[#94A3B8] font-medium">JPG, PNG, MP4 supported</p>
          <p className="text-[10px] text-[#94A3B8] font-medium mb-4">Max 100MB · Up to 8 images in batch</p>
          <div
            className="px-6 py-2 rounded-lg border border-[#C7D2FE] text-[#4F46E5] bg-white text-xs font-bold hover:bg-[#EEF2FF] transition-colors shadow-sm"
            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
          >
            Select File
          </div>
        </>
      )}

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*,video/mp4,video/avi,video/mov"
        onChange={(e) => { if (e.target.files?.length) handleFile(e.target.files[0]); }}
      />
    </div>
  );
}
