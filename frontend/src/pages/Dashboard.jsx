import { useState, useEffect, useCallback, useRef } from "react";
import { KPICards } from "../components/dashboard/KPICards";
import { OutputPreview } from "../components/dashboard/OutputPreview";
import { RowBreakdown } from "../components/dashboard/RowBreakdown";
import { ShelfHealthScore } from "../components/dashboard/ShelfHealthScore";
import { RestockSuggestions } from "../components/dashboard/RestockSuggestions";
import { Heatmap } from "../components/dashboard/Heatmap";
import { RestockPriority } from "../components/dashboard/RestockPriority";
import { RecentTable } from "../components/dashboard/RecentTable";
import { DragDropUpload } from "../components/dashboard/DragDropUpload";
import { BatchAnalysis } from "./BatchAnalysis";
import { BeforeAfter } from "./BeforeAfter";
import { getStats, getHistory, analyzeImage, analyzeVideo, getFileUrl } from "../services/api";
import { Loader } from "../components/ui/Loader";
import { AlertCircle, RefreshCw, UploadCloud, Eye, BarChart3, Shield, Zap } from "lucide-react";
import { cn } from "../lib/utils";

// ── Helpers ──
function mapRows(rows = []) {
  return rows.map((r, i) => ({
    category: r.zone_label?.replace(" Zone", "") || `Row ${r.row_display ?? r.row_id ?? i + 1}`,
    occupancy: r.occupancy_percent ?? 0,
    status: r.alert === "Critical" ? "CRIT" : r.alert === "Warning" ? "WARN" : "OK",
  }));
}
function mapSuggestions(rows = []) {
  const iconMap = {
    Dairy: "Milk",
    Beverages: "Droplets",
    Snacks: "Coffee",
    "Personal Care": "Heart",
    Other: "Package",
  };
  return rows
    .filter((r) => r.alert !== "OK")
    .sort((a, b) => a.occupancy_percent - b.occupancy_percent)
    .map((r) => {
      const category = r.zone_label?.replace(" Zone", "") || "Other";
      return {
        text: `${r.alert === "Critical" ? "Restock" : "Replenish"} ${r.zone_label} — ${r.occupancy_percent}% occupancy`,
        category: category,
        icon: iconMap[category] || "Package",
      };
    });
}
function mapPriority(arr = []) {
  const C = ["#EF4444", "#F59E0B", "#22C55E"];
  return arr.slice(0, 3).map((l, i) => ({ name: l, value: 100 - i * 30, color: C[i] }));
}
function mapHistory(items = []) {
  return items.slice(0, 6).map((item, i) => {
    const s = item.shelf_score ?? 0, a = item.report?.overall_alert ?? "OK";
    let st = "Excellent";
    if (a === "Critical" || s < 50) st = "Critical";
    else if (a === "Warning" || s < 70) st = "Needs Attention";
    else if (s < 85) st = "Good";
    return { id: String(i + 1).padStart(2, "0"), _id: item._id, file: item.filename || "unknown.jpg",
      time: item.created_at ? new Date(item.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—",
      score: s, occupancy: Math.round(item.report?.overall_occupancy ?? 0), empty: item.report?.total_empty_slots ?? 0, status: st };
  });
}

// ── Idle Landing ──
function IdleLanding({ onFileSelected, activeTab, setActiveTab }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef(null);
  const tabs = [
    { key: "single", label: "Single Analysis" },
    { key: "batch", label: "Batch (up to 8)" },
    { key: "compare", label: "Before / After" },
  ];

  return (
    <div className="flex flex-col items-center justify-start pt-8 min-h-[70vh] gap-8">
      {/* Hero Section */}
      <div className="text-center max-w-2xl">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Eye className="h-10 w-10 text-[#4F46E5]" />
          <h1 className="text-4xl font-bold text-[#0F172A]">
            Retail<span className="text-[#4F46E5]">Eye</span>
          </h1>
        </div>
        <p className="text-lg text-[#334155] font-medium leading-relaxed">
          AI-powered shelf intelligence platform. Upload a shelf image or video
          and get instant occupancy analysis, product detection, and restock recommendations.
        </p>
        <div className="flex items-center justify-center gap-6 mt-4 text-sm text-[#64748B]">
          <span className="flex items-center gap-1.5"><Zap className="h-4 w-4 text-[#4F46E5]" /> Smart Detection</span>
          <span className="flex items-center gap-1.5"><BarChart3 className="h-4 w-4 text-[#22C55E]" /> Occupancy Analytics</span>
          <span className="flex items-center gap-1.5"><Shield className="h-4 w-4 text-[#F59E0B]" /> AI Vision</span>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-1 bg-white p-1 rounded-xl shadow-sm border border-[#E2E8F0]">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={cn("px-5 py-2.5 text-sm font-semibold rounded-lg transition-colors",
              activeTab === t.key ? "bg-[#EEF2FF] text-[#4F46E5]" : "text-[#64748B] hover:text-[#0F172A]")}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Active Tab Content */}
      <div className="w-full max-w-5xl">
        {activeTab === "single" && (
          <div
            className={cn(
              "w-full max-w-2xl mx-auto flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-14 text-center transition-all cursor-pointer",
              isDragging ? "border-[#4F46E5] bg-[#EEF2FF] scale-[1.02]" : "border-[#C7D2FE] bg-white hover:border-[#4F46E5] hover:bg-[#EEF2FF]/30"
            )}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={e => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.[0]) onFileSelected([e.dataTransfer.files[0]]); }}
            onClick={() => fileRef.current?.click()}
          >
            <UploadCloud className="h-14 w-14 text-[#4F46E5] mb-4" />
            <h2 className="text-lg font-bold text-[#0F172A]">Drop your shelf image or video here</h2>
            <p className="text-sm text-[#64748B] mt-2">or click to browse files</p>
            <p className="text-xs text-[#94A3B8] mt-4">Supports JPG, PNG, MP4 · Max 100MB</p>
            <input ref={fileRef} type="file" className="hidden" accept="image/*,video/mp4"
              onChange={e => { if (e.target.files?.length) onFileSelected(Array.from(e.target.files)); }} />
          </div>
        )}

        {activeTab === "batch" && <BatchAnalysis />}
        {activeTab === "compare" && <BeforeAfter />}
      </div>
    </div>
  );
}

