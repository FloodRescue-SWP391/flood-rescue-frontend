import { useNavigate } from "react-router-dom";
import "./Hero.css";
import Header from "../../../components/common/Header";
import { useState, useEffect } from "react";

const Hero = () => {
  const navigate = useNavigate();
  const [typedText, setTypedText] = useState("");
  const [textIndex, setTextIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const texts = [
    "Emergency Rescue System",
    "24/7 Rescue Service",
    "Immediate Response",
    "Your Safety Matters"
  ];

  useEffect(() => {
    const currentText = texts[textIndex];
    const typeSpeed = isDeleting ? 50 : 100;
    const pauseTime = 1500;

    const timeout = setTimeout(() => {
      if (!isDeleting && charIndex < currentText.length) {
        setTypedText(currentText.substring(0, charIndex + 1));
        setCharIndex(charIndex + 1);
      } else if (!isDeleting && charIndex === currentText.length) {
        setTimeout(() => setIsDeleting(true), pauseTime);
      } else if (isDeleting && charIndex > 0) {
        setTypedText(currentText.substring(0, charIndex - 1));
        setCharIndex(charIndex - 1);
      } else {
        setIsDeleting(false);
        setTextIndex((textIndex + 1) % texts.length);
      }
    }, typeSpeed);

    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, textIndex, texts]);

  return (
    <>
      {/* ===== HEADER ===== */}
      <Header />

      {/* ===== HERO SECTION ===== */}
      <section className="hero">
        {/* Animated Background */}
        <div className="hero-background">
          <div className="pulse-circle"></div>
          <div className="pulse-circle delay-1"></div>
          <div className="pulse-circle delay-2"></div>
        </div>

        <div className="hero-container">
          <div className="hero-content">
            {/* Emergency Badge */}
            <div className="emergency-badge">
              <span className="badge-icon">🚨</span>
              <span className="badge-text">24/7 EMERGENCY SERVICE</span>
            </div>

            {/* Animated Typing Title */}
            <h1 className="hero-title">
              <span className="typed-text">{typedText}</span>
              <span className="cursor">|</span>
            </h1>

            {/* Subtitle */}
            <p className="hero-subtitle">
              When seconds count, our rapid response teams are ready to help.
              Professional emergency assistance at your fingertips.
            </p>

            {/* Stats */}
            <div className="hero-stats">
              <div className="stat-item">
                <div className="stat-number">24/7</div>
                <div className="stat-label">Availability</div>
              </div>
              <div className="stat-divider">•</div>
              <div className="stat-item">
                <div className="stat-number">5min</div>
                <div className="stat-label">Avg Response Time</div>
              </div>
              <div className="stat-divider">•</div>
              <div className="stat-item">
                <div className="stat-number">99%</div>
                <div className="stat-label">Success Rate</div>
              </div>
            </div>

            {/* Main CTA Button */}
            <button
              className="hero-btn"
              onClick={() => navigate("/citizen/request")}
            >
              <span className="btn-icon">🚨</span>
              <span className="btn-text">Request Emergency Rescue</span>
            </button>

            {/* Secondary Options */}
            <div className="hero-secondary-actions">
              <button 
                className="secondary-btn"
                onClick={() => navigate("/contact")}
              >
                <span className="secondary-icon">📞</span>
                <span>Contact Emergency Hotline</span>
              </button>
              <button 
                className="secondary-btn"
                onClick={() => navigate("/introduce")}
              >
                <span className="secondary-icon">ℹ️</span>
                <span>Learn About Our Services</span>
              </button>
            </div>
          </div>

          {/* Hero Illustration */}
          <div className="hero-illustration">
            <div className="rescue-icon">🚑</div>
            <div className="location-pin">📍</div>
            <div className="team-icon">👨‍🚒</div>
            <div className="signal-icon">📶</div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="scroll-indicator">
          <div className="mouse">
            <div className="wheel"></div>
          </div>
          <div className="arrow">↓</div>
        </div>
      </section>
    </>
  );
};

export default Hero;