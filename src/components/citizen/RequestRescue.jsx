import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../layout/citizen/RequestRescue.css";
import logo from "../../assets/logo.png";

const RequestRescue = () => {
  const [showSuccess, setShowSuccess] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    allowPublicPhone: false,
    address: "",
    mapLink: "",
    emergencyType: "Cứu người khẩn cấp",
    description: "",
    peopleCount: 0,
    contactVia: "phone",
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name || !formData.phone || !formData.address) {
      alert("Vui lòng nhập đầy đủ các trường bắt buộc!");
      return;
    }

    const newRequest = {
      id: Date.now(),
      ...formData,
      status: "PENDING", 
      createdAt: new Date().toLocaleString(),
    };

    const oldRequests =
      JSON.parse(localStorage.getItem("rescueRequests")) || [];

    localStorage.setItem(
      "rescueRequests",
      JSON.stringify([...oldRequests, newRequest])
    );

    localStorage.setItem("currentRequestId", newRequest.id);

    setShowSuccess(true);

    setTimeout(() =>{
      navigate("/request-status");
    }, 3000);

  };

  return (
    <div className="FE">
      {/* HEADER */}
      <header>
        <div className="logo">
          <img src={logo} alt="Rescue Now Logo" />
          <span>
            RESCUE.<div className="a">Now</div>
          </span>
        </div>
        <nav>
          <a>Giới thiệu</a>
          <a>Liên hệ</a>
        </nav>
      </header>

        {showSuccess && (
          <div className="success-toast">
            ✅ Gửi yêu cầu cứu hộ thành công!
          </div>
        )}
      {/* FORM */}
      <div className="request-container">
        <h2>Tạo yêu cầu cứu hộ</h2>

        <form onSubmit={handleSubmit} className="request-form">
          {/* LEFT */}
          <div className="form-left">
            <label>Tên của bạn *</label>
            <input name="name" value={formData.name} onChange={handleChange} />

            <label>Số điện thoại *</label>
            <input name="phone" value={formData.phone} onChange={handleChange} />

            <div className="checkbox">
              <input
                type="checkbox"
                name="allowPublicPhone"
                checked={formData.allowPublicPhone}
                onChange={handleChange}
              />
              <span>
                Có đồng ý công khai số điện thoại cho người khác hay không?
              </span>
            </div>

            <label>Khu vực và địa chỉ cụ thể *</label>
            <input
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="VD: Phú Yên, số 123 đường ABC"
            />

            <label>Bổ sung vị trí Google Maps</label>
            <input
              name="mapLink"
              value={formData.mapLink}
              onChange={handleChange}
            />
          </div>

          {/* RIGHT */}
          <div className="form-right">
            <label>Cần hỗ trợ</label>
            <select
              name="emergencyType"
              value={formData.emergencyType}
              onChange={handleChange}
            >
              <option>Cứu người khẩn cấp</option>
              <option>Sơ tán</option>
              <option>Y tế</option>
              <option>Lương thực</option>
            </select>

            <label>Mô tả tình huống</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
            />

            <label>Số người mắc kẹt</label>
            <input
              type="number"
              name="peopleCount"
              value={formData.peopleCount}
              onChange={handleChange}
              min="0"
            />

            <label>Liên lạc nhanh qua</label>
            <label>
              <input
                type="radio"
                name="contactVia"
                value="phone"
                checked={formData.contactVia === "phone"}
                onChange={handleChange}
              />{" "}
              📞 Điện thoại
            </label>
            <label>
              <input
                type="radio"
                name="contactVia"
                value="zalo"
                checked={formData.contactVia === "zalo"}
                onChange={handleChange}
              />{" "}
              💬 Zalo
            </label>
          </div>

          {/* ACTION */}
          <div className="form-actions">
            <button type="submit" className="submit-btn">
              Gửi yêu cầu
            </button>
            <button
              type="button"
              className="cancel-btn"
              onClick={() => window.location.reload()}
            >
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RequestRescue;
