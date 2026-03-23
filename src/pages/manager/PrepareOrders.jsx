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
      if (res?.success) setOrders(res.content || []);
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
        <h2>Relief Orders Management</h2>
        <button className="btn-refresh" onClick={loadOrders}>Refresh</button>
      </div>

      <div className="prepare-table-container">
        <table className="prepare-table">
          <thead>

            <tr>
              <th>Order ID</th>
              <th>Rescue Request</th>
              <th>Team</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
            <tr><th>Order ID</th><th>Rescue Request</th><th>Team</th><th>Status</th><th>Created</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.reliefOrderID}>
                <td>{o.reliefOrderID?.slice(0,8)}...</td>
                <td>{o.rescueRequestID}</td>
                <td>{o.teamName}</td>
                <td>{o.missionStatus}</td>
                <td>{o.createdTime}</td>
                <td>

                  <button
                    className="btn-icon"
                    onClick={() => handleView(o.reliefOrderID)}
                  >
                    View
                  </button>

                  <button
                    className="btn-icon btn-primary"
                    onClick={() => openPrepare(o.reliefOrderID)}
                  >
                    Prepare
                  </button>

                
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showDetail && selectedOrder && (
        <div className="modal-overlay"><div className="modal-box large"><h3>Order Details</h3>
          <p><b>Order ID:</b> {selectedOrder.reliefOrderID}</p>
          <p><b>Team:</b> {selectedOrder.teamName}</p>
          <p><b>Status:</b> {selectedOrder.status}</p>
          <table className="prepare-table"><thead><tr><th>Item</th><th>Category</th><th>Unit</th><th>Stock</th><th>Quantity</th></tr></thead><tbody>
            {items.map((i) => <tr key={i.reliefItemID}><td>{i.itemName}</td><td>{i.category}</td><td>{i.unit}</td><td>{i.availableStock}</td><td>{i.quantity}</td></tr>)}
          </tbody></table>
          <button className="btn-close" onClick={() => setShowDetail(false)}>Close</button>
        </div></div>
      )}

      {showPrepare && selectedOrder && (
        <div className="modal-overlay"><div className="modal-box large"><h3>Prepare Relief Order</h3>
          <p><b>Order ID:</b> {selectedOrder.reliefOrderID}</p>
          <table className="prepare-table"><thead><tr><th>Item</th><th>Category</th><th>Unit</th><th>Stock</th><th>Quantity</th></tr></thead><tbody>
            {items.map((i, index) => (
              <tr key={i.reliefItemID}><td>{i.itemName}</td><td>{i.category}</td><td>{i.unit}</td><td>{i.availableStock}</td>
                <td><input type="number" value={i.quantity} onChange={(e) => changeQty(index, e.target.value)} /></td></tr>
            ))}
          </tbody></table>
          <div className="modal-actions"><button className="btn-close" onClick={() => setShowPrepare(false)}>Cancel</button><button className="btn-icon btn-primary" onClick={confirmPrepare}>Confirm Prepare</button></div>
        </div></div>
      )}
    </div>
  );
}
