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
      
        <div className="contact-page">
          <h4>Contact Us</h4>
          <p className="lienhe">
          If you need support or have questions, please contact us below
            hereafter.
          </p>

          <div className="ngang"></div>

          <div className="lienhe1">
            <h5>Contact Information</h5>

            <div className="b">
              <p>📍 Address: 123 Rescue Street, TP.HCM</p>
              <p>📞 Hotline: 0965 782 358</p>
            </div>
            <div className="b">
              <p>📧 Email: rescue@gmail.com</p>
              <p>⏰ Business hours: 24/7</p>
            </div>
          </div>

          <div className="ngang"></div>

          <h5>Send Contact</h5>
          <form className="contact-form">
            <input type="text" placeholder="Fullname" />
            <input type="email" placeholder="Email" />
            <input type="text" placeholder="Phone Number" />
            <textarea placeholder="Contact content"></textarea>
            <button type="submit">Send</button>
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
