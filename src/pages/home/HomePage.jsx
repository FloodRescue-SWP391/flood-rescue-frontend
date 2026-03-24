import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Container, Row, Col, Card, Button } from "react-bootstrap";
import Header from "../../components/common/Header";
import Footer from "../../components/common/Footer";
import "./HomePage.css";

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="role-page min-vh-100 d-flex flex-column">
      <Header />

      <Container className="py-4 py-lg-5 flex-grow-1">
        <div className="top-bar-role mb-4">
          <Button
            variant="light"
            className="back-button"
            onClick={() => navigate("/")}
          >
            ← Quay lại
          </Button>
        </div>

        <div className="text-center hero-section mb-5">
          <h1 className="hero-title">
            Khi khẩn cấp xảy ra, sự trợ giúp sẽ đến.
          </h1>
          <p className="hero-subtitle mx-auto">
            Hệ thống thông minh kết nối người dân, đội cứu hộ và điều phối viên
            trong các tình huống khẩn cấp
          </p>
        </div>

        <section className="mb-5">
          <h2 className="section-title text-center mb-4">
            Truy cập hệ thống theo vai trò
          </h2>

          <Row className="g-4">
            <Col md={6} lg={3}>
              <Card className="h-100 shadow-sm border-0 text-center role-card">
                <Card.Body className="d-flex flex-column p-4">
                  <div className="role-icon mb-3">🎯</div>
                  <Card.Title className="role-card-title">
                    Điều phối viên
                  </Card.Title>
                  <Card.Text className="role-card-text flex-grow-1">
                    Phân công đội cứu hộ và quản lý các tình huống khẩn cấp
                  </Card.Text>
                  <Link to="/login?role=Coordinator" className="role-login-btn">
                    Đăng nhập →
                  </Link>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6} lg={3}>
              <Card className="h-100 shadow-sm border-0 text-center role-card">
                <Card.Body className="d-flex flex-column p-4">
                  <div className="role-icon mb-3">🚑</div>
                  <Card.Title className="role-card-title">
                    Đội cứu hộ
                  </Card.Title>
                  <Card.Text className="role-card-text flex-grow-1">
                    Nhận nhiệm vụ, cập nhật tiến độ cứu hộ
                  </Card.Text>
                  <Link to="/login?role=RescueTeam" className="role-login-btn">
                    Đăng nhập →
                  </Link>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6} lg={3}>
              <Card className="h-100 shadow-sm border-0 text-center role-card">
                <Card.Body className="d-flex flex-column p-4">
                  <div className="role-icon mb-3">📦</div>
                  <Card.Title className="role-card-title">Quản lý</Card.Title>
                  <Card.Text className="role-card-text flex-grow-1">
                    Quản lý trang thiết bị và hàng cứu trợ
                  </Card.Text>
                  <Link to="/login?role=Manager" className="role-login-btn">
                    Đăng nhập →
                  </Link>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6} lg={3}>
              <Card className="h-100 shadow-sm border-0 text-center role-card">
                <Card.Body className="d-flex flex-column p-4">
                  <div className="role-icon mb-3">⚙️</div>
                  <Card.Title className="role-card-title">
                    Quản trị viên
                  </Card.Title>
                  <Card.Text className="role-card-text flex-grow-1">
                    Quản lý hệ thống, người dùng và cấu hình
                  </Card.Text>
                  <Link
                    to="/login?role=Administrator"
                    className="role-login-btn"
                  >
                    Đăng nhập →
                  </Link>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </section>

        <section className="mb-5">
          <h2 className="section-title text-center mb-4">Tính năng nổi bật</h2>

          <Row className="g-4">
            <Col md={6} lg={3}>
              <Card className="h-100 border-0 shadow-sm text-center feature-card">
                <Card.Body className="p-4">
                  <div className="feature-icon mb-3">📍</div>
                  <Card.Title className="feature-card-title">
                    Định vị chính xác
                  </Card.Title>
                  <Card.Text className="feature-card-text">
                    Xác định vị trí sự cố với độ chính xác cao
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6} lg={3}>
              <Card className="h-100 border-0 shadow-sm text-center feature-card">
                <Card.Body className="p-4">
                  <div className="feature-icon mb-3">⚡</div>
                  <Card.Title className="feature-card-title">
                    Phản hồi nhanh
                  </Card.Title>
                  <Card.Text className="feature-card-text">
                    Tiếp nhận và xử lý thông tin trong vòng 5 phút
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6} lg={3}>
              <Card className="h-100 border-0 shadow-sm text-center feature-card">
                <Card.Body className="p-4">
                  <div className="feature-icon mb-3">📱</div>
                  <Card.Title className="feature-card-title">
                    Đa nền tảng
                  </Card.Title>
                  <Card.Text className="feature-card-text">
                    Truy cập trên mọi thiết bị di động và máy tính
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6} lg={3}>
              <Card className="h-100 border-0 shadow-sm text-center feature-card">
                <Card.Body className="p-4">
                  <div className="feature-icon mb-3">🔄</div>
                  <Card.Title className="feature-card-title">
                    Cập nhật thời gian thực
                  </Card.Title>
                  <Card.Text className="feature-card-text">
                    Theo dõi tiến độ cứu hộ theo thời gian thực
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </section>
      </Container>

      <Footer />
    </div>
  );
};

export default HomePage;
