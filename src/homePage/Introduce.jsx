
import Header from "../components/citizen/Header";
import { useNavigate } from "react-router-dom";
import beai from "../assets/user1.jpg";
import gialuan from "../assets/user2.jpg";
import quochuy from "../assets/user3.jpg";
import minh from "../assets/user4.jpg";
import hoanghuy from "../assets/user5.jpg";

import "../layout/homePage/Introduce.css";
const Introduce = () => {
  const navigate = useNavigate();
  return (
    <div>
      <Header />
      <div className="intro-page">
        <button className="back-btn1" onClick={() => navigate("/homePage")}>
          ⬅ Back
        </button>
        <section className="hp-intro">
          <h4>Introduce the RESCUE system</h4>
          <p>Rescue coordination and emergency support system</p>
        </section>

        <div className="ngang"></div>

        <div className="content1">
          <h7>Who are we ?</h7>
          <p>
            <strong>RESCUE</strong> is an emergency rescue coordination support system
            level, helping connect people with rescue teams, coordinators and
            supply unit in natural disaster, accident and emergency situations.
          </p>
        </div>

        <div className="ngang"></div>
        <div className="content2">
          <h7>Mission</h7>
          <p>
            Providing quick, accurate and effective rescue solutions, contributing
            minimizing damage to people and property.
          </p>
        </div>

        <div className="ngang"></div>
        <div className="content3">
          <h7>Main feature</h7>
          <ul>
            <li>📨 Send a rescue request quickly</li>
            <li>📍 Locate the problem location</li>
            <li>🚑 Coordinate appropriate rescue teams</li>
            <li>📊 Manage and monitor rescue status</li>
          </ul>
        </div>
        <div className="ngang"></div>

        <section className="content4">
          <h7>Reason for choosing</h7>
          <div className="card">
            <h3>⚡ Quickly</h3>
            <p> - Handle rescue requests in the shortest time.</p>
          </div>
          <div className="card">
            <h3>🤝 Connect</h3>
            <p> - Connecting people with rescue forces.</p>
          </div>
          <div className="card">
            <h3>🔒 Safe</h3>
            <p> - Secure user information.</p>
          </div>
        </section>

        <div className="ngang"></div>

        <div className="content5">
          <h7>Development team</h7>

          <div className="team-list">
            <div className="tren">
              <a
                href="https://www.facebook.com/beaimini"
                target="_blank"
                rel="noopener noreferrer"
                className="team-card"
              >
                <img src={beai} alt="Member 1" />
                <div className="content6">
                  <h8>Đặng Hoàng Trúc Vy</h8>
                  <p>Frontend Developer</p>
               
                </div>
              </a>

              <a
                href="https://www.facebook.com/gia.luan.luong.2024"
                target="_blank"
                rel="noopener noreferrer"
                className="team-card"
              >
                <img src={gialuan} alt="Member 2" />
                <div className="content6">
                  <h8>Lương Gia Luân</h8>
                  <p>Backend Developer</p>
                </div>
              </a>

              <a
                href="https://www.facebook.com/quochuy.chung.33"
                target="_blank"
                rel="noopener noreferrer"
                className="team-card"
              >
                <img src={quochuy} alt="Member 3" />
                <div className="content6">
                  <h8>Chung Quốc Huy</h8>
                  <p>Database</p>
                </div>
              </a>
            </div>

            <div className="duoi">
              <a
                href="https://www.facebook.com/minh.truong.676136?mibextid=wwXIfr&rdid=sZ8elDhKGd8VEI4z&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2F1DeoNLWmYd%2F%3Fmibextid%3DwwXIfr"
                target="_blank"
                rel="noopener noreferrer"
                className="team-card"
              >
                <img src={minh} alt="Member 4" />
                <div className="content6">
                  <h8>Trương Trần Anh Minh</h8>
                  <p>UI / UX</p>
                </div>
              </a>

              <a
                href="https://www.facebook.com/huy.hoang.le.487691"
                target="_blank"
                rel="noopener noreferrer"
                className="team-card"
              >
                <img src={hoanghuy} alt="Member 5" />
                <div className="content6">
                  <h8>Lê Hoàng Huy</h8>
                  <p>Backend Developer</p>
                </div>
              </a>
            </div>
          </div>
        </div>

        <div className="footer">© 2026 Rescue System. All rights reserved.</div>
      </div>
    </div>
  );
};

export default Introduce;
