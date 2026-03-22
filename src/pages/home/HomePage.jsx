import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Container, Row, Col, Card, Button } from "react-bootstrap";
import Header from "../../components/common/Header";

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-light min-vh-100 d-flex flex-column">
      <Header />

      <Container className="py-4 flex-grow-1">
        {/* Back button */}
        <Button variant="outline-dark" onClick={() => navigate("/")} className="mb-4">
          ⬅ Back
        </Button>

        {/* Hero section */}
        <div className="text-center mb-5">
          <h1 className="fw-bold display-5">When emergencies strike, help arrives.</h1>
          <p className="text-muted fs-5 mx-auto" style={{ maxWidth: "800px" }}>
            Smart system connects people, rescue teams and coordinators in emergency situations
          </p>
        </div>

        {/* Role section */}
        <section className="mb-5">
          <h2 className="text-center fw-bold mb-4">Access the system by role</h2>

          <Row className="g-4">
            <Col md={6} lg={3}>
              <Card className="h-100 shadow-sm border-0 text-center">
                <Card.Body>
                  <div className="fs-1 mb-3">🎯</div>
                  <Card.Title>Coordinator</Card.Title>
                  <Card.Text>
                    Assign rescue teams and manage emergency situations
                  </Card.Text>
                  <Link to="/login?role=Coordinator" className="btn btn-primary">
                    Login →
                  </Link>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6} lg={3}>
              <Card className="h-100 shadow-sm border-0 text-center">
                <Card.Body>
                  <div className="fs-1 mb-3">🚑</div>
                  <Card.Title>Rescue Team</Card.Title>
                  <Card.Text>
                    Receive tasks, update rescue progress
                  </Card.Text>
                  <Link to="/login?role=RescueTeam" className="btn btn-success">
                    Login →
                  </Link>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6} lg={3}>
              <Card className="h-100 shadow-sm border-0 text-center">
                <Card.Body>
                  <div className="fs-1 mb-3">📦</div>
                  <Card.Title>Manager</Card.Title>
                  <Card.Text>
                    Management of rescue equipment and supplies
                  </Card.Text>
                  <Link to="/login?role=Manager" className="btn btn-warning">
                    Login →
                  </Link>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6} lg={3}>
              <Card className="h-100 shadow-sm border-0 text-center">
                <Card.Body>
                  <div className="fs-1 mb-3">⚙️</div>
                  <Card.Title>Admin</Card.Title>
                  <Card.Text>
                    Manage systems, users, and settings
                  </Card.Text>
                  <Link to="/login?role=Administrator" className="btn btn-danger">
                    Login →
                  </Link>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </section>

        {/* Features section */}
        <section className="mb-5">
          <h2 className="text-center fw-bold mb-4">Outstanding features</h2>

          <Row className="g-4">
            <Col md={6} lg={3}>
              <Card className="h-100 border-0 shadow-sm text-center">
                <Card.Body>
                  <div className="fs-1 mb-3">📍</div>
                  <Card.Title>Accurate positioning</Card.Title>
                  <Card.Text>Locate the problem with high accuracy</Card.Text>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6} lg={3}>
              <Card className="h-100 border-0 shadow-sm text-center">
                <Card.Body>
                  <div className="fs-1 mb-3">⚡</div>
                  <Card.Title>Quick response</Card.Title>
                  <Card.Text>Receive and process information in 5 minutes</Card.Text>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6} lg={3}>
              <Card className="h-100 border-0 shadow-sm text-center">
                <Card.Body>
                  <div className="fs-1 mb-3">📱</div>
                  <Card.Title>Cross-platform</Card.Title>
                  <Card.Text>Access on any mobile device and computer</Card.Text>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6} lg={3}>
              <Card className="h-100 border-0 shadow-sm text-center">
                <Card.Body>
                  <div className="fs-1 mb-3">🔄</div>
                  <Card.Title>Real-time updates</Card.Title>
                  <Card.Text>Monitor rescue progress in real time</Card.Text>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </section>
      </Container>

      {/* Footer */}
      <footer className="bg-dark text-white py-4 mt-auto">
        <Container>
          <Row className="g-4">
            <Col md={4}>
              <h5>Emergency Rescue System</h5>
              <p className="mb-0">
                Smart rescue connection,
                <br />
                fast and effective
              </p>
            </Col>

            <Col md={4}>
              <h5>Contact</h5>
              <p className="mb-1">Email: rescue@gmail.com</p>
              <p className="mb-0">Hotline: 0901 234 567</p>
            </Col>

            <Col md={4}>
              <h5>Support</h5>
              <div className="d-flex flex-column">
                <Link to="/guide" className="text-white text-decoration-none mb-1">
                  Instructions for use
                </Link>
                <Link to="/faq" className="text-white text-decoration-none mb-1">
                  Frequently asked questions
                </Link>
                <Link to="/contact" className="text-white text-decoration-none">
                  Contact support
                </Link>
              </div>
            </Col>
          </Row>

          <hr className="border-light" />
          <div className="text-center">© 2026 Rescue System. All rights reserved.</div>
        </Container>
      </footer>
    </div>
  );
};

export default HomePage;