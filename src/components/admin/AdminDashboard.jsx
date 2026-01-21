import React from 'react';
import "../../layout/citizen/Header.css";
import "../../layout/admin/AdminDashboard.css";
import logo from '../../assets/logo.png';
import { Outlet, Link } from 'react-router-dom';



const AdminDashboard = () => {
  return (
    <div >
      <header>
        <div className="logo">
          <img src={logo} alt="Rescue Now Logo" />
          <span>RESCUE.<div className='a'>Now</div></span>
        </div>

        <nav>
          <Link to="">Introduce</Link>
          <Link to="">Contact</Link>
          <div className='admin'>
            <img src="https://www.dichvuinnhanh.com/wp-content/uploads/2024/12/co-be-doi-mu-tho-dang-yeu-301e026a.webp" alt="" />
            <Link to="">Admin</Link>
          </div>
        </nav>
      </header>

      {/* MAIN LAYOUT */}
      <div className="admin-body">
        {/* SIDEBAR BÊN TRÁI */}
        <aside className="admin-sidebar">
          <h3>Member Management</h3>
          <ul>
            <li><Link to="/admin/create-user">➕ Create User</Link></li>
            <li><Link to="/admin/list-user">📋 List Users</Link></li>
          </ul>
          <h3>Settings</h3>
          <ul>
            <li><Link to="/rescueTeam/Profile">👤 Profile</Link></li>
            <li><Link to="/admin/settings">🚪 Logout</Link></li>
          </ul>
        </aside>

        {/* NỘI DUNG ROUTE CON */}
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;