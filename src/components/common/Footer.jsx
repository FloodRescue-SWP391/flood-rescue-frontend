import React from "react";
import { Container, Row, Col } from "react-bootstrap";
import { Link } from "react-router-dom";
import "./Footer.css";

const Footer = () => {
  return (
    <footer className="footer">
      <Container>
        <Row className="gy-4 footer-content">
          {/* Brand */}
          <Col md={4}>
            <h5 className="footer-logo">
              RESCUE<span>.</span>NOW
            </h5>
            <p className="footer-desc">
              Hệ thống kết nối khẩn cấp nhanh chóng, <br />
              an toàn và đáng tin cậy.
            </p>
          </Col>

          {/* Contact */}
          <Col md={4}>
            <h5 className="footer-title">Liên hệ</h5>
            <p className="footer-item">📧 rescue@gmail.com</p>
            <p className="footer-item">📞 0965 782 358</p>
          </Col>

          {/* Support */}
          <Col md={4}>
            <h5 className="footer-title">Hỗ trợ</h5>
            <div className="footer-links">
              <Link to="/introduce">Giới thiệu</Link>
              <Link to="/contact">Liên hệ</Link>
            </div>
          </Col>
        </Row>

        <hr className="footer-line" />

        <div className="footer-bottom text-center">
          © 2026 RESCUE.NOW. All rights reserved.
        </div>
      </Container>
    </footer>
  );
};

export default Footer;
