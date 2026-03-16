import { API_BASE_URL, fetchWithAuth } from "./apiClient";

export async function register(payload) {
  const res = await fetchWithAuth(`${API_BASE_URL}/Auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || "Register failed");
  }

  return json.data;
}

export async function login(username, password) {
  const res = await fetch(`${API_BASE_URL}/Auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userName: username, password }),
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    throw new Error(json?.message || json?.title || text || "Login failed");
  }

  // Backend có thể trả content/data hoặc trả thẳng object, nên gom về 1 biến data để dùng thống nhất.
  const data = json?.content ?? json?.data ?? json;
  localStorage.setItem("auth", JSON.stringify(data));

  // Lưu token để API thường và SignalR đều đọc được token mới nhất.
  const token = data?.accessToken ?? data?.AccessToken;
  if (token) localStorage.setItem("token", token);

  // Hỗ trợ cả camelCase và PascalCase vì response backend có thể không đồng nhất giữa các endpoint.
  const roleName = data?.roleName ?? data?.RoleName ?? data?.role ?? data?.Role;
  if (roleName) localStorage.setItem("role", roleName);

  // userId dùng để xác định user hiện tại ở frontend, nhất là màn Rescue Team.
  const userId = data?.userID ?? data?.UserID ?? data?.userId ?? data?.UserId;
  if (userId) localStorage.setItem("userId", userId);

  // teamId dùng để biết user thuộc đội nào; backend cũng dựa claim TeamID để auto join đúng SignalR group.
  const teamId = data?.teamID ?? data?.TeamID ?? data?.teamId ?? data?.TeamId;
  if (teamId) localStorage.setItem("teamId", teamId);

  // isLeader giúp frontend render đúng giao diện Leader hoặc Member.
  const isLeader = data?.isLeader ?? data?.IsLeader;
  if (typeof isLeader !== "undefined") {
    localStorage.setItem("isLeader", String(isLeader));
  }

  return data;
}
