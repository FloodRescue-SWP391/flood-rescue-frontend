import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../layout/admin/listUser.css";
import "../../layout/citizen/Header.css";
import logo from "../../assets/logo.png";
import beai from "../../assets/user1.jpg";

/* ===== DUMMY DATA ===== */
export const dummyUsers = [
  {
    fullName: "Đặng Hoàng Trúc Vy",
    username: "Vy Dang",
    phone: "0965782358",
    role: "Administrator",
    createdAt: "15/01/2026",
    password: "123",
  },
  {
    fullName: "Baomini",
    username: "Baomini",
    phone: "0965782358",
    role: "Rescue Coordinator",
    createdAt: "15/01/2026",
    password: "123",
  },
  {
    fullName: "Chung Quốc Huy",
    username: "Huy Chung",
    phone: "0965782352",
    role: "Rescue Team",
    createdAt: "15/01/2026",
    password: "123",
  },
  {
    fullName: "Vũ Nguyễn Đức Huy",
    username: "Huy Vũ",
    phone: "0965782358",
    role: "Rescue Team",
    createdAt: "15/01/2026",
    password: "123",
  },
  {
    fullName: "Trương Trần Anh Minh",
    username: "Minh Truong",
    phone: "0789543210",
    role: "Manager",
    createdAt: "25/01/2026",
    password: "123",
  },
];

const ListUser = () => {
  const navigate = useNavigate();

  const [users, setUsers] = useState(dummyUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("All");
  const [toast, setToast] = useState({ show: false, message: "" });

  /* ===== HANDLERS ===== */
  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: "" }), 3000);
  };

  const handleDelete = (username) => {
    if (window.confirm("Bạn có chắc muốn xóa tài khoản này?")) {
      setUsers((prev) => prev.filter((u) => u.username !== username));
      showToast(`Đã xóa thành công tài khoản ${username}`);
    }
  };

  const handleResetPassword = (username) => {
    if (window.confirm("Reset mật khẩu về 123?")) {
      setUsers((prev) =>
        prev.map((u) =>
          u.username === username ? { ...u, password: "123" } : u,
        ),
      );
      showToast(`Đã reset mật khẩu ${username} về 123`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  /* ===== FILTER ===== */
  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = filterRole === "All" || u.role === filterRole;
    return matchSearch && matchRole;
  });

  return (
  <div className="admin-page">
    {/* ===== HEADER ===== */}
    <header>
      <div className="logo">
        <img src={logo} alt="Rescue Now Logo" />
        <span>
          RESCUE.<div className="a">Now</div>
        </span>
      </div>

      <div className="header-right">
        <nav>
          <Link className="nav-btn" to="/introduce">Introduce</Link>
          <Link className="nav-btn" to="/contact">Contact</Link>
        </nav>
        <span className="admin-name">Admin</span>
        <img src={beai} alt="Admin" className="admin-avatar" />
      </div>
    </header>

    {/* ===== BODY ===== */}
    <div className="admin-body">
      {/* ===== SIDEBAR ===== */}
      <aside className="admin-sidebar">
        <h3>👤 Member</h3>

        <button onClick={() => navigate("/admin/create-user")}>
          ➕ Add Member
        </button>

        <button
          className="active"
          onClick={() => navigate("/admin/list-user")}
        >
          📋 List Account
        </button>

        

        <h3>⚙️ Setting</h3>
        <button className="logout" onClick={handleLogout}>
          🚪 Logout
        </button>
      </aside>

      {/* ===== CONTENT ===== */}
      <main className="admin-content">
        <div className="form-wrapper">
          <h2>Manage All Accounts</h2>

          {/* SEARCH + FILTER */}
          <div className="controls">
            <input
              type="text"
              placeholder="Find name or username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="All">All positions</option>
              <option value="Administrator">Administrator</option>
              <option value="Manager">Manager</option>
              <option value="Rescue Coordinator">Rescue Coordinator</option>
              <option value="Rescue Team">Rescue Team</option>
            </select>
          </div>

          {/* USER LIST */}
          <div className="user-list">
            {filteredUsers.map((user, idx) => (
              <div key={idx} className="user-card">
                <p><strong>Fullname:</strong> {user.fullName}</p>
                <p><strong>Username:</strong> {user.username}</p>
                <p><strong>Number Phone:</strong> {user.phone}</p>
                <p><strong>Role:</strong> {user.role}</p>
                <p><strong>Create date:</strong> {user.createdAt}</p>
                <p><strong>Password:</strong> {user.password}</p>

                <div className="actions">
                  <button
                    className="delete-btn"
                    onClick={() => handleDelete(user.username)}
                  >
                    Xóa
                  </button>

                  <button
                    className="reset-btn"
                    onClick={() => handleResetPassword(user.username)}
                  >
                    Reset mật khẩu
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TOAST */}
        {toast.show && <div className="toast success">{toast.message}</div>}
      </main>
    </div>
  </div>
);

};

export default ListUser;
