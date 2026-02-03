import React from "react";
import { Link } from "react-router-dom";

import Header from "../../components/common/Header";
import "./HomePage.css";

const HomePage = () => {
  return (
    <div className="c1">
      {/* HEADER DÙNG CHUNG */}
      <Header />

      {/* ROLE MENU */}
      <div className="menu">
        <ul className="role-list">
          <li>
            <Link to="/citizen/hero">👤 Citizen</Link>
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

      <div className="footer1">
        © 2026 Rescue System. All rights reserved.
      </div>
    </div>
  );
};

export default HomePage;
