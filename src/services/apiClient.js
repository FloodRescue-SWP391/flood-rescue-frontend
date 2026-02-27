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
export const API_BASE_URL = "http://localhost:7142/api"; //đợi đổi đúng theo port backend
export async function fetchWithAuth(url, options = {}) {
    // Lấy access token từ localStorage
    const raw = localStorage.getItem("auth");
    const auth = raw ? JSON.parse(raw) : null;
    //backend có thể trả về AccessToken hoặc accessToken, nên phải check cả 2
    const accessToken = auth?.accessToken ?? auth?.AccessToken ?? null;

    //gửi request ban đầu
    let res = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {}),
            ...(accessToken
                ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
    });
    //nếu không phải lỗi 401, trả về response gốc
    if (res.status !== 401) return res;

    const refreshRes = await fetch(`${API_BASE_URL}/Auth/refresh-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            accessToken,//match với refreshTokenRequestDto bên backend
        }),
    });

    //nếu refresh thất bại -> logout
    if (!refreshRes.ok) {
        localStorage.removeItem("auth");
        window.location.href = "/login";
        return res; //trả về response 401 ban đầu để component có thể hiển thị thông báo nếu cần
    }

    //refresh thành công 
    const refreshJson = await refreshRes.json();
    //lưu token mới vào localStorage
    localStorage.setItem("auth", JSON.stringify(refreshJson.data));


    const newAccessToken =
        refreshJson.data.accessToken ??
        refreshJson.data.AccessToken;
    //gửi lại request ban đầu với token mới
    return fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {}),
            Authorization: `Bearer ${newAccessToken}`,
        },
    });
}