import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/common/Header";
import "./Login.css";
import { login } from "../../services/authService";
import { Container, Row, Col, Card, Form, Button } from "react-bootstrap";
import Footer from "../../components/common/Footer";

const Dashboard = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "info",
  });

  const showToast = (message, type = "info", duration = 1500) => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type });
    }, duration);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleLogin();
  };

  const handleLogin = async () => {
    if (!username || !password) {
      showToast("Vui lòng điền đầy đủ thông tin", "info");
      return;
    }

    try {
      setIsLoading(true);

      const auth = await login(username, password);
      console.log("Phản hồi đăng nhập:", auth);

      const content = auth?.content ?? auth?.data?.content ?? auth;
      const roleRaw =
        content?.role ??
        content?.Role ??
        content?.roleName ??
        content?.RoleName ??
        "";

      const fullName =
        content?.fullName ??
        content?.FullName ??
        content?.user?.fullName ??
        content?.user?.FullName ??
        content?.profile?.fullName ??
        content?.profile?.FullName ??
        content?.name ??
        content?.Name ??
        content?.username ??
        content?.Username ??
        username;

      const token = content?.accessToken ?? content?.AccessToken ?? "";

      if (!roleRaw) {
        console.log("Cannot read role. Raw auth:", auth);
        showToast("Không lấy được vai trò từ hệ thống", "error");
        return;
      }

      const roleKey = String(roleRaw).trim().toLowerCase();

      const roleMap = {
        admin: "Administrator",
        "inventory manager": "Manager",
        "rescue coordinator": "Coordinator",
        "rescue team member": "RescueTeam",
        ad: "Administrator",
        im: "Manager",
        rc: "Coordinator",
        rt: "RescueTeam",
      };

      const role = roleMap[roleKey];

      if (!role) {
        showToast(`Vai trò không hợp lệ: ${roleRaw}`, "error");
        return;
      }

      if (token) localStorage.setItem("token", token);
      localStorage.setItem("role", role);
      localStorage.setItem("isAuth", "true");
      localStorage.setItem("fullName", fullName);

      if (role === "RescueTeam") {
        const teamId = content?.teamID || content?.teamId || content?.TeamId;

        if (!teamId) {
          showToast("Không tìm thấy mã đội cứu hộ", "error");
          return;
        }

        localStorage.setItem("teamId", teamId);

        showToast("Đăng nhập thành công", "success", 1200);

        setTimeout(() => {
          navigate(`/rescue-team/${teamId}`, { replace: true });
        }, 1200);

        return;
      }

      showToast("Đăng nhập thành công", "success", 1200);

      setTimeout(() => {
        switch (role) {
          case "Administrator":
            navigate("/admin", { replace: true });
            break;
          case "Manager":
            navigate("/manager", { replace: true });
            break;
          case "Coordinator":
            navigate("/coordinator", { replace: true });
            break;
          default:
            navigate("/unauthorized", { replace: true });
        }
      }, 1200);
    } catch (err) {
      console.error("LOGIN ERROR:", err);

      const message =
        err?.response?.data?.message ||
        err?.response?.data?.title ||
        err?.message ||
        "Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản hoặc mật khẩu.";

      showToast(message, "error", 2000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page bg-light min-vh-100">
      <Header />

      <Container className="py-4 py-md-5">
        <div className="top-bar1">
          <Button
            variant="light"
            className="back-button2"
            onClick={() => navigate("/")}
          >
            Quay lại
          </Button>
        </div>

        <Row className="justify-content-center align-items-center g-4 g-lg-5">
          <Col lg={5} md={6} className="d-flex">
            <Card className="login-card border-0 shadow-sm rounded-4 w-100">
              <Card.Body className="p-4 p-md-5">
                <div className="text-center mb-4">
                  <h2 className="login-title fw-bold mb-2">
                    Đăng nhập tài khoản
                  </h2>
                  <p className="login-subtitle mb-0">
                    Đăng nhập để truy cập hệ thống quản lý cứu hộ
                  </p>
                </div>

                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label-custom">
                      Tên đăng nhập
                    </Form.Label>
                    <Form.Control
                      type="text"
                      size="lg"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Nhập tên đăng nhập"
                      className="rounded-3 input-custom"
                    />
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label className="form-label-custom">
                      Mật khẩu
                    </Form.Label>
                    <Form.Control
                      type="password"
                      size="lg"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Nhập mật khẩu"
                      className="rounded-3 input-custom"
                    />
                  </Form.Group>

                  <div className="d-grid">
                    <button
                      type="submit"
                      className="login-btn1 fw-semibold"
                      disabled={isLoading}
                    >
                      {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
                    </button>
                  </div>

                  <div className="mt-4">
                    <div className="emergency-box">
                      🚨 Đường dây nóng khẩn cấp: 115
                    </div>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={6} md={6} className="d-flex">
            <div className="info-panel ps-lg-4 w-100">
              <div className="mb-3">
                <span className="badge rounded-pill info-badge px-3 py-2">
                  Nền tảng hỗ trợ khẩn cấp
                </span>
              </div>

              <h1 className="hero-title mb-3">Hệ thống cứu hộ lũ lụt</h1>

              <p className="hero-desc mb-4">
                Một nền tảng thông minh được thiết kế để điều phối hoạt động cứu
                hộ và quản lý các yêu cầu khẩn cấp trong thiên tai lũ lụt.
              </p>

              <div className="feature-list">
                <div className="feature-item">
                  <div className="feature-icon">⚡</div>
                  <div className="text">
                    <div className="feature-title">
                      Điều phối cứu hộ khẩn cấp nhanh chóng
                    </div>
                    <div className="feature-desc">
                      Kết nối nhanh người gặp nạn với điều phối viên cứu hộ.
                    </div>
                  </div>
                </div>

                <div className="feature-item">
                  <div className="feature-icon">📍</div>
                  <div className="text">
                    <div className="feature-title">
                      Theo dõi cứu hộ theo thời gian thực
                    </div>
                    <div className="feature-desc">
                      Giám sát sự cố và tiến độ cứu hộ một cách hiệu quả.
                    </div>
                  </div>
                </div>

                <div className="feature-item">
                  <div className="feature-icon">🤝</div>
                  <div className="text">
                    <div className="feature-title">
                      Quản lý đội cứu hộ hiệu quả
                    </div>
                    <div className="feature-desc">
                      Hỗ trợ quản lý đội nhóm, nhiệm vụ và quy trình phản ứng
                      khẩn cấp.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Col>
        </Row>

        {toast.show && (
          <div className={`login-toast ${toast.type}`}>{toast.message}</div>
        )}
      </Container>
      <Footer />
    </div>
  );
};

export default Dashboard;
