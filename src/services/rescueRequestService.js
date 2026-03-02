import { API_BASE_URL } from "./apiClient";

//fetchWithTimeout dùng để tránh tình trạng request bị treo vô hạn (pending mãi không trả về).
const fetchWithTimeout = (url, options = {}, ms = 60000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);

  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
};


// POST: /api/RescueRequests
export async function createRescueRequest(payload) {
  const res = await fetchWithTimeout(`${API_BASE_URL}/RescueRequests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const raw = await res.text();
  let json = null;
  try { json = raw ? JSON.parse(raw) : null; } catch { }

  if (!res.ok) {
    // log để gửi BE
    console.error("CreateRescueRequest FAIL:", {
      status: res.status,
      statusText: res.statusText,
      body: json ?? raw,
      sent: payload,
    });

    const msg =
      (json && (json.message || json.title)) ||
      raw ||
      `Create rescue request failed (${res.status})`;

    throw new Error(msg);
  }

  return json; // ApiResponse
}

// GET: /api/RescueRequests/track/{shortCode}
export async function trackRescueRequest(shortCode) {
  const res = await fetch(
    `${API_BASE_URL}/RescueRequests/track/${encodeURIComponent(shortCode)}`
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || "Track rescue request failed");
  return json;//apiResponse
}
//  GET: /api/RescueRequests  (Coordinator dùng để lấy list)
export async function getAllRescueRequests() {
  const res = await fetch(`${API_BASE_URL}/RescueRequests`);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || "Get rescue requests failed");
  return json; // ApiResponse<List>
}

// optional: nếu BE có hỗ trợ query status
export async function getRescueRequestsByStatus(status) {
  const res = await fetch(
    `${API_BASE_URL}/RescueRequests?status=${encodeURIComponent(status)}`
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || "Get rescue requests failed");
  return json;
}