import React from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import "./AdminDashboard.css";
import Header from "../../components/common/Header";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    //Ngắt realtime trước khi xóa token để tránh connection cũ còn sống và backend vẫn nhận được user info cũ (OnConnectedAsync) dẫn đến không leave group được.
    await signalRService.stopConnection();
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
          <h3>🛟 Rescue Team</h3>
          <button
            onClick={() => navigate("/admin/create-rescue-team")}
            className={
              location.pathname === "/admin/create-rescue-team" ? "active" : ""
            }
          >
            ➕ Add Rescue Team
          </button>
          <button
            onClick={() => navigate("/admin/list-rescue-team")}
            className={location.pathname === "/admin/list-rescue-team" ? "active" : ""}
          >
            📋 List Rescue Team
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