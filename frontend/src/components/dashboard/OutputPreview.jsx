import { useEffect, useMemo, useRef, useState } from "react";
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
  const [imageSize, setImageSize] = useState({ width: 1, height: 1 });
  const [containerSize, setContainerSize] = useState({ width: 1, height: 1 });
  const scrollRef = useRef(null);
  const imgRef = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    const node = frameRef.current;
    if (!node || typeof ResizeObserver === "undefined") return undefined;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setContainerSize({ width: Math.max(1, width), height: Math.max(1, height) });
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const handleZoomIn  = () => setZoom((z) => Math.min(z + 0.25, 4));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleReset   = () => setZoom(1);

  const displayRect = useMemo(() => {
    const { width: frameWidth, height: frameHeight } = containerSize;
    const { width: naturalWidth, height: naturalHeight } = imageSize;
    if (!frameWidth || !frameHeight || !naturalWidth || !naturalHeight) {
      return { left: 0, top: 0, width: frameWidth, height: frameHeight };
    }

    const frameRatio = frameWidth / frameHeight;
    const imageRatio = naturalWidth / naturalHeight;

    if (imageRatio > frameRatio) {
      const width = frameWidth;
      const height = frameWidth / imageRatio;
      return { left: 0, top: (frameHeight - height) / 2, width, height };
    }

    const height = frameHeight;
    const width = frameHeight * imageRatio;
    return { left: (frameWidth - width) / 2, top: 0, width, height };
  }, [containerSize, imageSize]);

  const toPercentBox = (bbox) => {
    if (!bbox || bbox.length !== 4 || !imageSize.width || !imageSize.height) return null;
    const [x1, y1, x2, y2] = bbox;
    return {
      x: (x1 / imageSize.width) * 100,
      y: (y1 / imageSize.height) * 100,
      w: ((x2 - x1) / imageSize.width) * 100,
      h: ((y2 - y1) / imageSize.height) * 100,
    };
  };

  const formatLabel = (label) => {
    const text = label || "Item";
    return text.length > 18 ? `${text.slice(0, 17)}…` : text;
  };

  // Build overlay boxes — supports percent coords or raw pixel bboxes
  const renderBoxes = () =>
    detections.map((det, idx) => {
      const colors = getColors(det.type || det.category || "Other");
      const box = det.bbox ? toPercentBox(det.bbox) : det;
      if (!box) return null;
      const left = displayRect.left + (box.x / 100) * displayRect.width;
      const top = displayRect.top + (box.y / 100) * displayRect.height;
      const width = (box.w / 100) * displayRect.width;
      const height = (box.h / 100) * displayRect.height;
      const labelTooSmall = width < 44 || height < 20;
      return (
        <div
          key={idx}
          className="absolute group"
          style={{
            left,
            top,
            width,
            height,
            border: `1.5px solid ${colors.border}`,
            boxSizing: "border-box",
          }}
        >
          {!labelTooSmall && (
            <span
              className="absolute left-0 -top-[16px] max-w-full rounded px-[4px] py-[1px] text-[8px] font-bold text-white whitespace-nowrap overflow-hidden text-ellipsis leading-tight shadow-sm"
              style={{ backgroundColor: colors.label }}
            >
              {formatLabel(det.label || det.product_name || "Item")}
            </span>
          )}
        </div>
      );
    });

  const ImageWithOverlay = () => (
    <div ref={frameRef} className="relative w-full h-full">
      <img
        src={imageSrc}
        alt="Shelf analysis output"
        className="absolute inset-0 h-full w-full object-contain bg-[#0F172A]"
        draggable={false}
        ref={imgRef}
        onLoad={(e) => {
          const { naturalWidth, naturalHeight } = e.currentTarget;
          if (naturalWidth && naturalHeight) {
            setImageSize({ width: naturalWidth, height: naturalHeight });
          }
        }}
      />
      <div className="absolute inset-0">{renderBoxes()}</div>
    </div>
  );

  return (
    <>
      <Card className="flex flex-col h-full border-[#E2E8F0]">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-4 border-b border-[#E2E8F0] gap-3 sm:gap-0">
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
          <div className="relative w-full h-[250px] md:h-auto md:flex-1 rounded-xl overflow-hidden border border-[#E2E8F0] bg-[#0F172A]">
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
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

      {/* Full View Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="flex w-full max-w-6xl max-h-[90vh] flex-col overflow-hidden rounded-2xl bg-[#0F172A] shadow-2xl border border-white/10">
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
              className="flex-1 overflow-auto p-4"
              style={{ cursor: zoom > 1 ? (isPanning ? "grabbing" : "grab") : "default" }}
              onWheel={(e) => {
                if (e.ctrlKey || e.metaKey) {
                  e.preventDefault();
                  setZoom((z) => Math.min(Math.max(z + (e.deltaY < 0 ? 0.15 : -0.15), 0.5), 4));
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
              <div className="flex min-h-full min-w-full items-center justify-center">
                <img
                  src={imageSrc}
                  alt="Full shelf"
                  draggable={false}
                  style={
                    zoom === 1
                      ? { width: "100%", height: "100%", objectFit: "contain", display: "block", userSelect: "none" }
                      : { width: `${zoom * 100}%`, display: "block", userSelect: "none" }
                  }
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

