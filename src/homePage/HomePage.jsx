import React, { useRef, useState } from "react";
import logo from "../assets/logo.png";
import "../layout/citizen/Header.css";
import "../layout/homePage/HomePage.css";
import { Link } from "react-router-dom";

const HomePage = () => {
  return (
    <div className="c1">
      {/* ========== HEADER ========== */}
      <header>
        <div className="logo">
          <img src={logo} alt="Rescue Now Logo" />
          <span>
            RESCUE.<div className="a">Now</div>
          </span>
        </div>

        <nav>
          <Link className="nav-btn" to="/introduce">
            Introduce
          </Link>
          <Link className="nav-btn" to="/contact">
            Contact
          </Link>
        </nav>
      </header>

      {/* ========== ROLE MENU ========== */}
      <div className="menu">
        <ul className="role-list">
          <li>
            <Link to="/citizen/request">👤 Citizen</Link>
          </li>
          <li>
            <Link to="/login?role=Coordinator">🎯 Rescue Coordinator</Link>
          </li>
          <li>
            <Link to="/login?role=RescueTeam">🚑 Rescue Team</Link>
          </li>
          <li>
            <Link to="/login?role=Manager">📦 Manager</Link>
          </li>
          <li>
            <Link to="/login?role=Administrator">⚙️ Admin</Link>
          </li>
        </ul>
      </div>

      <div className="footer1">© 2026 Rescue System. All rights reserved.</div>
    </div>
  );
};

export default HomePage;
