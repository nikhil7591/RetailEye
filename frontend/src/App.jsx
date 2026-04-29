import { useState, useEffect } from "react";
import useAnalysis from "./hooks/useAnalysis";
import UploadPanel from "./components/UploadPanel";
import VideoPlayer from "./components/VideoPlayer";
import HealthCard from "./components/HealthCard";
import RowBreakdownTable from "./components/RowBreakdownTable";
import RestockList from "./components/RestockList";
import DownloadPanel from "./components/DownloadPanel";
import ThemeToggle from "./components/ThemeToggle";

/**
 * Empty state data to show the dashboard before any analysis
 */
const emptyData = {
  overall_occupancy: 0,
  overall_alert: "OK",
  total_products_detected: 0,
  total_empty_slots: 0,
  rows: [
    { row_id: 0, zone_label: "-", occupancy_percent: 0, alert: "OK", products: [], empty_slots: 0 },
    { row_id: 1, zone_label: "-", occupancy_percent: 0, alert: "OK", products: [], empty_slots: 0 },
    { row_id: 2, zone_label: "-", occupancy_percent: 0, alert: "OK", products: [], empty_slots: 0 }
  ],
  restock_priority: []
};

const LOADING_STEPS = [
  "Uploading media file...",
  "Running YOLOv8 detection...",
  "Clustering shelf rows...",
  "Identifying products with AI...",
  "Calculating occupancy metrics...",
  "Generating final report..."
];

export default function App() {
  const [theme, setTheme] = useState("dark");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [mediaUrl, setMediaUrl] = useState(null);
  const [jsonUrl, setJsonUrl] = useState(null);
  const [csvUrl, setCsvUrl] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  
  // Live execution simulation state
  const [stepIndex, setStepIndex] = useState(0);

  const { analyzeFile, isLoading, error } = useAnalysis();

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  useEffect(() => {
    let interval;
    if (isLoading) {
      setStepIndex(0);
      interval = setInterval(() => {
        setStepIndex((prev) => Math.min(prev + 1, LOADING_STEPS.length - 1));
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleAnalyze = async (file) => {
    try {
      const result = await analyzeFile(file);
      setAnalysisResult(result.report);
      setMediaUrl(result.mediaUrl);
      setJsonUrl(result.jsonUrl);
      setCsvUrl(result.csvUrl);
      setMediaType(result.mediaType);
    } catch {
      // error is already set inside the hook
    }
  };

  const handleReset = () => {
    setAnalysisResult(null);
    setMediaUrl(null);
    setJsonUrl(null);
    setCsvUrl(null);
    setMediaType(null);
  };

  const currentData = analysisResult || emptyData;

  return (
    <div className={theme}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 text-slate-800 transition-colors duration-300 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100">
        {/* ── Navbar ─────────────────────────────────────────── */}
        <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-200/60 bg-white/70 px-6 py-3 backdrop-blur-lg dark:border-slate-800/60 dark:bg-slate-900/70">
          <div className="flex items-center gap-3">
            {/* Logo icon */}
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <h1 className="text-lg font-bold tracking-tight">
              Retail<span className="text-brand-500">Eye</span>
            </h1>
          </div>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </nav>

        {/* ── Main Content ───────────────────────────────────── */}
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          
          {/* Error display */}
          {error && !isLoading && (
            <div className="mx-auto mb-6 max-w-md rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-center text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
              <p className="font-semibold">Analysis failed</p>
              <p className="mt-1 opacity-80">{error}</p>
            </div>
          )}

          {/* Dashboard */}
          <div className="space-y-8 animate-in fade-in">
            {/* Media + Health overview */}
            <div className="grid gap-6 lg:grid-cols-5">
              
              {/* Media Slot (Upload / Loading / Player) */}
              <div className="lg:col-span-3 glass-card flex flex-col justify-center min-h-[400px] !p-0 overflow-hidden relative">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center gap-6 py-20 px-8 h-full bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="spinner" />
                    <div className="text-center w-full max-w-xs">
                      <p className="text-lg font-semibold text-brand-600 dark:text-brand-400 animate-pulse">
                        {LOADING_STEPS[stepIndex]}
                      </p>
                      <div className="mt-4 flex gap-1 justify-center">
                        {LOADING_STEPS.map((_, i) => (
                          <div 
                            key={i} 
                            className={`h-1.5 w-full rounded-full transition-all duration-300 ${i <= stepIndex ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ) : !mediaUrl ? (
                  <UploadPanel onAnalyze={handleAnalyze} />
                ) : (
                  <VideoPlayer url={mediaUrl} type={mediaType} />
                )}
              </div>

              {/* Health Card */}
              <div className="lg:col-span-2">
                <HealthCard data={currentData} />
              </div>
            </div>

            {/* Row breakdown */}
            <RowBreakdownTable rows={currentData.rows} />

            {/* Restock + Downloads */}
            <div className="grid gap-6 md:grid-cols-2">
              <RestockList
                priority={currentData.restock_priority}
                rows={currentData.rows}
              />
              <DownloadPanel 
                mediaType={mediaType} 
                mediaUrl={mediaUrl} 
                jsonUrl={jsonUrl} 
                csvUrl={csvUrl} 
              />
            </div>

            {/* Reset button */}
            {analysisResult && !isLoading && (
              <div className="flex justify-center pb-8">
                <button onClick={handleReset} className="btn btn-outline">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                  </svg>
                  Analyze Another
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
