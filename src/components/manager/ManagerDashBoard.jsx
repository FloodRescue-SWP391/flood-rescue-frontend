import "../../layout/manager/Manager.css";
import logo from "../../assets/logo.png";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const [openMenu, setOpenMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setOpenMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="manager-root">
      <header>
        <div className="logo">
          <img src={logo} alt="Rescue Now Logo" />
          <span>
            RESCUE.<div className="a">Now</div>
          </span>
        </div>

        <nav>
          <Link to="">Introduce</Link>
          <Link to="">Contact</Link>
          <div className="admin">
            <Link to="">Manager</Link>
          </div>
        </nav>
      </header>

      <div className="manager-body">
       
        <aside className="manager-sidebar">
          
          <div className="sidebar-header" ref={menuRef}>
            <button
              className="sidebar-menu-btn"
              onClick={() => setOpenMenu((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={openMenu}
            >
              <span></span>
              <span></span>
              <span></span>
            </button>

            <h3 className="sidebar-title">Requirement</h3>
            {openMenu && (
              <div className="sidebar-popover" role="menu">
                <button
                  className="sidebar-item"
                  onClick={() => {
                    navigate("/manager");
                    setOpenMenu(false);
                  }}
                >
                  📦 Yêu cầu
                </button>

                <button
                  className="sidebar-item"
                  onClick={() => {
                    navigate("/manager/report");
                    setOpenMenu(false);
                  }}
                >
                  📄 Báo cáo
                </button>

                <button
                  className="sidebar-item"
                  onClick={() => {
                    navigate("/manager/warehouse");
                    setOpenMenu(false);
                  }}
                >
                  🏬 Kho hàng tồn kho
                </button>
              </div>
            )}
          </div>

          <div className="request-item">
            <div>
              <b>Yêu cầu cung cấp vật tư</b>
              <p>Khu vực: Phú Yên</p>
            </div>
            <button>Xem chi tiết</button>
          </div>
        </aside>

        {/* NỘI DUNG CHÍNH */}
        <main className="manager-content">
          <div className="request-card">
            <div className="request-card-header">
              <span>Yêu cầu cung cấp vật tư</span>
              <span className="area">Khu vực: Phú Yên</span>
            </div>

            <div className="request-card-body">
              <div className="team-code">Mã đội:</div>

              <table className="supply-table">
                <thead>
                  <tr>
                    <th>Tên sản phẩm</th>
                    <th>Số lượng</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Thuốc ho</td>
                    <td>20 liều</td>
                  </tr>
                  <tr>
                    <td>Nước</td>
                    <td>100 lốc</td>
                  </tr>
                  <tr>
                    <td>Mì gói</td>
                    <td>20 thùng</td>
                  </tr>
                </tbody>
              </table>

              <button className="notify-btn">NOTIFICATION SENT</button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}