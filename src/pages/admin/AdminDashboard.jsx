import React from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import "./AdminDashboard.css";
import Header from "../../components/common/Header";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    // Xử lý logout
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    navigate("/login");
  };

  return (
    <div className="admin-page">
      <Header />
      <div className="admin-body">
        {/* SIDEBAR */}
        <aside className="admin-sidebar">
          <h3>👤 Member</h3>
          <button 
            onClick={() => navigate("/admin/create-user")}
            className={location.pathname === "/admin/create-user" ? "active" : ""}
          >
            ➕ Add Member
          </button>
          <button 
            onClick={() => navigate("/admin/list-user")}
            className={location.pathname === "/admin/list-user" ? "active" : ""}
          >
            📋 List Account
          </button>

          <h3>⚙️ Setting</h3>
          <button className="logout" onClick={handleLogout}>
            🚪 Logout
          </button>
        </aside>

        {/* CONTENT AREA */}
        <main className="admin-content">
          <Outlet context={{ handleLogout }} />
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;