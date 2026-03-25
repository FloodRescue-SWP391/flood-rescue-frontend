/**
 *  API CLIENT SERVICE
 *
 * Vai trò / Chức năng chính:
 * - Là HTTP client trung tâm của frontend.
 * - Chịu trách nhiệm gửi request đến backend.
 * - Tự động thêm JWT (Authorization: Bearer) vào các API cần xác thực.
 * - Tự động xử lý refresh token khi access token hết hạn.
 *
 * ------------------------------------------------------------
 * FLOW XỬ LÝ:
 *
 * 1) Lấy object auth từ localStorage.
 * 2) Trích xuất accessToken (hỗ trợ cả accessToken và AccessToken).
 * 3) Gửi request ban đầu kèm Authorization header.
 * 4) Nếu response ≠ 401 → trả về response bình thường.
 * 5) Nếu response = 401 (token hết hạn):
 *      → Gọi POST /api/Auth/refresh-token với accessToken hiện tại.
 * 6) Nếu refresh thất bại:
 *      → Xóa auth khỏi localStorage và redirect về /login.
 * 7) Nếu refresh thành công:
 *      → Lưu auth mới vào localStorage.
 *      → Retry lại request ban đầu với token mới.
 */
// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://apifloodrescue.huydevops.id.vn/api";
// // them API_BASE_URL vao console ở dòng 25
// console.log("API_BASE_URL =", API_BASE_URL);

// export { API_BASE_URL };
// export async function fetchWithAuth(url, options = {}) {
//     // Lấy access token từ localStorage
//     const raw = localStorage.getItem("auth");
//     const token = localStorage.getItem("token");

//     const auth = raw ? JSON.parse(raw) : null;
//     //backend có thể trả về AccessToken hoặc accessToken, nên phải check cả 2
//     const accessToken = auth?.accessToken ?? auth?.AccessToken ?? null;

//     const fullUrl = url.startsWith("http") ? url : `${API_BASE_URL}${url}`;


//     //gửi request ban đầu
//     let res = await fetch(fullUrl, {
//         ...options,
//         headers: {
//             ...(options.headers || {}),
//             ...(options.body ? { "Content-Type": "application/json" } : {}),
//             ...(token
//                 ? { Authorization: `Bearer ${token}` } : {}),
//         },
//     });
//     //nếu không phải lỗi 401, trả về response gốc
//     if (res.status !== 401) return res;

//     const refreshRes = await fetch(`${API_BASE_URL}/Auth/refresh-token`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ accessToken: token }),
//     });

//     //nếu refresh thất bại -> logout
//     if (!refreshRes.ok) {
//         localStorage.removeItem("token");
//         localStorage.removeItem("role");
//         localStorage.removeItem("auth");
//         window.location.href = "/login";
//         return res; //trả về response 401 ban đầu để component có thể hiển thị thông báo nếu cần
//     }

//     //refresh thành công 
//     const refreshJson = await refreshRes.json();
//     const newToken = refreshJson?.data?.accessToken ?? refreshJson?.data?.AccessToken;
//     //lưu token mới vào localStorage
//     localStorage.setItem("auth", JSON.stringify(refreshJson.data));
//     localStorage.setItem("token", newToken);

//     const newAccessToken =
//         refreshJson.data.accessToken ??
//         refreshJson.data.AccessToken;
//     //gửi lại request ban đầu với token mới

//     return fetch(fullUrl, {
//         ...options,
//         headers: {
//             "Content-Type": "application/json",
//             ...(options.headers || {}),
//             Authorization: `Bearer ${newAccessToken}`,
//         },
//     });
// }



const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://apifloodrescue.huydevops.id.vn/api";

export { API_BASE_URL };

export async function fetchWithAuth(url, options = {}) {
  const raw = localStorage.getItem("auth");
  const token = localStorage.getItem("token");

  let auth = null;
  try {
    auth = raw ? JSON.parse(raw) : null;
  } catch {
    auth = null;
  }

  const accessToken = token ?? auth?.accessToken ?? auth?.AccessToken ?? null;

  const fullUrl = url.startsWith("http") ? url : `${API_BASE_URL}${url}`;

  console.log(`DEBUG FETCH: ${options.method || "GET"} ${fullUrl}`);
  const finalHeaders = {
    ...(options.headers || {}),
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
  console.log("DEBUG HEADERS:", { ...finalHeaders, Authorization: accessToken ? "Bearer ***" : "NONE" });

  let res = await fetch(fullUrl, {
    ...options,
    headers: finalHeaders,
  });

  if (res.status !== 401) return res;

  const refreshRes = await fetch(`${API_BASE_URL}/Auth/refresh-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken }),
  });

  if (!refreshRes.ok) {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("auth");
    window.location.href = "/login";
    return res;
  }

  const refreshText = await refreshRes.text();
  let refreshJson = null;

  try {
    refreshJson = refreshText ? JSON.parse(refreshText) : null;
  } catch {
    refreshJson = null;
  }

  const newToken =
    refreshJson?.data?.accessToken ||
    refreshJson?.data?.AccessToken ||
    refreshJson?.accessToken ||
    refreshJson?.AccessToken ||
    null;

  if (!newToken) {
    console.error("Refresh token response invalid:", refreshJson);
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("auth");
    window.location.href = "/login";
    return res;
  }

  if (refreshJson?.data) {
    localStorage.setItem("auth", JSON.stringify(refreshJson.data));
  } else {
    localStorage.setItem("auth", JSON.stringify(refreshJson));
  }

  localStorage.setItem("token", newToken);

  return fetch(fullUrl, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${newToken}`,
    },
  });
}