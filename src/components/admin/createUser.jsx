import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../layout/admin/createUser.css";
import "../../layout/citizen/Header.css";
import logo from "../../assets/logo.png";
import beai from "../../assets/user1.jpg";

const CreateUser = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "Rescue Coordinator",
  });

  const [noun, setNoun] = useState({
    show: false,
    message: "",
    type: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const showToast = (message, type = "success") => {
    setNoun({ show: true, message, type });
    setTimeout(() => {
      setNoun({ show: false, message: "", type: "" });
    }, 3000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      showToast("❌ Mật khẩu không khớp", "error");
      return;
    }

    console.log("User created:", formData);
    showToast("🎉 Tạo tài khoản thành công", "success");

    setFormData({
      fullName: "",
      username: "",
      phone: "",
      password: "",
      confirmPassword: "",
      role: "Rescue Coordinator",
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="admin-page">
      {/* ===== HEADER ===== */}
      <header>
        <div className="logo">
          <img src={logo} alt="Rescue Now Logo" />
          <span>
            RESCUE.<div className="a">Now</div>
          </span>
        </div>
        
        <div className="header-right">
          <nav>
            <Link className="nav-btn" to="/introduce">
              Introduce
            </Link>
            <Link className="nav-btn" to="/contact">
              Contact
            </Link>
          </nav>

          <span className="admin-name">Admin</span>
          <img src={beai} alt="Admin" className="admin-avatar" />
        </div>
      </header>

      {/* ===== TOAST ===== */}
      {noun.show && (
        <div className={`toast ${noun.type}`}>{noun.message}</div>
      )}

      {/* ===== BODY ===== */}
      <div className="admin-body">
        {/* ===== SIDEBAR ===== */}
        <aside className="admin-sidebar">
          <h3>👤 Member</h3>

          <button className="active">➕ Add Member</button>

          <button onClick={() => navigate("/admin/list-user")}>
            📋 List Account
          </button>

          <h3>⚙️ Setting</h3>
          <button className="logout" onClick={handleLogout}>
            🚪 Logout
          </button>
        </aside>

        {/* ===== CONTENT ===== */}
        <main className="admin-content">
          <div className="form-wrapper">
            <h2>Create New Account</h2>

            <form onSubmit={handleSubmit} className="create-form">
              {/* ROLE */}
              <div className="role-section">
                <p>Choose roles:</p>
                <div className="role-cards">
                  {["Rescue Coordinator", "Rescue Team", "Manager"].map(
                    (role) => (
                      <label
                        key={role}
                        className={`role-card ${
                          formData.role === role ? "active" : ""
                        }`}
                      >
                        <input
                          type="radio"
                          name="role"
                          value={role}
                          checked={formData.role === role}
                          onChange={handleChange}
                        />
                        {role}
                      </label>
                    ),
                  )}
                </div>
              </div>

              {/* INPUT */}
              {[
                ["Full Name", "fullName"],
                ["Username", "username"],
                ["Phone Number", "phone"],
                ["Password", "password", "password"],
                ["Confirm Password", "confirmPassword", "password"],
              ].map(([label, name, type]) => (
                <div className="form-row-grid" key={name}>
                  <label>{label}</label>
                  <input
                    type={type || "text"}
                    name={name}
                    value={formData[name]}
                    onChange={handleChange}
                  />
                </div>
              ))}

              <div className="form-submit">
                <button type="submit">Create</button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

export default CreateUser;
