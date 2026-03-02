import { Navigate, useLocation } from "react-router-dom";


export default function ProtectedRoute({ allowedRoles, children }) {
const token = localStorage.getItem("accessToken");
  const role = localStorage.getItem("role"); // lưu khi login

  const isAuth = !!token;

  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
