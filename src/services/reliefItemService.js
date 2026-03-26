import { API_BASE_URL, fetchWithAuth } from "./apiClient";

const BASE  = `${API_BASE_URL}/ReliefItems`;

const pickFirstValue = (source, keys, fallback = null) => {
    for (const key of keys) {
        const value = source?.[key];
        if (value !== undefined && value !== null && value !== "") {
            return value;
        }
    }

    return fallback;
};

// FIX: Handle ApiResponse/content/data/array payloads safely in one place.
export async function extractApiData(response, debugLabel = "ReliefItems API") {
    const isFetchResponse =
        response &&
        typeof response === "object" &&
        typeof response.text === "function" &&
        typeof response.ok === "boolean";

    let payload = response;
    let rawText = "";

    if (isFetchResponse) {
        rawText = await response.text();

        try {
            payload = rawText ? JSON.parse(rawText) : null;
        } catch (error) {
            console.warn(`[${debugLabel}] Response is not valid JSON:`, error);
            payload = rawText || null;
        }

        console.log(`[${debugLabel}] Raw payload:`, payload);

        if (!response.ok || payload?.success === false) {
            const error = new Error(
                payload?.message ||
                payload?.title ||
                rawText ||
                `Request failed (${response.status})`,
            );
            error.status = response.status;
            error.payload = payload;
            throw error;
        }
    } else {
        console.log(`[${debugLabel}] Parsed payload:`, payload);

        if (payload?.success === false) {
            const error = new Error(payload?.message || "Request failed.");
            error.payload = payload;
            throw error;
        }
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

export function normalizeReliefItem(item = {}) {
    const reliefItemID = pickFirstValue(item, [
        "reliefItemID",
        "ReliefItemID",
        "reliefItemId",
        "ReliefItemId",
        "id",
        "ID",
    ]);
    const reliefItemName = pickFirstValue(item, [
        "reliefItemName",
        "ReliefItemName",
        "itemName",
        "ItemName",
        "name",
        "Name",
    ], "");
    const categoryID = pickFirstValue(item, [
        "categoryID",
        "CategoryID",
        "categoryId",
        "CategoryId",
    ], "");
    const unitID = pickFirstValue(item, [
        "unitID",
        "UnitID",
        "unitId",
        "UnitId",
    ], "");
    const categoryName = pickFirstValue(item, [
        "categoryName",
        "CategoryName",
    ], item?.category?.name || item?.Category?.Name || "");
    const unitName = pickFirstValue(item, [
        "unitName",
        "UnitName",
    ], item?.unit?.name || item?.Unit?.Name || "");

    return {
        ...item,
        id: reliefItemID ?? item?.id ?? item?.ID ?? null,
        reliefItemID: reliefItemID ?? null,
        reliefItemId: reliefItemID ?? null,
        reliefItemName,
        categoryID,
        categoryId: categoryID,
        unitID,
        unitId: unitID,
        categoryName,
        unitName,
    };
}

export function normalizeReliefItems(items) {
    if (!Array.isArray(items)) return [];
    return items.map((item) => normalizeReliefItem(item));
}

const normalizeSingleReliefItem = (item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
        return item;
    }

    return normalizeReliefItem(item);
};

export const reliefItemsService = {
    async getAll() {
        console.log("[reliefItemsService.getAll] Endpoint:", BASE);
        const res = await fetchWithAuth(BASE, { method: "GET" });
        const data = await extractApiData(res, "GET ReliefItems");
        const normalized = normalizeReliefItems(data);
        console.log("[reliefItemsService.getAll] Normalized items:", normalized);
        return normalized;
    },
    async getById(id) {
        console.log("[reliefItemsService.getById] Endpoint:", `${BASE}/${id}`);
        const res = await fetchWithAuth(`${BASE}/${id}`, { method: "GET" });
        const data = await extractApiData(res, `GET ReliefItems/${id}`);
        return normalizeSingleReliefItem(data);
    },

    async create(payload) {
        console.log("[reliefItemsService.create] Endpoint:", BASE);
        console.log("[reliefItemsService.create] Payload:", payload);
        const res = await fetchWithAuth(BASE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const data = await extractApiData(res, "POST ReliefItems");
        return normalizeSingleReliefItem(data);
    },

    async update(id, payload) {
        console.log("[reliefItemsService.update] Endpoint:", `${BASE}/${id}`);
        console.log("[reliefItemsService.update] Payload:", payload);
        const res = await fetchWithAuth(`${BASE}/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const data = await extractApiData(res, `PUT ReliefItems/${id}`);
        return normalizeSingleReliefItem(data);
    },

    async remove(id) {
        console.log("[reliefItemsService.remove] Endpoint:", `${BASE}/${id}`);
        const res = await fetchWithAuth(`${BASE}/${id}`, {
            method: "DELETE",
        });
        return await extractApiData(res, `DELETE ReliefItems/${id}`);
    },
};
