// File này đã được chú thích lại để bạn biết các block realtime/API dùng để làm gì.
import "./PrepareOrders.css";
import { useEffect, useState } from "react";
import { reliefOrdersService } from "../../services/reliefOrdersService";
import signalRService from "../../services/signalrService";
import { CLIENT_EVENTS } from "../../data/signalrConstants";
import { toast } from "react-hot-toast";
import { RefreshCw } from "lucide-react";

export default function PrepareOrder() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showPrepare, setShowPrepare] = useState(false);
  const [items, setItems] = useState([]);

  const extractList = (res) => {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.content)) return res.content;
    if (Array.isArray(res?.items)) return res.items;
    if (Array.isArray(res?.data?.content)) return res.data.content;
    if (typeof res === "object" && res !== null) {
      const potentialArray = Object.values(res).find(Array.isArray);
      if (potentialArray) return potentialArray;
    }
    return [];
  };

  const loadOrders = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      
      // Ưu tiên lấy đơn dạng Supply (nguồn cung cấp vật tư cho Manager)
      const resSupply = await reliefOrdersService.getPendingSupply();
      console.log("getPendingSupply response:", resSupply);
      let list = extractList(resSupply);

      // Nếu API supply không trả về gì, fallback về getPending thông thường
      if (list.length === 0) {
        console.log("Supply list empty, fallback to getPending...");
        const resPending = await reliefOrdersService.getPending();
        console.log("getPending response:", resPending);
        list = extractList(resPending);
      }

      setOrders(list);
      if (!silent) toast.success("Đã cập nhật danh sách đơn hàng.");
    } catch (err) {
      console.error("loadOrders error:", err);
      if (!silent) toast.error("Không thể cập nhật danh sách đơn hàng.");
    } finally {
      if (!silent) setLoading(false);
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
        await signalRService.on(
          CLIENT_EVENTS.RELIEF_ORDER_CREATED_COORDINATOR,
          handleReliefOrderCreated,
        );
      } catch (err) {
        console.error("SignalR init error in PrepareOrders:", err);
      }
    };

    init();
    return () => {
      signalRService.off(
        CLIENT_EVENTS.RELIEF_ORDER_CREATED_COORDINATOR,
        handleReliefOrderCreated,
      );
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
        items: items.map((i) => ({
          reliefItemID: i.reliefItemID,
          quantity: Number(i.quantity),
        })),
      };

      // await reliefOrdersService.prepareOrder(payload);
      const res = await reliefOrdersService.prepareOrder(payload);
      if (!res?.success)
        throw new Error(res?.message || "Prepare order failed");

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
        <h2>Quản lý đơn hàng cứu trợ</h2>
        <button 
          className="btn-refresh" 
          onClick={() => loadOrders()} 
          disabled={loading}
        >
          {loading ? (
            <>
              <RefreshCw className="spinner" size={16} /> Đang tải...
            </>
          ) : (
            "Làm mới"
          )}
        </button>
      </div>

      <div className="prepare-table-container">
        <table className="prepare-table">
          <thead>
            <tr>
              <th>Mã đơn hàng</th>
              <th>Mã yêu cầu cứu hộ</th>
              <th>Đội cứu hộ</th>
              <th>Trạng thái</th>
              <th>Ngày tạo</th>
              <th>Hành động</th>
            </tr>
          </thead>

          <tbody>
            {orders.map((o) => (
              <tr key={o.reliefOrderID}>
                <td>{o.reliefOrderID?.slice(0, 8)}...</td>

                <td>{o.rescueRequestID || o.rescueRequestId || "Không có"}</td>

                <td>{o.teamName || o.rescueTeamId || "Chưa có đội"}</td>

                <td>
                  <span
                    className={`badge ${
                      o.missionStatus === "Pending"
                        ? "badge-warning"
                        : "badge-primary"
                    }`}
                  >
                    {o.missionStatus || o.status || "Pending"}
                  </span>
                </td>

                <td>
                  {o.createdTime
                    ? new Date(o.createdTime).toLocaleString()
                    : "Không rõ"}
                </td>

                <td>
                  <button
                    className="btn-icon"
                    onClick={() => handleView(o.reliefOrderID)}
                  >
                    Xem
                  </button>

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
                <td
                  colSpan={6}
                  style={{ textAlign: "center", padding: "20px" }}
                >
                  Chưa có đơn hàng nào cần chuẩn bị.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL CHI TIẾT */}
      {showDetail && selectedOrder && (
        <div className="modal-overlay">
          <div className="modal-box large">
            <h3 className="section-title">Chi tiết đơn hàng</h3>

            <div className="order-info-card">
              <div className="order-info-grid">
                <div className="info-item">
                  <span className="info-label">Mã đơn</span>
                  <span className="info-val">
                    {selectedOrder.reliefOrderID}
                  </span>
                </div>

                <div className="info-item">
                  <span className="info-label">Đội cứu hộ</span>
                  <span className="info-val">
                    {selectedOrder.teamName ||
                      selectedOrder.rescueTeamId ||
                      "Chưa cập nhật"}
                  </span>
                </div>

                <div className="info-item">
                  <span className="info-label">Trạng thái</span>
                  <span className="info-val">
                    {selectedOrder.missionStatus || selectedOrder.status}
                  </span>
                </div>

                <div className="info-item">
                  <span className="info-label">Mã yêu cầu</span>
                  <span className="info-val">
                    {selectedOrder.rescueRequestID ||
                      selectedOrder.rescueRequestId ||
                      "Không có"}
                  </span>
                </div>
              </div>
            </div>

            <h4 className="section-title" style={{ fontSize: "1rem" }}>
              Danh sách vật phẩm
            </h4>

            <table className="prepare-table" style={{ background: "#f8fafc" }}>
              <thead>
                <tr>
                  <th>Vật phẩm</th>
                  <th>Danh mục</th>
                  <th>Đơn vị</th>
                  <th>Tồn kho</th>
                  <th>Số lượng</th>
                </tr>
              </thead>

              <tbody>
                {items.length === 0 && (
                  <tr>
                    <td colSpan={5}>Không có vật phẩm</td>
                  </tr>
                )}

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

            <div
              className="modal-actions"
              style={{ justifyContent: "flex-end" }}
            >
              <button
                className="btn-close"
                onClick={() => setShowDetail(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHUẨN BỊ */}
      {showPrepare && selectedOrder && (
        <div className="modal-overlay">
          <div className="modal-box large">
            <h3 className="section-title">Chuẩn bị hàng xuất kho</h3>

            <div className="order-info-card">
              <div className="order-info-grid">
                <div className="info-item">
                  <span className="info-label">Mã đơn</span>
                  <span className="info-val">
                    {selectedOrder.reliefOrderID}
                  </span>
                </div>

                <div className="info-item">
                  <span className="info-label">Trạng thái</span>
                  <span className="info-val">
                    {selectedOrder.missionStatus || selectedOrder.status}
                  </span>
                </div>
              </div>

              <p
                style={{
                  marginTop: "10px",
                  color: "#64748b",
                  fontSize: "14px",
                }}
              >
                * Vui lòng kiểm tra và nhập số lượng cần xuất trước khi xác
                nhận.
              </p>
            </div>

            <table className="prepare-table">
              <thead>
                <tr>
                  <th>Vật phẩm</th>
                  <th>Danh mục</th>
                  <th>Đơn vị</th>
                  <th>Tồn kho</th>
                  <th>Số lượng chuẩn bị</th>
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
                        style={{
                          padding: "8px",
                          width: "100px",
                          borderRadius: "5px",
                          border: "1px solid #cbd5e1",
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div
              className="modal-actions"
              style={{
                justifyContent: "flex-end",
                gap: "15px",
                marginTop: "25px",
              }}
            >
              <button
                className="btn-close"
                onClick={() => setShowPrepare(false)}
                style={{
                  background: "#64748b",
                  border: "1px solid #475569",
                }}
              >
                Hủy
              </button>

              <button
                className="btn-icon btn-primary"
                onClick={confirmPrepare}
                style={{ padding: "8px 20px" }}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
