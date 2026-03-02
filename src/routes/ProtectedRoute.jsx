import { Navigate, useLocation } from "react-router-dom";


export default function ProtectedRoute({ allowedRoles, children }) {
  const location = useLocation();

  const isAuth = localStorage.getItem("isAuth") === "true";
  const role = (localStorage.getItem("role") || "").trim();

  console.log("[ProtectedRoute] isAuth:", isAuth, "role:", role, "allowed:", allowedRoles);

  if (!isAuth) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  console.log("isAuth:", localStorage.getItem("isAuth"));
  console.log("role:", localStorage.getItem("role"));
  console.log("allowedRoles:", allowedRoles);

  return children;
}
