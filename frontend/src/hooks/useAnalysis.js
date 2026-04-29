import { useState, useCallback } from "react";

/**
 * Custom hook for managing shelf analysis API calls.
 * Handles file upload, loading state, and error handling.
 */
export default function useAnalysis() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const analyzeFile = useCallback(async (file) => {
    setIsLoading(true);
    setError(null);

    try {
      // Determine endpoint based on MIME type
      const isVideo = file.type.startsWith("video/");
      const endpoint = isVideo ? "/api/analyze/video" : "/api/analyze/image";

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error: ${response.status}`);
      }

      const data = await response.json();

      // Build full media URL
      const mediaKey = isVideo ? "processed_video_url" : "processed_image_url";
      const mediaUrl = data[mediaKey]
        ? `/api${data[mediaKey]}`
        : null;

      return {
        report: data.report,
        mediaUrl,
        jsonUrl: data.report_json_url ? `/api${data.report_json_url}` : null,
        csvUrl: data.report_csv_url ? `/api${data.report_csv_url}` : null,
        mediaType: isVideo ? "video" : "image",
      };
    } catch (err) {
      console.error("[useAnalysis]", err);
      setError(err.message || "Analysis failed");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { analyzeFile, isLoading, error };
}
