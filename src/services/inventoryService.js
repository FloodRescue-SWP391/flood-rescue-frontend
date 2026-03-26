import { fetchWithAuth } from "./apiClient";

const BASE_PATH = "/Inventories";

// Parse JSON và ném lỗi thống nhất để màn Manager đọc dữ liệu ổn định.
async function parseJsonResponse(res) {
  const text = await res.text();
  let json = {};

  try {
    json = text ? JSON.parse(text) : {};
  } catch (error) {
    console.warn("[inventoryService] Response is not valid JSON:", error);
    json = {};
  }

  if (!res.ok || json?.success === false) {
    throw new Error(json?.message || `Request failed (${res.status})`);
  }
  return json;
}


/**
 * GET /api/Inventories?warehouseId=1
 */
// Lấy tồn kho theo warehouse cho dashboard manager.
export async function getInventoryByWarehouse(warehouseId) {
  if (warehouseId === undefined || warehouseId === null || warehouseId === "") {
    throw new Error("warehouseId is required.");
  }

  const res = await fetchWithAuth(
    `${BASE_PATH}?warehouseId=${encodeURIComponent(warehouseId)}`,
    { method: "GET" },
  );

  // // ApiResponse<T>: { success, message, statusCode, content }
  // if (res?.success === false) {
  //   throw new Error(res?.message || "Failed to get inventory.");
  // }

  // return res; // UI lấy res.content
  return await parseJsonResponse(res);
}

/**
 * POST /api/Inventories/receive
 * body: { warehouseID, items: [{ reliefItemID, quantity }] }
 */
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

  // if (res?.success === false) {
  //   throw new Error(res?.message || "Receive inventory failed.");
  // }

  // return res; // UI lấy res.content
  return await parseJsonResponse(res);
}
/**
 * PUT /api/Inventories/adjust
 * body: { warehouseID, items: [{ reliefItemID, adjustmentQuantity }] }
 */
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

  // if (res?.success === false) {
  //   throw new Error(res?.message || "Adjust inventory failed.");
  // }

  // return res; // UI lấy res.content
  return await parseJsonResponse(res);
}

// NEW: Xóa tồn kho của một vật phẩm trong kho bằng cách điều chỉnh số lượng về 0.
export async function removeInventoryStock({
  warehouseID,
  reliefItemID,
  inventoryID = null,
  quantity = 0,
}) {
  if (warehouseID === undefined || warehouseID === null || warehouseID === "") {
    throw new Error("warehouseID is required.");
  }

  if (reliefItemID === undefined || reliefItemID === null || reliefItemID === "") {
    throw new Error("reliefItemID is required.");
  }

  const numericQuantity = Number(quantity);
  if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) {
    throw new Error("quantity must be greater than 0 to remove inventory.");
  }

  return await adjustInventory({
    warehouseID,
    items: [
      {
        inventoryID,
        InventoryID: inventoryID,
        reliefItemID,
        ReliefItemID: reliefItemID,
        adjustmentQuantity: -Math.abs(numericQuantity),
      },
    ],
  });
}

export const inventoryService = {
  getInventoryByWarehouse,
  receiveInventory,
  adjustInventory,
  removeInventoryStock,
};
