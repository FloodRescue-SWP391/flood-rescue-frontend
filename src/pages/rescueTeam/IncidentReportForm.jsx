import { useState } from "react";
import { FaTimes, FaExclamationTriangle, FaCheckCircle } from "react-icons/fa";
import { incidentReportService } from "../../services/incidentReportService";
import "./IncidentReportForm.css";

const INCIDENT_TYPES = [
  { id: "injury", label: "Chấn thương / Cấp cứu y tế" },
  { id: "equipment_failure", label: "Hỏng hóc thiết bị" },
  { id: "communication_loss", label: "Mất liên lạc" },
  { id: "environmental", label: "Nguy hiểm môi trường" },
  { id: "casualty", label: "Thương vong" },
  { id: "other", label: "Khác" },
];

const SEVERITY_LEVELS = [
  { id: "low", label: "Thấp", color: "#ffc107" },
  { id: "medium", label: "Trung bình", color: "#ff9800" },
  { id: "high", label: "Cao", color: "#f44336" },
  { id: "critical", label: "Tới hạn", color: "#9c27b0" },
];

export default function IncidentReportForm({ mission, onClose, onSubmit }) {
  const userId = localStorage.getItem("userId") || "";
  
  const [formData, setFormData] = useState({
    rescueMissionID: mission?.rescueMissionID || "",
    rescueRequestID: mission?.rescueRequestID || "",
    title: "",
    type: "",
    description: "",
    severity: "medium",
    latitude: mission?.latitude || mission?.locationLatitude || "",
    longitude: mission?.longitude || mission?.locationLongitude || "",
    reporterName: "",
    remarks: "",
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [successId, setSuccessId] = useState("");

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = "Tiêu đề sự cố là bắt buộc";
    }
    if (!formData.type) {
      newErrors.type = "Loại sự cố là bắt buộc";
    }
    if (!formData.description.trim()) {
      newErrors.description = "Mô tả chi tiết là bắt buộc";
    }
    if (!formData.reporterName.trim()) {
      newErrors.reporterName = "Tên người báo cáo là bắt buộc";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      // Gửi dữ liệu lên API
      const payload = {
        rescueMissionID: formData.rescueMissionID,
        rescueRequestID: formData.rescueRequestID,
        title: formData.title,
        type: formData.type,
        description: formData.description,
        severity: formData.severity,
        latitude: formData.latitude ? Number(formData.latitude) : null,
        longitude: formData.longitude ? Number(formData.longitude) : null,
        reporterName: formData.reporterName,
        remarks: formData.remarks,
      };

      console.log("Gửi báo cáo sự cố:", payload);

      const res = await incidentReportService.reportIncident(payload);

      if (res?.success || res?.isSuccess) {
        setSuccessId(res?.incidentReportID || res?.id || Math.random().toString(36).substr(2, 9).toUpperCase());
        setSubmitted(true);

        // Auto-close sau 2 giây
        setTimeout(() => {
          if (onSubmit) {
            onSubmit(formData);
          }
          onClose();
        }, 2000);
      } else {
        setErrors({
          submit: res?.message || "Lỗi khi gửi báo cáo sự cố. Vui lòng thử lại.",
        });
      }
    } catch (error) {
      console.error("Lỗi gửi báo cáo:", error);
      setErrors({
        submit: "Kết nối thất bại. Vui lòng kiểm tra mạng và thử lại.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content incident-report-modal" onClick={(e) => e.stopPropagation()}>
          <div className="success-container">
            <div className="success-icon">
              <FaCheckCircle size={64} />
            </div>
            <h2>Báo cáo sự cố thành công</h2>
            <p>Báo cáo sự cố của bạn đã được ghi nhận và chuyển cho nhân viên điều phối.</p>
            <p className="report-id">ID Báo cáo: {successId}</p>
            <button className="btn-primary" onClick={onClose}>
              Đóng
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content incident-report-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header incident-header">
          <div className="header-title">
            <FaExclamationTriangle size={24} />
            <h2>Báo cáo sự cố</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <FaTimes size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="modal-body incident-form">
          {errors.submit && (
            <div className="error-alert">
              <FaExclamationTriangle /> {errors.submit}
            </div>
          )}

          {/* Mission & Request IDs (Read-only) */}
          <div className="form-section">
            <h3>Thông tin tham chiếu</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="rescueMissionID">ID nhiệm vụ</label>
                <input
                  type="text"
                  id="rescueMissionID"
                  name="rescueMissionID"
                  value={formData.rescueMissionID}
                  readOnly
                  className="input-readonly"
                />
              </div>
              <div className="form-group">
                <label htmlFor="rescueRequestID">ID yêu cầu</label>
                <input
                  type="text"
                  id="rescueRequestID"
                  name="rescueRequestID"
                  value={formData.rescueRequestID}
                  readOnly
                  className="input-readonly"
                />
              </div>
            </div>
          </div>

          {/* Incident Details */}
          <div className="form-section">
            <h3>Chi tiết sự cố</h3>

            <div className="form-group">
              <label htmlFor="title">
                Tiêu đề sự cố <span className="required">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Mô tả ngắn gọn về sự cố"
                className={errors.title ? "error" : ""}
                maxLength="100"
              />
              {errors.title && <span className="error-text">{errors.title}</span>}
              <span className="char-count">{formData.title.length}/100</span>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="type">
                  Loại sự cố <span className="required">*</span>
                </label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className={errors.type ? "error" : ""}
                >
                  <option value="">-- Chọn loại sự cố --</option>
                  {INCIDENT_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {errors.type && <span className="error-text">{errors.type}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="severity">Mức độ nghiêm trọng</label>
                <div className="severity-selector">
                  {SEVERITY_LEVELS.map((level) => (
                    <button
                      key={level.id}
                      type="button"
                      className={`severity-btn ${formData.severity === level.id ? "active" : ""}`}
                      style={formData.severity === level.id ? { borderColor: level.color } : {}}
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          severity: level.id,
                        }))
                      }
                    >
                      <span
                        className="severity-dot"
                        style={{
                          backgroundColor: level.color,
                        }}
                      ></span>
                      {level.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="description">
                Mô tả chi tiết <span className="required">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Mô tả chi tiết về sự cố xảy ra..."
                rows="4"
                className={errors.description ? "error" : ""}
                maxLength="500"
              />
              {errors.description && <span className="error-text">{errors.description}</span>}
              <span className="char-count">{formData.description.length}/500</span>
            </div>
          </div>

          {/* Location */}
          <div className="form-section">
            <h3>Vị trí sự cố</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="latitude">Vĩ độ (Latitude)</label>
                <input
                  type="number"
                  id="latitude"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleInputChange}
                  step="0.000001"
                  placeholder="0.000000"
                />
              </div>
              <div className="form-group">
                <label htmlFor="longitude">Kinh độ (Longitude)</label>
                <input
                  type="number"
                  id="longitude"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleInputChange}
                  step="0.000001"
                  placeholder="0.000000"
                />
              </div>
            </div>
          </div>

          {/* Reporter Information */}
          <div className="form-section">
            <h3>Thông tin người báo cáo</h3>
            <div className="form-group">
              <label htmlFor="reporterName">
                Tên người báo cáo / Trưởng đội <span className="required">*</span>
              </label>
              <input
                type="text"
                id="reporterName"
                name="reporterName"
                value={formData.reporterName}
                onChange={handleInputChange}
                placeholder="Họ và tên của bạn"
                className={errors.reporterName ? "error" : ""}
              />
              {errors.reporterName && <span className="error-text">{errors.reporterName}</span>}
            </div>
          </div>

          {/* Additional Notes */}
          <div className="form-section">
            <h3>Thông tin bổ sung</h3>
            <div className="form-group">
              <label htmlFor="remarks">Ghi chú thêm</label>
              <textarea
                id="remarks"
                name="remarks"
                value={formData.remarks}
                onChange={handleInputChange}
                placeholder="Bất kỳ thông tin hoặc quan sát bổ sung nào..."
                rows="3"
                maxLength="300"
              />
              <span className="char-count">{formData.remarks.length}/300</span>
            </div>
          </div>

          {/* Form Actions */}
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
              Hủy bỏ
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Đang gửi..." : "Gửi báo cáo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
