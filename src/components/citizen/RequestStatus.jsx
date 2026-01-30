import React, { useState } from "react";
import "../../layout/citizen/RequestStatus.css";
import "../../layout/citizen/Header.css";
import { Link, useNavigate } from "react-router-dom";
import logo from "../../assets/logo.png";

const RequestStatus = () => {
  const navigate = useNavigate();

  // ===== GIẢ LẬP DATA REQUEST =====
  const [request, setRequest] = useState({
    type: "Medical Emergency",
    time: "26/01/2026 - 08:13",
    name: "Nguyễn Văn A",
    phone: "0901234567",
    address: "123 Main St, Nha Trang",
    status: "pending", // pending | processing | completed
  });

  return (
    <div className="request-status-page">
      {/* ===== HEADER ===== */}
      <header>
        <div className="logo">
          <img src={logo} alt="Rescue Now Logo" />
          <span>
            RESCUE.<div className="a">Now</div>
          </span>
        </div>

        <nav>
          <Link className="nav-btn" to="/introduce">Introduct</Link>
          <Link className="nav-btn" to="/contact">Contact</Link>
        </nav>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <div className="detail">
        <div className="dau">
          <p className="h2">My Requests</p>

          <button
            className="create"
            onClick={() => navigate("/citizen/request")}
          >
            Create Request
          </button>
        </div>

        <div className="gach"></div>

        {/* ===== REQUEST CARD ===== */}
        <div className="request-card">
          <div className="card-header">
            <div className="card-header1">
              <h3>{request.type}</h3>
              <p className="time">Time: {request.time}</p>
            </div>

            <span className={`status ${request.status}`}>
              {request.status.toUpperCase()}
            </span>
          </div>

          <div className="card-body">
            <p><b>Full Name:</b> {request.name}</p>
            <p><b>Phone Number:</b> {request.phone}</p>
            <p><b>Address:</b> {request.address}</p>
          </div>

          <button className="detail-btn3">
            Detail Request Rescue
          </button>

          {/* ===== MAP GIẢ LẬP KHI PROCESSING ===== */}
          {request.status === "processing" && (
            <div className="map-demo">
              🚑 Rescue team is on the way...
              <div className="fake-map">[ MAP DISPLAY HERE ]</div>
            </div>
          )}

          {/* ===== DEMO BUTTONS (SAU NÀY XÓA) ===== */}
          <div className="demo-status">
            <button onClick={() => setRequest({ ...request, status: "pending" })}>
              Pending
            </button>
            <button onClick={() => setRequest({ ...request, status: "processing" })}>
              Processing
            </button>
            <button onClick={() => setRequest({ ...request, status: "completed" })}>
              Completed
            </button>
          </div>
        </div>
      </div>

      {/* ===== FOOTER ===== */}
      <div className="footer2">
        © 2026 Rescue System. All rights reserved.
      </div>
    </div>
  );
};

export default RequestStatus;
