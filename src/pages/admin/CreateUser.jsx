import React, { useEffect, useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import "./CreateUser.css";
import { register } from "../../services/authService";
import { getAllRescueTeams } from "../../services/rescueTeamService"; // nhớ đúng path

const ROLE_ID_MAP = {
  Admin: "AD",
  "Rescue Coordinator": "RC",
  "Rescue Team": "RT", // hoặc R6 / gì đó backend yêu cầu
  Manager: "IM", // hoặc A0 nếu Manager = Admin
};
const CreateUser = () => {
  const { handleLogout } = useOutletContext();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "Rescue Coordinator",
    rescueTeamId: "",
    isLeader: false,
  });

  const [teams, setTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(false);

  const [toast, setToast] = useState("");
  const [errors, setErrors] = useState({});

  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRescueTeamRole = formData.role === "Rescue Team";

  // Load teams ONLY when role = Rescue Team
  useEffect(() => {
    if (!isRescueTeamRole) {
      // role khác => reset 2 field & clear list
      setFormData((p) => ({ ...p, rescueTeamId: "", isLeader: false }));
      setTeams([]);
      return;
    }

    (async () => {
      try {
        setLoadingTeams(true);

        const json = await getAllRescueTeams();
        console.log("getAllRescueTeams json:", json);

        const list = json?.content?.data || [];
        setTeams(Array.isArray(list) ? list : []);
      } catch (e) {
        setTeams([]);
      } finally {
        setLoadingTeams(false);
      }
    })();
  }, [isRescueTeamRole]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      // Clear error when user starts typing
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };
  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim())
      newErrors.fullName = "Vui lòng nhập họ và tên";
    if (!formData.username.trim())
      newErrors.username = "Vui lòng nhập tên đăng nhập";
    if (!formData.phone.trim()) newErrors.phone = "Vui lòng nhập số điện thoại";
    if (!formData.password) newErrors.password = "Vui lòng nhập mật khẩu";
    if (!formData.confirmPassword)
      newErrors.confirmPassword = "Vui lòng xác nhận mật khẩu";

    if (formData.password && formData.password.length < 8) {
      newErrors.password = "Mật khẩu phải có ít nhất 8 ký tự";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Mật khẩu xác nhận không khớp";
    }

    // Phone validation (basic)
    const phoneRegex = /^[0-9]{10,15}$/;
    if (formData.phone && !phoneRegex.test(formData.phone)) {
      newErrors.phone = "Vui lòng nhập số điện thoại.";
    }

    // SỬA: role mapping check (nên có)
    if (!ROLE_ID_MAP[formData.role]) {
      newErrors.role = "Chưa gán vai trò";
    }

    // SỬA: chỉ Rescue Team mới required rescueTeamId
    if (isRescueTeamRole && !formData.rescueTeamId) {
      newErrors.rescueTeamId = "Vui lòng chọn đội cứu hộ";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setToast("");

    if (!validateForm()) {
      setToast("❌ Vui lòng kiểm tra và sửa lỗi trong biểu mẫu");
      return;
    }

    const payload = {
      username: formData.username.trim(),
      password: formData.password,
      phone: formData.phone.trim(),
      fullName: formData.fullName.trim(),
      roleId: ROLE_ID_MAP[formData.role],
      ...(isRescueTeamRole
        ? {
            rescueTeamId: formData.rescueTeamId,
            isLeader: formData.isLeader,
          }
        : {}),
    };

    try {
      setIsSubmitting(true);
      console.log("REGISTER PAYLOAD:", payload);
      await register(payload);
      setToast("✅ Tài khoản đã được tạo thành công! Đang chuyển hướng...");

      // Tự động chuyển qua trang danh sách để xem cập nhật
      setTimeout(() => {
        navigate("/admin/list-user");
      }, 1500);

      // Reset form after delay
      setFormData({
        fullName: "",
        username: "",
        phone: "",
        password: "",
        confirmPassword: "",
        role: "Rescue Coordinator",
        rescueTeamId: "",
        isLeader: false,
      });
      setErrors({});
    } catch (err) {
      const msg = err?.message || "Register failed";

      if (msg.toLowerCase().includes("unauthorized") || msg.includes("401")) {
        handleLogout?.();
      }

      setToast(`❌ ${msg}`);
      setTimeout(() => setToast(""), 2500); // tự tắt sau 2.5s
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {toast && (
        <div className={`toast ${toast.includes("❌") ? "error" : "success"}`}>
          {toast}
        </div>
      )}

      <div className="create-user-container">
        <h2 className="create-user-title">Tạo tài khoản mới</h2>

        <form onSubmit={handleSubmit} className="create-form">
          <div className="form-group">
            <label htmlFor="role" className="role-label">
              Vai trò <span>*</span>
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className={errors.role ? "error" : ""}
            >
              <option value="Rescue Coordinator">Điều phối cứu hộ</option>
              <option value="Rescue Team">Đội cứu hộ</option>
              <option value="Manager">Quản lý</option>
              <option value="Admin">Quản trị viên</option>
            </select>
            {errors.role && (
              <span className="error-message">{errors.role}</span>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="fullName" className="role-label">
              Họ và tên <span>*</span>
            </label>
            <input
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Nhập họ và tên"
              className={errors.fullName ? "error" : ""}
              required
            />
            {errors.fullName && (
              <span className="error-message">{errors.fullName}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="username" className="role-label">
              Tên đăng nhập <span>*</span>
            </label>
            <input
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Nhập tên đăng nhập"
              className={errors.username ? "error" : ""}
              required
            />
            {errors.username && (
              <span className="error-message">{errors.username}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="phone" className="role-label">
              Số điện thoại <span>*</span>
            </label>
            <input
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Nhập số điện thoại"
              className={errors.phone ? "error" : ""}
              required
            />
            {errors.phone && (
              <span className="error-message">{errors.phone}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password" className="role-label">
              Mật khẩu <span>*</span>
            </label>
            <input
              id="password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Nhập mật khẩu"
              className={errors.password ? "error" : ""}
              required
            />
            {errors.password && (
              <span className="error-message">{errors.password}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="role-label">
              Xác nhận mật khẩu <span>*</span>
            </label>
            <input
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Nhập lại mật khẩu"
              className={errors.confirmPassword ? "error" : ""}
              required
            />
            {errors.confirmPassword && (
              <span className="error-message">{errors.confirmPassword}</span>
            )}
          </div>
          {isRescueTeamRole && (
            <>
              <div className="form-group">
                <label htmlFor="rescueTeamId" className="role-label">
                  Đội cứu hộ <span>*</span>
                </label>
                <select
                  id="rescueTeamId"
                  name="rescueTeamId"
                  value={formData.rescueTeamId}
                  onChange={handleChange}
                  className={errors.rescueTeamId ? "error" : ""}
                  disabled={loadingTeams}
                >
                  <option value="">
                    {loadingTeams ? "Loading teams..." : "Chon đội cúu hộ"}
                  </option>

                  {teams.map((t) => (
                    <option key={t.rescueTeamID} value={t.rescueTeamID}>
                      {t.teamName}
                    </option>
                  ))}
                </select>

                {errors.rescueTeamId && (
                  <span className="error-message">{errors.rescueTeamId}</span>
                )}
              </div>

              <div className="form-group">
                <div className="inline-check">
                  <input
                    id="isLeader"
                    type="checkbox"
                    name="isLeader"
                    checked={formData.isLeader}
                    onChange={handleChange}
                  />

                  <label
                    htmlFor="isLeader"
                    className="role-label"
                    style={{ color: "brown" }}
                  >
                    Là trưởng nhóm ?
                  </label>
                </div>
              </div>
            </>
          )}
          <button type="submit" className="submit">
            Tạo tài khoản
          </button>
        </form>
      </div>
    </>
  );
};

export default CreateUser;
