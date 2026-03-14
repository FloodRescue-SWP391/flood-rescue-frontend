import Header from "../../components/common/Header";
import ManagerSidebar from "../../components/manager/ManagerSidebar";
import { Outlet } from "react-router-dom";
import "./ManagerDashboard.css";
import "./ManagerLayout.css";

export default function ManagerLayout() {

  return (
    <>
      <Header />

      <div className="manager-layout">

        <ManagerSidebar />

        <div className="manager-content">
          <Outlet />
        </div>

      </div>
    </>
  );

}