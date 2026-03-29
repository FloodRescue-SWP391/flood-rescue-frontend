// import { API_BASE_URL, fetchWithAuth } from "./apiClient";

// const BASE = `${API_BASE_URL}/IncidentReports`;

// export const incidentReportService = {
//   async reportIncident(payload) {
//     const res = await fetchWithAuth(`${BASE}/report`, {
//       method: "POST",
//       body: JSON.stringify(payload),
//     });
//     return await res.json();
//   },

//   async getPendingReports() {
//     const res = await fetchWithAuth(`${BASE}/pending`);
//     return await res.json();
//   },

//   async resolveIncident(payload) {
//     const res = await fetchWithAuth(`${BASE}/resolve`, {
//       method: "PUT",
//       body: JSON.stringify(payload),
//     });
//     return await res.json();
//   },

//   async getIncidentHistory() {
//     const res = await fetchWithAuth(`${BASE}/history`);
//     return await res.json();
//   },

//   async filterIncidents(params = {}) {
//     const searchParams = new URLSearchParams();

//     if (params.statuses?.length) {
//       params.statuses.forEach((status) => {
//         searchParams.append("statuses", status);
//       });
//     }

//     if (params.createdFromDate) {
//       searchParams.append("createdFromDate", params.createdFromDate);
//     }

//     if (params.createdToDate) {
//       searchParams.append("createdToDate", params.createdToDate);
//     }

//     if (params.resolvedFromDate) {
//       searchParams.append("resolvedFromDate", params.resolvedFromDate);
//     }

//     if (params.resolvedToDate) {
//       searchParams.append("resolvedToDate", params.resolvedToDate);
//     }

//     if (params.pageNumber) {
//       searchParams.append("pageNumber", params.pageNumber);
//     }

//     if (params.pageSize) {
//       searchParams.append("pageSize", params.pageSize);
//     }

//     const query = searchParams.toString();
//     const res = await fetchWithAuth(`${BASE}/filter${query ? `?${query}` : ""}`);
//     return await res.json();
//   },

//   async getIncidentById(id) {
//     const res = await fetchWithAuth(`${BASE}/${id}`);
//     return await res.json();
//   },
// };

import { API_BASE_URL, fetchWithAuth } from "./apiClient";

const BASE = `${API_BASE_URL}/IncidentReports`;

async function parseResponse(res) {
  const text = await res.text();
  let json = {};

  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }

  if (!res.ok || json?.success === false) {
    throw new Error(json?.message || json?.title || `Request failed (${res.status})`);
  }

  return json;
}

export const incidentReportService = {
  async reportIncident(payload) {
    const res = await fetchWithAuth(`${BASE}/report`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    return await parseResponse(res);
  },

  async getPendingReports() {
    const res = await fetchWithAuth(`${BASE}/pending`, {
      method: "GET",
    });
    return await parseResponse(res);
  },

  async resolveIncident(payload) {
    const res = await fetchWithAuth(`${BASE}/resolve`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    return await parseResponse(res);
  },

  async getIncidentHistory() {
    const res = await fetchWithAuth(`${BASE}/history`, {
      method: "GET",
    });
    return await parseResponse(res);
  },

  async filterIncidents(params = {}) {
    const searchParams = new URLSearchParams();

    if (params.statuses?.length) {
      params.statuses.forEach((status) => {
        searchParams.append("statuses", status);
      });
    }

    if (params.createdFromDate) {
      searchParams.append("createdFromDate", params.createdFromDate);
    }

    if (params.createdToDate) {
      searchParams.append("createdToDate", params.createdToDate);
    }

    if (params.resolvedFromDate) {
      searchParams.append("resolvedFromDate", params.resolvedFromDate);
    }

    if (params.resolvedToDate) {
      searchParams.append("resolvedToDate", params.resolvedToDate);
    }

    if (params.pageNumber) {
      searchParams.append("pageNumber", params.pageNumber);
    }

    if (params.pageSize) {
      searchParams.append("pageSize", params.pageSize);
    }

    const query = searchParams.toString();

    const res = await fetchWithAuth(
      `${BASE}/filter${query ? `?${query}` : ""}`,
      { method: "GET" }
    );

    return await parseResponse(res);
  },

  async getIncidentById(id) {
    const res = await fetchWithAuth(`${BASE}/${id}`, {
      method: "GET",
    });
    return await parseResponse(res);
  },
};