/**
 * DownloadPanel — Download buttons for JSON, CSV, and video/image reports.
 */
export default function DownloadPanel({ mediaType, mediaUrl, jsonUrl, csvUrl }) {
  const downloads = [
    {
      id: "dl-json",
      label: "JSON Report",
      icon: "📄",
      href: jsonUrl,
      filename: "report.json",
    },
    {
      id: "dl-csv",
      label: "CSV Report",
      icon: "📊",
      href: csvUrl,
      filename: "report.csv",
    },
    {
      id: "dl-media",
      label: mediaType === "video" ? "Processed Video" : "Processed Image",
      icon: mediaType === "video" ? "🎬" : "🖼️",
      href: mediaUrl,
      filename: mediaType === "video" ? "processed_video.mp4" : "processed_image.jpg",
    },
  ];

  // Filter out media download if no video was processed
  const items = downloads.filter((d) => d.href !== null);

  return (
    <div id="download-panel" className="glass-card">
      <h3 className="mb-1 text-base font-bold tracking-tight">Downloads</h3>
      <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
        Export your analysis results
      </p>

      <div className="space-y-2">
        {items.map((d) => (
          <a
            key={d.id}
            id={d.id}
            href={d.href}
            download={d.filename}
            className="btn btn-outline w-full justify-start"
          >
            <span className="text-lg">{d.icon}</span>
            {d.label}
          </a>
        ))}
      </div>
    </div>
  );
}
