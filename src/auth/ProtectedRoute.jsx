import { Navigate, Outlet } from "react-router-dom";


export default function ProtectedRoute({ allowedRoles, children}) {
  const isAuth = localStorage.getItem("isAuth") === "true";
  const role = localStorage.getItem("role");

  if(!isAuth){
    return <Navigate to= "/login" replace/>
  }

  //Neu sai Quyen thi se tra ve unauthorized
  if(allowedRoles&& !allowedRoles.includes(role)){
    return<Navigate to="/unauthorized" replace/>;
  }

  // OK-> render
  return children;
}
