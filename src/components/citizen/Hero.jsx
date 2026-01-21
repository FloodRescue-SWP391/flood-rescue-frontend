import React from "react";

import "../../layout/citizen/Hero.css";
export default function Hero() {
  return (
    <section className="hero">
      
        <div className="hero-text">
            <h1>Cầu cứu khẩn cấp</h1>
            <p className="subtitle">
                Chúng tôi sẽ chuyển yêu cầu của bạn đến đội cứu hộ gần nhất
            </p>
        </div>
      <button className="btn-main">
        <span className="sos">SOS</span>
        TẠO YÊU CẦU CỨU HỘ NGAY &gt;&gt;&gt;
      </button>

      <div className="note">
        ✅ Thao tác chỉ mất 1 - 2 phút | Không cần đăng nhập
      </div>

      <button className="btn-floating">
        <span className="sos1">SOS</span>
        CẦU CỨU NGAY
      </button>
    </section>
  );
}
