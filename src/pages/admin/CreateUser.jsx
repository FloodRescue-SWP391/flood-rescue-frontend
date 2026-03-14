import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import "./CreateUser.css";
import { register } from "../../services/authService";
import { getAllRescueTeams } from "../../services/rescueTeamService"; // nhớ đúng path

const ROLE_ID_MAP = {
  "Admin": "AD",
  "Rescue Coordinator": "RC",
  "Rescue Team": "RT",       // hoặc R6 / gì đó backend yêu cầu
  "Manager": "IM",           // hoặc A0 nếu Manager = Admin
};
const CreateUser = () => {
  const { handleLogout } = useOutletContext();

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
        setLoadingTeams(true)

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

    if (!formData.fullName.trim()) newErrors.fullName = "Full name is required";
    if (!formData.username.trim()) newErrors.username = "Username is required";
    if (!formData.phone.trim()) newErrors.phone = "Phone is required";
    if (!formData.password) newErrors.password = "Password is required";
    if (!formData.confirmPassword) newErrors.confirmPassword = "Confirm password is required";

    if (formData.password && formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    // Phone validation (basic)
    const phoneRegex = /^[0-9]{10,15}$/;
    if (formData.phone && !phoneRegex.test(formData.phone)) {
      newErrors.phone = "Please enter a valid phone number";
    }

    // SỬA: role mapping check (nên có)
    if (!ROLE_ID_MAP[formData.role]) {
      newErrors.role = "Role mapping missing";
    }

    // SỬA: chỉ Rescue Team mới required rescueTeamId
    if (isRescueTeamRole && !formData.rescueTeamId) {
      newErrors.rescueTeamId = "Please select a rescue team";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setToast("");

    if (!validateForm()) {
      setToast("❌ Please fix the errors in the form");
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
      setToast("✅ Account created successfully!");

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
        <h2 className="create-user-title">Create New Account</h2>

        <form onSubmit={handleSubmit} className="create-form">
          <div className="form-group">
            <label htmlFor="role" className="role-label">Role <span>*</span></label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className={errors.role ? "error" : ""}
            >
              <option value="Rescue Coordinator">Rescue Coordinator</option>
              <option value="Rescue Team">Rescue Team</option>
              <option value="Manager">Manager</option>
              <option value="Admin">Admin</option>
            </select>
            {errors.role && <span className="error-message">{errors.role}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="fullName" className="role-label">Full Name <span>*</span></label>
            <input
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Enter full name"
              className={errors.fullName ? "error" : ""}
              required
            />
            {errors.fullName && <span className="error-message">{errors.fullName}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="username" className="role-label">Username <span>*</span></label>
            <input
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Enter username"
              className={errors.username ? "error" : ""}
              required
            />
            {errors.username && <span className="error-message">{errors.username}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="phone" className="role-label">Phone <span>*</span></label>
            <input
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter phone number"
              className={errors.phone ? "error" : ""}
              required
            />
            {errors.phone && <span className="error-message">{errors.phone}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password" className="role-label">Password <span>*</span></label>
            <input
              id="password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter password"
              className={errors.password ? "error" : ""}
              required
            />
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="role-label">Confirm Password <span>*</span></label>
            <input
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm password"
              className={errors.confirmPassword ? "error" : ""}
              required
            />
            {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
          </div>
          {isRescueTeamRole && (
            <>
              <div className="form-group">
                <label htmlFor="rescueTeamId" className="role-label">Rescue Team <span>*</span></label>
                <select
                  id="rescueTeamId"
                  name="rescueTeamId"
                  value={formData.rescueTeamId}
                  onChange={handleChange}
                  className={errors.rescueTeamId ? "error" : ""}
                  disabled={loadingTeams}
                >
                  <option value="">
                    {loadingTeams ? "Loading teams..." : "Select a team"}
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

                  <label htmlFor="isLeader" className="role-label" style={{ color: "brown" }}>Is Leader</label>
                </div>
              </div>
            </>
          )}
          <button type="submit" className="submit">
            Create Account
          </button>
        </form>
      </div>
    </>
  );
};

export default CreateUser;