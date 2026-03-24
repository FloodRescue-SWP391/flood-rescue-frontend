import { useNavigate } from "react-router-dom";
import "./Hero.css";
import Header from "../../../components/common/Header";
import { useState, useEffect } from "react";
import { trackRescueRequest } from "../../../services/rescueRequestService";
import Footer from "../../../components/common/Footer";
const Hero = () => {
  const navigate = useNavigate();

  {
    /* handleRequestRescue sẽ dùng khi deploy được ứng dụng. */
  }
  const handleRequestRescue = async () => {
    const savedCode = localStorage.getItem("lastShortCode");

    if (!savedCode) {
      navigate("/citizen/request");
      return;
    }

    try {
      const res = await trackRescueRequest(savedCode);
      const dto = res?.content;
      const status = (dto?.status || "").toLowerCase();

      const activeStatuses = ["pending", "processing"];
      const doneStatuses = ["completed", "delivered", "cancelled", "rejected"];

      if (activeStatuses.includes(status)) {
        navigate(`/citizen/request-status?code=${savedCode}`);
        return;
      }

      if (doneStatuses.includes(status)) {
        localStorage.removeItem("lastShortCode");
        localStorage.removeItem("lastRequestData");
        localStorage.removeItem("lastRescueTeamData");
        navigate("/citizen/request");
        return;
      }

      navigate("/citizen/request");
    } catch (error) {
      console.error("Failed to check active rescue request:", error);
      navigate("/citizen/request");
    }
  };

  return (
    <>
      {/* ===== HEADER ===== */}
      <Header />

      {/* ===== HERO SECTION ===== */}

      <section className="hero">
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-headline">
              <span className="line1">CỨU HỘ</span>
              <span className="line2">KHÔNG</span>
              <span className="line3">THỂ CHỜ!</span>
            </h1>

            <p className="hero-network">
              Mạng lưới cứu hộ khẩn cấp 24/7. <br></br>
              Kết nối bạn ngay lập tức với đội cứu hộ gần nhất!
            </p>

            <button
              className="hero-cta-btn"
              onClick={() => navigate("/citizen/request")}
            >
              <span className="btn-icon-1">⚠️</span>
              <span className="btn-text">YÊU CẦU CỨU HỘ NGAY!</span>
            </button>
          </div>

          {/* Stats Section */}
          <div className="hero-stats">
            <div className="stat-item">
              <div className="stat-number1">05'</div>
              <div className="stat-label">THỜI GIAN PHẢN HỒI TRUNG BÌNH</div>
            </div>

            <div className="stat-divider"></div>

            <div className="stat-item">
              <div className="stat-number1">1.2K+</div>
              <div className="stat-label">ĐỘI CỨU HỘ SẴN SÀNG</div>
            </div>

            <div className="stat-divider"></div>

            <div className="stat-item">
              <div className="stat-number1">99.9%</div>
              <div className="stat-label">TỶ LỆ CỨU HỘ THÀNH CÔNG</div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
};

export default Hero;
