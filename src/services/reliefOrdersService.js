import { API_BASE_URL, fetchWithAuth } from "./apiClient";

const BASE = `${API_BASE_URL}/ReliefOrders`;

async function safeJson(res) {
    const text = await res.text();

    // No content
    if (!text) {
        return res.ok
            ? { success: true, message: "OK", statusCode: res.status, content: null }
            : { success: false, message: `HTTP ${res.status}`, statusCode: res.status, content: null };
    }

    try {
        return JSON.parse(text);
    } catch {
        return { success: false, message: text, statusCode: res.status, content: null };
    }
}

export const reliefOrdersService = {
    // POST /api/ReliefOrders/prepare
    async prepareOrder(payload) {
        // payload: { reliefOrderID, items: [{ reliefItemID, quantity }] }
        const res = await fetchWithAuth(`${BASE}/prepare`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" }, // nên thêm
            body: JSON.stringify(payload),
        });
        return await safeJson(res); // ApiResponse<...>
    },
    async getAll() {
        const res = await fetchWithAuth(`${BASE}`);
        return await safeJson(res);
    },

    async getById(id) {
        const res = await fetchWithAuth(`${BASE}/${id}`);
        return await safeJson(res);
    },
    async getPending() {
        const res = await fetchWithAuth(`${BASE}?status=Pending`);
        return await safeJson(res);
    },

};