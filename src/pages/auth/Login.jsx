import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/common/Header";
import "./Login.css";
import { login } from "../../services/authService";
import { Container, Row, Col, Card, Form, Button } from "react-bootstrap";
import Footer from "../../components/common/Footer";

const Dashboard = () => {
  const navigate = useNavigate();

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
      const auth = await login(username, password);
      console.log("Login response:", auth);

      // vì backend bọc trong content
      const content = auth?.content ?? auth?.data?.content ?? auth;
      const roleRaw =
        content?.role ??
        content?.Role ??
        content?.roleName ??
        content?.RoleName ??
        "";
      const token = content?.accessToken ?? content?.AccessToken ?? "";

      if (!roleRaw) {
        console.log("Cannot read role. Raw auth:", auth);
        showToast("Không lấy được role từ response", "error");
        return;
      }

      // ✅ Normalize
      const roleKey = String(roleRaw).trim().toLowerCase();

      // ✅ Map role theo DB (RoleName/RoleID)
      const roleMap = {
        // RoleName trong DB
        admin: "Administrator",
        "inventory manager": "Manager",
        "rescue coordinator": "Coordinator",
        "rescue team member": "RescueTeam",

        // nếu backend trả RoleID
        ad: "Administrator",
        im: "Manager",
        rc: "Coordinator",
        rt: "RescueTeam",
      };

      const role = roleMap[roleKey];

      console.log("roleRaw =", roleRaw, "=> mapped =", role);

      if (!role) {
        showToast(`Role không hợp lệ: ${roleRaw}`, "error");
        return;
      }

      // lưu token/role để ProtectedRoute dùng
      if (token) localStorage.setItem("token", token);
      localStorage.setItem("role", role); // lưu role đã map (FE role)
      localStorage.setItem("isAuth", "true");

      showToast("Đăng nhập thành công", "success");

      console.log("NAVIGATE TO ROLE:", role);
      switch (role) {
        case "Administrator":
          navigate("/admin", { replace: true });
          break;
        case "Manager":
          navigate("/manager", { replace: true });
          break;
        case "RescueTeam": {
          const teamId = content?.teamID || content?.teamId || content?.TeamId;

          if (!teamId) {
            showToast("Không tìm thấy teamId", "error");
            console.log("LOGIN CONTENT:", content);
            return;
          }

          localStorage.setItem("teamId", teamId);

          navigate(`/rescue-team/${teamId}`, { replace: true });

          break;
        }

        case "Coordinator":
          navigate("/coordinator", { replace: true });
          break;
        default:
          navigate("/unauthorized", { replace: true });
      }
    } catch (err) {
      showToast(err?.message || "Đăng nhập thất bại", "error");
    }
  };

  return (
    <div className="login-page bg-light min-vh-100">
      <Header />

      <Container className="py-4 py-md-5">
        <div className="top-bar1">
          <Button
            variant="light"
            className="back-button"
            onClick={() => navigate("/")}
          >
            ← Back
          </Button>
        </div>

        <Row className="justify-content-center  align-items-stretch g-4">
          <Col lg={5} md={6} className="d-flex">
            <Card className="border-0 shadow-lg rounded-4 w-100 h-100">
              <Card.Body className="p-4 p-md-5">
                <div className="text-center mb-4">
                  <h2 className="fw-bold mb-2 display-5">Login Account</h2>
                  <p className="text-muted mb-0 display-7">
                    Sign in to access the rescue management system
                  </p>
                </div>

                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold fs-5">User Name</Form.Label>
                    <Form.Control
                      type="text"
                      size="lg"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter username"
                      className="rounded-3"
                    />
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label className="fw-semibold fs-5">Password</Form.Label>
                    <Form.Control
                      type="password"
                      size="lg"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="rounded-3"
                    />
                  </Form.Group>

                  <div className="d-grid">
                    <button type="submit" className="login-btn1 fw-bold">
                      Login
                    </button>
                  </div>

                  <div className="mt-4">
                    <div className="emergency-box">
                      🚨 Emergency Hotline: 115
                    </div>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={6} md={6} className="d-flex">
            <div className="ps-lg-4 w-100 h-100 d-flex flex-column justify-content-between">
              <div className="mb-3">
                <span className="badge rounded-pill text-bg-danger px-3 py-2">
                  Emergency Support Platform
                </span>
              </div>

              <h1 className="display-5 fw-bold mb-3">Flood Rescue System</h1>

              <p className="lead text-muted mb-4">
                A smart platform designed to coordinate rescue operations and
                manage emergency requests during flood disasters.
              </p>

              <Card className="border-0 shadow-sm rounded-4 mb-3">
                <Card.Body className="d-flex align-items-center gap-3">
                  <div className="fs-3">⚡</div>
                  <div>
                    <div className="fw-bold">Fast emergency coordination</div>
                    <div className="text-muted small">
                      Quickly connect people with rescue coordinators
                    </div>
                  </div>
                </Card.Body>
              </Card>

              <Card className="border-0 shadow-sm rounded-4 mb-3">
                <Card.Body className="d-flex align-items-center gap-3">
                  <div className="fs-3">📍</div>
                  <div>
                    <div className="fw-bold">Real-time rescue tracking</div>
                    <div className="text-muted small">
                      Monitor incidents and rescue progress efficiently
                    </div>
                  </div>
                </Card.Body>
              </Card>

              <Card className="border-0 shadow-sm rounded-4">
                <Card.Body className="d-flex align-items-center gap-3">
                  <div className="fs-3">🤝</div>
                  <div>
                    <div className="fw-bold">
                      Efficient rescue team management
                    </div>
                    <div className="text-muted small">
                      Support teams, tasks, and emergency response workflow
                    </div>
                  </div>
                </Card.Body>
              </Card>
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
