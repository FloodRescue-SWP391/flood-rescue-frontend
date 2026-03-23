// File này đã được chú thích lại để bạn biết các block realtime/API dùng để làm gì.
import "./PrepareOrders.css";
import { useEffect, useState } from "react";
import { reliefOrdersService } from "../../services/reliefOrdersService";
import signalRService from "../../services/signalrService";
import { CLIENT_EVENTS } from "../../data/signalrConstants";
export default function PrepareOrder() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showPrepare, setShowPrepare] = useState(false);
  const [items, setItems] = useState([]);

  const loadOrders = async () => {
    try {
      const res = await reliefOrdersService.getPending();
      let list = [];
      if (Array.isArray(res)) list = res;
      else if (Array.isArray(res?.data)) list = res.data;
      else if (Array.isArray(res?.content)) list = res.content;
      else if (Array.isArray(res?.items)) list = res.items;
      else if (Array.isArray(res?.data?.content)) list = res.data.content;
      else if (typeof res === 'object' && res !== null) {
        const potentialArray = Object.values(res).find(Array.isArray);
        if (potentialArray) list = potentialArray;
      }
      setOrders(list);
    } catch (err) {
      console.error(err);
    }
  };

  // Manager nghe event từ coordinator: có relief order mới thì reload danh sách để khỏi cần F5.
  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    const handleReliefOrderCreated = async (data) => {
      console.log("ReliefOrderCreatedCoordinator:", data);
      await loadOrders();
    };

    const init = async () => {
      try {
        await signalRService.startConnection();
        await signalRService.on(CLIENT_EVENTS.RELIEF_ORDER_CREATED_COORDINATOR, handleReliefOrderCreated);
      } catch (err) {
        console.error("SignalR init error in PrepareOrders:", err);
      }
    };

    init();
    return () => {
      signalRService.off(CLIENT_EVENTS.RELIEF_ORDER_CREATED_COORDINATOR, handleReliefOrderCreated);
    };
  }, []);

  /* =========================
        VIEW ORDER
  ========================= */

  const handleView = async (id) => {
    try {
      const res = await reliefOrdersService.getById(id);
      if (res?.success) {
        setSelectedOrder(res.content);
        setItems(res.content.items || []);
        setShowDetail(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openPrepare = async (id) => {
    try {
      const res = await reliefOrdersService.getById(id);
      if (res?.success) {
        setSelectedOrder(res.content);
        setItems(res.content.items || []);
        setShowPrepare(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const changeQty = (index, value) => {
    const updated = [...items];
    updated[index].quantity = Number(value);
    setItems(updated);
  };

  const confirmPrepare = async () => {
    try {
      const payload = {
        reliefOrderID: selectedOrder.reliefOrderID,
        items: items.map((i) => ({ reliefItemID: i.reliefItemID, quantity: Number(i.quantity) })),
      };

      // await reliefOrdersService.prepareOrder(payload);
      const res = await reliefOrdersService.prepareOrder(payload);
      if (!res?.success) throw new Error(res?.message || "Prepare order failed");

      setShowPrepare(false);

      // loadOrders();
      await loadOrders();

    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="prepare-page">
      <div className="prepare-header">
        {/* Quản lý đơn hàng cứu trợ */}
        <h2>Quản lý Đơn hàng Cứu Trợ (Relief Orders)</h2>
        <button className="btn-refresh" onClick={loadOrders}>Làm mới</button>
      </div>

      <div className="prepare-table-container">
        <table className="prepare-table">
          <thead>
            {/* Sửa lỗi lặp 2 dòng thead, loại bỏ 1 dòng thừa */}
            <tr>
              <th>Mã Đơn hàng (Order ID)</th>
              <th>Mã Yêu cầu Cứu hộ</th>
              <th>Đội Cứu hộ</th>
              <th>Trạng thái</th>
              <th>Ngày Tạo</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.reliefOrderID}>
                <td>{o.reliefOrderID?.slice(0,8)}...</td>
                {/* ID yêu cầu và Tên đội có thể hiển thị nếu backend trả về, hoặc map qua field tùy chọn */}
                <td>{o.rescueRequestID || o.rescueRequestId || "Không có"}</td>
                <td>{o.teamName || o.rescueTeamId || "Chưa có đội"}</td>
                <td>
                  <span className={`badge ${o.missionStatus === 'Pending' ? 'badge-warning' : 'badge-primary'}`}>
                    {o.missionStatus || o.status || "Pending"}
                  </span>
                </td>
                <td>{o.createdTime ? new Date(o.createdTime).toLocaleString() : "Không rõ"}</td>
                <td>
                  {/* Nút Xem chi tiết Đơn hàng */}
                  <button
                    className="btn-icon"
                    onClick={() => handleView(o.reliefOrderID)}
                  >
                    Xem
                  </button>

                  {/* Nút Chuẩn bị hàng hóa cho Đơn hàng */}
                  <button
                    className="btn-icon btn-primary"
                    onClick={() => openPrepare(o.reliefOrderID)}
                  >
                    Chuẩn bị
                  </button>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "20px" }}>
                  Chưa có đơn hàng mới nào cần chuẩn bị.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* FORM INFORMATION ĐÀNG HOÀNG: Modal View Chi tiết */}
      {showDetail && selectedOrder && (
        <div className="modal-overlay">
          <div className="modal-box large">
            <h3 className="section-title">Chi tiết Đơn hàng Mới (Relief Order)</h3>
            
            <div className="order-info-card">
              <div className="order-info-grid">
                <div className="info-item">
                  <span className="info-label">Mã Đơn (Order ID)</span>
                  <span className="info-val">{selectedOrder.reliefOrderID}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Đội Cứu hộ (Team)</span>
                  <span className="info-val">{selectedOrder.teamName || selectedOrder.rescueTeamId || "Chưa cập nhật"}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Trạng thái (Status)</span>
                  <span className="info-val">{selectedOrder.missionStatus || selectedOrder.status}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Yêu cầu liên kết (Request ID)</span>
                  <span className="info-val">{selectedOrder.rescueRequestID || selectedOrder.rescueRequestId || "Không có"}</span>
                </div>
              </div>
            </div>

            <h4 className="section-title" style={{ fontSize: "1rem" }}>Danh sách Vật phẩm Cấu thành</h4>
            <table className="prepare-table" style={{ background: "#f8fafc" }}>
              <thead>
                <tr>
                  <th>Vật phẩm (Item)</th>
                  <th>Danh mục (Category)</th>
                  <th>Đơn vị (Unit)</th>
                  <th>Tồn kho (Stock)</th>
                  <th>Số lượng (Qty)</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && <tr><td colSpan={5}>Không có vật phẩm nào</td></tr>}
                {items.map((i, idx) => (
                  <tr key={idx}>
                    <td>{i.reliefItemName || i.itemName}</td>
                    <td>{i.categoryName || i.category}</td>
                    <td>{i.unitName || i.unit}</td>
                    <td>{i.availableStock ?? "N/A"}</td>
                    <td>{i.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="modal-actions" style={{ justifyContent: "flex-end" }}>
              <button className="btn-close" onClick={() => setShowDetail(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* FORM CHUẨN BỊ (PREPARE) BÀI BẢN HƠN */}
      {showPrepare && selectedOrder && (
        <div className="modal-overlay">
          <div className="modal-box large">
            <h3 className="section-title">Chuẩn bị Hàng hóa Xuất Kho</h3>
            
            <div className="order-info-card">
              <div className="order-info-grid">
                <div className="info-item">
                  <span className="info-label">Mã Đơn (Order ID)</span>
                  <span className="info-val">{selectedOrder.reliefOrderID}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Trạng thái</span>
                  <span className="info-val">{selectedOrder.missionStatus || selectedOrder.status}</span>
                </div>
              </div>
              <p style={{ marginTop: "10px", color: "#64748b", fontSize: "14px" }}>
                * Vui lòng kiểm tra và điền số lượng cần xuất cho từng vật phẩm theo thực tế trước khi xác nhận.
              </p>
            </div>

            <table className="prepare-table">
              <thead>
                <tr>
                  <th>Vật phẩm (Item)</th>
                  <th>Danh mục (Category)</th>
                  <th>Đơn vị (Unit)</th>
                  <th>Tồn kho (Stock)</th>
                  <th>Số lượng Chuẩn bị (Qty)</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i, index) => (
                  <tr key={index}>
                    <td>{i.reliefItemName || i.itemName}</td>
                    <td>{i.categoryName || i.category}</td>
                    <td>{i.unitName || i.unit}</td>
                    <td>{i.availableStock ?? "N/A"}</td>
                    <td>
                      <input 
                        type="number" 
                        min="0"
                        value={i.quantity || 0} 
                        onChange={(e) => changeQty(index, e.target.value)} 
                        style={{ padding: "8px", width: "100px", borderRadius: "5px", border: "1px solid #cbd5e1" }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="modal-actions" style={{ justifyContent: "flex-end", gap: "15px", marginTop: "25px" }}>
              <button className="btn-close" onClick={() => setShowPrepare(false)} style={{ background: "#64748b", border: "1px solid #475569" }}>Hủy bỏ (Cancel)</button>
              <button className="btn-icon btn-primary" onClick={confirmPrepare} style={{ padding: "8px 20px" }}>Xác nhận Chuẩn bị (Confirm)</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
