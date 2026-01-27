//fetch = function used for making HTTP requests to fetch authentication tokens and manage user sessions.
//       (JSON style data, images, files, etc.)
//       Simplifies asynchronous data fetching in JS and used  for interacting with APIs to retrieve and send
//       data asynchronously over the web.
//       fetch(url,{method: "options"})


import { getAccessToken, saveAuth, logout } from "./authHelper";

export async function fetchWithAuth(url, options = {}) {
  const accessToken = getAccessToken();

  let res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (res.status !== 401) return res;

  // refresh token (refresh token nằm trong cookie/server, DB check)
  const refreshRes = await fetch("/api/auth/refresh-token", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ AccessToken: accessToken }), 
  });

  if (!refreshRes.ok) {
    logout();
    window.location.href = "/login";
    return res;
  }

  const refreshJson = await refreshRes.json();
  const authDto = refreshJson.data;

  saveAuth(authDto);

  const newAccessToken = authDto.accessToken || authDto.AccessToken;

  return fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${newAccessToken}`,
    },
  });
}

