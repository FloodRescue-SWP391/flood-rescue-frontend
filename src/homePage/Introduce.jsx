import React from "react";

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
        <div className="ngang"></div>
        <section className="hp-intro">
          <h4>Giới thiệu hệ thống RESCUE</h4>
          <p>Hệ thống điều phối cứu hộ và hỗ trợ khẩn cấp</p>
        </section>

        <div className="ngang"></div>

        <div className="content1">
          <h7>Chúng tôi là ai ?</h7>
          <p>
            <strong>RESCUE</strong> là hệ thống hỗ trợ điều phối cứu hộ khẩn
            cấp, giúp kết nối người dân với các đội cứu hộ, điều phối viên và
            đơn vị tiếp tế trong các tình huống thiên tai, tai nạn và khẩn cấp.
          </p>
        </div>

        <div className="ngang"></div>
        <div className="content2">
          <h7>Sứ mệnh</h7>
          <p>
            Cung cấp giải pháp cứu hộ nhanh chóng, chính xác và hiệu quả, góp
            phần giảm thiểu thiệt hại về người và tài sản.
          </p>
        </div>

        <div className="ngang"></div>
        <div className="content3">
          <h7>Tính năng chính</h7>
          <ul>
            <li>📨 Gửi yêu cầu cứu hộ nhanh chóng</li>
            <li>📍 Định vị vị trí sự cố</li>
            <li>🚑 Điều phối đội cứu hộ phù hợp</li>
            <li>📊 Quản lý và theo dõi trạng thái cứu hộ</li>
          </ul>
        </div>
        <div className="ngang"></div>

        <section className="content4">
          <h7>Lý do chọn</h7>
          <div className="card">
            <h3>⚡ Nhanh chóng</h3>
            <p> - Xử lý yêu cầu cứu hộ trong thời gian ngắn nhất.</p>
          </div>
          <div className="card">
            <h3>🤝 Kết nối</h3>
            <p> - Kết nối người dân với các lực lượng cứu hộ.</p>
          </div>
          <div className="card">
            <h3>🔒 An toàn</h3>
            <p> - Bảo mật thông tin người dùng.</p>
          </div>
        </section>

        <div className="ngang"></div>

        <div className="content5">
          <h7>Đội ngũ phát triển</h7>

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
