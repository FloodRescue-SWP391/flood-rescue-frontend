import React from "react";
import { Link } from "react-router-dom";
import Header from "../../components/common/Header";
import "./HomePage.css";

const HomePage = () => {
  return (
    <div className="homepage-container">
      <Header />

          <p className="a">
            Smart system connects people, rescue teams and coordinators in emergency situations
          </p>
     

      {/* ROLE SELECTION SECTION */}
      <section className="role-section">
        <h2 className="section-title">Access the system by role</h2>
    
        <div className="role-grid">
          <div className="role-card">
            <div className="role-icon">👤</div>
            <h3 className="role-title">Citizen</h3>
            <p className="role-description">Report incidents, request rescue, track progress</p>
            <Link to="/citizen/hero" className="role-link">Access now →</Link>
          </div>
          
          <div className="role-card">
            <div className="role-icon">🎯</div>
            <h3 className="role-title">Coordinator</h3>
            <p className="role-description">Assign rescue teams and manage emergency situations</p>
            <Link to="/login?role=Coordinator" className="role-link">Login →</Link>
          </div>
          
          <div className="role-card">
            <div className="role-icon">🚑</div>
            <h3 className="role-title">Rescue Team</h3>
            <p className="role-description">Receive tasks, update rescue progress</p>
            <Link to="/login?role=RescueTeam" className="role-link">Login →</Link>
          </div>
          
          <div className="role-card">
            <div className="role-icon">📦</div>
            <h3 className="role-title">Manager</h3>
            <p className="role-description">Management of rescue equipment and supplies</p>
            <Link to="/login?role=Manager" className="role-link">Login →</Link>
          </div>
          
          <div className="role-card">
            <div className="role-icon">⚙️</div>
            <h3 className="role-title">Admin</h3>
            <p className="role-description">Manage systems, users, and settings</p>
            <Link to="/login?role=Administrator" className="role-link">Login →</Link>
          </div>
        
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="features-section">
        <h2 className="section-title">Outstanding features</h2>
        <div className="features-grid">
          <div className="feature-item">
            <div className="feature-icon">📍</div>
            <h3>Accurate positioning</h3>
            <p>Locate the problem with high accuracy</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">⚡</div>
            <h3>Quick response</h3>
            <p>Receive and process information in 5 minutes</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">📱</div>
            <h3>Cross-platform</h3>
            <p>Access on any mobile device and computer</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">🔄</div>
            <h3>Real-time updates</h3>
            <p>Monitor rescue progress in real time</p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="homepage-footer">
        <div className="footer-content">
          <div className="footer-section">
            <h3>Emergency Rescue System</h3>
            <p>Smart rescue connection, 
              <br />
              fast and effective</p>
          </div>
          <div className="footer-section">
            <h3>Contact</h3>
            <p>Email: rescue@gmail.com</p>
            <p>Hotline: 0901 234 567</p>
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

export default HomePage;