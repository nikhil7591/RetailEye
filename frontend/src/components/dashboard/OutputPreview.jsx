import { useState, useRef } from "react";
import { Maximize2, ZoomIn, ZoomOut, ImageOff, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Button } from "../ui/Button";
import { cn } from "../../lib/utils";

const CATEGORY_COLORS = {
  Beverages:      { border: "#4F46E5", label: "#4F46E5" },
  Snacks:         { border: "#22C55E", label: "#22C55E" },
  Dairy:          { border: "#F59E0B", label: "#F59E0B" },
  "Personal Care":{ border: "#EF4444", label: "#EF4444" },
  "Empty Slot":   { border: "#94A3B8", label: "#94A3B8" },
  Other:          { border: "#8B5CF6", label: "#8B5CF6" },
};

function getColors(type) {
  return CATEGORY_COLORS[type] || CATEGORY_COLORS["Other"];
}

export function OutputPreview({ imageSrc, detections = [], isAnalyzed = false }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const scrollRef = useRef(null);

  const handleZoomIn  = () => setZoom((z) => Math.min(z + 0.25, 4));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleReset   = () => setZoom(1);

  // Build overlay boxes — works with both mock % coords and real pixel coords
  const renderBoxes = () =>
    detections.map((det, idx) => {
      const colors = getColors(det.type || det.category || "Other");
      return (
        <div
          key={idx}
          className="absolute group"
          style={{
            left:   `${det.x}%`,
            top:    `${det.y}%`,
            width:  `${det.w}%`,
            height: `${det.h}%`,
            border: `1.5px solid ${colors.border}`,
            boxSizing: "border-box",
          }}
        >
          <span
            className="absolute left-0 -top-[15px] px-[3px] py-[1px] text-[8px] font-bold text-white whitespace-nowrap leading-tight"
            style={{ backgroundColor: colors.label }}
          >
            {det.label || det.product_name || "Item"}
          </span>
        </div>
      );
    });

  const ImageWithOverlay = () => (
    <div className="relative w-full h-full">
      <img
        src={imageSrc}
        alt="Shelf analysis output"
        className="w-full h-full object-contain bg-[#0F172A]"
        draggable={false}
      />
      {renderBoxes()}
    </div>
  );

  return (
    <>
      <Card className="flex flex-col h-full border-[#E2E8F0]">
        <CardHeader className="flex flex-row items-center justify-between py-4 border-b border-[#E2E8F0]">
          <CardTitle className="text-[12px] font-bold tracking-wider text-[#0F172A] uppercase">
            OUTPUT PHOTO WITH LABELS
          </CardTitle>
          {isAnalyzed ? (
            <div className="flex items-center gap-1.5 rounded-md bg-[#ECFDF5] px-2.5 py-1 border border-[#A7F3D0]">
              <CheckCircle2 className="h-3 w-3 text-[#10B981]" />
              <span className="text-[10px] font-bold text-[#059669] tracking-wider uppercase">AI DETECTION ACTIVE</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-md bg-[#F8FAFC] px-2.5 py-1 border border-[#E2E8F0]">
              <span className="text-[10px] font-semibold text-[#94A3B8] tracking-wider uppercase">AWAITING UPLOAD</span>
            </div>
          )}
        </CardHeader>

        <CardContent className="flex-1 p-5 flex flex-col gap-4">
          {/* Image area */}
          <div className="relative w-full flex-1 min-h-[250px] max-h-[320px] rounded-xl overflow-hidden border border-[#E2E8F0] bg-[#0F172A]">
            {isAnalyzed && imageSrc ? (
              <ImageWithOverlay />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-[#475569]">
                <div className="p-4 rounded-full bg-[#1E293B]">
                  <ImageOff className="h-8 w-8 text-[#475569]" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-[#94A3B8]">No image analyzed yet</p>
                  <p className="text-xs text-[#64748B] mt-1">Upload a shelf image to see detections here</p>
                </div>
              </div>
            )}
          </div>

          {/* Legend + action row */}
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-[#64748B]">
              {Object.entries(CATEGORY_COLORS).map(([cat, colors]) => (
                <div key={cat} className="flex items-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: colors.label }}
                  />
                  {cat}
                </div>
              ))}
            </div>
            {isAnalyzed && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs font-semibold text-[#4F46E5] border-[#E0E7FF] hover:bg-[#EEF2FF] shrink-0"
                onClick={() => setIsFullscreen(true)}
              >
                <Maximize2 className="mr-1.5 h-3.5 w-3.5" />
                Full View
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#0F172A]/95 backdrop-blur-sm">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <h2 className="text-white font-bold text-sm tracking-wide">Analysis Output — Full View</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleZoomOut}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
              >
                <ZoomOut className="h-4 w-4" /> Zoom Out
              </button>
              <span className="text-white/60 text-xs font-mono w-12 text-center">{Math.round(zoom * 100)}%</span>
              <button
                onClick={handleZoomIn}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
              >
                <ZoomIn className="h-4 w-4" /> Zoom In
              </button>
              <button
                onClick={handleReset}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
              >
                Reset
              </button>
              <button
                onClick={() => { setIsFullscreen(false); setZoom(1); }}
                className="ml-2 px-3 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-xs font-bold transition-colors"
              >
                ✕ Close
              </button>
            </div>
          </div>

          {/* Scrollable image area with drag-to-pan */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-auto p-6"
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
                setPanStart({ x: e.clientX + scrollRef.current.scrollLeft, y: e.clientY + scrollRef.current.scrollTop });
              }
            }}
            onMouseMove={(e) => {
              if (isPanning && scrollRef.current) {
                scrollRef.current.scrollLeft = panStart.x - e.clientX;
                scrollRef.current.scrollTop = panStart.y - e.clientY;
              }
            }}
            onMouseUp={() => setIsPanning(false)}
            onMouseLeave={() => setIsPanning(false)}
          >
            <img
              src={imageSrc}
              alt="Full shelf"
              draggable={false}
              style={{
                width: `${zoom * 100}%`,
                display: "block",
                userSelect: "none",
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}

