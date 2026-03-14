// src/services/warehouseService.js
import { fetchWithAuth } from "./apiClient";

const BASE_PATH = "/Warehouses";

/**
 * GET /api/Warehouses
 * Lấy danh sách warehouse
 */
export async function getWarehouses() {
  const res = await fetchWithAuth(BASE_PATH, {
    method: "GET",
  });

  if (res?.success === false) {
    throw new Error(res?.message || "Failed to get warehouses.");
  }

  return res; // UI dùng res.content
}

/**
 * GET /api/Warehouses/{id}
 * Lấy chi tiết warehouse
 */
export async function getWarehouseById(id) {
  if (!id || Number(id) <= 0) {
    throw new Error("Warehouse id must be a positive number.");
  }

  const res = await fetchWithAuth(`${BASE_PATH}/${id}`, {
    method: "GET",
  });

  if (res?.success === false) {
    throw new Error(res?.message || "Failed to get warehouse.");
  }

  return res;
}

/**
 * POST /api/Warehouses
 * Tạo warehouse
 */
export async function createWarehouse(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("payload is required.");
  }

  const res = await fetchWithAuth(BASE_PATH, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (res?.success === false) {
    throw new Error(res?.message || "Create warehouse failed.");
  }

  return res;
}

/**
 * PUT /api/Warehouses/{id}
 * Update warehouse
 */
export async function updateWarehouse(id, payload) {
  if (!id || Number(id) <= 0) {
    throw new Error("Warehouse id must be a positive number.");
  }

  const res = await fetchWithAuth(`${BASE_PATH}/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (res?.success === false) {
    throw new Error(res?.message || "Update warehouse failed.");
  }

  return res;
}

/**
 * DELETE /api/Warehouses/{id}
 * Xóa warehouse
 */
export async function deleteWarehouse(id) {
  if (!id || Number(id) <= 0) {
    throw new Error("Warehouse id must be a positive number.");
  }

  const res = await fetchWithAuth(`${BASE_PATH}/${id}`, {
    method: "DELETE",
  });

  if (res?.success === false) {
    throw new Error(res?.message || "Delete warehouse failed.");
  }

  return res;
}

export const warehouseService = {
  getWarehouses,
  getWarehouseById,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
};