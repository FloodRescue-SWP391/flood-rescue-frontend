/**
 * AUTH SERVICE 
 *
 * Vai trò / Chức năng chính:
 * - Cung cấp các hàm gọi API liên quan đến Authentication.
 * - Thực hiện đăng ký (register) và đăng nhập (login).
 * - Khi login thành công: lưu thông tin auth (token + user info) vào localStorage
 *   để các request sau dùng được (thông qua apiClient/fetchWithAuth).
 *
 * ------------------------------------------------------------
 * FLOW REGISTER:
 * 1) Nhận payload từ UI (RegisterRequestDTO).
 * 2) Gửi POST /api/Auth/register.
 * 3) Nếu OK → return json.data cho UI xử lý.
 * 4) Nếu lỗi → throw Error để UI hiển thị thông báo.
 *
 * ------------------------------------------------------------
 * FLOW LOGIN:
 * 1) Nhận username + password từ UI (LoginRequestDTO).
 * 2) Gửi POST /api/Auth/login.
 * 3) Nếu OK:
 *      - Backend trả AuthResponseDTO (AccessToken, Role, UserID, ...)
 *      - Lưu json.data vào localStorage key "auth".
 *      - Return json.data cho UI (navigate theo role, hiển thị tên,...)
 * 4) Nếu lỗi → throw Error để UI hiển thị thông báo.
 *
 */
import { API_BASE_URL, fetchWithAuth } from "./apiClient";

// nếu register public thì giữ fetch như bạn đang làm
// nếu register cần auth thì dùng fetchWithAuth:
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
  } catch { }

  if (!res.ok) {
    const msg = json?.message || json?.title || text || "Login Failed";
    throw new Error(msg);
  }
  //lưu auth để apiClient có thể tự động thêm token vào header khi gọi API sau này
  const data = json?.content ?? json?.data ?? json; // FIX: swagger trả content

  // lưu auth
  localStorage.setItem("auth", JSON.stringify(data));

  // FIX: lưu token để apiClient gửi Authorization header
  const token = data?.accessToken ?? data?.AccessToken;
  if (token) {
    localStorage.setItem("token", token);
  }
  // lưu role
  if (data?.roleName) {
    localStorage.setItem("role", data.roleName);
  }

  // demo leader
  if (data?.roleName === "RescueTeam") {
    localStorage.setItem("isLeader", "true");
    localStorage.setItem(
      "teamId",
      "8c6813a2-7d06-4eb1-ba5c-0e3d92765cc3"
    );
  }



  return data; //giả sử backend trả về { data: { accessToken, refreshToken, ... } }
}
