// src/services/rescueTeamService.js
import { fetchWithAuth } from "./apiClient";

const BASE = "/RescueTeams";

export async function getAllRescueTeams() {
  // ApiResponse<List<RescueTeamResponseDTO>>
  return fetchWithAuth(`${BASE}`, { method: "GET" });
}