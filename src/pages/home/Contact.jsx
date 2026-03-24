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
import Footer from "../../components/common/Footer";

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
                className="back-button1"
                onClick={() => navigate("/")}
              >
                ← Quay lại
              </Button>
            </div>

            <div className="contact-content">
              <div className="text-center contact-header">
                <h2 className="contact-title">Liên hệ hệ thống RESCUE</h2>
                <p className="contact-subtitle">
                  Nếu bạn cần hỗ trợ hoặc có bất kỳ câu hỏi nào, vui lòng liên
                  hệ với chúng tôi.
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
                    <h6>Địa chỉ</h6>
                    <p>123 Rescue Street, TP.HCM</p>
                  </div>
                </Col>

                <Col xs={12} md={6}>
                  <div className="feature-box">
                    <div className="feature-icon">
                      <FaPhoneAlt />
                    </div>
                    <h6>Số điện thoại</h6>
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
                    <h6>Thời gian làm việc</h6>
                    <p>Hỗ trợ 24/7</p>
                  </div>
                </Col>
              </Row>

              {/* Khối thông tin liên hệ + form */}
              <Form className="contact-form">
                <div className="contact-info-box">
                  <h4 className="mb-3">Thông tin liên hệ</h4>
                  <p>
                    Vui lòng điền vào form bên dưới và đội ngũ của chúng tôi sẽ
                    phản hồi bạn sớm nhất có thể.
                  </p>

                  <Row className="g-3 mt-1">
                    <Col xs={12} md={6}>
                      <Form.Group>
                        <Form.Label>Họ và tên</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="Nhập họ và tên của bạn"
                        />
                      </Form.Group>
                    </Col>

                    <Col xs={12} md={6}>
                      <Form.Group>
                        <Form.Label>Email</Form.Label>
                        <Form.Control
                          type="email"
                          placeholder="Nhập email của bạn"
                        />
                      </Form.Group>
                    </Col>

                    <Col xs={12}>
                      <Form.Group>
                        <Form.Label>Số điện thoại</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="Nhập số điện thoại của bạn"
                        />
                      </Form.Group>
                    </Col>

                    <Col xs={12}>
                      <Form.Group>
                        <Form.Label>Nội dung</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={5}
                          placeholder="Nhập nội dung của bạn..."
                        />
                      </Form.Group>
                    </Col>

                    <Col xs={12} className="d-flex justify-content-center">
                      <Button
                        variant="danger"
                        type="submit"
                        className="send-btn1"
                      >
                        Gửi liên hệ
                      </Button>
                    </Col>
                  </Row>
                </div>
              </Form>
            </div>
          </Card>
        </Container>

        <Footer />
      </div>
    </>
  );
};

export default Contact;
