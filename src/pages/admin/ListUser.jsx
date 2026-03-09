import React, { useMemo, useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import "./ListUser.css";
import { getUsers, deactivateUser } from "../../services/userService";

const ListUser = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [showPassword, setShowPassword] = useState({});
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageNumber] = useState(1);
  const [pageSize] = useState(100);

  const { handleLogout } = useOutletContext();


  // Lấy danh sách role duy nhất
  const uniqueRoles = useMemo(() => {
    return["All", ...new Set(users.map(user => user.roleName).filter(Boolean))];
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
      const roleId = roleFilter === "All" ? "" : roleFilter;
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


  const handleResetPassword = (username) => {
    showToast(`⚠️ Reset password API chưa có cho "${username}"`);
  };



  const togglePasswordVisibility = (username) => {
    setShowPassword(prev => ({
      ...prev,
      [username]: !prev[username]
    }));
  };


  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.fullName.toLowerCase().includes(search.toLowerCase()) ||
      user.username.toLowerCase().includes(search.toLowerCase());

    const matchesRole =
      roleFilter === "All" || user.roleName === roleFilter;

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
                    <span className="user-id">ID: {user.userID || index + 1}</span>
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
                    <div className="info-row">
                      <span className="label">Password:</span>
                      <div className="password-horizontal">
                        <span className="password-value">
                          {showPassword[user.username] ? "N/A" : "••••••••"}
                        </span>
                        <button
                          className="eye-btn"
                          onClick={() => togglePasswordVisibility(user.username)}
                          title={showPassword[user.username] ? "Hide password" : "Show password"}
                        >
                          {showPassword[user.username] ? "👁️" : "👁️‍🗨️"}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="action-buttons">
                    <button
                      className="reset-btn"
                      onClick={() => handleResetPassword(user.username)}
                    >
                      🔄 Reset Password
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(user.userID,user.username)}
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
                  <th>ID</th>
                  <th>Full Name</th>
                  <th>Username</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Password</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="no-data">
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user, index) => (
                    <tr key={index}>
                      <td className="cell-id">{user.userID || index + 1}</td>
                      <td>{user.fullName}</td>
                      <td>{user.username}</td>
                      <td>{user.phone}</td>
                      <td>
                        <span className="table-role">{user.roleName}</span>
                      </td>
                      <td>
                        <div className="table-password">
                          <span className="password-display">
                            {showPassword[user.username] ? "N/A" : "••••••••"}
                          </span>
                          <button
                            className="table-eye-btn"
                            onClick={() => togglePasswordVisibility(user.username)}
                            title={showPassword[user.username] ? "Hide password" : "Show password"}
                          >
                            {showPassword[user.username] ? "👁️" : "👁️‍🗨️"}
                          </button>
                        </div>
                      </td>
                      <td>{user.isActive?"Active":"Inactive"}</td>
                    </tr>
                  ))
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