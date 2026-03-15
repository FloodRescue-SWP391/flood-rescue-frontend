import { NavLink , useNavigate} from "react-router-dom";
import "./ManagerSidebar.css";

export default function ManagerSidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("auth"); // xóa token
    navigate("/login"); // quay về trang login
  };

  return (

    <div className="manager-sidebar">

      <h5 className="sidebar-title">
        Manager
      </h5>

      <nav>

        <NavLink to="/manager" end>
          Dashboard
        </NavLink>

        <NavLink to="/manager/warehouse">
          Warehouse
        </NavLink>

        <NavLink to="/manager/inventory">
          Inventory
        </NavLink>

        <NavLink to="/manager/items">
          Relief Items
        </NavLink>

        <NavLink to="/manager/orders">
          Prepare Orders
        </NavLink>

        <NavLink to="/manager/report">
          Usage Report
        </NavLink>
        {/* Logout Button */}
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </nav>

    </div>

  );

}