// ── Processing State ──
function ProcessingView({ progress, state, filename }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6">
      <div className="relative">
        <div className="h-20 w-20 rounded-full border-4 border-[#EEF2FF] flex items-center justify-center">
          <Loader size={32} className="text-[#4F46E5]" />
        </div>
      </div>
      <div className="text-center">
        <h2 className="text-xl font-bold text-[#0F172A]">
          {state === "uploading" ? "Uploading..." : "AI is analyzing your shelf..."}
        </h2>
        <p className="text-sm text-[#64748B] mt-2">
          {state === "uploading" ? `Sending ${filename} to RetailEye servers` : "Detecting products · Identifying brands"}
        </p>
      </div>
      <div className="w-full max-w-md bg-[#E2E8F0] rounded-full h-2.5">
        <div className="h-full bg-[#4F46E5] rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-xs text-[#94A3B8]">{progress}% complete</p>
    </div>
  );
}

// ── Main Dashboard ──
export function Dashboard() {
  const STORAGE_KEY = "retaileye:latest-result";
  const [persistedResult] = useState(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [phase, setPhase] = useState(persistedResult ? "active" : "loading"); // loading | idle | uploading | processing | active | error
  const [activeTab, setActiveTab] = useState("single");
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const [latestResult, setLatestResult] = useState(persistedResult);
  const [progress, setProgress] = useState(0);
  const [uploadFilename, setUploadFilename] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [s, h] = await Promise.all([getStats(), getHistory(6)]);
      setStats(s);
      setHistory(h.items || []);
      
      // On initial load, phase goes from 'loading' to 'idle'
      setPhase((prev) => (prev === "loading" ? "idle" : prev));
      
      if (h.items?.length) {
        setLatestResult(prev => prev || h.items[0]);
      }
    } catch (err) {
      setError(err.message);
      setPhase("error");
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Persist latest results across route changes
  useEffect(() => {
    try {
      if (latestResult) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(latestResult));
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Storage is best-effort; ignore failures.
    }
  }, [latestResult, STORAGE_KEY]);

  // Listen for "New Upload" button from Navbar
  useEffect(() => {
    const handler = () => {
      setLatestResult(null);
      setPhase("idle");
      setError(null);
    };
    window.addEventListener("retaileye:new-upload", handler);
    return () => window.removeEventListener("retaileye:new-upload", handler);
  }, []);

  const handleFiles = async (files) => {
    if (!files?.length) return;
    const file = files[0];
    setUploadFilename(file.name);
    setPhase("uploading");
    setProgress(0);

    try {
      const isVideo = file.type.startsWith("video/");
      const fn = isVideo ? analyzeVideo : analyzeImage;
      const result = await fn(file, (p) => {
        setProgress(p);
        if (p >= 50) setPhase("processing");
      });
      setProgress(100);
      setLatestResult(result);
      await loadData();
      setPhase("active");
    } catch (err) {
      setError(err.message);
      setPhase("error");
    }
  };

  const resetToUpload = () => {
    setLatestResult(null);
    setPhase("idle");
    setError(null);
  };

  // ── Render ──
  if (phase === "loading") {
    return <div className="flex h-[60vh] items-center justify-center"><Loader size={28} /></div>;
  }

  if (phase === "error") {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <AlertCircle className="h-12 w-12 text-[#EF4444]" />
        <p className="text-base font-bold text-[#0F172A]">Something went wrong</p>
        <p className="text-sm text-[#64748B]">{error}</p>
        <div className="flex gap-3">
          <button onClick={loadData} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-semibold hover:bg-[#4338CA]">
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
          <button onClick={resetToUpload} className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-sm font-semibold text-[#64748B] hover:bg-[#F1F5F9]">
            Upload New
          </button>
        </div>
      </div>
    );
  }

  if (phase === "idle") {
    return <IdleLanding onFileSelected={handleFiles} activeTab={activeTab} setActiveTab={setActiveTab} />;
  }

  if (phase === "uploading" || phase === "processing") {
    return <ProcessingView progress={progress} state={phase} filename={uploadFilename} />;
  }

  // ── Active Dashboard ──
  const metrics = stats ? {
    shelfScore: { value: stats.avg_shelf_score, label: stats.total_scans === 0 ? "No scans yet" : `${stats.total_scans} scan${stats.total_scans !== 1 ? "s" : ""} analysed` },
    occupancy: { value: Math.round(stats.avg_occupancy), label: `Avg across ${stats.total_scans} analyses` },
    emptySlots: { value: stats.total_empty_slots, label: stats.recent_alert === "Critical" ? "Critical alert" : "Total empty found" },
    productsFound: { value: stats.total_products_found, label: "Total products detected" },
  } : null;

  const reportRows = latestResult?.report?.rows ?? [];
  const imageSrc = latestResult?.processed_image_url ? getFileUrl(latestResult.processed_image_url) : null;
  const detections = [
    ...(latestResult?.report?.products ?? []).map((p) => ({
      bbox: p.bbox,
      label: p.name,
      category: p.category || "Other",
    })),
    ...(latestResult?.report?.empty_spaces ?? []).map((e) => ({
      bbox: e.bbox,
      label: "Empty",
      category: "Empty Slot",
    })),
  ];

  return (
    <div className="flex flex-col gap-6 pb-8">
      <KPICards metrics={metrics} historyItems={history} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6">
          <OutputPreview imageSrc={imageSrc} detections={detections} isAnalyzed={!!imageSrc} />
        </div>
        <div className="lg:col-span-3">
          <RowBreakdown rows={mapRows(reportRows)} />
        </div>
        <div className="lg:col-span-3">
          <ShelfHealthScore
            score={latestResult?.shelf_score ?? stats?.avg_shelf_score ?? 0}
            label={(latestResult?.shelf_score ?? 0) >= 80 ? "GOOD" : (latestResult?.shelf_score ?? 0) >= 50 ? "FAIR" : "CRITICAL"}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4"><RestockSuggestions items={mapSuggestions(reportRows)} /></div>
        <div className="lg:col-span-4"><Heatmap rows={reportRows} /></div>
        <div className="lg:col-span-4"><RestockPriority priorityData={mapPriority(latestResult?.report?.restock_priority ?? [])} /></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-12"><RecentTable data={mapHistory(history)} /></div>
      </div>
    </div>
  );
}
