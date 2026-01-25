import "../../layout/manager/ManagerReport.css";


export default function ManagerReport() {
  return (
    <div className="report-page">
      <div className="report-topbar">
        <div className="report-search">
          <input placeholder="Nhập tên đội..." />
          <button>SEARCH</button>
        </div>
      </div>

      <div className="report-card">
        {/* LEFT */}
        <div className="report-left">
          <div className="report-field">
            <div className="label">Mã đội:</div>
            <div className="line" />
          </div>

          <div className="report-field">
            <div className="label">Thời gian:</div>
            <div className="line" />
          </div>

          <button className="report-export">XUẤT FILE</button>
        </div>

        {/* DIVIDER */}
        <div className="report-divider" />

        {/* RIGHT */}
        <div className="report-right">
          <h3>Báo cáo tuần vừa qua</h3>
          <p className="report-sub">
            số sản phẩm đã lấy trong tuần vừa qua ............................................
          </p>

          <table className="report-table">
            <thead>
              <tr>
                <th>Tên sản phẩm</th>
                <th>Số lượng</th>
                <th>Ngày lấy</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
