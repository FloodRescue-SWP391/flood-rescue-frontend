import React from "react";
import { useNavigate } from "react-router-dom";
import { Container, Card, Form, Button, Row, Col } from "react-bootstrap";
import {
  FaPhoneAlt,
  FaEnvelope,
  FaMapMarkerAlt,
  FaClock,
} from "react-icons/fa";
import "./Contact.css";
import Header from "../../components/common/Header";

const Contact = () => {
  const navigate = useNavigate();

  return (
    <>
    <Header />
    <div className="contact-bg">
      <Container fluid className="py-4">
        <Card className="contact-card shadow-sm">
          <div className="top-bar">
            <Button
              variant="light"
              className="back-button"
              onClick={() => navigate("/")}
            >
              ← Back
            </Button>
          </div>

          <div className="contact-content">
            <div className="text-center contact-header">
              <h2 className="contact-title" >Contact RESCUE System</h2>
              <p className="contact-subtitle">
                If you need assistance or have any questions, please contact us.
              </p>
            </div>

            <hr />

            {/* 4 ô icon - 2 trên 2 dưới */}
            <Row className="g-3 mb-4">
              <Col xs={12} md={6}>
                <div className="feature-box">
                  <div className="feature-icon">
                    <FaMapMarkerAlt />
                  </div>
                  <h6>Address</h6>
                  <p>123 Rescue Street, TP.HCM</p>
                </div>
              </Col>

              <Col xs={12} md={6}>
                <div className="feature-box">
                  <div className="feature-icon">
                    <FaPhoneAlt />
                  </div>
                  <h6>Phone</h6>
                  <p>0965 782 358</p>
                </div>
              </Col>

              <Col xs={12} md={6}>
                <div className="feature-box">
                  <div className="feature-icon">
                    <FaEnvelope />
                  </div>
                  <h6>Email</h6>
                  <p>rescue@gmail.com</p>
                </div>
              </Col>

              <Col xs={12} md={6}>
                <div className="feature-box">
                  <div className="feature-icon">
                    <FaClock />
                  </div>
                  <h6>Working Time</h6>
                  <p>24/7 Support</p>
                </div>
              </Col>
            </Row>

            {/* Khối thông tin liên hệ + form */}
            <Form className="contact-form">
              <div className="contact-info-box">
                <h4 className="mb-3">Contact Information</h4>
                <p>
                  Please fill in the form below and our team will get back to
                  you as soon as possible.
                </p>

                <Row className="g-3 mt-1">
                  <Col xs={12} md={6}>
                    <Form.Group>
                      <Form.Label>Fullname</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter your fullname"
                      />
                    </Form.Group>
                  </Col>

                  <Col xs={12} md={6}>
                    <Form.Group>
                      <Form.Label>Email</Form.Label>
                      <Form.Control
                        type="email"
                        placeholder="Enter your email"
                      />
                    </Form.Group>
                  </Col>

                  <Col xs={12}>
                    <Form.Group>
                      <Form.Label>Phone number</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter your phone number"
                      />
                    </Form.Group>
                  </Col>

                  <Col xs={12}>
                    <Form.Group>
                      <Form.Label>Message</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={5}
                        placeholder="Write your message here..."
                      />
                    </Form.Group>
                  </Col>

                  <Col xs={12} className="d-flex justify-content-center">
                    <Button
                      variant="danger"
                      type="submit"
                      className="send-btn1"
                    >
                      Send Contact
                    </Button>
                  </Col>
                </Row>
              </div>
            </Form>
          </div>
        </Card>
      </Container>
    </div>
    </>
  );
};

export default Contact;
