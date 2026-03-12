// src/services/rescueMissionService.js
import { fetchWithAuth } from "./apiClient";

const BASE = "/RescueMission";
/**
 * Complete Rescue Mission
 * API: PUT /api/RescueMission/complete
 * Body: { rescueMissionID: "GUID" }
 * Response: { success, message, statusCode, content: {...} }
 */
export const completeMission = async (rescueMissionID) => {
    if (!rescueMissionID) throw new Error("rescueMissionID is required");

    const json = await fetchWithAuth(`${BASE}/complete`, {
        method: "PUT",
        body: JSON.stringify({ rescueMissionID }),
    });

    if (!json?.success) throw new Error(json?.message || "Complete mission failed");
    return json.content;
};

export const rescueMissionService = {
    dispatch: async ({ rescueRequestID, rescueTeamID }) => {
        const res = await fetchWithAuth(`${BASE}/dispatch`, {
            method: "POST",
            body: JSON.stringify({
                rescueRequestID,
                rescueTeamID
            }),
        });
        return res;
    },

    respond: ({ rescueMissionID, isAccepted, rejectReason }) => {
        return fetchWithAuth(`${BASE}/respond`, {
            method: "POST",
            body: JSON.stringify({
                rescueMissionID,
                isAccepted,
                rejectReason: rejectReason ?? null,
            }),
        });
    },
    // Confirm pickup (PUT /api/RescueMission/confirm-pickup)
    confirmPickup: ({ rescueMissionID, reliefOrderID }) => {
        if (!rescueMissionID || !reliefOrderID) {
            throw new Error("rescueMissionID và reliefOrderID là bắt buộc");
        }

        return fetchWithAuth(`${BASE}/confirm-pickup`, {
            method: "PUT",
            body: JSON.stringify({ rescueMissionID, reliefOrderID }),
        });
    },
    // Option A (nếu BE làm GET /team/{teamId}?status=...)
    getByTeam: ({ teamId, status }) => {
        const qs = status ? `?status=${encodeURIComponent(status)}` : "";
        return fetchWithAuth(`${BASE}/team/${teamId}${qs}`, { method: "GET" });
    },

    // Option B (nếu BE làm GET /assigned/{teamId})
    getAssigned: ({ teamId }) => {
        return fetchWithAuth(`${BASE}/assigned/${teamId}`, { method: "GET" });
    },

};