import React, { useMemo, useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import "./ListUser.css";
import { getUsers, deactivateUser, updateUser } from "../../services/userService";

const ListUser = () => {

  const [editingUserId, setEditingUserId] = useState(null);

  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageNumber] = useState(1);
  const [pageSize] = useState(100);

  const { handleLogout } = useOutletContext();

  const [editForm, setEditForm] = useState({
    fullName: "",
    phone: "",
    roleID: "",
  });

  // Lấy danh sách role duy nhất
  const uniqueRoles = useMemo(() => {
    return ["All", ...new Set(users.map(user => user.roleName).filter(Boolean))];
  }, [users]);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 3000);
  };

  const loadUsers = async () => {
    try {
      setLoading(true);

      // chỗ này hiện đang lấy value từ dropdown roleFilter.
      // Nếu backend yêu cầu RoleID thật sự (AD, MN, RT...) thì
      // roleFilter phải lưu roleID chứ không phải roleName.
      // Còn nếu backend vẫn nhận string role name thì giữ như này.
      const roleId = "";
      const isActive = "";

      const res = await getUsers({
        searchKeyword: search,
        roleId,
        isActive,
        pageNumber,
        pageSize,
      });

      if (res?.success) {
        const apiUsers = res?.content?.data || [];
        setUsers(apiUsers);
      } else {
        showToast("❌ Failed to load users");
      }
    } catch (error) {
      console.error("Load users error:", error);

      if (error.message?.includes("401")) {
        handleLogout?.();
      }

      showToast("❌ Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(() => {
      loadUsers();
    }, 300);

    return () => clearTimeout(delay);
  }, [search, roleFilter]);


  const handleDelete = async (userId, username) => {
    const confirmed = window.confirm(`Deactivate account "${username}"?`);
    if (!confirmed) return;

    try {
      const res = await deactivateUser(userId);

      if (res?.success) {
        showToast(`✅ Account "${username}" has been deactivated`);
        loadUsers();
      } else {
        showToast(`❌ Failed to deactivate "${username}"`);
      }
    } catch (error) {
      console.error("Deactivate user error:", error);
      showToast(`❌ Failed to deactivate "${username}"`);
    }
  };
  // ===== ADD: hàm chuyển sang trang sửa user =====
  const handleEdit = (user) => {
    setEditingUserId(user.userID);
    setEditForm({
      fullName: user.fullName || "",
      phone: user.phone || "",
      roleID: user.roleID || "",
    });
  };

  // ===== ADD: cập nhật form edit =====
  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };
  // ===== ADD: hủy edit =====
  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditForm({
      fullName: "",
      phone: "",
      roleID: "",
    });
  };
  // ===== ADD: save tạm ở frontend trước, sau nối API sau =====
  const handleSaveEdit = async (userId) => {
    try {
      const payload = {
        fullName: editForm.fullName,
        phone: editForm.phone,
        roleID: editForm.roleID,
      };

      const res = await updateUser(userId, payload);

      if (res?.success) {
        showToast("✅ User updated successfully");
        setEditingUserId(null);
        loadUsers();
      } else {
        showToast("❌ Failed to update user");
      }
    } catch (error) {
      console.error("Update user error:", error);
      showToast("❌ Failed to update user");
    }
  };
  const filteredUsers = users.filter((user) => {
    const fullName = String(user.fullName || "").toLowerCase();
    const username = String(user.username || "").toLowerCase();
    const keyword = search.toLowerCase();

    const matchesSearch =
      fullName.includes(keyword) ||
      username.includes(keyword);

    const matchesRole =
      roleFilter === "All" ||
      String(user.roleName || "").trim().toLowerCase() ===
      String(roleFilter || "").trim().toLowerCase();

    return matchesSearch && matchesRole;
  });

  // Kiểm tra xem có đang search hoặc filter không
  const isSearchingOrFiltering =
    search.trim() !== "" || roleFilter !== "All";

  return (
    <>
      {toast && (
        <div className={`toast ${toast.includes("✅") ? "success" : "error"}`}>
          {toast}
        </div>
      )}


      <div className="list-user-container">
        <h2>Account List</h2>

        {/* Controls */}
        <div className="controls-container">
          <div className="search-container">
            <input
              className="search"
              placeholder="Search name or username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="filter-container">
            <select
              className="role-filter"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              {uniqueRoles.map((role, index) => (
                <option key={index} value={role}>{role}</option>
              ))}
            </select>
          </div>

          {/* View Mode Indicator */}
          <div className="view-indicator">
            <span className={`indicator ${isSearchingOrFiltering ? 'card-mode' : 'table-mode'}`}>
              {isSearchingOrFiltering ? '🔍 Filter/Card View' : '📋 Full Table View'}
            </span>
          </div>
        </div>

        <div className="search-info">
          Found {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
          {roleFilter !== "All" && ` in role "${roleFilter}"`}
          {search.trim() !== "" && ` matching "${search}"`}
        </div>

        {/* Card View (Khi search/filter) */}
        {isSearchingOrFiltering && (
          <div className="user-list">
            {filteredUsers.length === 0 ? (
              <div className="no-results">
                <p>No users found</p>
              </div>
            ) : (
              filteredUsers.map((user, index) => (
                //
                <div key={user.userID || index} className="user-card">
                  <div className="user-header">
                    <span className="user-role">{user.roleName}</span>
                  </div>

                  <div className="user-info">
                    <div className="info-row">
                      <span className="label">Full Name:</span>
                      <span className="value">{user.fullName}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Username:</span>
                      <span className="value">{user.username}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Phone:</span>
                      <span className="value">{user.phone}</span>
                    </div>
                  </div>

                  <div className="action-buttons2">
                    <button
                      className="edit-btn"
                      onClick={() => handleEdit(user)}
                    >
                      Edit
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(user.userID, user.username)}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Table View (Khi không search/filter) */}
        {!isSearchingOrFiltering && (
          <div className="table-container">
            <table className="user-table">
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Username</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="no-data">
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user, index) => {
                    // ===== ADD: kiểm tra dòng hiện tại có đang edit không =====
                    const isEditing = editingUserId === user.userID;

                    return (
                      <tr key={user.userID || index}>
                        <td>
                          {isEditing ? (
                            <input
                              type="text"
                              className="edit-input"
                              value={editForm.fullName}
                              onChange={(e) => handleEditChange("fullName", e.target.value)}
                            />
                          ) : (
                            user.fullName
                          )}
                        </td>

                        <td>{user.username}</td>

                        <td>
                          {isEditing ? (
                            <input
                              type="text"
                              className="edit-input"
                              value={editForm.phone}
                              onChange={(e) => handleEditChange("phone", e.target.value)}
                            />
                          ) : (
                            user.phone
                          )}
                        </td>

                        <td>
                          {isEditing ? (
                            <select
                              className="edit-input"
                              value={editForm.roleID}
                              onChange={(e) => handleEditChange("roleID", e.target.value)}
                            >
                              {/* ===== CHANGE: sửa lại roleID đúng backend nếu khác ===== */}
                              <option value="AD">Admin</option>
                              <option value="MN">Manager</option>
                              <option value="IM">Inventory Manager</option>
                              <option value="CT">Coordinator</option>
                              <option value="RT">Rescue Team</option>
                            </select>
                          ) : (
                            <span className="table-role">{user.roleName}</span>
                          )}
                        </td>

                        <td>
                          <span className={user.isActive ? "status-active" : "status-inactive"}>
                            {user.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>

                        <td>
                          <div className="table-actions">
                            {isEditing ? (
                              <>
                                <button
                                  className="save-btn"
                                  onClick={() => handleSaveEdit(user.userID)}
                                >
                                  Save
                                </button>
                                <button
                                  className="cancel-btn"
                                  onClick={handleCancelEdit}
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  className="edit-btn"
                                  onClick={() => handleEdit(user)}
                                >
                                  Edit
                                </button>
                                <div className="action-buttons1">
                                  {/* ===== NOTE: edit chỉ hỗ trợ ở table view ===== */}
                                  <button
                                    className="delete-btn1"
                                    onClick={() => handleDelete(user.userID, user.username)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

export default ListUser;