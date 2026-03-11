import React from "react";
import { Link, useNavigate } from "react-router-dom";

import Header from "../../components/common/Header";
import "./Introduce.css";

import beai from "../../assets/images/user1.jpg";
import gialuan from "../../assets/images/user2.jpg";
import quochuy from "../../assets/images/user3.jpg";
import minh from "../../assets/images/user4.jpg";
import hoanghuy from "../../assets/images/user5.jpg";

const Introduce = () => {
  const navigate = useNavigate();

  return (
    <div>
      <Header />

      <div className="intro-page">
        <button className="back-btn1" onClick={() => navigate("/")}>
          ⬅ Back
        </button>

        <section className="hp-intro">
          <h4>Introducing the RESCUE system</h4>
          <p>Emergency rescue and support coordination system</p>
        </section>

        <div className="ngang"></div>

        <div className="content1">
          <h7>Who are we ?</h7>
          <p>
            <strong>RESCUE</strong> is an emergency rescue coordination
            support system, helping to connect people with rescue teams.
          </p>
        </div>

        <div className="ngang"></div>

        <div className="content2">
          <h7>Mission</h7>
          <p>Providing fast, accurate, and effective rescue solutions.</p>
        </div>

        <div className="ngang"></div>

        <div className="content3">
          <h7>Main features</h7>
          <ul>
            <li>📨 Send a rescue request quickly.</li>
            <li>📍 Locate the incident</li>
            <li>🚑 Coordinate rescue team</li>
            <li>📊 Monitor rescue status</li>
          </ul>
        </div>

        <div className="ngang"></div>

        <div className="content5">
          <p className="dep">Development team</p>

          <div className="team-list">
            {[
              {
                img: beai,
                name: "Đặng Hoàng Trúc Vy",
                role: "Frontend + UI/UX Lead",
              },
              {
                img: minh,
                name: "Trương Trần Anh Minh",
                role: "Frontend + API integration",
              },
              {
                img: gialuan,
                name: "Lương Gia Luân",
                role: "Backend - Core API",
              },
              {
                img: quochuy,
                name: "Chung Quốc Huy",
                role: "Backend - Database Engineer",
              },

              {
                img: hoanghuy,
                name: "Lê Hoàng Huy",
                role: "Backend - System logic",
              },
            ].map((m, i) => (
              <div className="team-card" key={i}>
                <img src={m.img} alt={m.name} />
                <div className="content6">
                  <h8>{m.name}</h8>
                  <p className="role">{m.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        
      </div>

      <footer className="homepage-footer">
          <div className="footer-content">
            <div className="footer-section">
              <h3>Emergency Rescue System</h3>
              <p>
                Smart rescue connection,
                <br />
                fast and effective
              </p>
            </div>
            <div className="footer-section">
              <h3>Contact</h3>
              <p>Email: rescue@gmail.com</p>
              <p>Hotline: 0965 782 358</p>
            </div>
            <div className="footer-section">
              <h3>Support</h3>
              <Link to="/guide">Instructions for use</Link>
              <Link to="/faq">Frequently asked questions</Link>
              <Link to="/contact">Contact support</Link>
            </div>
          </div>
          <div className="footer-bottom">
            © 2026 Rescue System. All rights reserved.
          </div>
        </footer>
    </div>
  );
};

export default Introduce;
