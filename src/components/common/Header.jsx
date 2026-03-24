import React from "react";
import logo from "../../assets/images/logo.png";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Navbar, Container, Nav, Button } from "react-bootstrap";
import "./Header.css";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const showLogin = location.pathname === "/";

  return (
    <>
      <div className="topbar py-2">
        <div className="marquee">
          <div
            className="marquee-content"
            style={{ color: "red", fontSize: "25px", fontWeight: "bold" }}
          >
            🔔 Hỗ trợ khẩn cấp 24/7 | ⏱️ Phản hồi trong vòng 5 phút | 🚑 Hệ
            thống cứu hộ lũ lụt | 🛡️ Phản hồi an toàn và nhanh chóng
          </div>
        </div>
      </div>

      <Navbar expand="lg" className="main-navbar">
        <Container fluid className="px-3 px-lg-5">
          <Navbar.Brand
            as={Link}
            to="/"
            className="d-flex align-items-center brand-logo"
          >
            <img src={logo} alt="Rescue Now Logo" className="logo-img me-2" />
            <span className="brand-text">
              RESCUE<strong style={{ color: "orangered" }}>.</strong>NOW
            </span>
          </Navbar.Brand>

          <Navbar.Toggle aria-controls="main-navbar-nav" />

          <Navbar.Collapse id="main-navbar-nav">
            <Nav className="ms-auto d-flex align-items-center gap-4">
              <Nav.Link as={Link} to="/introduce" className="nav-link-custom">
                Giới thiệu
              </Nav.Link>

              <Nav.Link as={Link} to="/contact" className="nav-link-custom">
                Liên hệ
              </Nav.Link>

              {showLogin && (
                <Button
                  variant="none"
                  className="login-btn"
                  onClick={() => navigate("/home")}
                >
                  Đăng nhập
                </Button>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </>
  );
};

export default Header;
