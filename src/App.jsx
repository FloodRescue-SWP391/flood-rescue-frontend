import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});



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


// MANAGER
import ManagerDashBoard from "./components/manager/ManagerDashBoard";

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
        <Route path="/citizen/request-status"element={<RequestStatus />}/>
       

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
        {/*============Manager============*/}
        <Route
          path="/manager"
          element={
            <ProtectedRoute allowedRoles={["Manager"]}>
              <ManagerDashBoard />
            </ProtectedRoute>
          }
        >
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
