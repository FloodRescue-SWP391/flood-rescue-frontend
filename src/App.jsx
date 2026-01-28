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

      </Routes>
    </BrowserRouter>
  );
}

export default App;
