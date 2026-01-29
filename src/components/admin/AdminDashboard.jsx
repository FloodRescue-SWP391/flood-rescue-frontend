import React from 'react';
import "../../layout/citizen/Header.css";
import "../../layout/admin/AdminDashboard.css";
import logo from '../../assets/logo.png';
import { Outlet, Link, useNavigate } from 'react-router-dom';



const AdminDashboard = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };
  return (
    <div >
      <Outlet />
      
    </div>
  );
};

export default AdminDashboard;