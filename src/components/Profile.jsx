import "./Profile.css";
import logo from '../assets/logo.png'

export default function Profile() {
  return (
    <div className="profile-page">
      <header className="profile-nav">
        <div className="logo">
          <img src={logo} alt="Rescue Now Logo" />
          <span>
            RESCUE.<div className="a">Now</div>
          </span>
        </div>
        <div className="avatar">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z"/>
          </svg>
        </div>
      </header>

      <section className="profile-content">
        {/* Profile Avatar */}
        <div className="profile-avatar">
        {/* Avatar can be changed when have api */}
          <img src="https://i.pravatar.cc/150?img=5" alt="User Avatar" />
        </div>

        {/* User Info */}
        {/* Tên có thể sẽ thay đổi theo API */}
        <h2 className="profile-name">Đặng Hoàng Trúc Vy</h2>
        <div className="profile-role">
          <span className="role-text">Manager</span>
          <span className="divider">|</span>
          <span className="status-dot"></span>
          <span className="join-text">Joined:</span>
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
