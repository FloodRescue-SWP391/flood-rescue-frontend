import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Home
import HomePage from "./homePage/HomePage";
import Contact from "./homePage/Contact";
import Introduce from "./homePage/Introduce";

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
// MANAGER
import ManagerDashBoard from "./components/manager/ManagerDashBoard";
import ManagerReport from "./components/manager/ManagerReport";

// PROFILE
import Profile from "./components/Profile";

// AUTH
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
        {/* ================= HOME ================= */}
        <Route path="/homepage" element={<HomePage />} />
        <Route path="/introduce" element={<Introduce />} />
        <Route path="/contact" element={<Contact />} />

        {/* ================= CITIZEN (PUBLIC) ================= */}
        <Route path="/citizen/request" element={<RequestRescue />} />
        <Route path="/citizen/status" element={<RequestStatus />} />
        <Route path="/citizen/on-the-way" element={<OnTheWay />} />
        <Route path="/citizen/completed" element={<Completed />} />

        {/* ================= LOGIN ================= */}
        <Route path="/login" element={<Dashboard />} />

        {/* ================= ADMIN ================= */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["Administrator"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        >
          <Route index element={<CreateUser />} />
          <Route path="create-user" element={<CreateUser />} />
          <Route path="list-user" element={<ListUser />} />
        </Route>

        // Layout manager sau khi đăng nhập
        <Route element={<ProtectedRoute allowedRoles={["Manager"]} />}>
          <Route path="/manager/*" element={<ManagerDashBoard />}>
            <Route index element={<div />} />
          </Route>
        {/* ================= MANAGER ================= */}
        <Route
          path="/manager"
          element={
            <ProtectedRoute allowedRoles={["Manager"]}>
              <ManagerDashBoard />
            </ProtectedRoute>
          }
        >
          <Route path="report" element={<ManagerReport />} />
        </Route>

        {/* ================= PROFILE ================= */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* ================= DEFAULT ================= */}
        <Route path="/" element={<Navigate to="/homepage" replace />} />
        <Route path="/unauthorized" element={<h1>Unauthorized</h1>} />


        {/* fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
