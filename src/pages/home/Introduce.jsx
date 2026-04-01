import React from "react";
import { useNavigate } from "react-router-dom";
import { Container, Card, Button } from "react-bootstrap";
import { FaAmbulance, FaMapMarkerAlt } from "react-icons/fa";
import "./Introduce.css";
import Header from "../../components/common/Header";
import Footer from "../../components/common/Footer";

import beai from "../../assets/images/user1.jpg";
import gialuan from "../../assets/images/user2.jpg";
import quochuy from "../../assets/images/user3.jpg";
import minh from "../../assets/images/user4.jpg";
import hoanghuy from "../../assets/images/user5.jpg";

const Introduce = () => {
  const navigate = useNavigate();

  const teamMembers = [
    {
      img: beai,
      name: "Đặng Hoàng Trúc Vy",
      role: "Frontend - UI/UX Lead",
    },
    {
      img: minh,
      name: "Trương Trần Anh Minh",
      role: "Frontend - API integration Lead",
    },
    { img: gialuan, name: "Lương Gia Luân", role: "Backend - API Developer" },
    {
      img: quochuy,
      name: "Chung Quốc Huy",
      role: "Backend - DevOps Lead",
    },
    { img: hoanghuy, name: "Lê Hoàng Huy", role: "Backend - API Developer" },
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
                className="back-button1"
                onClick={() => navigate("/")}
              >
                Quay lại
              </Button>
            </div>

            <div className="intro-content">
              <div className="text-center intro-header">
                <h2 className="intro-title">Giới thiệu hệ thống RESCUE</h2>
                <p className="intro-subtitle">
                  Hệ thống điều phối cứu hộ và hỗ trợ khẩn cấp
                </p>
              </div>

              <hr />

              <section className="content-section">
                <h4>Chúng tôi là ai?</h4>
                <p>
                  <strong style={{ color: "black" }}>RESCUE</strong> là một hệ
                  thống hỗ trợ điều phối cứu hộ khẩn cấp, giúp kết nối người dân
                  với các đội cứu hộ một cách nhanh chóng và hiệu quả.
                </p>
              </section>

              <hr />

              <section className="content-section">
                <h4>Sứ mệnh</h4>
                <p>
                  Cung cấp giải pháp cứu hộ nhanh chóng, chính xác và hiệu quả.
                </p>
              </section>

              <hr />

              <section className="content-section">
                <h4>Tính năng chính</h4>
                <div className="feature-grid">
                  <div className="feature-item">
                    <div className="feature-icon2">📨</div>
                    <p>Gửi yêu cầu cứu hộ nhanh chóng</p>
                  </div>

                  <div className="feature-item">
                    <div className="feature-icon2">📍</div>
                    <p>Định vị vị trí sự cố</p>
                  </div>

                  <div className="feature-item">
                    <div className="feature-icon2">🚑</div>
                    <p>Điều phối đội cứu hộ</p>
                  </div>

                  <div className="feature-item">
                    <div className="feature-icon2">📊</div>
                    <p>Theo dõi trạng thái cứu hộ</p>
                  </div>
                </div>
              </section>

              <hr />

              <section className="team-section text-center">
                <h3 className="team-title">Đội ngũ phát triển</h3>

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
        <Footer />
      </div>
    </>
  );
};

export default Introduce;
