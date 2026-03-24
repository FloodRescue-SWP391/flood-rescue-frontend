import { useNavigate } from "react-router-dom";
import Header from "../../components/common/Header";
import "./Unauthorized.css";

export default function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div className="unauth-wrapper">
      <Header />

      <div className="unauth-container">
        <div className="unauth-card">
          <div className="unauth-icon">🚫</div>

          <h2>Truy cập bị từ chối</h2>
          <p>
            Bạn không có quyền truy cập vào trang này.
            Vui lòng đăng nhập đúng tài khoản hoặc liên hệ quản trị viên.
          </p>

          <div className="unauth-buttons">
            <button
              className="btn-home"
              onClick={() => navigate("/", { replace: true })}
            >
              ⬅ Về trang chủ
            </button>

            <button
              className="btn-login"
              onClick={() => navigate("/login", { replace: true })}
            >
              🔐 Đăng nhập lại
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}