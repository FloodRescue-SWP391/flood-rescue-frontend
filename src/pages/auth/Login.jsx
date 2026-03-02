import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/common/Header";
import "./login.css";
import { login } from "../../services/authService";


const Dashboard = () => {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "info",
  });

  const showToast = (message, type = "info", duration = 1500) => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type });
    }, duration);
  };

  const handleLogin = async () => {
    if (!username || !password) {
      showToast("Vui lòng điền đầy đủ thông tin", "info");
      return;
    }

    try {
      const auth = await login(username, password);
      console.log("Login response:", auth);

      // vì backend bọc trong content
      const content = auth?.content ?? auth?.data?.content ?? auth;
      const roleRaw = content?.role ?? content?.Role ?? content?.roleName ?? content?.RoleName ?? "";
      const token = content?.accessToken ?? content?.AccessToken ?? "";

      if (!roleRaw) {
        console.log("Cannot read role. Raw auth:", auth);
        showToast("Không lấy được role từ response", "error");
        return;
      }

      // ✅ Normalize
      const roleKey = String(roleRaw).trim().toLowerCase();

      // ✅ Map role theo DB (RoleName/RoleID)
      const roleMap = {
        // RoleName trong DB
        "admin": "Administrator",
        "inventory manager": "Manager",
        "rescue coordinator": "Coordinator",
        "rescue team member": "RescueTeam",

        // nếu backend trả RoleID
        "ad": "Administrator",
        "im": "Manager",
        "rc": "Coordinator",
        "rt": "RescueTeam",
      };

      const role = roleMap[roleKey];

      console.log("roleRaw =", roleRaw, "=> mapped =", role);

      if (!role) {
        showToast(`Role không hợp lệ: ${roleRaw}`, "error");
        return;
      }

      // lưu token/role để ProtectedRoute dùng
      if (token) localStorage.setItem("token", token);
      localStorage.setItem("role", role);      // lưu role đã map (FE role)
      localStorage.setItem("isAuth", "true");

      showToast("Đăng nhập thành công", "success");

      console.log("NAVIGATE TO ROLE:", role);
      switch (role) {
        case "Administrator":
          navigate("/admin", { replace: true });
          break;
        case "Manager":
          navigate("/manager", { replace: true });
          break;
        case "RescueTeam":
          navigate("/rescue-team", { replace: true });
          break;
        case "Coordinator":
          navigate("/coordinator", { replace: true });
          break;
        default:
          navigate("/unauthorized", { replace: true });
      }

    } catch (err) {
      showToast(err?.message || "Đăng nhập thất bại", "error");
    }
  };

  return (
    <div>
      <Header />

      <button className="back-btn1" onClick={() => navigate("/")}>
        ⬅ Back
      </button>

      <div className="login-container">
        <div className="a2">
          <h2>Login Account</h2>

          <div className="login">
            <p>User Name</p>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
            />

            <p>Password</p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />

            <button type="button" onClick={handleLogin}>Login</button>

            {/* Emergency hotline */}
            <div className="emergency-hotline">
              <span>🚨</span>
              <span>Emergency Hotline: 115</span>
            </div>
          </div>
        </div>
      </div>

      {toast.show && (
        <div className={`login-toast ${toast.type}`}>{toast.message}</div>
      )}


    </div>
  );
};

export default Dashboard;
