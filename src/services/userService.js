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

    if (searchKeyword) query.append("searchKeyword", searchKeyword);
    if (roleId) query.append("roleId", roleId);
    if (isActive !== "") query.append("isActive", isActive);
    query.append("pageNumber", pageNumber);
    query.append("pageSize", pageSize);

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

    if (!response.ok) {
        throw new Error("Failed to update user.");
    }

    return await response.json();
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