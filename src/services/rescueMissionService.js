// src/services/rescueMissionService.js
import { fetchWithAuth } from "./apiClient";

const BASE = "/RescueMission";

export const rescueMissionService = {
    dispatch: ({ rescueRequestID, rescueTeamID }) => {
        return fetchWithAuth(`${BASE}/dispatch`, {
            method: "POST",
            body: JSON.stringify({ rescueRequestID, rescueTeamID }),
        });
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
    confirmPickup: ({ rescueMissionID, reliefOrderID }) =>
        fetchWithAuth(`${BASE}/confirm-pickup`, {
            method: "PUT",
            body: JSON.stringify({ rescueMissionID, reliefOrderID }),
        }),

    // ✅ Option A (nếu BE làm GET /team/{teamId}?status=...)
    getByTeam: ({ teamId, status }) => {
        const qs = status ? `?status=${encodeURIComponent(status)}` : "";
        return fetchWithAuth(`${BASE}/team/${teamId}${qs}`, { method: "GET" });
    },

    // ✅ Option B (nếu BE làm GET /assigned/{teamId})
    getAssigned: ({ teamId }) => {
        return fetchWithAuth(`${BASE}/assigned/${teamId}`, { method: "GET" });
    },
};