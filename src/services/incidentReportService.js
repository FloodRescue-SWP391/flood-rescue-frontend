import { API_BASE_URL, fetchWithAuth } from "./apiClient";

const BASE = `${API_BASE_URL}/IncidentReports`;

export const incidentReportService = {
  async reportIncident(payload) {
    const res = await fetchWithAuth(`${BASE}/report`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return await res.json();
  },

  async getPendingReports() {
    const res = await fetchWithAuth(`${BASE}/pending`);
    return await res.json();
  },

  async resolveIncident(payload) {
    const res = await fetchWithAuth(`${BASE}/resolve`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return await res.json();
  },

  async getIncidentHistory() {
    const res = await fetchWithAuth(`${BASE}/history`);
    return await res.json();
  },

  async filterIncidents(params = {}) {
    const searchParams = new URLSearchParams();

    if (params.statuses?.length) {
      params.statuses.forEach((status) => {
        searchParams.append("Statuses", status);
      });
    }

    if (params.createdFromDate) {
      searchParams.append("CreatedFromDate", params.createdFromDate);
    }

    if (params.createdToDate) {
      searchParams.append("CreatedToDate", params.createdToDate);
    }

    if (params.resolvedFromDate) {
      searchParams.append("ResolvedFromDate", params.resolvedFromDate);
    }

    if (params.resolvedToDate) {
      searchParams.append("ResolvedToDate", params.resolvedToDate);
    }

    if (params.pageNumber) {
      searchParams.append("PageNumber", params.pageNumber);
    }

    if (params.pageSize) {
      searchParams.append("PageSize", params.pageSize);
    }

    const query = searchParams.toString();
    const res = await fetchWithAuth(`${BASE}/filter${query ? `?${query}` : ""}`);
    return await res.json();
  },

  async getIncidentById(id) {
    const res = await fetchWithAuth(`${BASE}/${id}`);
    return await res.json();
  },
};