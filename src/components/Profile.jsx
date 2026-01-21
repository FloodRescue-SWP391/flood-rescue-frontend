import '../layout/rescueTeam/Profile.css';
import "../layout/citizen/Header.css";
import logo from '../assets/logo.png';
import { Link } from 'react-router-dom';

export default function Profile() {
  return (
    <div className="profile-page">
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

      <section className="profile-content">
        {/* Profile Avatar */}
        <div className="profile-avatar">
        {/* Avatar can be changed when have api */}
          <img src="https://wp-cms-media.s3.ap-east-1.amazonaws.com/lay_anh_dai_dien_facebook_dep_5_d472871f1d.jpg" alt="User Avatar" />
        </div>

        {/* User Info */}
        {/* Tên có thể sẽ thay đổi theo API */}
        <h2 className="profile-name">Đặng Hoàng Trúc Vy</h2>
        <div className="profile-role">
          <span className="role-text">Manager</span>
          <span className="divider">|</span>
          <span className="status-dot"></span>
          <span className="join-text">Joined: 16/05/2025</span>
        </div>

        {/* Quick Stats */}
        <div className="quick-stats">
          <h3 className="stats-title">Quick Stats</h3>
          <div className="stats-container">
            <div className="stat-box">
                {/* Nhiệm vụ có thể sẽ thay đổi theo API */}
              <span className="stat-number">25</span>
              <span className="stat-label">Tasks</span>
            </div>
            {/* giờ làm có thể sẽ thay đổi theo API */}
            <div className="stat-box worktime-box">
              <span className="stat-number">120</span>
              <span className="stat-label">Work Hours</span>
            </div>
          </div>
        </div>

        {/* Phone Number */}
        {/* Số điện thoại có thể sẽ thay đổi theo API */}
        <div className="phone-info">
          <span>Phone: 0965782358</span>
        </div>

        {/* Action Buttons */}
        <div className="profile-actions">
          <button className="btn btn-change-password">Change Password</button>
          <button className="btn btn-logout">Logout</button>
        </div>
      </section>
    </div>
  );
}
