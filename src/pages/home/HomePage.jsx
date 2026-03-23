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
            ← Back
          </Button>
        </div>

        <div className="text-center hero-section mb-5">
          <h1 className="hero-title">
            When emergencies strike, help arrives.
          </h1>
          <p className="hero-subtitle mx-auto">
            Smart system connects people, rescue teams and coordinators in
            emergency situations
          </p>
        </div>

        <section className="mb-5">
          <h2 className="section-title text-center mb-4">
            Access the system by role
          </h2>

          <Row className="g-4">
            <Col md={6} lg={3}>
              <Card className="h-100 shadow-sm border-0 text-center role-card">
                <Card.Body className="d-flex flex-column p-4">
                  <div className="role-icon mb-3">🎯</div>
                  <Card.Title className="role-card-title">Coordinator</Card.Title>
                  <Card.Text className="role-card-text flex-grow-1">
                    Assign rescue teams and manage emergency situations
                  </Card.Text>
                  <Link to="/login?role=Coordinator" className="role-login-btn">
                    Login →
                  </Link>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6} lg={3}>
              <Card className="h-100 shadow-sm border-0 text-center role-card">
                <Card.Body className="d-flex flex-column p-4">
                  <div className="role-icon mb-3">🚑</div>
                  <Card.Title className="role-card-title">Rescue Team</Card.Title>
                  <Card.Text className="role-card-text flex-grow-1">
                    Receive tasks, update rescue progress
                  </Card.Text>
                  <Link to="/login?role=RescueTeam" className="role-login-btn">
                    Login →
                  </Link>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6} lg={3}>
              <Card className="h-100 shadow-sm border-0 text-center role-card">
                <Card.Body className="d-flex flex-column p-4">
                  <div className="role-icon mb-3">📦</div>
                  <Card.Title className="role-card-title">Manager</Card.Title>
                  <Card.Text className="role-card-text flex-grow-1">
                    Management of rescue equipment and supplies
                  </Card.Text>
                  <Link to="/login?role=Manager" className="role-login-btn">
                    Login →
                  </Link>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6} lg={3}>
              <Card className="h-100 shadow-sm border-0 text-center role-card">
                <Card.Body className="d-flex flex-column p-4">
                  <div className="role-icon mb-3">⚙️</div>
                  <Card.Title className="role-card-title">Admin</Card.Title>
                  <Card.Text className="role-card-text flex-grow-1">
                    Manage systems, users, and settings
                  </Card.Text>
                  <Link
                    to="/login?role=Administrator"
                    className="role-login-btn"
                  >
                    Login →
                  </Link>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </section>

        <section className="mb-5">
          <h2 className="section-title text-center mb-4">
            Outstanding features
          </h2>

          <Row className="g-4">
            <Col md={6} lg={3}>
              <Card className="h-100 border-0 shadow-sm text-center feature-card">
                <Card.Body className="p-4">
                  <div className="feature-icon mb-3">📍</div>
                  <Card.Title className="feature-card-title">
                    Accurate positioning
                  </Card.Title>
                  <Card.Text className="feature-card-text">
                    Locate the problem with high accuracy
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6} lg={3}>
              <Card className="h-100 border-0 shadow-sm text-center feature-card">
                <Card.Body className="p-4">
                  <div className="feature-icon mb-3">⚡</div>
                  <Card.Title className="feature-card-title">
                    Quick response
                  </Card.Title>
                  <Card.Text className="feature-card-text">
                    Receive and process information in 5 minutes
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6} lg={3}>
              <Card className="h-100 border-0 shadow-sm text-center feature-card">
                <Card.Body className="p-4">
                  <div className="feature-icon mb-3">📱</div>
                  <Card.Title className="feature-card-title">
                    Cross-platform
                  </Card.Title>
                  <Card.Text className="feature-card-text">
                    Access on any mobile device and computer
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6} lg={3}>
              <Card className="h-100 border-0 shadow-sm text-center feature-card">
                <Card.Body className="p-4">
                  <div className="feature-icon mb-3">🔄</div>
                  <Card.Title className="feature-card-title">
                    Real-time updates
                  </Card.Title>
                  <Card.Text className="feature-card-text">
                    Monitor rescue progress in real time
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