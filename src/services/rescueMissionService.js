import { fetchWithAuth } from "./apiClient";

const BASE = "/RescueMission";

// Chuẩn hóa mọi response về JSON để component không phải tự .json() lần nữa.

// export const completeMission = async (rescueMissionID) => {
//   if (!rescueMissionID) {
//     throw new Error("rescueMissionID is required");
//   }

//   const json = await fetchWithAuth(`${BASE}/complete`, {
//     method: "PUT",
//     body: JSON.stringify({ rescueMissionID }),
//   });

//   if (!json?.success) {
//     throw new Error(json?.message || "Complete mission failed");
//   }

//   return json.content;
// };

// Chuẩn hóa mọi response về JSON để component không phải tự .json() lần nữa.
async function parseJsonResponse(res) {
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok || json?.success === false) {
    throw new Error(json?.message || `Request failed (${res.status})`);
  }
  return json;
}

// Hoàn thành mission và trả content đã parse sẵn.
export const completeMission = async (rescueMissionID) => {
  if (!rescueMissionID) throw new Error("rescueMissionID is required");

  const res = await fetchWithAuth(`${BASE}/complete`, {
    method: "PUT",
    body: JSON.stringify({ rescueMissionID }),
  });
  const json = await parseJsonResponse(res);
  return json.content;
};
/* ================= SERVICE ================= */

export const rescueMissionService = {
  // Coordinator assign request cho rescue team.
  dispatch: async ({ rescueRequestID, rescueTeamID }) => {
    const res = await fetchWithAuth(`${BASE}/dispatch`, {
      method: "POST",
      body: JSON.stringify({ rescueRequestID, rescueTeamID }),
    });

    // return await res.json();
    return await parseJsonResponse(res);
  },

  /* -------- ACCEPT / REJECT -------- */
  // Leader accept/reject mission.
  respond: async ({ rescueMissionID, isAccepted, rejectReason }) => {
    const res = await fetchWithAuth(`${BASE}/respond`, {
      method: "POST",
      body: JSON.stringify({
        rescueMissionID,
        isAccepted,
        rejectReason: rejectReason ?? null,
      }),
    });

    // return await res.json();
    return await parseJsonResponse(res);
  },

  /* -------- CONFIRM PICKUP -------- */

  confirmPickup: async ({ rescueMissionID, reliefOrderID }) => {
    if (!rescueMissionID || !reliefOrderID) {
      throw new Error("rescueMissionID and reliefOrderID are required");
    }

    const res = await fetchWithAuth(`${BASE}/confirm-pickup`, {
      method: "PUT",
      body: JSON.stringify({ rescueMissionID, reliefOrderID }),
    });
    return await parseJsonResponse(res);
  },

  // Lấy danh sách mission theo team + status để hiển thị cho Rescue Team.
  filter: async ({ rescueTeamID, statuses, pageNumber = 1, pageSize = 20 }) => {
    const params = new URLSearchParams();
    if (rescueTeamID) params.append("RescueTeamID", rescueTeamID);
    if (statuses) statuses.forEach((s) => params.append("Statuses", s));
    params.append("PageNumber", pageNumber);
    params.append("PageSize", pageSize);

    const res = await fetchWithAuth(`${BASE}/filter?${params.toString()}`, {
      method: "GET",
    });

    // const json = await res.json(); // 🔥 THIẾU DÒNG NÀY

    // return json;
    return await parseJsonResponse(res);
  },
  /* -------- GET MISSION DETAIL -------- */

  getById: async (id) => {
    const res = await fetchWithAuth(`${BASE}/${id}`, {
      method: "GET",
    });
    return await parseJsonResponse(res);
  },

  getById: async (id) => {
    const res = await fetchWithAuth(`${BASE}/${id}`, { method: "GET" });
    return await parseJsonResponse(res);
  },

  getTeamMembers: async (teamId) => {
    const res = await fetchWithAuth(`${BASE}/teams/${teamId}/members`, {
      method: "GET",
    });
    return await parseJsonResponse(res);
  },
};
