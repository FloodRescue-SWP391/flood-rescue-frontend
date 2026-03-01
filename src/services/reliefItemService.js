import { API_BASE_URL, fetchWithAuth } from "./apiClient";

const BASE  = `${API_BASE_URL}/ReliefItems`;

export const reliefItemsService = {
    async getAll() {
        const res = await fetchWithAuth(BASE);
        return await res.json();
    },
    async getById(id) {
        const res = await fetchWithAuth(`${BASE}/${id}`);
        return await res.json();
    },

    async create(payload) {
        const res = await fetchWithAuth(BASE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        return await res.json();
    },

    async update(id, payload) {
        const res = await fetchWithAuth(`${BASE}/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        return await res.json();
    },

    async remove(id) {
        const res = await fetchWithAuth(`${BASE}/${id}`, {
            method: "DELETE",
        });
        return await res.json();
    },
};
