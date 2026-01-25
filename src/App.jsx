import { BrowserRouter, Routes, Route } from "react-router-dom";

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
import Profile from "./components/Profile";

// PROTECTED
import ProtectedRoute from "./routes/ProtectedRoute";

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
        <Route
          path="/admin"
          element={
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
        <Route
          path="/rescueTeam/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
