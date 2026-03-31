import { NavLink, useNavigate } from "react-router-dom";
import "./ManagerSideBar.css";
import signalRService from "../../services/signalrService";

export default function ManagerSidebar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signalRService.stopConnection();
    } catch (error) {
      console.warn("SignalR stop failed:", error);
    }

    localStorage.removeItem("auth");
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("isAuth");
    localStorage.removeItem("fullName");
    localStorage.removeItem("userFullName");
    localStorage.removeItem("userId");
    localStorage.removeItem("teamId");
    localStorage.removeItem("isLeader");

    navigate("/login", { replace: true });
  };

  return (
    <div className="manager-sidebar">
      <h5 className="sidebar-title">Người quản lý</h5>

      <nav>
        <NavLink to="/manager" end>
          Trang tổng quan
        </NavLink>

        <NavLink to="/manager/warehouse">Kho</NavLink>

        <NavLink to="/manager/inventory">Hàng tồn kho</NavLink>

        <NavLink to="/manager/relief-orders">Đơn cứu trợ</NavLink>

      </nav>
    </div>
  );
}
