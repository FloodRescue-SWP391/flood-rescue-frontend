import React, { useMemo, useState, useEffect } from "react";
import { useOutletContext, useLocation } from "react-router-dom";
import "./ListUser.css";
import {
  getUsers,
  deactivateUser,
  updateUser,
} from "../../services/userService";

const ListUser = () => {
  const [editingUserId, setEditingUserId] = useState(null);
  const location = useLocation();
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
    return [
      "All",
      ...new Set(users.map((user) => user.roleName).filter(Boolean)),
    ];
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
        showToast("❌ Không thể tải danh sách người dùng");
      }
    } catch (error) {
      console.error("Không thể tải danh sách người dùng:", error);

      if (error.message?.includes("401")) {
        handleLogout?.();
      }

      showToast("❌ Không thể tải danh sách người dùng");
    } finally {
      setLoading(false);
    }
  };
  // load user ngay khi mở trang
  useEffect(() => {
    loadUsers();
  }, [location.pathname]);
  useEffect(() => {
    const delay = setTimeout(() => {
      loadUsers();
    }, 300);

    return () => clearTimeout(delay);
  }, [search, roleFilter]);

  const handleDelete = async (userId, username) => {
    const confirmed = window.confirm(`Vô hiệu hóa tài khoản "${username}"?`);
    if (!confirmed) return;

    try {
      const res = await deactivateUser(userId);

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
        showToast("✅ Cập nhật người dùng thành công");
        setEditingUserId(null);
        loadUsers();
      } else {
        showToast("❌ Không thể cập nhật người dùng");
      }
    } catch (error) {
      console.error("Lỗi cập nhật người dùng:", error);
      showToast("❌ Không thể cập nhật người dùng");
    }
  };
  const filteredUsers = users.filter((user) => {
    const fullName = String(user.fullName || "").toLowerCase();
    const username = String(user.username || "").toLowerCase();
    const keyword = search.toLowerCase();

    const matchesSearch =
      fullName.includes(keyword) || username.includes(keyword);

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

  // Kiểm tra xem có đang search hoặc filter không
  const isSearchingOrFiltering = search.trim() !== "" || roleFilter !== "All";

  return (
    <>
      {toast && (
        <div className={`toast ${toast.includes("✅") ? "success" : "error"}`}>
          {toast}
        </div>
      )}

      <div className="list-user-container">
        <h2>Danh sách tài khoản</h2>

        {/* Controls */}
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

          {/* View Mode Indicator */}
          <div className="view-indicator">
            <span
              className={`indicator ${isSearchingOrFiltering ? "card-mode" : "table-mode"}`}
            >
              {isSearchingOrFiltering
                ? "🔍 Chế độ lọc/thẻ"
                : "📋 Chế độ bảng đầy đủ"}
            </span>
          </div>
        </div>

        <div className="search-info">
          Tìm thấy {filteredUsers.length} người dùng
          {roleFilter !== "All" && ` với vai trò "${roleFilter}"`}
          {search.trim() !== "" && ` khớp với "${search}"`}
        </div>

        {/* Card View */}
        {isSearchingOrFiltering && (
          <div className="user-list">
            {filteredUsers.length === 0 ? (
              <div className="no-results">
                <p>Không tìm thấy người dùng</p>
              </div>
            ) : (
              filteredUsers.map((user, index) => (
                <div key={user.userID || index} className="user-card">
                  <div className="user-header">
                    <span className="user-role">{user.roleName}</span>
                  </div>

                  <div className="user-info">
                    <div className="info-row">
                      <span className="label">Họ và tên:</span>
                      <span className="value">{user.fullName}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Tên đăng nhập:</span>
                      <span className="value">{user.username}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Số điện thoại:</span>
                      <span className="value">{user.phone}</span>
                    </div>
                  </div>

                  <div className="action-buttons2">
                    <button
                      className="edit-btn"
                      onClick={() => handleEdit(user)}
                    >
                      Sửa
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(user.userID, user.username)}
                    >
                      🗑️ Xóa
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Table View */}
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
                              <option value="AD">Quản trị viên</option>
                              <option value="MN">Quản lý</option>
                              <option value="IM">Quản lý kho</option>
                              <option value="CT">Điều phối viên</option>
                              <option value="RT">Đội cứu hộ</option>
                            </select>
                          ) : (
                            <span className="table-role">{user.roleName}</span>
                          )}
                        </td>

                        <td>
                          <span
                            className={
                              user.isActive
                                ? "status-active"
                                : "status-inactive"
                            }
                          >
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
                                >
                                  Lưu
                                </button>
                                <button
                                  className="cancel-btn"
                                  onClick={handleCancelEdit}
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
    </>
  );
};

export default ListUser;
