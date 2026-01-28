import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// LOGIN
import Dashboard from "./components/admin/Dashboard";

// ADMIN
import AdminDashboard from "./components/admin/AdminDashboard";
import CreateUser from "./components/admin/createUser";
import ListUser from "./components/admin/listUser";

// CITIZEN
import RequestRescue from "./components/citizen/RequestRescue";
import RequestStatus from "./components/citizen/RequestStatus";
import OnTheWay from "./components/citizen/status/OnTheWay";
import Completed from "./components/citizen/status/Completed";

// PROFILE
// layout and component of MANAGER
import ManagerDashBoard from "./components/manager/ManagerDashBoard";
// Trang profile
import Profile from "./components/Profile";
// Protected Route
import ProtectedRoute from "./auth/ProtectedRoute";




function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ================= PUBLIC / CITIZEN ================= */}
        <Route path="/" element={<RequestRescue />} />
        <Route path="/request-status" element={<RequestStatus />} />
        <Route path="/On_The_Way" element={<OnTheWay />} />
        <Route path="/Completed" element={<Completed />} />
        {/* ================= LOGIN ================= */}
        <Route path="/login" element={<Dashboard />} />



        {/* ================= ADMIN (LOGIN REQUIRED) ================= */}
        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        }
        >
          <Route index element={<CreateUser />} />
          <Route path="create-user" element={<CreateUser />} />
          <Route path="list-user" element={<ListUser />} />
        </Route>

        {/* ================= RESCUE TEAM PROFILE ================= */}
        <Route path="/rescueTeam/profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
        />
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
          </Route>
        </Route>



        {/* fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
