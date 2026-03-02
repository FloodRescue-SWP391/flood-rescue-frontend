import { API_BASE_URL } from "./apiClient";

// POST: /api/RescueRequests
export async function createRescueRequest(payload) {
  const res = await fetch(`${API_BASE_URL}/RescueRequests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || "Create rescue request failed");
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