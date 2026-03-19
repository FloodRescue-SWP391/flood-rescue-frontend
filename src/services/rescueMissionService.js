import { fetchWithAuth } from "./apiClient";

const BASE = "/RescueMission";

export const completeMission = async (rescueMissionID) => {
  if (!rescueMissionID) {
    throw new Error("rescueMissionID is required");
  }

  const res = await fetchWithAuth(`${BASE}/complete`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ rescueMissionID }),
  });

  const json = await res.json();

  console.log("COMPLETE RESPONSE:", json);

  if (!json?.success) {
    throw new Error(json?.message || "Complete mission failed");
  }

  return json.content;
};

export const rescueMissionService = {
  dispatch: async ({ rescueRequestID, rescueTeamID }) => {
    const url = `${BASE}/dispatch`;

    console.log("DISPATCH URL:", url);
    console.log("DISPATCH PAYLOAD:", {
      rescueRequestID,
      rescueTeamID,
    });

    const res = await fetchWithAuth(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rescueRequestID,
        rescueTeamID,
      }),
    });

    console.log("DISPATCH RAW RESPONSE:", res);

    const json = await res.json();
    console.log("DISPATCH RESPONSE JSON:", json);

    return json;
  },
  respond: async ({ rescueMissionID, isAccepted, rejectReason }) => {
    const res = await fetchWithAuth(`${BASE}/respond`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rescueMissionID,
        isAccepted,
        rejectReason: rejectReason ?? null,
      }),
    });

    return await res.json();
  },

  confirmPickup: async ({ rescueMissionID, reliefOrderID }) => {
    if (!rescueMissionID || !reliefOrderID) {
      throw new Error("rescueMissionID and reliefOrderID are required");
    }

    const res = await fetchWithAuth(`${BASE}/confirm-pickup`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rescueMissionID,
        reliefOrderID,
      }),
    });

    return await res.json();
  },

  filter: async ({ rescueTeamID, statuses, pageNumber = 1, pageSize = 20 }) => {
    const params = new URLSearchParams();

    if (rescueTeamID) params.append("RescueTeamID", rescueTeamID);

    if (statuses) {
      statuses.forEach((s) => params.append("Statuses", s));
    }

    params.append("PageNumber", pageNumber);
    params.append("PageSize", pageSize);

    const res = await fetchWithAuth(`${BASE}/filter?${params.toString()}`, {
      method: "GET",
    });

    return await res.json();
  },

  getById: async (id) => {
    const res = await fetchWithAuth(`${BASE}/${id}`, {
      method: "GET",
    });

    return await res.json();
  },

  getTeamMembers: async (teamId) => {
    const res = await fetchWithAuth(`${BASE}/teams/${teamId}/members`, {
      method: "GET",
    });

    return await res.json();
  },
};
