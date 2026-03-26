// src/services/rescueTeamService.js
import { fetchWithAuth } from "./apiClient";

const BASE = "/RescueTeams";

async function parseJsonSafe(res, debugLabel = "RescueTeams API") {
    const raw = await res.text();
    let json = null;

    try {
        json = raw ? JSON.parse(raw) : null;
    } catch (error) {
        console.warn(`[${debugLabel}] Response is not valid JSON:`, error);
        json = null;
    }

    if (!res.ok || json?.success === false) {
        const error = new Error(
            json?.message ||
            json?.title ||
            raw ||
            `Request failed (${res.status})`,
        );
        error.status = res.status;
        error.payload = json;
        throw error;
    }

    return json ?? {};
}


// GET: ApiResponse<List<RescueTeamResponseDTO>>
export async function getAllRescueTeams(options = {}) {
    const { noCache = false } = options;

    let url = `${BASE}/filter?pageNumber=1&pageSize=100`;

    if (noCache) {
        url += `&_t=${Date.now()}`;
    }

    const res = await fetchWithAuth(url, { method: "GET" });
    return await parseJsonSafe(res, "GET RescueTeams/filter");
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

    return await parseJsonSafe(res, "POST RescueTeams");
}

// PUT: ApiResponse<RescueTeamResponseDTO>
export async function updateRescueTeam(id, payload) {
    if (!id) throw new Error("updateRescueTeam: id is required");

    const res = await fetchWithAuth(`${BASE}/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
    });

    return await parseJsonSafe(res, `PUT RescueTeams/${id}`);
}

// DELETE: ApiResponse<bool>
export async function deleteRescueTeam(id) {
    if (!id) throw new Error("deleteRescueTeam: id is required");

    const res = await fetchWithAuth(`${BASE}/${id}`, {
        method: "DELETE",
    });

    return await parseJsonSafe(res, `DELETE RescueTeams/${id}`);

}
