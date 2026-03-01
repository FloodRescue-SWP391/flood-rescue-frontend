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
};