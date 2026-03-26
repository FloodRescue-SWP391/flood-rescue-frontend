import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useOutletContext, useLocation } from "react-router-dom";
import "./ListUser.css";
import {
  getUsers,
  deactivateUser,
  updateUser,
} from "../../services/userService";

const ROLE_OPTIONS = [
  { value: "IM", label: "Quản lý kho" },
  { value: "RC", label: "Điều phối viên" },
  { value: "RT", label: "Đội cứu hộ" },
];

const ROLE_LABEL_BY_ID = ROLE_OPTIONS.reduce((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, {});

const ListUser = () => {
  const location = useLocation();
  const { handleLogout } = useOutletContext();

  const [editingUserId, setEditingUserId] = useState(null);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [pageNumber] = useState(1);
  const [pageSize] = useState(100);

  const [editForm, setEditForm] = useState({
    fullName: "",
    phone: "",
    roleID: "",
  });

  const uniqueRoles = useMemo(() => {
    return [
      "All",
      ...new Set(users.map((user) => user.roleName).filter(Boolean)),
    ];
  }, [users]);

  const showToast = useCallback((message) => {
    setToast(message);

    if (window.toastTimer) {
      clearTimeout(window.toastTimer);
    }

    window.toastTimer = setTimeout(() => {
      setToast("");
    }, 3000);
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);

      console.log("Loading users with params:", {
        searchKeyword: "",
        roleId: "",
        isActive: "",
        pageNumber,
        pageSize,
      });

      const res = await getUsers({
        searchKeyword: "",
        roleId: "",
        isActive: "",
        pageNumber,
        pageSize,
      });

      console.log("GetUsers API Response:", res);

      if (res?.success) {
        const apiUsers = res?.content?.data || [];
        setUsers(apiUsers);
      } else {
        showToast("❌ Không thể tải danh sách người dùng");
      }
    } catch (error) {
      console.error("Không thể tải danh sách người dùng:", error);

      if (String(error?.message || "").includes("401")) {
        handleLogout?.();
      }

      showToast("❌ Không thể tải danh sách người dùng");
    } finally {
      setLoading(false);
    }
  }, [handleLogout, pageNumber, pageSize, showToast]);

  useEffect(() => {
    loadUsers();
  }, [location.pathname, loadUsers]);

  const handleDelete = async (userId, username) => {
    const confirmed = window.confirm(`Vô hiệu hóa tài khoản "${username}"?`);
    if (!confirmed) return;

    try {
      const res = await deactivateUser(userId);
      console.log("DeactivateUser API Response:", res);

      if (res?.success) {
        showToast(`✅ Tài khoản "${username}" đã được vô hiệu hóa`);
        loadUsers();
      } else {
        showToast(`❌ Không thể vô hiệu hóa tài khoản "${username}"`);
      }
    } catch (error) {
      console.error("Lỗi vô hiệu hóa người dùng:", error);
      showToast(`❌ Không thể vô hiệu hóa tài khoản "${username}"`);
    }
  };

  const handleEdit = (user) => {
    setEditingUserId(user.userID);
    setEditForm({
      fullName: user.fullName || "",
      phone: user.phone || "",
      roleID: user.roleID || "",
    });
  };

  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditForm({
      fullName: "",
      phone: "",
      roleID: "",
    });
  };

  const validateEditForm = () => {
    const fullName = editForm.fullName.trim();
    const phone = editForm.phone.trim();
    const roleID = editForm.roleID;

    if (!fullName) {
      showToast("❌ Họ và tên không được để trống");
      return false;
    }

    if (fullName.length < 2) {
      showToast("❌ Họ và tên phải có ít nhất 2 ký tự");
      return false;
    }

    if (!/^0\d{9}$/.test(phone)) {
      showToast("❌ Số điện thoại phải gồm 10 số và bắt đầu bằng 0");
      return false;
    }

    if (!roleID) {
      showToast("❌ Vui lòng chọn vai trò");
      return false;
    }

    if (!["RC", "IM", "RT"].includes(roleID)) {
      showToast(
        "❌ Vai trò hợp lệ chỉ gồm: Điều phối viên, Quản lý kho, Đội cứu hộ",
      );
      return false;
    }
    return true;
  };

  const handleSaveEdit = async (userId) => {
    if (saving) return;

    const fullName = editForm.fullName.trim();
    const phone = editForm.phone.trim();
    const roleID = editForm.roleID;

    if (!fullName) {
      showToast("❌ Họ và tên không được để trống");
      return;
    }

    if (!/^0\d{9}$/.test(phone)) {
      showToast("❌ Số điện thoại phải gồm 10 số và bắt đầu bằng 0");
      return;
    }

    if (!["RC", "IM", "RT"].includes(roleID)) {
      showToast(
        "❌ Vai trò hợp lệ chỉ gồm: Điều phối viên, Quản lý kho, Đội cứu hộ",
      );
      return;
    }

    try {
      setSaving(true);

      const payload = { fullName, phone, roleID };
      const res = await updateUser(userId, payload);

      const updatedUser = res?.content || {
        userID: userId,
        fullName,
        phone,
        roleID,
      };

      setUsers((prev) =>
        prev.map((user) =>
          user.userID === userId ? { ...user, ...updatedUser } : user,
        ),
      );
      setEditingUserId(null);
      showToast("✅ Cập nhật người dùng thành công");
    } catch (error) {
      console.error("Lỗi cập nhật người dùng:", error);
      showToast(error?.message || "❌ Không thể cập nhật người dùng");
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return users.filter((user) => {
      const fullName = String(user.fullName || "").toLowerCase();
      const username = String(user.username || "").toLowerCase();

      const matchesSearch =
        !keyword || fullName.includes(keyword) || username.includes(keyword);

      const matchesRole =
        roleFilter === "All" ||
        String(user.roleName || "")
          .trim()
          .toLowerCase() ===
          String(roleFilter || "")
            .trim()
            .toLowerCase();

      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const isSearchingOrFiltering = search.trim() !== "" || roleFilter !== "All";

  return (
    <>
      <div className="list-user-container">
        <h2>Danh sách tài khoản</h2>

        <div className="controls-container">
          <div className="search-container">
            <input
              className="search"
              placeholder="Tìm kiếm theo tên hoặc tên đăng nhập..."
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
                <option key={index} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          <div className="view-indicator">
            <span
              className={`indicator ${
                isSearchingOrFiltering ? "card-mode" : "table-mode"
              }`}
            >
              {isSearchingOrFiltering
                ? "🔍 Chế độ lọc/thẻ"
                : "📋 Chế độ bảng đầy đủ"}
            </span>
          </div>
        </div>

        <div className="search-info">
          {loading
            ? "Đang tải danh sách người dùng..."
            : `Tìm thấy ${filteredUsers.length} người dùng`}
          {roleFilter !== "All" && ` với vai trò "${roleFilter}"`}
          {search.trim() !== "" && ` khớp với "${search}"`}
        </div>

        {isSearchingOrFiltering && (
          <div className="user-list">
            {filteredUsers.length === 0 ? (
              <div className="no-results">
                <p>Không tìm thấy người dùng</p>
              </div>
            ) : (
              filteredUsers.map((user, index) => {
                const isEditing = editingUserId === user.userID;

                return (
                  <div key={user.userID || index} className="user-card">
                    <div className="user-header">
                      <span className="user-role">
                        {isEditing
                          ? ROLE_LABEL_BY_ID[editForm.roleID] ||
                            "Đang chỉnh sửa"
                          : user.roleName}
                      </span>
                    </div>

                    <div className="user-info1">
                      <div className="info-row">
                        <span className="label">Họ và tên:</span>
                        {isEditing ? (
                          <input
                            type="text"
                            className="edit-input"
                            value={editForm.fullName}
                            onChange={(e) =>
                              handleEditChange("fullName", e.target.value)
                            }
                          />
                        ) : (
                          <span className="value">{user.fullName}</span>
                        )}
                      </div>

                      <div className="info-row">
                        <span className="label">Tên đăng nhập:</span>
                        <span className="value">{user.username}</span>
                      </div>

                      <div className="info-row">
                        <span className="label">Số điện thoại:</span>
                        {isEditing ? (
                          <input
                            type="text"
                            className="edit-input"
                            value={editForm.phone}
                            onChange={(e) =>
                              handleEditChange("phone", e.target.value)
                            }
                          />
                        ) : (
                          <span className="value">{user.phone}</span>
                        )}
                      </div>

                      {isEditing && (
                        <div className="info-row">
                          <span className="label">Vai trò:</span>
                          <select
                            className="edit-input"
                            value={editForm.roleID}
                            onChange={(e) =>
                              handleEditChange("roleID", e.target.value)
                            }
                          >
                            {ROLE_OPTIONS.map((role) => (
                              <option key={role.value} value={role.value}>
                                {role.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="action-buttons2">
                      {isEditing ? (
                        <>
                          <button
                            className="save-btn"
                            onClick={() => handleSaveEdit(user.userID)}
                            disabled={saving}
                          >
                            {saving ? "Đang lưu..." : "Lưu"}
                          </button>
                          <button
                            className="cancel-btn"
                            onClick={handleCancelEdit}
                            disabled={saving}
                          >
                            Hủy
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="edit-btn"
                            onClick={() => handleEdit(user)}
                          >
                            Sửa
                          </button>
                          <button
                            className="delete-btn"
                            onClick={() =>
                              handleDelete(user.userID, user.username)
                            }
                          >
                            🗑️ Xóa
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {!isSearchingOrFiltering && (
          <div className="table-container">
            <table className="user-table">
              <thead>
                <tr>
                  <th>Họ và tên</th>
                  <th>Tên đăng nhập</th>
                  <th>Số điện thoại</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="no-data">
                      Không tìm thấy người dùng
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user, index) => {
                    const isEditing = editingUserId === user.userID;

                    return (
                      <tr key={user.userID || index}>
                        <td>
                          {isEditing ? (
                            <input
                              type="text"
                              className="edit-input"
                              value={editForm.fullName}
                              onChange={(e) =>
                                handleEditChange("fullName", e.target.value)
                              }
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
                              onChange={(e) =>
                                handleEditChange("phone", e.target.value)
                              }
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
                              onChange={(e) =>
                                handleEditChange("roleID", e.target.value)
                              }
                            >
                              {ROLE_OPTIONS.map((role) => (
                                <option key={role.value} value={role.value}>
                                  {role.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="table-role">{user.roleName}</span>
                          )}
                        </td>

                        <td>
                          <span
                            className={`status-badge ${
                              user.isActive ? "active" : "inactive"
                            }`}
                          >
                            <span className="status-dot"></span>
                            {user.isActive ? "Hoạt động" : "Không hoạt động"}
                          </span>
                        </td>

                        <td>
                          <div className="table-actions">
                            {isEditing ? (
                              <>
                                <button
                                  className="save-btn"
                                  onClick={() => handleSaveEdit(user.userID)}
                                  disabled={saving}
                                >
                                  {saving ? "Đang lưu..." : "Lưu"}
                                </button>
                                <button
                                  className="cancel-btn"
                                  onClick={handleCancelEdit}
                                  disabled={saving}
                                >
                                  Hủy
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  className="edit-btn"
                                  onClick={() => handleEdit(user)}
                                >
                                  Sửa
                                </button>
                                <div className="action-buttons1">
                                  <button
                                    className="delete-btn1"
                                    onClick={() =>
                                      handleDelete(user.userID, user.username)
                                    }
                                  >
                                    Xóa
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

      {toast && (
        <div
          className={`toast_container1 ${toast.includes("✅") ? "success" : "error"}`}
        >
          {toast}
        </div>
      )}
    </>
  );
};

export default ListUser;
