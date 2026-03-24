import { NavLink , useNavigate} from "react-router-dom";
import "./ManagerSideBar.css";


export default function ManagerSidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("auth"); // xóa token
    navigate("/login"); // quay về trang login
  };

  return (

    <div className="manager-sidebar">

      <h5 className="sidebar-title">
        Người quản lý
      </h5>

      <nav>

        <NavLink to="/manager" end>
          Trang tổng quan
        </NavLink>

        <NavLink to="/manager/warehouse">
          Kho
        </NavLink>

        <NavLink to="/manager/inventory">
          Hàng tồn kho
        </NavLink>

        <NavLink to="/manager/items">
          Vật phẩm cứu trợ
        </NavLink>

        <NavLink to="/manager/orders">
          Chuẩn bị đơn đặt hàng
        </NavLink>

        <NavLink to="/manager/report">
          Báo cáo sử dụng
        </NavLink>
        {/* Logout Button */}
        <button className="logout-btn" onClick={handleLogout}>
          Đăng xuất
        </button>
      </nav>

    </div>

  );

}