import React from "react";
import "./Header.css";
import logo from "../../assets/images/logo.png";
import { Link, useLocation, useNavigate } from "react-router-dom";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const showLogin = location.pathname === "/";
  return (
    <header>
      {/* Top Bar with Emergency Information */}
      <div className="top-bar">
        <div className="top-bar-content">
          <span> 🔔 24/7 EMERGENCY SUPPORT</span>
          <span className="separator">|</span>
          <span> ⏱️ RESPONSE WITHIN 5 MINUTES</span>
          <span className="separator">|</span>
          <span> 🚑 FLOOD RESCUE SYSTEM</span>
          <span className="separator">|</span>
          <span> 🛡️ SAFE & FAST RESPONSE</span>
        </div>
      </div>

      {/* Main Header with Logo and Navigation */}
      <div className="main-header">
        <div className="logo">
          <img src={logo} alt="Rescue Now Logo" />
          <span className="logo-text">RESCUE.NOW</span>
        </div>

        <nav className="title">
          <Link className="title1" to="/introduce">
            Introduce
          </Link>
          <Link className="title1" to="/contact">
            Contact
          </Link>
          {showLogin && (
            <button onClick={() => navigate("/home")}>Login</button>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
