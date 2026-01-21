import React, { useState } from 'react';
import '../../layout/admin/Dashboard.css';
import logo from '../../assets/logo.png';
import "../../layout/citizen/Header.css";
import { Outlet, Link } from 'react-router-dom';

const Dashboard = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [toast, setToast] = useState({
    show: false,
    message: '',
    type: 'success', // success | info
  });

 const handleLogin = () => {
  if (!username || !password) {
    setToast({
      show: true,
      message: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu',
      type: 'info',
    });
    return;
  }

  // giả lập login thành công
  setToast({
    show: true,
    message: 'Đăng nhập thành công!',
    type: 'success',
  });

  setTimeout(() => {
    setToast({ show: false, message: '', type: 'success' });
  }, 3000);
};

    // TODO: call API login ở đây
  

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
          <input
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div className="login">
          <p>Mật khẩu</p>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button onClick={handleLogin}>Đăng nhập</button>

        <p className="switch">
          Bạn chưa có tài khoản?
          <span
  className="contact-admin"
  onClick={() =>
    setToast({
      show: true,
      message: 'Vui lòng liên hệ Admin qua SĐT: 0965782358 để được cấp tài khoản.',
      type: 'info',
    })
  }
>
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
