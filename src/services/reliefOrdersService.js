import { API_BASE_URL, fetchWithAuth } from "./apiClient";

const BASE = `${API_BASE_URL}/ReliefOrders`;

export const reliefOrdersService = {
    // POST /api/ReliefOrders/prepare
    async prepareOrder(payload) {
        // payload: { reliefOrderID, items: [{ reliefItemID, quantity }] }
        const res = await fetchWithAuth(`${BASE}/prepare`, {
            method: "POST",
            body: JSON.stringify(payload),
        });
        return await res.json(); // ApiResponse<...>
    },
    async getAll() {
        const res = await fetchWithAuth(`${BASE}`);
        return await res.json();
    },

    async getById(id) {
        const res = await fetchWithAuth(`${BASE}/${id}`);
        return await res.json();
    },
    async getPending() {
        const res = await fetchWithAuth(`${BASE}?status=Pending`);
        return await res.json();
    },
    // (optional nếu backend có) getAll/getById sau này
};