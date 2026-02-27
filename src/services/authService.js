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
import { API_BASE_URL } from "./apiClient";


export async function register(payload) {
  const res = await fetch(`${API_BASE_URL}/Auth/register`, {
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
    body: JSON.stringify({ username, password }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || "Login failed");
  }
  //lưu auth để apiClient có thể tự động thêm token vào header khi gọi API sau này
  localStorage.setItem("auth", JSON.stringify(json.data)); //giả sử backend trả về { data: { accessToken, refreshToken, ... } } 
  return json.data; //giả sử backend trả về { data: { accessToken, refreshToken, ... } }
}
