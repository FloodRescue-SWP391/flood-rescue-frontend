import { BrowserRouter, Routes, Route } from "react-router-dom";

// Trang đăng nhập
import Dashboard from "./components/admin/Dashboard";

// Layout admin và các trang con
import AdminDashboard from "./components/admin/AdminDashboard";
import CreateUser from "./components/admin/createUser";
import ListUser from "./components/admin/listUser";

// Trang profile
import Profile from "./components/Profile";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Trang mặc định là đăng nhập */}
        <Route path="/" element={<Dashboard />} />

        {/* Layout admin sau khi đăng nhập */}
        <Route path="/admin" element={<AdminDashboard />}>
          <Route index element={<CreateUser />} /> {/* Trang mặc định khi vào /admin */}
          <Route path="create-user" element={<CreateUser />} />
          <Route path="list-user" element={<ListUser />} />
        </Route>

        {/* Trang profile */}
        <Route path="/rescueTeam/Profile" element={<Profile />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;