// src/services/warehouseService.js
import { fetchWithAuth } from "./apiClient";

const BASE_PATH = "/Warehouses";

/** Parse response an toàn - giống rescueRequestService */
async function parseResponse(res) {
  const raw = await res.text();
  let json = null;

  try {
    json = raw ? JSON.parse(raw) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    console.error(`API Error (${res.status}):`, json || raw);
    const error = new Error(
      (json && (json.message || json.title)) ||
      (res.status === 403
        ? "Bạn không có quyền thực hiện thao tác này."
        : "") ||
      raw ||
      `Lỗi từ Server (${res.status})`
    );
    error.status = res.status;
    throw error;
  }

  return json;
}

/**
 * GET /api/Warehouses
 */
export async function getWarehouses() {
  const res = await fetchWithAuth(BASE_PATH, { method: "GET" });
  return await parseResponse(res);
}

/**
 * GET /api/Warehouses/{id}
 */
export async function getWarehouseById(id) {
  const res = await fetchWithAuth(`${BASE_PATH}/${id}`, { method: "GET" });
  return await parseResponse(res);
}

/**
 * POST /api/Warehouses
 */
export async function createWarehouse(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("payload is required.");
  }

  const res = await fetchWithAuth(BASE_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return await parseResponse(res);
}

/**
 * PUT /api/Warehouses/{id}
 */
export async function updateWarehouse(id, payload) {
  const res = await fetchWithAuth(`${BASE_PATH}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return await parseResponse(res);
}

/**
 * DELETE /api/Warehouses/{id}
 */
export async function deleteWarehouse(id) {
  const res = await fetchWithAuth(`${BASE_PATH}/${id}`, {
    method: "DELETE",
  });

  return await parseResponse(res);
}

export const warehouseService = {
  getWarehouses,
  getWarehouseById,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
};
