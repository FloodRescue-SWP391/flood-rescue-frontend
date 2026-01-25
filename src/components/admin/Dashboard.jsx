import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../layout/admin/Dashboard.css';
import logo from '../../assets/logo.png';
import "../../layout/citizen/Header.css";
import { Link } from 'react-router-dom';
import { dummyUsers } from './listUser';

const Dashboard = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const navigate = useNavigate();
  const goByRole = (role) => {
    switch (role) {
      case "Administrator":
        return "/admin";
      case "Manager":
        return "/manager";
      default:
        return "/unauthorized";
    }
  };

  const showToast = (message, type = "info", duration = 1500) => {
    
    setToast({ show: false, message: "", type });

    setTimeout(() => {
      setToast({ show: true, message, type });
    }, 10);

   
    setTimeout(() => {
      setToast({ show: false, message: "", type });
    }, duration);
  };

  const handleLogin = () => {
    if (!username || !password) {
      showToast("Vui lòng điền đầy đủ thông tin", "info");
      return;
    }
    const foundUser = dummyUsers.find(
      (user) =>
        user.username === username.trim() &&
        user.password === password.trim()
    );

    if (!foundUser) {
      showToast("Tên đăng nhập hoặc mật khẩu không đúng", "error");
      return;
    }

    localStorage.setItem("isAuth", "true");
    localStorage.setItem("role", foundUser.role);


    showToast("Đăng nhập thành công", "success");

    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
      if (foundUser.role === "Administrator") {
        navigate("/admin", { replace: true });
      } else if (foundUser.role === "Manager") {
        navigate("/manager", { replace: true });
      } else {
        navigate("/unauthorized", { replace: true });
      }
    }, 850);
  };

  return (
    <div>
      <header>
        <div className="logo">
          <img src={logo} alt="Rescue Now Logo" />
          <span>RESCUE.<div className='a'>Now</div></span>
        </div>
        <nav>
          <Link to="">Introduce</Link>
          <Link to="">Contact</Link>
        </nav>
      </header>

      <div className="login-container">
        <div className="a2">
          <h2>Login Account</h2>
          <div className="login">
            <p>Tên đăng nhập</p>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="login">
            <p>Mật khẩu</p>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button onClick={handleLogin}>Đăng nhập</button>
          <p className="switch">
            Bạn chưa có tài khoản?
            <span className="contact-admin" onClick={() =>
              setToast({
                show: true,
                message: 'Vui lòng liên hệ Admin qua SĐT: 0965782358 để được cấp tài khoản.',
                type: 'info',
              })
            }>
              Liên hệ Admin
            </span>
          </p>
        </div>
      </div>

      {toast.show && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default Dashboard;