import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");

  if (!token) {
    // Chưa đăng nhập → quay về trang login (Dashboard)
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
