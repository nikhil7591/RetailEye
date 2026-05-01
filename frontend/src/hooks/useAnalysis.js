import { useState, useCallback } from "react";
import { analyzeImage, analyzeVideo } from "../services/api";

export default function useAnalysis() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const analyzeFile = useCallback(async (file) => {
    setIsLoading(true);
    setError(null);
    setData(null);

    try {
      const isVideo = file?.type?.startsWith("video/");
      const result = await (isVideo ? analyzeVideo(file) : analyzeImage(file));
      setData(result);
      return result;
    } catch (err) {
      setError(err.message || "An error occurred during analysis.");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    data,
    isLoading,
    error,
    analyzeFile,
    reset,
  };
}
