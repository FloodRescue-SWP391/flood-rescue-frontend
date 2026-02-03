import { Navigate, Outlet } from "react-router-dom";


export default function ProtectedRoute({ allowedRoles, children }) {
  const isAuth = localStorage.getItem("isAuth") === "true";
  const role = localStorage.getItem("role");

  if (!isAuth) {
    return <Navigate to="/login" replace />
  }

  //Neu sai Quyen thi se tra ve unauthorized
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  console.log("isAuth:", localStorage.getItem("isAuth"));
  console.log("role:", localStorage.getItem("role"));
  console.log("allowedRoles:", allowedRoles);

  // OK-> render
  return children;
}
