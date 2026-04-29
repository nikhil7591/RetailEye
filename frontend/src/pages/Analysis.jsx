import { useState, useRef } from "react";
import { UploadCloud, FileImage, RefreshCw } from "lucide-react";
import useAnalysis from "../hooks/useAnalysis";
import { OutputPreview } from "../components/dashboard/OutputPreview";
import { RowBreakdown } from "../components/dashboard/RowBreakdown";
import { Heatmap } from "../components/dashboard/Heatmap";
import { Button } from "../components/ui/Button";
import { cn } from "../lib/utils";

export function Analysis() {
  const { data, isLoading, error, analyzeFile, reset } = useAnalysis();
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    
    // Create local preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    
    try {
      await analyzeFile(file);
    } catch (e) {
      console.error(e);
    }
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleReset = () => {
    setPreviewUrl(null);
    reset();
  };

  // Upload State
  if (!data && !isLoading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] flex-col items-center justify-center animate-in">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">New Analysis</h1>
          <p className="mt-2 text-slate-500 max-w-md mx-auto">
            Upload a high-resolution shelf image to run AI detection and occupancy calculation.
          </p>
        </div>

        <div
          className={cn(
            "flex w-full max-w-2xl flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-white p-12 text-center transition-all duration-200",
            isDragging ? "border-blue-500 bg-blue-50/50 scale-[1.02]" : "border-slate-300 hover:border-slate-400"
          )}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <div className="rounded-full bg-blue-50 p-4 mb-4">
            <UploadCloud className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">Click or drag image here</h3>
          <p className="mt-1 text-sm text-slate-500 mb-6">Supports JPG, PNG, WEBP up to 20MB</p>
          
          <input
            type="file"
            className="hidden"
            accept="image/*"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files?.length) handleFile(e.target.files[0]);
            }}
          />
          <Button onClick={() => fileInputRef.current?.click()} size="lg">
            Browse Files
          </Button>
        </div>

        {error && (
          <div className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-200 w-full max-w-2xl text-center">
            {error}
          </div>
        )}
      </div>
    );
  }

  // Loading State
  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] flex-col items-center justify-center animate-in">
        <div className="relative w-64 h-64 mb-8 mx-auto rounded-xl overflow-hidden shadow-lg border border-slate-200">
          <img src={previewUrl} className="w-full h-full object-cover blur-sm opacity-50" alt="Preview" />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
             <div className="h-12 w-12 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin mb-4" />
             <div className="bg-white/90 backdrop-blur px-4 py-1.5 rounded-full text-sm font-medium text-slate-700 shadow-sm">
                Analyzing Shelf...
             </div>
          </div>
        </div>
        <p className="text-slate-500 text-sm animate-pulse">Running computer vision models...</p>
      </div>
    );
  }

  // Result State
  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Analysis Results</h1>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
            <FileImage className="h-4 w-4" /> image_scan_2023.jpg
          </p>
        </div>
        <Button variant="outline" onClick={handleReset} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          New Analysis
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 min-h-[500px]">
          <OutputPreview imageSrc={previewUrl} detections={data?.detections} />
        </div>
        <div className="flex flex-col gap-6">
          <div className="flex-1">
            <RowBreakdown rows={data?.rows} />
          </div>
          <div className="flex-1">
            <Heatmap data={data?.heatmapData} />
          </div>
        </div>
      </div>
    </div>
  );
}
