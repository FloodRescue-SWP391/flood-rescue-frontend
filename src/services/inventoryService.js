import { fetchWithAuth } from "./apiClient";

const BASE_PATH = "/Inventories";

// Parse JSON và ném lỗi thống nhất để màn Manager đọc dữ liệu ổn định.
async function parseJsonResponse(res) {
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok || json?.success === false) {
    throw new Error(json?.message || `Request failed (${res.status})`);
  }
  return json;
}

// Lấy tồn kho theo warehouse cho dashboard manager.
export async function getInventoryByWarehouse(warehouseId) {
  if (!warehouseId || Number(warehouseId) <= 0) {
    throw new Error("warehouseId must be a positive number.");
  }

  const res = await fetchWithAuth(
    `${BASE_PATH}?warehouseId=${encodeURIComponent(warehouseId)}`,
    { method: "GET" },
  );

  return await parseJsonResponse(res);
}

// Nhập hàng vào kho.
export async function receiveInventory(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("payload is required.");
  }

  const res = await fetchWithAuth(`${BASE_PATH}/receive`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return await parseJsonResponse(res);
}

// Điều chỉnh số lượng tồn kho.
export async function adjustInventory(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("payload is required.");
  }

  const res = await fetchWithAuth(`${BASE_PATH}/adjust`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return await parseJsonResponse(res);
}

export const inventoryService = {
  getInventoryByWarehouse,
  receiveInventory,
  adjustInventory,
};
