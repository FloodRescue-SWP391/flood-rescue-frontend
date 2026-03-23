import { API_BASE_URL, fetchWithAuth } from "./apiClient";

//fetchWithTimeout dùng để tránh tình trạng request bị treo vô hạn (pending mãi không trả về).
const fetchWithTimeout = (url, options = {}, ms = 60000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);

  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
};

// helper parse response an toàn
async function parseResponse(res) {
  const raw = await res.text();
  let json = null;

  try {
    json = raw ? JSON.parse(raw) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    throw new Error(
      (json && (json.message || json.title)) ||
      raw ||
      `Request failed (${res.status})`
    );
  }

  return json;
}
// POST: /api/RescueRequests
export async function createRescueRequest(payload) {
  const res = await fetchWithTimeout(`${API_BASE_URL}/RescueRequests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const raw = await res.text();
  let json = null;

  try {
    json = raw ? JSON.parse(raw) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    // log để gửi BE
    console.error("CreateRescueRequest FAIL:", {
      status: res.status,
      statusText: res.statusText,
      body: json ?? raw,
      sent: payload,
    });

    throw new Error(
      (json && (json.message || json.title)) || raw ||
      `Create rescue request failed (${res.status})`
    );
  }
  return json; // ApiResponse
}

// GET: /api/RescueRequests/track/{shortCode}
export async function trackRescueRequest(shortCode) {
  const res = await fetchWithTimeout(
    `${API_BASE_URL}/RescueRequests/track/${encodeURIComponent(shortCode)}`
  );
  return await parseResponse(res);
}
//  GET: /api/RescueRequests  (Coordinator dùng để lấy list)
export async function getAllRescueRequests() {
  const res = await fetchWithTimeout(`${API_BASE_URL}/RescueRequests`);
  return await parseResponse(res);
}


// GET: /api/RescueRequests/{id}
export async function getRescueRequestById(id) {
  const res = await fetchWithAuth(`/RescueRequests/${id}`);
  return await res.json();
}
// GET: /api/RescueRequests/filter
export async function filterRescueRequests(params = {}) {
  const query = new URLSearchParams();

  if (params.status) {
    if (Array.isArray(params.status)) {
      params.status.forEach((s) => query.append("status", s));
    } else {
      query.append("status", params.status);
    }
  }

  if (params.requestType) query.append("requestType", params.requestType);
  if (params.fromDate) query.append("fromDate", params.fromDate);
  if (params.toDate) query.append("toDate", params.toDate);
  if (params.pageNumber) query.append("pageNumber", params.pageNumber);
  if (params.pageSize) query.append("pageSize", params.pageSize);

  const url = `${API_BASE_URL}/RescueRequests/filter${query.toString() ? `?${query.toString()}` : ""
    }`;

  const res = await fetchWithTimeout(url);
  return await parseResponse(res);
}