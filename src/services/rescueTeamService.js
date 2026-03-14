// src/services/rescueTeamService.js
import { fetchWithAuth } from "./apiClient";

const BASE = "/RescueTeams";


// GET: ApiResponse<List<RescueTeamResponseDTO>>
export async function getAllRescueTeams(options = {}) {
    const { noCache = false } = options;

    let url = `${BASE}/filter?pageNumber=1&pageSize=100`;

    if (noCache) {
        url += `&_t=${Date.now()}`;
    }

    const res = await fetchWithAuth(url, { method: "GET" });
    return res.json();
}

// GET: ApiResponse<RescueTeamResponseDTO>
export async function getRescueTeamById(id) {
    if (!id) throw new Error("getRescueTeamById: id is required");
    return fetchWithAuth(`${BASE}/${id}`, { method: "GET" });
}

// POST: ApiResponse<RescueTeamResponseDTO>
export async function createRescueTeam(payload) {
    const res = await fetchWithAuth(`${BASE}`, {
        method: "POST",
        body: JSON.stringify(payload),
    });

    return res.json();
}

// PUT: ApiResponse<RescueTeamResponseDTO>
export async function updateRescueTeam(id, payload) {
    if (!id) throw new Error("updateRescueTeam: id is required");

    const res = await fetchWithAuth(`${BASE}/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
    });

    return res.json();
}

// DELETE: ApiResponse<bool>
export async function deleteRescueTeam(id) {
    if (!id) throw new Error("deleteRescueTeam: id is required");

    const res = await fetchWithAuth(`${BASE}/${id}`, {
        method: "DELETE",
    });

    return res.json();

}