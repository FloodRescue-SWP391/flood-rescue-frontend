// src/services/warehouseService.js
import { fetchWithAuth } from "./apiClient";

const BASE_PATH = "/Warehouses";

const pickFirstValue = (source, keys, fallback = null) => {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return fallback;
};

/** Parse response safely before extracting actual payload. */
async function parseResponse(res, debugLabel = "Warehouses API") {
  const raw = await res.text();
  let json = null;

  try {
    json = raw ? JSON.parse(raw) : null;
  } catch {
    json = null;
  }

  console.log(`[${debugLabel}] Raw payload:`, json || raw);

  if (!res.ok || json?.success === false) {
    console.error(`API Error (${res.status}):`, json || raw);
    const error = new Error(
      (json && (json.message || json.title)) ||
        (res.status === 403
          ? "Bạn không có quyền thực hiện thao tác này."
          : "") ||
        raw ||
        `Lỗi từ Server (${res.status})`,
    );
    error.status = res.status;
    error.payload = json || raw;
    throw error;
  }

  return json;
}

// FIX: Support ApiResponse { content }, { data }, or direct array/object.
export async function extractApiData(response, debugLabel = "Warehouses API") {
  const isFetchResponse =
    response &&
    typeof response === "object" &&
    typeof response.text === "function" &&
    typeof response.ok === "boolean";

  const payload = isFetchResponse
    ? await parseResponse(response, debugLabel)
    : response;

  if (payload?.success === false) {
    const error = new Error(payload?.message || "Warehouse request failed.");
    error.payload = payload;
    throw error;
  }

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data?.content)) return payload.data.content;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;

  if (payload?.content !== undefined) return payload.content;
  if (payload?.data?.content !== undefined) return payload.data.content;
  if (payload?.data !== undefined) return payload.data;
  if (payload?.items !== undefined) return payload.items;
  if (payload?.results !== undefined) return payload.results;

  return payload;
}

export function normalizeWarehouse(warehouse = {}) {
  const warehouseId = pickFirstValue(warehouse, [
    "warehouseId",
    "WarehouseId",
    "warehouseID",
    "WarehouseID",
    "id",
    "ID",
  ]);
  const warehouseName = pickFirstValue(
    warehouse,
    ["warehouseName", "WarehouseName", "name", "Name"],
    "",
  );
  const address = pickFirstValue(warehouse, ["address", "Address"], "");
  const locationLat = pickFirstValue(
    warehouse,
    ["locationLat", "LocationLat", "latitude", "Latitude", "lat", "Lat"],
    "",
  );
  const locationLong = pickFirstValue(
    warehouse,
    [
      "locationLong",
      "LocationLong",
      "longitude",
      "Longitude",
      "lng",
      "Lng",
      "lon",
      "Lon",
    ],
    "",
  );
  const isDeleted = pickFirstValue(
    warehouse,
    ["isDeleted", "IsDeleted"],
    false,
  );
  const createdBy = pickFirstValue(
    warehouse,
    ["createdBy", "CreatedBy"],
    "",
  );

  return {
    ...warehouse,
    id: warehouseId ?? warehouse?.id ?? warehouse?.ID ?? null,
    warehouseId: warehouseId ?? null,
    warehouseID: warehouseId ?? null,
    warehouseName,
    name: warehouse?.name || warehouseName,
    address,
    locationLat,
    locationLong,
    isDeleted: Boolean(isDeleted),
    createdBy,
  };
}

export function normalizeWarehouses(items) {
  if (!Array.isArray(items)) return [];
  return items.map((warehouse) => normalizeWarehouse(warehouse));
}

const normalizeSingleWarehouse = (warehouse) => {
  if (!warehouse || typeof warehouse !== "object" || Array.isArray(warehouse)) {
    return warehouse;
  }

  return normalizeWarehouse(warehouse);
};

/**
 * GET /api/Warehouses
 */
export async function getWarehouses() {
  console.log("[warehouseService.getWarehouses] Endpoint:", BASE_PATH);
  const res = await fetchWithAuth(BASE_PATH, { method: "GET" });
  const data = await extractApiData(res, "GET Warehouses");
  const normalized = normalizeWarehouses(data);
  console.log("[warehouseService.getWarehouses] Normalized warehouses:", normalized);
  return normalized;
}

/**
 * GET /api/Warehouses/filter
 */
export async function filterWarehouses(params = {}) {
  const searchParams = new URLSearchParams();

  if (params?.name) searchParams.append("Name", params.name);
  if (params?.address) searchParams.append("Address", params.address);
  if (params?.isActive !== "" && params?.isActive !== undefined && params?.isActive !== null) {
    searchParams.append("IsActive", String(params.isActive));
  }
  if (params?.pageNumber) searchParams.append("PageNumber", String(params.pageNumber));
  if (params?.pageSize) searchParams.append("PageSize", String(params.pageSize));

  const query = searchParams.toString();
  const endpoint = query ? `${BASE_PATH}/filter?${query}` : `${BASE_PATH}/filter`;

  console.log("[warehouseService.filterWarehouses] Endpoint:", endpoint);

  const res = await fetchWithAuth(endpoint, { method: "GET" });
  const payload = await parseResponse(res, "GET Warehouses/filter");

  const rawItems = Array.isArray(payload?.content?.data)
    ? payload.content.data
    : Array.isArray(payload?.data?.content?.data)
      ? payload.data.content.data
      : Array.isArray(payload?.content)
        ? payload.content
        : [];

  const normalizedItems = normalizeWarehouses(rawItems);

  return {
    ...payload,
    content: {
      ...(payload?.content && typeof payload.content === "object" ? payload.content : {}),
      data: normalizedItems,
      totalCount: pickFirstValue(
        payload?.content,
        ["totalCount", "TotalCount"],
        normalizedItems.length,
      ),
    },
  };
}

/**
 * GET /api/Warehouses/{id}
 */
export async function getWarehouseById(id) {
  console.log("[warehouseService.getWarehouseById] Endpoint:", `${BASE_PATH}/${id}`);
  const res = await fetchWithAuth(`${BASE_PATH}/${id}`, { method: "GET" });
  const data = await extractApiData(res, `GET Warehouses/${id}`);
  return normalizeSingleWarehouse(data);
}

/**
 * POST /api/Warehouses
 */
export async function createWarehouse(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("payload is required.");
  }

  console.log("[warehouseService.createWarehouse] Endpoint:", BASE_PATH);
  console.log("[warehouseService.createWarehouse] Payload:", payload);
  const res = await fetchWithAuth(BASE_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await extractApiData(res, "POST Warehouses");
  return normalizeSingleWarehouse(data);
}

/**
 * PUT /api/Warehouses/{id}
 */
export async function updateWarehouse(id, payload) {
  console.log("[warehouseService.updateWarehouse] Endpoint:", `${BASE_PATH}/${id}`);
  console.log("[warehouseService.updateWarehouse] Payload:", payload);
  const res = await fetchWithAuth(`${BASE_PATH}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await extractApiData(res, `PUT Warehouses/${id}`);
  return normalizeSingleWarehouse(data);
}

/**
 * DELETE /api/Warehouses/{id}
 */
export async function deleteWarehouse(id) {
  console.log("[warehouseService.deleteWarehouse] Endpoint:", `${BASE_PATH}/${id}`);
  const res = await fetchWithAuth(`${BASE_PATH}/${id}`, {
    method: "DELETE",
  });

  return await extractApiData(res, `DELETE Warehouses/${id}`);
}

export const warehouseService = {
  getWarehouses,
  filterWarehouses,
  getWarehouseById,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
};
