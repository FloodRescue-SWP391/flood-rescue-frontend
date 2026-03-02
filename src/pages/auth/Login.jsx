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
      //gọi api login
      const auth = await login(username, password);
      console.log("Login response:", auth);

      const role = auth.role ?? auth.Role; //backend có thể trả về role hoặc Role, nên phải check cả 2
      // auth là AuthResponseDTO: AccessToken, Role, FullName, ...
      showToast("Đăng nhập thành công", "success");

      setTimeout(() => {
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
      }, 1500);
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

            <button onClick={handleLogin}>Login</button>

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
