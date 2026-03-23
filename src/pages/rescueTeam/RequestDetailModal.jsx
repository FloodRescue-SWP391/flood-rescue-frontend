import { useState } from "react";
import {
  FaTimes,
  FaPhone,
  FaMapMarkerAlt,
  FaClock,
  FaTag,
} from "react-icons/fa";
import "./RequestDetailModal.css";

export default function RequestDetailModal({ mission, onClose, onReportIncident }) {
  const [activeTab, setActiveTab] = useState("details"); // details | people | timeline

  if (!mission) return null;

  const requestId = mission?.rescueRequestID || "N/A";
  const citizenName = mission?.citizenName || mission?.fullName || "Unknown";
  const citizenPhone = mission?.citizenPhone || mission?.phone || "N/A";
  const description = mission?.description || mission?.rescueRequest?.description || "No description";
  const status = mission?.status || "Unknown";
  const latitude = mission?.latitude || mission?.locationLatitude || "N/A";
  const longitude = mission?.longitude || mission?.locationLongitude || "N/A";
  const createdAt = mission?.assignedAt || mission?.createdAt || "N/A";
  const address = mission?.address || mission?.rescueRequest?.address || "Not provided";
  const requestType = mission?.rescueRequest?.requestType || mission?.type || "Rescue";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content request-detail-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2>Chi tiết yêu cầu cứu hộ</h2>
          <button className="close-btn" onClick={onClose}>
            <FaTimes size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="modal-tabs">
          <button
            className={`tab-btn ${activeTab === "details" ? "active" : ""}`}
            onClick={() => setActiveTab("details")}
          >
            Chi tiết
          </button>
          <button
            className={`tab-btn ${activeTab === "people" ? "active" : ""}`}
            onClick={() => setActiveTab("people")}
          >
            Người liên quan
          </button>
          <button
            className={`tab-btn ${activeTab === "timeline" ? "active" : ""}`}
            onClick={() => setActiveTab("timeline")}
          >
            Lịch sử
          </button>
        </div>

        {/* Tab Content */}
        <div className="modal-body">
          {/* Details Tab */}
          {activeTab === "details" && (
            <div className="tab-content">
              <div className="detail-section">
                <h3>Thông tin yêu cầu</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>ID Yêu cầu</label>
                    <p className="value">{requestId}</p>
                  </div>
                  <div className="detail-item">
                    <label>Loại yêu cầu</label>
                    <p className="value">
                      <FaTag /> {requestType}
                    </p>
                  </div>
                  <div className="detail-item full-width">
                    <label>Mô tả</label>
                    <p className="value">{description}</p>
                  </div>
                  <div className="detail-item">
                    <label>Trạng thái</label>
                    <p className={`value status status-${status.toLowerCase()}`}>
                      {status}
                    </p>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>Vị trí</h3>
                <div className="detail-grid">
                  <div className="detail-item full-width">
                    <label>Địa chỉ</label>
                    <p className="value">{address}</p>
                  </div>
                  <div className="detail-item">
                    <label>
                      <FaMapMarkerAlt /> Vĩ độ
                    </label>
                    <p className="value">{latitude}</p>
                  </div>
                  <div className="detail-item">
                    <label>
                      <FaMapMarkerAlt /> Kinh độ
                    </label>
                    <p className="value">{longitude}</p>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>Thông tin nhiệm vụ</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>
                      <FaClock /> Thời gian gán
                    </label>
                    <p className="value">{createdAt}</p>
                  </div>
                  <div className="detail-item">
                    <label>Trạng thái nhiệm vụ</label>
                    <p className={`value status status-${status.toLowerCase()}`}>
                      {status}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* People Tab */}
          {activeTab === "people" && (
            <div className="tab-content">
              <div className="detail-section">
                <h3>Thông tin người dân</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Tên người dân</label>
                    <p className="value">{citizenName}</p>
                  </div>
                  <div className="detail-item">
                    <label>
                      <FaPhone /> Liên hệ
                    </label>
                    <p className="value">
                      <a href={`tel:${citizenPhone}`} className="phone-link">
                        {citizenPhone}
                      </a>
                    </p>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>Gán cho đội</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>ID Đội cứu hộ</label>
                    <p className="value">{mission?.rescueTeamID || "N/A"}</p>
                  </div>
                  <div className="detail-item">
                    <label>ID Nhiệm vụ</label>
                    <p className="value">{mission?.rescueMissionID || "N/A"}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === "timeline" && (
            <div className="tab-content">
              <div className="timeline">
                <div className="timeline-item">
                  <div className="timeline-marker">
                    <div className="timeline-dot"></div>
                  </div>
                  <div className="timeline-content">
                    <h4>Yêu cầu được tạo</h4>
                    <p>{createdAt}</p>
                    <span className="timeline-label">Yêu cầu được khởi tạo</span>
                  </div>
                </div>

                <div className="timeline-item">
                  <div className="timeline-marker">
                    <div className="timeline-dot"></div>
                  </div>
                  <div className="timeline-content">
                    <h4>Gán cho đội</h4>
                    <p>{mission?.assignedAt || "N/A"}</p>
                    <span className="timeline-label">Đội cứu hộ tiếp nhận</span>
                  </div>
                </div>

                <div className="timeline-item">
                  <div className="timeline-marker">
                    <div className="timeline-dot"></div>
                  </div>
                  <div className="timeline-content">
                    <h4>Đang thực hiện</h4>
                    <p>{mission?.startTime || "N/A"}</p>
                    <span className="timeline-label">Đội bắt đầu thực hiện cứu hộ</span>
                  </div>
                </div>

                {mission?.endTime && (
                  <div className="timeline-item">
                    <div className="timeline-marker">
                      <div className="timeline-dot"></div>
                    </div>
                    <div className="timeline-content">
                      <h4>Hoàn thành</h4>
                      <p>{mission.endTime}</p>
                      <span className="timeline-label">Hoàn tất nhiệm vụ cứu hộ</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Đóng
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              onReportIncident(mission);
              onClose();
            }}
          >
            Báo cáo sự cố
          </button>
        </div>
      </div>
    </div>
  );
}
