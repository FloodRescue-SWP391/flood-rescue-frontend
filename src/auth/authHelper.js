const ACCESS_TOKEN = "accessToken";
const USER = "user";
const EXPIRES_IN = "expiresIn";

export function saveAuth(authDto) {
  // authDto là json.data từ backend
  localStorage.setItem(ACCESS_TOKEN, authDto.accessToken || authDto.AccessToken);

  const user = {
    userId: authDto.userID ?? authDto.UserID,
    username: authDto.username ?? authDto.Username,
    fullName: authDto.fullName ?? authDto.FullName,
    role: authDto.role ?? authDto.Role,
  };

  localStorage.setItem(USER, JSON.stringify(user));
  localStorage.setItem(EXPIRES_IN, String(authDto.expiresIn ?? authDto.ExpiresIn ?? 0));

  return user;
}

export function getUser() {
  const raw = localStorage.getItem(USER);
  return raw ? JSON.parse(raw) : null;
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN);
}

export function logout() {
  localStorage.clear();
}
