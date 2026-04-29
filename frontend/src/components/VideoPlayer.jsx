/**
 * VideoPlayer — Displays the processed image or video result.
 */
export default function VideoPlayer({ url, type }) {
  if (!url) return null;

  return (
    <div id="media-player" className="glass-card overflow-hidden !p-0">
      <div className="relative bg-slate-900">
        {type === "video" ? (
          <video
            src={url}
            controls
            autoPlay
            loop
            className="w-full rounded-2xl object-contain"
            style={{ maxHeight: "500px" }}
          />
        ) : (
          <img
            src={url}
            alt="Analyzed shelf"
            className="w-full rounded-2xl object-contain"
            style={{ maxHeight: "500px" }}
          />
        )}
      </div>
    </div>
  );
}
