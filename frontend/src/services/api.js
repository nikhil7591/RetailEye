/**
 * RetailEye — API Service
 * All calls go to the FastAPI backend at http://localhost:8000
 */

const BASE_URL = "http://localhost:8000";

// Helper: generic fetch with error handling
async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, options);
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      detail = err.detail || detail;
    } catch (_) {}
    throw new Error(detail);
  }
  return res.json();
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

export async function getHistory(limit = 50, skip = 0) {
  return apiFetch(`/history?limit=${limit}&skip=${skip}`);
}

export async function getHistoryItem(id) {
  return apiFetch(`/history/${id}`);
}

export async function deleteHistoryItem(id) {
  return apiFetch(`/history/${id}`, { method: "DELETE" });
}

export async function clearAllHistory() {
  return apiFetch(`/history`, { method: "DELETE" });
}

// ─── Stats ─────────────────────────────────────────────────────────────────

export async function getStats() {
  return apiFetch("/stats");
}

// ─── Downloads ─────────────────────────────────────────────────────────────

export function getDownloadUrl(id, format) {
  return `${BASE_URL}/download/${id}/${format}`;
}

export function getFileUrl(relativePath) {
  // relativePath like "/outputs/processed_abc123.jpg"
  return `${BASE_URL}${relativePath}`;
}
