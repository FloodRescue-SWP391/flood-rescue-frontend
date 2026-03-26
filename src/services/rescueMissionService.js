import { fetchWithAuth } from "./apiClient";

const BASE = "/RescueMission";

async function parseJsonResponse(res) {
  const text = await res.text();
  let json = {};

  try {
    json = text ? JSON.parse(text) : {};
  } catch (error) {
    console.warn("[rescueMissionService] Response is not valid JSON:", error);
    json = {};
  }

  if (!res.ok || json?.success === false) {
    throw new Error(json?.message || `Request failed (${res.status})`);
  }
  return json;
}

export const completeMission = async (rescueMissionID) => {
  if (!rescueMissionID) {
    throw new Error("rescueMissionID is required");
  }

  // API implemented as /RescueMission/complete with rescueMissionID in body
  const res = await fetchWithAuth(`${BASE}/complete`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ rescueMissionID }),
  });

  const json = await parseJsonResponse(res);

  console.log("COMPLETE RESPONSE:", json);

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

    const json = await parseJsonResponse(res);
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

    return await parseJsonResponse(res);
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

    return await parseJsonResponse(res);
  },

  filter: async ({ rescueTeamID, statuses, pageNumber = 1, pageSize = 20 }) => {
    const params = new URLSearchParams();
    if (rescueTeamID) params.append("rescueTeamId", rescueTeamID);
    if (statuses) statuses.forEach((s) => params.append("statuses", s));
    params.append("pageNumber", pageNumber);
    params.append("pageSize", pageSize);

    const res = await fetchWithAuth(`${BASE}/filter?${params.toString()}`, {
      method: "GET",
    });

    return await parseJsonResponse(res);
  },

  getById: async (id) => {
    const res = await fetchWithAuth(`${BASE}/${id}`, {
      method: "GET",
    });

    return await parseJsonResponse(res);
  },

  getTeamMembers: async (teamId) => {
    const res = await fetchWithAuth(`${BASE}/teams/${teamId}/members`, {
      method: "GET",
    });

    return await parseJsonResponse(res);
  },
};
