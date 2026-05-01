/**
 * RetailEye — API Service
 * All calls go to the FastAPI backend at http://localhost:8000
 */

export const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

let authToken = null;
export function setAuthToken(token) {
  authToken = token;
}

export async function apiFetch(endpoint, options = {}) {
  const headers = {
    ...options.headers,
  };
  
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Clear token and redirect if unauthorized
      setAuthToken(null);
      localStorage.removeItem("retaileye:token");
      localStorage.removeItem("retaileye:user");
      window.location.href = "/login";
    }
    let msg = "API Error";
    try {
      const errData = await response.json();
      msg = errData.detail || msg;
    } catch (e) {
      msg = `HTTP Error ${response.status}`;
    }
    throw new Error(msg);
  }
  return response.json();
}

// ─── Analysis ──────────────────────────────────────────────────────────────

/**
 * Upload a single image for analysis.
 * @param {File} file
 * @param {(progress: number) => void} onProgress - optional callback (0-100)
 * @returns {Promise<Object>} API response with report + processed_image_url
 */
export async function analyzeImage(file, onProgress) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BASE_URL}/analyze/image`);
    if (authToken) {
      xhr.setRequestHeader("Authorization", `Bearer ${authToken}`);
    }

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 50)); // 0-50 = uploading
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (e) {
          reject(new Error("Invalid JSON response"));
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.detail || `HTTP ${xhr.status}`));
        } catch (_) {
          reject(new Error(`HTTP ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(formData);
  });
}

/**
 * Upload a video for analysis.
 * @param {File} file
 * @param {(progress: number) => void} onProgress
 */
export async function analyzeVideo(file, onProgress) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BASE_URL}/analyze/video`);
    if (authToken) {
      xhr.setRequestHeader("Authorization", `Bearer ${authToken}`);
    }

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 40));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (e) {
          reject(new Error("Invalid JSON response"));
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.detail || `HTTP ${xhr.status}`));
        } catch (_) {
          reject(new Error(`HTTP ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(formData);
  });
}

// ─── History ───────────────────────────────────────────────────────────────

export async function getHistory(limit = 50, skip = 0, storeId = null) {
  const params = new URLSearchParams({ limit, skip });
  if (storeId) params.append("store_id", storeId);
  const qs = params.toString();
  
  const cacheKey = `history_${qs}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  
  const data = await apiFetch(`/history?${qs}`);
  setCache(cacheKey, data);
  return data;
}

// ─── Notifications ─────────────────────────────────────────────────────────

export async function getNotifications(limit = 10) {
  return apiFetch(`/notifications?limit=${limit}`);
}

export async function getHistoryItem(id) {
  return apiFetch(`/history/${id}`);
}

export async function deleteHistoryItem(id) {
  const res = await apiFetch(`/history/${id}`, { method: "DELETE" });
  cache.clear(); // invalidate cache on delete
  return res;
}

export async function resolveHistoryItem(id) {
  const res = await apiFetch(`/history/${id}/resolve`, { method: "PATCH" });
  cache.clear(); // invalidate cache on resolution
  return res;
}

export async function clearAllHistory() {
  const res = await apiFetch("/history", { method: "DELETE" });
  cache.clear(); // invalidate cache
  return res;
}

// ─── Stats & Heatmap ────────────────────────────────────────────────────────
export async function getStats() {
  const cacheKey = "stats";
  const cached = getCached(cacheKey);
  if (cached) return cached;
  
  const data = await apiFetch("/stats");
  setCache(cacheKey, data);
  return data;
}

export async function getHeatmapStats(limit = 8) {
  const cacheKey = `heatmap_${limit}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  
  const data = await apiFetch(`/stats/heatmap?limit=${limit}`);
  setCache(cacheKey, data);
  return data;
}

// ─── Simple Cache ──────────────────────────────────────────────────────────
const cache = new Map();
const CACHE_TTL = 30000; // 30 seconds

function getCached(key) {
  const item = cache.get(key);
  if (item && Date.now() - item.timestamp < CACHE_TTL) {
    return item.data;
  }
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

// ─── Settings ─────────────────────────────────────────────────────────────

export async function getSettings() {
  return apiFetch("/settings");
}

export async function saveSettings(data) {
  return apiFetch("/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

// ─── Downloads ─────────────────────────────────────────────────────────────

export function getDownloadUrl(id, format) {
  return `${BASE_URL}/download/${id}/${format}`;
}

export function getFileUrl(relativePath) {
  // relativePath like "/outputs/processed_abc123.jpg"
  return `${BASE_URL}${relativePath}`;
}
