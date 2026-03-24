import React, { useState } from "react";
import "./CreateRescueTeam.css";
import { createRescueTeam } from "../../services/rescueTeamService";

const CreateRescueTeam = () => {
  const [formData, setFormData] = useState({
    teamName: "",
    city: "",
    currentStatus: "Available",
    currentLatitude: "",
    currentLongitude: "",
  });

  const [toast, setToast] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((p) => ({ ...p, [name]: value }));

    // clear error when user starts typing
    if (errors[name]) {
      setErrors((p) => ({ ...p, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.teamName.trim()) newErrors.teamName = "Tên đội là bắt buộc";
    if (!formData.city.trim()) newErrors.city = "Thành phố là bắt buộc";
    if (!formData.currentStatus.trim())
      newErrors.currentStatus = "Trạng thái là bắt buộc";

    // optional: lat/long validation if provided
    const lat = formData.currentLatitude;
    const lng = formData.currentLongitude;

    if (lat !== "" && Number.isNaN(Number(lat))) {
      newErrors.currentLatitude = "Vĩ độ phải là một số";
    } else if (lat !== "" && (Number(lat) < -90 || Number(lat) > 90)) {
      newErrors.currentLatitude = "Vĩ độ phải nằm trong khoảng từ -90 đến 90";
    }

    if (lng !== "" && Number.isNaN(Number(lng))) {
      newErrors.currentLongitude = "Kinh độ phải là một số";
    } else if (lng !== "" && (Number(lng) < -180 || Number(lng) > 180)) {
      newErrors.currentLongitude =
        "Kinh độ phải nằm trong khoảng từ -180 đến 180";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      teamName: "",
      city: "",
      currentStatus: "Available",
      currentLatitude: "",
      currentLongitude: "",
    });
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("SUBMIT CLICKED"); // thêm dòng này

    if (!validateForm()) {
      showToast("❌ Vui lòng nhập đầy đủ và đúng thông tin.");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        teamName: formData.teamName.trim(),
        city: formData.city.trim(),
        currentStatus: formData.currentStatus.trim(),
        currentLatitude:
          formData.currentLatitude === ""
            ? 0
            : Number(formData.currentLatitude),
        currentLongitude:
          formData.currentLongitude === ""
            ? 0
            : Number(formData.currentLongitude),
      };

      const res = await createRescueTeam(payload);

      if (res?.success === false) {
        showToast(`❌ ${res?.message || "Tạo đội cứu hộ không thành công"}`);
        return;
      }

      showToast("✅ Tạo đội cứu hộ thành công!");
      resetForm();
    } catch (err) {
      showToast(`❌ ${err?.message || "Tạo đội cứu hộ không thành công"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {toast && (
        <div className={`toast ${toast.includes("❌") ? "error" : "success"}`}>
          {toast}
        </div>
      )}

      <div className="create-rescue-team-container">
        <h2>Tạo Đội cứu hộ</h2>

        <form onSubmit={handleSubmit} className="create-form">
          <div className="form-group">
            <label htmlFor="teamName">Tên đội</label>
            <input
              id="teamName"
              name="teamName"
              value={formData.teamName}
              onChange={handleChange}
              placeholder="Nhâp tên đội"
              className={errors.teamName ? "error" : ""}
              required
            />
            {errors.teamName && (
              <span className="error-message">{errors.teamName}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="city">Thành phố</label>
            <input
              id="city"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="Nhập thành phố"
              className={errors.city ? "error" : ""}
              required
            />
            {errors.city && (
              <span className="error-message">{errors.city}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="currentStatus">Trạng thái</label>
            <select
              id="currentStatus"
              name="currentStatus"
              value={formData.currentStatus}
              onChange={handleChange}
              className={errors.currentStatus ? "error" : ""}
              required
            >
              <option value="Available">Sẵn sàng</option>
              <option value="Busy">Đang bận</option>
              <option value="Inactive">Không hoạt động</option>
            </select>
            {errors.currentStatus && (
              <span className="error-message">{errors.currentStatus}</span>
            )}
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label htmlFor="currentLatitude">Vĩ độ</label>
              <input
                id="currentLatitude"
                name="currentLatitude"
                value={formData.currentLatitude}
                onChange={handleChange}
                placeholder="0"
                className={errors.currentLatitude ? "error" : ""}
              />
              {errors.currentLatitude && (
                <span className="error-message">{errors.currentLatitude}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="currentLongitude">Kinh độ</label>
              <input
                id="currentLongitude"
                name="currentLongitude"
                value={formData.currentLongitude}
                onChange={handleChange}
                placeholder="0"
                className={errors.currentLongitude ? "error" : ""}
              />
              {errors.currentLongitude && (
                <span className="error-message">{errors.currentLongitude}</span>
              )}
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Đang tạo..." : "Tạo đội cứu hộ"}
          </button>
        </form>
      </div>
    </>
  );
};

export default CreateRescueTeam;
