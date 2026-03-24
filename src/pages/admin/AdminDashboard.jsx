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
          <h3>👤 Thành viên</h3>
          <button
            onClick={() => navigate("/admin/create-user")}
            className={location.pathname === "/admin/create-user" ? "active" : ""}
          >
            ➕ Thêm thành viên
          </button>
          <button
            onClick={() => navigate("/admin/list-user")}
            className={location.pathname === "/admin/list-user" ? "active" : ""}
          >
            📋 Danh sách tài khoản
          </button>
          <h3>🛟 Đội cứu hộ</h3>
          <button
            onClick={() => navigate("/admin/create-rescue-team")}
            className={
              location.pathname === "/admin/create-rescue-team" ? "active" : ""
            }
          >
            ➕ Thêm đội cứu hộ
          </button>
          <button
            onClick={() => navigate("/admin/list-rescue-team")}
            className={location.pathname === "/admin/list-rescue-team" ? "active" : ""}
          >
            📋 Danh sách đội cứu hộ
          </button>
          <h3>📊 Báo cáo</h3>
          <button
            onClick={() => navigate("/admin/report")}
            className={location.pathname === "/admin/report" ? "active" : ""}
          >
            📈 Báo cáo của quản trị viên
          </button>

          <h3>⚙️ Cài đặt</h3>
          <button className="logout" onClick={handleLogout}>
            🚪 Đăng xuất
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