import { API_BASE_URL, fetchWithAuth } from "./apiClient";

// GET LIST USERS
export const getUsers = async ({
  searchKeyword = "",
  roleId = "",
  isActive = "",
  pageNumber = 1,
  pageSize = 10,
} = {}) => {
  const query = new URLSearchParams();

  if (searchKeyword) query.append("SearchKeyword", searchKeyword);
  if (roleId) query.append("RoleID", roleId);
  if (isActive !== "") query.append("IsActive", isActive);
  query.append("PageNumber", pageNumber);
  query.append("PageSize", pageSize);

  const response = await fetchWithAuth(
    `${API_BASE_URL}/Users?${query.toString()}`,
    {
      method: "GET",
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch users.");
  }

  return await response.json();
};

// UPDATE USER
export const updateUser = async (userId, userData) => {
  const response = await fetchWithAuth(`${API_BASE_URL}/Users/${userId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  });

  const raw = await response.text();
  let data = null;

  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw;
  }

  console.log("UpdateUser raw response:", raw);
  console.log("UpdateUser parsed response:", data);

  if (!response.ok) {
    const errorMessage =
      data?.errors
        ? JSON.stringify(data.errors, null, 2)
        : data?.message || data?.title || raw || "Failed to update user.";

    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return { success: true, status: 204 };
  }

  if (!raw) {
    return { success: true, status: response.status };
  }

  return {
    success: true,
    status: response.status,
    ...data,
  };
};

// DEACTIVATE USER
export const deactivateUser = async (userId) => {
    const response = await fetchWithAuth(
        `${API_BASE_URL}/Users/${userId}/deactivate`,
        {
            method: "PATCH",
        }
    );

    if (!response.ok) {
        throw new Error("Failed to deactivate user.");
    }

    return await response.json();
};

// GET USER BY ID (nếu sau này cần)
export const getUserById = async (userId) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/Users/${userId}`, {
        method: "GET",
    });

    if (!response.ok) {
        throw new Error("Failed to fetch user detail.");
    }

    return await response.json();
};