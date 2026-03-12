// src/services/rescueMissionService.js

import { fetchWithAuth } from "./apiClient";

const BASE = "/RescueMission";

/* ================= COMPLETE MISSION ================= */

export const completeMission = async (rescueMissionID) => {

    if (!rescueMissionID) {
        throw new Error("rescueMissionID is required");
    }

    const json = await fetchWithAuth(`${BASE}/complete`, {
        method: "PUT",
        body: JSON.stringify({ rescueMissionID })
    });

    if (!json?.success) {
        throw new Error(json?.message || "Complete mission failed");
    }

    return json.content;
};


/* ================= SERVICE ================= */

export const rescueMissionService = {

    /* -------- DISPATCH (Coordinator) -------- */

    dispatch: async ({ rescueRequestID, rescueTeamID }) => {

        return fetchWithAuth(`${BASE}/dispatch`, {
            method: "POST",
            body: JSON.stringify({
                rescueRequestID,
                rescueTeamID
            })
        });

    },

    /* -------- ACCEPT / REJECT -------- */

    respond: ({ rescueMissionID, isAccepted, rejectReason }) => {

        return fetchWithAuth(`${BASE}/respond`, {
            method: "POST",
            body: JSON.stringify({
                rescueMissionID,
                isAccepted,
                rejectReason: rejectReason ?? null
            })
        });

    },

    /* -------- CONFIRM PICKUP -------- */

    confirmPickup: ({ rescueMissionID, reliefOrderID }) => {

        if (!rescueMissionID || !reliefOrderID) {
            throw new Error("rescueMissionID and reliefOrderID are required");
        }

        return fetchWithAuth(`${BASE}/confirm-pickup`, {
            method: "PUT",
            body: JSON.stringify({
                rescueMissionID,
                reliefOrderID
            })
        });

    },

    /* ================= LOAD MISSIONS ================= */

    /* -------- FILTER MISSIONS (MAIN API) -------- */

    filter: ({
        rescueTeamID,
        statuses,
        pageNumber = 1,
        pageSize = 20
    }) => {

        const params = new URLSearchParams();

        if (rescueTeamID) params.append("RescueTeamID", rescueTeamID);

        if (statuses) {
            statuses.forEach(s => params.append("Statuses", s));
        }

        params.append("PageNumber", pageNumber);
        params.append("PageSize", pageSize);

        return fetchWithAuth(`${BASE}/filter?${params.toString()}`, {
            method: "GET"
        });

    },

    /* -------- GET MISSION DETAIL -------- */

    getById: (id) => {

        return fetchWithAuth(`${BASE}/${id}`, {
            method: "GET"
        });

    },

    /* -------- TEAM MEMBERS -------- */

    getTeamMembers: (teamId) => {

        return fetchWithAuth(`${BASE}/teams/${teamId}/members`, {
            method: "GET"
        });

    }

};