import { Navigate, Outlet } from "react-router-dom";


export default function ProtectedRoute({ allowedRoles, children }) {

  return children;
}
