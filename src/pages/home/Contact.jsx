import React from "react";
import { useNavigate } from "react-router-dom";

import Header from "../../components/common/Header";
import "./Contact.css";

const Contact = () => {
  const navigate = useNavigate();

  return (
    <div>
      <Header />

      <div className="contact">
        <button className="back-btn1" onClick={() => navigate("/")}>
          ⬅ Back
        </button>

       

        <div className="contact-page">
          <h4>Contact Us</h4>
          <p className="lienhe">
           If you need assistance or have any questions, please contact us using the information below.
          </p>

          <div className="ngang"></div>

          <div className="lienhe1">
            <h5>Contact information</h5>
            <p>📍 Address: 123 Rescue Street, TP.HCM</p>
            <p>📞 Phone Number: 0901 234 567</p>
            <p>📧 Email: rescue@gmail.com</p>
            <p>⏰ Timework: 24/7</p>
          </div>

          <div className="ngang"></div>

          <h5>Send contact</h5>
          <form className="contact-form">
            <input type="text" placeholder="Fullname" />
            <input type="email" placeholder="Email" />
            <input type="text" placeholder="Phone number" />
            <textarea placeholder="Contact information"></textarea>
            <button type="submit">Send contact</button>
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
