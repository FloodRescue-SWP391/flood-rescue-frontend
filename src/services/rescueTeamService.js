// src/services/rescueTeamService.js
import { fetchWithAuth } from "./apiClient";

const BASE = "/RescueTeams";

export async function getAllRescueTeams() {
    // ApiResponse<List<RescueTeamResponseDTO>>
    const res = await fetchWithAuth(`${BASE}/filter?pageNumber=1&pageSize=100`);
    const data = await res.json();
    return data;
}

// GET: ApiResponse<RescueTeamResponseDTO>
export async function getRescueTeamById(id) {
    if (!id) throw new Error("getRescueTeamById: id is required");
    return fetchWithAuth(`${BASE}/${id}`, { method: "GET" });
}

// POST: ApiResponse<RescueTeamResponseDTO>
export async function createRescueTeam(payload) {
    // payload: RescueTeamRequestDTO
    return fetchWithAuth(`${BASE}`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

// PUT: ApiResponse<RescueTeamResponseDTO>
export async function updateRescueTeam(id, payload) {
    if (!id) throw new Error("updateRescueTeam: id is required");
    // payload: RescueTeamRequestDTO
    return fetchWithAuth(`${BASE}/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
    });
}

// DELETE: ApiResponse<bool>
export async function deleteRescueTeam(id) {
    if (!id) throw new Error("deleteRescueTeam: id is required");
    return fetchWithAuth(`${BASE}/${id}`, { method: "DELETE" });
}