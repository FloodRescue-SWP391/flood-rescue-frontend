import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import HomePage from "./pages/home/HomePage";
import Introduce from "./pages/home/Introduce";
import Contact from "./pages/home/Contact";

import Hero from "./pages/citizen/home/Hero";
import RequestRescue from "./pages/citizen/request/RequestRescue";
import RequestStatus from "./pages/citizen/request/RequestStatus";

import Login from "./pages/auth/Login";
import ProtectedRoute from "./routes/ProtectedRoute";

// ===== ADMIN =====
import AdminDashboard from "./pages/admin/AdminDashboard";
import ListUser from "./pages/admin/ListUser.jsx";
import CreateUser from "./pages/admin/CreateUser.jsx";

// ===== MANAGER =====
import ManagerDashboard from "./pages/manager/ManagerDashboard";

import RescueTeam from "./pages/rescueTeam/RescueTeam";

import CoordinatorDashboard from "./pages/coordinator/Dashboard.jsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ===== HOME ===== */}
        <Route path="/" element={<HomePage />} />

        {/* ===== HEADER ===== */}
        <Route path="/introduce" element={<Introduce />} />
        <Route path="/contact" element={<Contact />} />

        {/* ===== LOGIN ===== */}
        <Route path="/login" element={<Login />} />

        {/* ===== CITIZEN ===== */}
        <Route path="/citizen/hero" element={<Hero />} />
        <Route path="/citizen/request" element={<RequestRescue />} />
        <Route path="/citizen/request-status" element={<RequestStatus />} />

        {/* ===== ADMIN (PROTECTED) ===== */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["Administrator"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        >
          {/* Redirect mặc định đến create-user */}
          <Route index element={<Navigate to="create-user" replace />} />
          <Route path="create-user" element={<CreateUser />} />
          <Route path="list-user" element={<ListUser />} />
        </Route>

        {/* ===== MANAGER (PROTECTED) ===== */}
        <Route
          path="/manager"
          element={
            <ProtectedRoute allowedRoles={["Manager"]}>
              <ManagerDashboard />
            </ProtectedRoute>
          }
        />

        {/* ===== COORDINATOR (PROTECTED) ===== */}
        <Route
          path="/coordinator"
          element={
            <ProtectedRoute allowedRoles={["Coordinator"]}>
              <CoordinatorDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/rescue-team"
          element={
            <ProtectedRoute allowedRoles={["RescueTeam"]}>
              <RescueTeam />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
