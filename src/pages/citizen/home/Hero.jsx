import { useNavigate } from "react-router-dom";
import "./Hero.css";
import Header from "../../../components/common/Header";
import { useState, useEffect } from "react";
import { trackRescueRequest } from "../../../services/rescueRequestService";
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
              <span className="line1">RESCUE</span>
              <span className="line2">CAN'T</span>
              <span className="line3">WAIT!</span>
            </h1>

            <p className="hero-network">
              24/7 emergency rescue network. <br></br>
              Instantly connecting you with the nearest rescue team!
            </p>

            {/* onClick={handleRequestRescue}  để thay dòng onClick={() => navigate("/citizen/request")} */}
            <button
              className="hero-cta-btn"
              onClick={() => navigate("/citizen/request")}
            >
              <span className="btn-icon-1">⚠️</span>
              <span className="btn-text">REQUEST RESCUE NOW!</span>
            </button>
          </div>

          {/* Stats Section */}
          <div className="hero-stats">
            <div className="stat-item">
              <div className="stat-number1">05'</div>
              <div className="stat-label">AVERAGE RESPONSE TIME</div>
            </div>

            <div className="stat-divider"></div>

            <div className="stat-item">
              <div className="stat-number1">1.2K+</div>
              <div className="stat-label">RESCUE TEAMS READY</div>
            </div>

            <div className="stat-divider"></div>

            <div className="stat-item">
              <div className="stat-number1">99.9%</div>
              <div className="stat-label">SUCCESSFUL RESCUE RATE</div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Hero;
