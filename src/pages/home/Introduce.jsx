import React from "react";
import { useNavigate } from "react-router-dom";
import { Container, Card, Button } from "react-bootstrap";
import { FaAmbulance, FaMapMarkerAlt } from "react-icons/fa";
import "./Introduce.css";
import Header from "../../components/common/Header";

import beai from "../../assets/images/user1.jpg";
import gialuan from "../../assets/images/user2.jpg";
import quochuy from "../../assets/images/user3.jpg";
import minh from "../../assets/images/user4.jpg";
import hoanghuy from "../../assets/images/user5.jpg";

const Introduce = () => {
  const navigate = useNavigate();

  const teamMembers = [
    { img: beai, name: "Đặng Hoàng Trúc Vy", role: "Frontend - UI/UX Lead" },
    {
      img: minh,
      name: "Trương Trần Anh Minh",
      role: "Frontend - API integration Lead",
    },
    { img: gialuan, name: "Lương Gia Luân", role: "Backend - Xách nước" },
    {
      img: quochuy,
      name: "Chung Quốc Huy",
      role: "Backend - All",
    },
    { img: hoanghuy, name: "Lê Hoàng Huy", role: "Backend - Bổ cam" },
  ];

  return (
    <>
    <Header />
    <div className="intro-bg">
      
      <Container fluid className="py-4">
        <Card className="intro-card shadow-sm">
          <div className="top-bar">
            <Button
              variant="light"
              className="back-button"
              onClick={() => navigate("/")}
            >
              ← Back
            </Button>
          </div>

          <div className="intro-content">
            <div className="text-center intro-header">
              <h2 className="intro-title">Introducing the RESCUE System</h2>
              <p className="intro-subtitle">
                Emergency rescue and support coordination system
              </p>
            </div>

            <hr />

            <section className="content-section">
              <h4>Who are we?</h4>
              <p>
                <strong style={{ color: "black" }}>RESCUE</strong> is an
                emergency rescue coordination support system, helping to connect
                people with rescue teams quickly and effectively.
              </p>
            </section>

            <hr />

            <section className="content-section">
              <h4>Mission</h4>
              <p>Providing fast, accurate, and effective rescue solutions.</p>
            </section>

            <hr />

            <section className="content-section">
              <h4>Main Features</h4>
              <div className="feature-grid">
                <div className="feature-item">
                  <div className="feature-icon">📨</div>
                  <p>Send a rescue request quickly</p>
                </div>

                <div className="feature-item">
                  <div className="feature-icon">📍</div>
                  <p>Locate the incident</p>
                </div>

                <div className="feature-item">
                  <div className="feature-icon">🚑</div>
                  <p>Coordinate rescue teams</p>
                </div>

                <div className="feature-item">
                  <div className="feature-icon">📊</div>
                  <p>Monitor rescue status</p>
                </div>
              </div>
            </section>

            <hr />

            <section className="team-section text-center">
              <h3 className="team-title">Development Team</h3>

              <div className="team-row">
                {teamMembers.map((member, index) => (
                  <div className="team-item" key={index}>
                    <img
                      src={member.img}
                      alt={member.name}
                      className="team-img"
                    />
                    <h5>{member.name}</h5>
                    <p>{member.role}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </Card>
      </Container>
    </div>
    </>
  );
};

export default Introduce;
