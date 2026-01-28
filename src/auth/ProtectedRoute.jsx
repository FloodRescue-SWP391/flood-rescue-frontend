import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedRoute({ allowedRoles }) {
  const isAuth = localStorage.getItem("isAuth") === "true";
  const role = localStorage.getItem("role");

  // Chưa đăng nhập
  if (!isAuth) { 
    return <Navigate to="/login" replace />;
  }

  // Sai quyền
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }


  return <Outlet />;
}
