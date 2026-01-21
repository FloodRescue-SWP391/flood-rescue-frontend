import React from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";


// Dựa vào ảnh image_17a61d.png:
// Cả 2 file này đều nằm trong thư mục src/components/admin/
import AdminLayout from "./components/admin/AdminDashboard"; // Dashboard đóng vai trò Layout
import CreateUser from "./components/admin/createUser";
import ListUser from "./components/admin/listUser";
import Dashboard from "./components/admin/Dashboard";

import Header from "./components/Header";
import Hero from "./components/Hero";
import Profile from "./components/Profile";

function App() {
  return (
   
    <BrowserRouter>
      <Routes>
        {/* Tự động chuyển hướng về trang tạo user */}
        <Route path="/" element={<Navigate to="/admin/create-user" />} />
        
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="create-user" element={<CreateUser />} />
          <Route path="list-user" element={<ListUser />} />
        </Route>

        {/*Citizen routes*/}

        <Route path="/" element={
          <>
          <Header/>
          <Hero/>
          </>          
        }/>

      </Routes>
      <Dashboard/>
    </BrowserRouter>

  );
}

export default App;