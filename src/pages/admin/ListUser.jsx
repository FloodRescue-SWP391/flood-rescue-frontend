import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import "./ListUser.css";
import { dummyUsers } from "../../data/dummyUsers";

const ListUser = () => {
  const [users, setUsers] = useState(dummyUsers);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [showPassword, setShowPassword] = useState({});
  const [toast, setToast] = useState("");
  const [viewMode, setViewMode] = useState("table"); // Mặc định là table

  const { handleLogout } = useOutletContext();

  // Lấy danh sách role duy nhất
  const uniqueRoles = ["All", ...new Set(users.map(user => user.role))];

  // Theo dõi khi có search hoặc filter
  useEffect(() => {
    if (search.trim() !== "" || roleFilter !== "All") {
      setViewMode("card"); // Khi search hoặc filter, chuyển sang card view
    } else {
      setViewMode("table"); // Khi không search/filter, chuyển về table view
    }
  }, [search, roleFilter]);

  const handleDelete = (username) => {
    if (window.confirm("Delete this account?")) {
      setUsers(users.filter((u) => u.username !== username));
      showToast(`✅ Account "${username}" has been deleted`);
    }
  };

  const handleResetPassword = (username) => {
    if (window.confirm(`Reset password for "${username}" to "123"?`)) {
      setUsers(users.map(user => 
        user.username === username 
          ? { ...user, password: "123", updatedAt: new Date().toLocaleString() }
          : user
      ));
      showToast(`✅ Password for "${username}" has been reset to "123"`);
    }
  };

  const togglePasswordVisibility = (username) => {
    setShowPassword(prev => ({
      ...prev,
      [username]: !prev[username]
    }));
  };

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 3000);
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      user.fullName.toLowerCase().includes(search.toLowerCase()) ||
      user.username.toLowerCase().includes(search.toLowerCase());
    
    const matchesRole = roleFilter === "All" || user.role === roleFilter;
    
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
                <div key={index} className="user-card">
                  <div className="user-header">
                    <span className="user-role">{user.role}</span>
                    <span className="user-id">ID: {user.id || index + 1}</span>
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
                          {showPassword[user.username] ? user.password : "••••••••"}
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
                    <div className="info-row">
                      <span className="label">Created:</span>
                      <span className="value">{user.createdAt}</span>
                    </div>
                    {user.updatedAt && (
                      <div className="info-row">
                        <span className="label">Updated:</span>
                        <span className="value updated">{user.updatedAt}</span>
                      </div>
                    )}
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
                      onClick={() => handleDelete(user.username)}
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
                  <th>Created</th>
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
                      <td className="cell-id">{user.id || index + 1}</td>
                      <td>{user.fullName}</td>
                      <td>{user.username}</td>
                      <td>{user.phone}</td>
                      <td>
                        <span className="table-role">{user.role}</span>
                      </td>
                      <td>
                        <div className="table-password">
                          <span className="password-display">
                            {showPassword[user.username] ? user.password : "••••••••"}
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
                      <td>{user.createdAt}</td>
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