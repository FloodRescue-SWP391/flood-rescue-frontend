// src/services/inventoryService.js
import { fetchWithAuth } from "./apiClient";

const BASE_PATH = "/Inventorys";

/**
 * GET /api/inventorys?warehouseId=1
 */
export async function getInventoryByWarehouse(warehouseId) {
  if (!warehouseId || Number(warehouseId) <= 0) {
    throw new Error("warehouseId must be a positive number.");
  }

  const res = await fetchWithAuth(
    `${BASE_PATH}?warehouseId=${encodeURIComponent(warehouseId)}`,
    { method: "GET" }
  );

  // ApiResponse<T>: { success, message, statusCode, content }
  if (res?.success === false) {
    throw new Error(res?.message || "Failed to get inventory.");
  }

  return res; // UI lấy res.content
}

/**
 * POST /api/inventorys/receive
 * body: { warehouseID, items: [{ reliefItemID, quantity }] }
 */
export async function receiveInventory(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("payload is required.");
  }

  const { warehouseID, items } = payload;

  if (!warehouseID || Number(warehouseID) <= 0) {
    throw new Error("warehouseID must be a positive number.");
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("items must be a non-empty array.");
  }
  for (const it of items) {
    if (!it?.reliefItemID || Number(it.reliefItemID) <= 0) {
      throw new Error("Each item must have a valid reliefItemID > 0.");
    }
    if (it?.quantity == null || Number(it.quantity) <= 0) {
      throw new Error("Each item must have quantity > 0.");
    }
  }

  const res = await fetchWithAuth(`${BASE_PATH}/receive`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (res?.success === false) {
    throw new Error(res?.message || "Receive inventory failed.");
  }

  return res; // UI lấy res.content
}

export const inventoryService = {
  getInventoryByWarehouse,
  receiveInventory,
};