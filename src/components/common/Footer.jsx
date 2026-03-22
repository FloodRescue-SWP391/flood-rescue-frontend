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
              Fast emergency connection system, <br />
              safe and reliable.
            </p>
          </Col>

          <Col md={4}>
            <h5 className="footer-title">Contact</h5>
            <p>Email: rescue@gmail.com</p>
            <p>Hotline: 0965 782 358</p>
          </Col>

          <Col md={4}>
            <h5 className="footer-title">Support</h5>
            <div className="footer-links">
              <Link to="/introduce">Introduce</Link>
              <Link to="/contact">Contact</Link>
            </div>
          </Col>

        </Row>

        <hr />

        <div className="text-center footer-bottom">
          © 2026 RESCUE.NOW. All rights reserved.
        </div>
      </Container>
    </footer>
  );
};

export default Footer;