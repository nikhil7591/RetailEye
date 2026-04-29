/**
 * DownloadPanel — Download buttons for JSON, CSV, and video/image reports.
 * Uses fetch + Blob to force downloads for cross-origin/proxied URLs.
 */
export default function DownloadPanel({ mediaType, mediaUrl, jsonUrl, csvUrl }) {
  const handleDownload = async (url, filename) => {
    if (!url) return;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download error:", err);
      alert("Download failed: " + err.message);
    }
  };

  const downloads = [
    { id: "dl-json", label: "JSON Report", icon: "📄", href: jsonUrl, filename: "report.json" },
    { id: "dl-csv", label: "CSV Report", icon: "📊", href: csvUrl, filename: "report.csv" },
    {
      id: "dl-media",
      label: mediaType === "video" ? "Processed Video" : "Processed Image",
      icon: mediaType === "video" ? "🎬" : "🖼️",
      href: mediaUrl,
      filename: mediaType === "video" ? "processed_video.mp4" : "processed_image.jpg",
    },
  ].filter((d) => d.href);

  return (
    <div id="download-panel" className="glass-card">
      <h3 className="mb-1 text-base font-bold tracking-tight">Downloads</h3>
      <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
        Export your analysis results
      </p>

      <div className="space-y-2">
        {downloads.map((d) => (
          <button
            key={d.id}
            id={d.id}
            onClick={() => handleDownload(d.href, d.filename)}
            className="btn btn-outline w-full justify-start"
          >
            <span className="text-lg">{d.icon}</span>
            {d.label}
          </button>
        ))}
      </div>
    </div>
  );
}
