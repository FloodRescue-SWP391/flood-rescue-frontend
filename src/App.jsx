import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import { Toaster } from "react-hot-toast";

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
import CreateRescueTeam from "./pages/admin/CreateRescueTeam";
import ListRescueTeams from "./pages/admin/ListRescueTeams.jsx";
import AdminReport from "./pages/admin/AdminReport.jsx";

// ===== MANAGER =====
import ManagerLayout from "./pages/manager/ManagerLayout";
import ManagerDashboard from "./pages/manager/ManagerDashboard";
import Warehouse from "./pages/manager/Warehouse";
import Inventory from "./pages/manager/Inventory";
import ManagerReliefOrders from "./pages/manager/ManagerReliefOrders";

import RescueTeam from "./pages/rescueTeam/RescueTeam";
import CoordinatorDashboard from "./pages/coordinator/Dashboard.jsx";

//====unauthorized====
import Unauthorized from "./pages/common/Unauthorized";

function App() {
  return (
    <BrowserRouter>
    {/*Toast Notification*/ }
      <Toaster position="top-right" />
      
      <Routes>
        {/* ===== DEFAULT: CITIZEN HOME ===== */}
        <Route path="/" element={<Hero />} />

        {/* ===== HOME ===== */}
        <Route path="/home" element={<HomePage />} />

        {/* ===== HEADER ===== */}
        <Route path="/introduce" element={<Introduce />} />
        <Route path="/contact" element={<Contact />} />

        {/* ===== LOGIN ===== */}
        <Route path="/login" element={<Login />} />

        {/* ===== CITIZEN ===== */}
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
          <Route path="create-rescue-team" element={<CreateRescueTeam />} />
          <Route path="list-user" element={<ListUser />} />
          <Route path="list-rescue-team" element={<ListRescueTeams />} />
          <Route path="report" element={<AdminReport />} />
        </Route>

        {/* ===== MANAGER (PROTECTED) ===== */}
        <Route
          path="/manager"
          element={
            <ProtectedRoute allowedRoles={["Manager"]}>
              <ManagerLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<ManagerDashboard />} />

          <Route path="warehouse" element={<Warehouse />} />

          <Route path="inventory" element={<Inventory />} />

          <Route path="relief-orders" element={<ManagerReliefOrders />} />

          <Route path="items" element={<Navigate to="/manager/inventory" replace />} />

          <Route path="report" element={<Navigate to="/manager" replace />} />
        </Route>

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
          path="/rescue-team/:teamId"
          element={
            <ProtectedRoute allowedRoles={["RescueTeam"]}>
              <RescueTeam />
            </ProtectedRoute>
          }
        />
        <Route path="/unauthorized" element={<Unauthorized />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
