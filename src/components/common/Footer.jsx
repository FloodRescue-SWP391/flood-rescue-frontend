import React from "react";
import { Container, Row, Col } from "react-bootstrap";
import { Link } from "react-router-dom";
import "./Footer.css";

const Footer = () => {
  return (
    <footer className="footer">
      <Container>
        <Row className="gy-4">
          
          <Col md={4}>
            <h5 className="footer-title">RESCUE.NOW</h5>
            <p>
              Hệ thống kết nối khẩn cấp nhanh chóng, <br />
              an toàn và đáng tin cậy.
            </p>
          </Col>

          <Col md={4}>
            <h5 className="footer-title">Liên hệ</h5>
            <p>Email: rescue@gmail.com</p>
            <p>Hotline: 0965 782 358</p>
          </Col>

          <Col md={4}>
            <h5 className="footer-title">Hỗ trợ</h5>
            <div className="footer-links">
              <Link to="/introduce">Giới thiệu</Link>
              <Link to="/contact">Liên hệ</Link>
            </div>
          </Col>

        </Row>

        <hr />

        <div className="text-center footer-bottom">
          © 2026 RESCUE.NOW. Mọi quyền được bảo lưu.
        </div>
      </Container>
    </footer>
  );
};

export default Footer;