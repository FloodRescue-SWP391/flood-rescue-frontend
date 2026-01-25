import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Trang đăng nhập
import Dashboard from "./components/admin/Dashboard";

// Layout admin và các trang con
import AdminDashboard from "./components/admin/AdminDashboard";
import CreateUser from "./components/admin/createUser";
import ListUser from "./components/admin/listUser";
// layout and component of MANAGER
import ManagerDashBoard from "./components/manager/ManagerDashBoard";
import ManagerReport from "./components/manager/ManagerReport";
// Trang profile
import Profile from "./components/Profile";
//
import ProtectedRoute from "./auth/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Trang mặc định là đăng nhập */}
        <Route path="/login" element={<Dashboard />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/unauthorized" element={<h1>Unauthorized Access</h1>} />


        {/* Layout admin sau khi đăng nhập */}
        <Route element={<ProtectedRoute allowedRoles={["Administrator"]} />}>
          <Route path="/admin" element={<AdminDashboard />}>
            <Route index element={<CreateUser />} /> {/* Trang mặc định khi vào /admin */}
            <Route path="create-user" element={<CreateUser />} />
            <Route path="list-user" element={<ListUser />} />
          </Route>
        </Route>

        // Layout manager sau khi đăng nhập
        <Route element={<ProtectedRoute allowedRoles={["Manager"]} />}>
          <Route path="/manager/*" element={<ManagerDashBoard />}>
            <Route index element={<div />} />
            <Route path="report" element={<ManagerReport />} />
            <Route path="warehouse" element={<div>Warehouse (đang làm)</div>} />
          </Route>
        </Route>


        {/* fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;