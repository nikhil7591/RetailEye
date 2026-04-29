import { useState, useRef } from "react";

/**
 * UploadPanel — Drag-and-drop / click file uploader for images & videos.
 */
export default function UploadPanel({ onAnalyze }) {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const accept = ".jpg,.jpeg,.png,.mp4";

  const handleFile = (f) => {
    if (f) setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const isImage = file?.type?.startsWith("image/");
  const isVideo = file?.type?.startsWith("video/");

  return (
    <div className="mx-auto max-w-2xl py-16">
      {/* Hero text */}
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Upload Shelf <span className="text-brand-500">Image</span>
        </h2>
        <p className="mt-3 text-slate-500 dark:text-slate-400">
          Drop a shelf photo or video and let AI analyze product occupancy in seconds.
        </p>
      </div>

      {/* Dropzone */}
      <div
        id="upload-dropzone"
        className={`dropzone flex cursor-pointer flex-col items-center justify-center rounded-2xl px-8 py-16 text-center transition-all ${dragOver ? "dragover" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        {!file ? (
          <>
            {/* Upload icon */}
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              Drag &amp; drop your file here, or <span className="text-brand-500 underline">browse</span>
            </p>
            <p className="mt-1 text-xs text-slate-400">JPG, PNG, or MP4 · Max 50 MB</p>
          </>
        ) : (
          <div className="flex items-center gap-4">
            {/* File type icon */}
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${isVideo ? "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400" : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"}`}>
              {isVideo ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              )}
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate max-w-xs">
                {file.name}
              </p>
              <p className="text-xs text-slate-400">{formatSize(file.size)}</p>
            </div>
            {/* Remove button */}
            <button
              onClick={(e) => { e.stopPropagation(); setFile(null); }}
              className="ml-2 rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Analyze button */}
      {file && (
        <div className="mt-6 flex justify-center">
          <button
            id="analyze-button"
            onClick={() => onAnalyze(file)}
            className="btn btn-primary px-8 py-3 text-base"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            Analyze Shelf
          </button>
        </div>
      )}
    </div>
  );
}
