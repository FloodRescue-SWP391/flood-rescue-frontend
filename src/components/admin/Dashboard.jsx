import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../layout/admin/Dashboard.css";
import "../../layout/citizen/Header.css";
import logo from "../../assets/logo.png";
import { dummyUsers } from "./listUser";


const Dashboard = () => {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "info",
  });

  // ===== Toast helper =====
  const showToast = (message, type = "info", duration = 1500) => {
    setToast({ show: true, message, type });

    setTimeout(() => {
      setToast({ show: false, message: "", type });
    }, duration);
  };


  // ===== Login handler =====
  const handleLogin = () => {
    if (!username || !password) {
      showToast("Vui lòng điền đầy đủ thông tin", "info");
      return;
    }

    const foundUser = dummyUsers.find(
      (user) => user.username === username.trim() && user.password === password.trim()
    );

    if (!foundUser) {
      showToast("❌ Tên đăng nhập hoặc mật khẩu không đúng", "error");
      return;
    }

    // Lưu auth
    localStorage.setItem("isAuth", "true");
    localStorage.setItem("token", "fake-token");
    localStorage.setItem("role", foundUser.role);

    showToast("Đăng nhập thành công", "success");




    setTimeout(() => {
      switch (foundUser.role) {
        case "Administrator":
          navigate("/admin", { replace: true });
          break;
        case "Manager":
          navigate("/manager", { replace: true });
          break;
        default:
          navigate("/unauthorized", { replace: true });
      }
    }, 1500);
  }

  return (
    <div>
      {/* ===== Header ===== */}
      <header>
        <div className="logo">
          <img src={logo} alt="Rescue Now Logo" />
          <span>
            RESCUE.<div className="a">Now</div>
          </span>
        </div>

        <nav>
          <Link className="nav-btn" to="/introduce">
            Giới thiệu
          </Link>
          <Link className="nav-btn" to="/contact">
            Liên hệ
          </Link>
        </nav>
      </header>

      <button className="back-btn1" onClick={() => navigate("/homePage")}>
        ⬅ Back
      </button>

      {/* ===== Login ===== */}
      <div className="login-container">
        <div className="a2">
          <h2>Login Account</h2>

          <div className="login">

            <div className="login">
              <p>Tên đăng nhập</p>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="login">
              <p>Mật khẩu</p>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button onClick={handleLogin}>Đăng nhập</button>

            <p className="switch">
              Bạn chưa có tài khoản?{" "}
              {/*       */}
              <span
                className="contact-admin"
                onClick={() =>
                  setToast({
                    show: true,
                    message: "Vui lòng liên hệ Admin qua SĐT: 0965782358 để được cấp tài khoản.",
                    type: "info",
                  })
                }
              >
                Bạn chưa có tài khoản?
             </span>
              {/*       */}
                <span
                  className="contact-admin"
                  onClick={() =>
                    showToast(
                      "Vui lòng liên hệ Admin qua SĐT: 0965782358 để được cấp tài khoản.",
                      "info",
                      2500,
                    )
                  }
                >
                  {" "}
                  Liên hệ Admin
                </span>
            </p>

          </div>

        </div>
        </div>

        {/* --------------------  */}
        {toast.show && <div className={`toast ${toast.type}`}>{toast.message}</div>}
        {/* ===== Toast ===== */}
        {toast.show && (
          <div className={`login-toast ${toast.type}`}>
            {toast.message}
          </div>
        )}

      </div>

       
    
    );
};

        export default Dashboard;
