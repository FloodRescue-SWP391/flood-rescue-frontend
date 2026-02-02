import React from "react";

import Header from "../components/citizen/Header";
import { useNavigate } from "react-router-dom";

import "../layout/homePage/Contact.css";

const Contact = () => {
  const navigate = useNavigate();
  return (
    <div>
      <Header />
      <div className="contact">
        <button className="back-btn1" onClick={() => navigate("/homePage")}>
          ⬅ Back
        </button>
        <hr />
        <div className="contact-page">
          <h4>Liên Hệ Với Chúng Tôi</h4>
          <p className="lienhe">
            Nếu bạn cần hỗ trợ hoặc có thắc mắc, vui lòng liên hệ theo thông tin
            dưới đây.
          </p>

          <div className="ngang"></div>

          <div className="lienhe1">
            <h5>Thông tin liên hệ</h5>

            <div className="b">
              <p>📍 Địa chỉ: 123 Rescue Street, TP.HCM</p>
              <p>📞 Điện thoại: 0901 234 567</p>
            </div>
            <div className="b">
              <p>📧 Email: rescue@gmail.com</p>
              <p>⏰ Giờ làm việc: 24/7</p>
            </div>
          </div>

          <div className="ngang"></div>

          <h5>Gửi liên hệ</h5>
          <form className="contact-form">
            <input type="text" placeholder="Họ và tên" />
            <input type="email" placeholder="Email" />
            <input type="text" placeholder="Số điện thoại" />
            <textarea placeholder="Nội dung liên hệ"></textarea>
            <button type="submit">Gửi liên hệ</button>
          </form>

          <div className="footer">
            © 2026 Rescue System. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
