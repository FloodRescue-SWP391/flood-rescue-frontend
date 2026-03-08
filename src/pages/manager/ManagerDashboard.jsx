import "./Dashboard.css";
import Header from "../../components/common/Header.jsx"
import { useEffect, useMemo, useState } from "react";
import { BarChart3, TrendingUp, Activity, PieChart } from "lucide-react";
import { categoryService } from "../../services/categoryService.js";
import { reliefItemsService } from "../../services/reliefItemService.js";
import { reliefOrdersService } from "../../services/reliefOrdersService.js";
import { inventoryService } from "../../services/inventoryService.js";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import useSignalR from "../../hooks/useSignalR";
import { CLIENT_EVENTS } from "../../data/signalrConstants";
export default function ManagerDashboard() {
  // ====== TEAMS & USAGE FILTER STATE ======
  const [reportTeam, setReportTeam] = useState("");
  const [reportPeriod, setReportPeriod] = useState("week");

  //category STATE
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await categoryService.getAll();
        if (res?.success) {
          setCategories(res.content ||res.data|| []);
        }
      } catch (err) {
        console.error("Load categories failed: ", err);
        setCategories([]);
      }
    };
    loadCategories();
  }, []);
  const categoryNameById = useMemo(() => {
    const map = new Map();
    (categories || []).forEach((c) => {
      const id = c.categoryID ?? c.CategoryID;
      const name = c.categoryName ?? c.CategoryName;
      if (id != null && name) {
        map.set(Number(id), name);
      }
    });
    return map;
  }, [categories]);

  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiveWarehouseID, setReceiveWarehouseID] = useState("");
  const [receiveItems, setReceiveItems] = useState([{ reliefItemID: "", quantity: 0 }]);
  // ===== INVENTORY VIEW STATE =====
  const [selectedWarehouseID, setSelectedWarehouseID] = useState("");
  const [inventoryList, setInventoryList] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState("");

  // ===== ADJUST INVENTORY STATE =====
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustWarehouseID, setAdjustWarehouseID] = useState("");
  const [adjustItems, setAdjustItems] = useState([
    { reliefItemID: "", adjustmentQuantity: 0 },
  ]);


  const openReceive = () => {
    setReceiveWarehouseID("");
    setReceiveItems([{ reliefItemID: "", quantity: 0 }]);
    setShowReceiveModal(true);
  };

  const closeReceive = () => setShowReceiveModal(false);

  const addReceiveRow = () =>
    setReceiveItems((prev) => [...prev, { reliefItemID: "", quantity: 0 }]);

  const removeReceiveRow = (idx) =>
    setReceiveItems((prev) => prev.filter((_, i) => i !== idx));

  const updateReceiveRow = (idx, patch) =>
    setReceiveItems((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const confirmReceive = async () => {
    const whId = Number(receiveWarehouseID);
    if (!whId || whId <= 0) return alert("WarehouseID không hợp lệ");

    const items = receiveItems
      .filter((x) => Number(x.reliefItemID) > 0 && Number(x.quantity) > 0)
      .map((x) => ({ reliefItemID: Number(x.reliefItemID), quantity: Number(x.quantity) }));

    if (items.length === 0) return alert("Bạn chưa nhập item/quantity hợp lệ");

    try {
      const res = await inventoryService.receiveInventory({ warehouseID: whId, items });
      if (!res?.success) return alert(res?.message || "Nhập kho thất bại");

      alert(res?.message || "Nhập kho thành công!");
      closeReceive();
      // reload lại danh sách tồn kho nếu đang xem đúng kho vừa nhập
      if (Number(selectedWarehouseID) === whId) {
        await loadInventoryByWarehouse(whId);
      }
    } catch (e) {
      console.error(e);
      alert(e?.message || "Nhập kho thất bại");
    }
  };
  // ===== ADJUST INVENTORY FUNCTIONS =====
  const openAdjust = () => {
    setAdjustWarehouseID(selectedWarehouseID || "");
    setAdjustItems([{ reliefItemID: "", adjustmentQuantity: 0 }]);
    setShowAdjustModal(true);
  };

  const closeAdjust = () => setShowAdjustModal(false);

  const addAdjustRow = () =>
    setAdjustItems((prev) => [...prev, { reliefItemID: "", adjustmentQuantity: 0 }]);

  const removeAdjustRow = (idx) =>
    setAdjustItems((prev) => prev.filter((_, i) => i !== idx));

  const updateAdjustRow = (idx, patch) =>
    setAdjustItems((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const confirmAdjust = async () => {
    const whId = Number(adjustWarehouseID);
    if (!whId || whId <= 0) return alert("WarehouseID không hợp lệ");

    const items = adjustItems
      .filter(
        (x) =>
          Number(x.reliefItemID) > 0 &&
          Number(x.adjustmentQuantity) !== 0
      )
      .map((x) => ({
        reliefItemID: Number(x.reliefItemID),
        adjustmentQuantity: Number(x.adjustmentQuantity),
      }));

    if (items.length === 0) {
      return alert("Bạn chưa nhập item/adjustment hợp lệ");
    }

    try {
      const res = await inventoryService.adjustInventory({
        warehouseID: whId,
        items,
      });

      if (!res?.success) {
        return alert(res?.message || "Điều chỉnh tồn kho thất bại");
      }

      alert(res?.message || "Điều chỉnh tồn kho thành công!");
      closeAdjust();

      // reload lại danh sách tồn kho nếu đang xem đúng kho vừa chỉnh
      if (Number(selectedWarehouseID) === whId) {
        await loadInventoryByWarehouse(whId);
      }
    } catch (e) {
      console.error(e);
      alert(e?.message || "Điều chỉnh tồn kho thất bại");
    }
  };

  const [products, setProducts] = useState([]);
  const loadItems = async () => {
    try {
      const res = await reliefItemsService.getAll();
      console.log("reliefItemsService: ", res);

      if (res?.success) {
        const rawList = res.content || res.data || [];
        const normalized = rawList.map((p) => ({
          reliefItemID: p.reliefItemID ?? p.ReliefItemID,
          reliefItemName: p.reliefItemName ?? p.ReliefItemName ?? "",
          categoryID: p.categoryID ?? p.CategoryID,
          unit: p.unit ?? p.Unit ?? "",
        }));
        setProducts(normalized);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error("Load relief items failed:", err);
      setProducts([]);
    }
  };
  useEffect(() => {
    loadItems();
  }, []);
  // ===== LOAD INVENTORY BY WAREHOUSE =====
  const loadInventoryByWarehouse = async (warehouseId) => {
    try {
      setInventoryLoading(true);
      setInventoryError("");

      const res = await inventoryService.getInventoryByWarehouse(warehouseId);

      if (!res?.success) {
        setInventoryList([]);
        setInventoryError(res?.message || "Load inventory failed");
        return;
      }

      setInventoryList(Array.isArray(res.content) ? res.content : []);
    } catch (err) {
      console.error("Load inventory failed:", err);
      setInventoryList([]);
      setInventoryError(err?.message || "Load inventory failed");
    } finally {
      setInventoryLoading(false);
    }
  };
  //==Prepare order ==
  const [orders, setOrders] = useState([]);
  const [showPrepareModal, setShowPrepareModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [prepareItems, setPrepareItems] = useState([]); // [{reliefItemID, quantity}]
  // Map reliefItemID -> reliefItemName
  const itemNameById = useMemo(() => {
    const map = new Map();
    (products || []).forEach((p) => {
      const id = p.reliefItemID ?? p.ReliefItemID;
      const name = p.reliefItemName ?? p.ReliefItemName;
      if (id && name) map.set(id, name);
    });
    return map;
  }, [products]);
  const loadOrders = async () => {
    try {
      const res = await reliefOrdersService.getAll(); // hoặc getPending()

      console.log("Orders API response:", res);      // log toàn bộ response
      console.log("Orders data:", res?.data);        // log riêng data

      if (res?.success) {
        const normalized = (res.data || []).map((o) => ({
          reliefOrderID: o.reliefOrderID ?? o.ReliefOrderID ?? o.id,
          status: o.status ?? o.Status,
          missionStatus: o.missionStatus ?? o.MissionStatus,
          warehouseName: o.warehouseName ?? o.WarehouseName ?? "",
          items: (o.items ?? o.Items ?? []).map((x) => ({
            reliefItemID: x.reliefItemID ?? x.ReliefItemID,
            quantity: x.quantity ?? x.Quantity ?? 0,
          })),
        }));

        setOrders(normalized);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error("Load orders failed:", err);
      setOrders([]);
    }
  };
  useEffect(() => {
    //BE Chưa có Get/api/ReliefOrders 
    //loadOrders();
  }, []);



  // ====== PRODUCT USAGE HISTORY (mock) ======
  const productUsageHistory = [
    { teamId: "T1", productName: "Medical Kit", quantity: 3, dateTaken: "2026-01-26" },
    { teamId: "T1", productName: "Stretcher", quantity: 1, dateTaken: "2026-01-25" },
    { teamId: "T2", productName: "First Aid Kit", quantity: 5, dateTaken: "2026-01-27" },
  ];
  // ====== TEAMS (mock) ======
  const teams = [
    { id: "T1", name: "Rescue Team 1" },
    { id: "T2", name: "Rescue Team 2" },
  ];

  const monthlyRescues = [
    { month: "Jan", requests: 45, completed: 42 },
    { month: "Feb", requests: 52, completed: 48 },
    { month: "Mar", requests: 38, completed: 36 },
    { month: "Apr", requests: 61, completed: 58 },
    { month: "May", requests: 55, completed: 52 },
    { month: "Jun", requests: 48, completed: 45 },
  ];

  const emergencyTypes = [
    { name: "Medical", value: 145, color: "#ff3b3b" },
    { name: "Accident", value: 92, color: "#ffe600" },
    { name: "Natural", value: 34, color: "#22c55e" },
    { name: "Other", value: 51, color: "#6366f1" },
  ];

  const responseTimeData = [
    { time: "0-5 min", count: 85 },
    { time: "5-10 min", count: 142 },
    { time: "10-15 min", count: 98 },
    { time: "15-20 min", count: 45 },
    { time: "20+ min", count: 30 },
  ];



  // ====== KPI ======
  const { totalRequests, totalCompleted, successRate } = useMemo(() => {
    const tr = monthlyRescues.reduce((s, m) => s + m.requests, 0);
    const tc = monthlyRescues.reduce((s, m) => s + m.completed, 0);
    const rate = tr === 0 ? 0 : (tc / tr) * 100;
    return {
      totalRequests: tr,
      totalCompleted: tc,
      successRate: rate.toFixed(1),
    };
  }, [monthlyRescues]);

  // ====== ACTIONS ======
  const openPrepare = (order) => {

    setSelectedOrder(order)
    setPrepareItems(order.items || []);
    setShowPrepareModal(true);
  };

  const closePrepare = () => {
    setShowPrepareModal(false);
    setSelectedOrder(null);
    setPrepareItems([]);
  };

  const setPrepareQty = (reliefItemID, qty) => {
    setPrepareItems((prev) =>
      prev.map((x) =>
        x.reliefItemID === reliefItemID ? { ...x, quantity: Number(qty) } : x
      )
    );
  };

  const confirmPrepare = async () => {
    if (!selectedOrder) return;

    const items = prepareItems
      .filter(x => Number(x.quantity) > 0)
      .map(x => ({
        reliefItemID: x.reliefItemID,
        quantity: Number(x.quantity),
      }));

    if (items.length === 0) {
      alert("Bạn chưa nhập số lượng xuất kho");
      return;
    }

    const payload = {
      reliefOrderID: selectedOrder.reliefOrderID,
      items,
    };

    const res = await reliefOrdersService.prepareOrder(payload);

    if (!res?.success) {
      alert(res?.message || "Prepare failed!");
      return;
    }

    alert("Soạn hàng thành công!");
    closePrepare();
    await loadOrders(); // reload từ API
  };


  function getFilteredUsage() {
    const now = new Date();
    const daysLimit =
      reportPeriod === "week"
        ? 7
        : reportPeriod === "month"
          ? 30
          : reportPeriod === "quarter"
            ? 90
            : Infinity;

    return productUsageHistory.filter((item) => {
      if (reportTeam && item.teamId !== reportTeam) return false;

      const itemDate = new Date(item.dateTaken);
      const daysDiff = Math.floor((now - itemDate) / (1000 * 60 * 60 * 24));
      return daysDiff >= 0 && daysDiff <= daysLimit;
    });
  }

  const filteredUsage = useMemo(() => getFilteredUsage(), [reportTeam, reportPeriod]);

  const escapeCSV = (v = "") => `"${String(v).replaceAll('"', '""')}"`;

  const handleExportProductsCSV = () => {
    const rows = [
      ["RESCUE MANAGEMENT SYSTEM"],
      ["Relief Items Report"],
      ["Generated", new Date().toLocaleString()],
      [],
      ["ReliefItemID", "ReliefItemName", "CategoryID", "CategoryName", "Unit"],
      ...products.map((p) => [
        p.reliefItemID,
        p.reliefItemName,
        p.categoryID,
        categoryNameById.get(Number(p.categoryID)) || "",
        p.unit,
      ]),
    ];

    const csv = rows.map((r) => r.map(escapeCSV).join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relief-items-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ===== NEW ITEM (CREATE RELIEF ITEM) MODAL =====
  const [showNewItemModal, setShowNewItemModal] = useState(false);
  const [newItemForm2, setNewItemForm2] = useState({
    reliefItemName: "",
    categoryID: "",
    unit: "",
  });

  const openNewItemModal = () => {
    setNewItemForm2({ reliefItemName: "", categoryID: "", unit: "" });
    setShowNewItemModal(true);
  };

  const closeNewItemModal = () => setShowNewItemModal(false);

  const submitNewItem = async (e) => {
    e?.preventDefault?.();

    const payload = {
      reliefItemName: newItemForm2.reliefItemName.trim(),
      categoryID: Number(newItemForm2.categoryID),
      unit: newItemForm2.unit.trim(),
    };

    if (!payload.reliefItemName) return alert("Product name is required");
    if (!payload.categoryID) return alert("Category is required");
    if (!payload.unit) return alert("Unit is required");

    try {
      const res = await reliefItemsService.create(payload);
      if (!res?.success) {
        alert(res?.message || "Create item failed");
        return;
      }

      alert(res?.message || "Created new item!");
      closeNewItemModal();
      await loadItems(); // reload products list
    } catch (err) {
      console.error(err);
      alert(err?.message || "Create item failed");
    }
  };

  const reportPeriodLabel =
    reportPeriod === "week" ? "Past Week" : reportPeriod === "month" ? "Past Month" : "Past Quarter";

  const totalRetrieved = filteredUsage.reduce((s, x) => s + x.quantity, 0);

  const selectedId =
    selectedOrder?.reliefOrderID ??
    selectedOrder?.ReliefOrderID ??
    selectedOrder?.id;

  const selectedMission =
    selectedOrder?.missionStatus ??
    selectedOrder?.MissionStatus ??
    "";

  const selectedWarehouse =
    selectedOrder?.warehouseName ??
    selectedOrder?.WarehouseName ??
    "";

 // Sử dụng custom hook useSignalR để lắng nghe sự kiện realtime khi có order mới được tạo (dành cho coordinator) để tự động reload orders list và items list.
useSignalR({
  [CLIENT_EVENTS.RELIEF_ORDER_CREATED_COORDINATOR]: () => {
    loadOrders();
    loadItems();
  },
});

  return (
    <div className="manager-root">
      {/* HEADER */}

      <Header />

      {/* MAIN */}
      <main className="manager-content">
        <div className="mp-wrap">
          {/* KPI CARD */}
          <div className="panel-card">
            <div className="panel-head">
              <div className="panel-icon">
                <BarChart3 size={18} />
              </div>
              <div>
                <div className="panel-title">Manager Dashboard</div>
                <div className="panel-sub">Analyze rescue data and manage products</div>
              </div>
            </div>

            <div className="kpi-grid">
              <div className="kpi">
                <div>
                  <div className="kpi-label">Total Requests</div>
                  <div className="kpi-value">{totalRequests}</div>
                </div>
                <Activity />
              </div>

              <div className="kpi">
                <div>
                  <div className="kpi-label">Completed</div>
                  <div className="kpi-value">{totalCompleted}</div>
                </div>
                <TrendingUp />
              </div>

              <div className="kpi">
                <div>
                  <div className="kpi-label">Success Rate</div>
                  <div className="kpi-value">{successRate}%</div>
                </div>
                <PieChart />
              </div>

              <div className="kpi">
                <div>
                  <div className="kpi-label">Avg Response</div>
                  <div className="kpi-value">8.5m</div>
                </div>
                <Activity />
              </div>
            </div>
          </div>

          {/* GRID */}
          <div className="mp-grid">
            {/* LINE */}
            <div className="panel-card">
              <div className="panel-card-title">Rescue Requests Trend</div>
              <div className="chart-box">
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={monthlyRescues}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="requests" stroke="#ff3b3b" strokeWidth={2} />
                    <Line type="monotone" dataKey="completed" stroke="#ff6b00" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* PIE */}
            <div className="panel-card">
              <div className="panel-card-title">Emergency Types Distribution</div>
              <div className="chart-box">
                <ResponsiveContainer width="100%" height={240}>
                  <RePieChart>
                    <Pie
                      data={emergencyTypes}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {emergencyTypes.map((e, i) => (
                        <Cell key={i} fill={e.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* BAR */}
            <div className="panel-card">
              <div className="panel-card-title">Response Time Analysis</div>
              <div className="chart-box">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={responseTimeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#ff6b00" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* PRODUCTS */}
            <div className="panel-card">
              <div className="panel-row">
                <div className="panel-card-title">Rescue Products</div>
                <div className="inventory-toolbar">
                  <button className="btn-yellow" onClick={openNewItemModal}>
                    Add New Item
                  </button>
                  {/* nút nhập kho */}
                  <button className="btn-yellow" onClick={openReceive}>
                    Add Products to WareHouse
                  </button>
                  {/*nút này dùng để receive inventory*/}
                  <button className="btn-yellow" onClick={openAdjust}>
                    Adjust Inventory
                  </button>
                </div>
              </div>

              <div className="product-box">
                <div className="product-list">
                  {products.map((p) => (
                    <div
                      className="product-item"
                      key={p.reliefItemID}
                    >
                      <div>
                        <div className="product-name">{p.reliefItemName}</div>
                        <div className="product-meta">
                          <span>{categoryNameById.get(Number(p.categoryID)) || `Category #${p.categoryID ?? p.CategoryID}`}</span>
                          <span className="dot">•</span>
                          <span>Unit: {p.unit}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {products.length === 0 && (
                    <div style={{ opacity: 0.7, padding: 12 }}>No Products</div>
                  )}
                </div>
              </div>
            </div>
            {/* ===== WAREHOUSE INVENTORY ===== */}
            <div className="panel-card report-card">
              <div className="panel-row">
                <div className="panel-card-title">Warehouse Inventory</div>

                <div className="inventory-toolbar">
                  <input
                    type="number"
                    min={1}
                    placeholder="Warehouse ID"
                    value={selectedWarehouseID}
                    onChange={(e) => setSelectedWarehouseID(e.target.value)}
                  />
                  <button
                    className="btn-yellow"
                    onClick={() => {
                      const id = Number(selectedWarehouseID);
                      if (!id || id <= 0) {
                        alert("WarehouseID không hợp lệ");
                        return;
                      }
                      loadInventoryByWarehouse(id);
                    }}
                  >
                    View Inventory
                  </button>
                </div>
              </div>

              {inventoryLoading && (
                <div className="inventory-loading">Loading inventory...</div>
              )}

              {inventoryError && (
                <div className="inventory-error">{inventoryError}</div>
              )}

              <div className="inventory-table-wrap">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Relief Item</th>
                      <th>Unit</th>
                      <th>Quantity</th>
                      <th>Last Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryList.map((item) => (
                      <tr key={item.inventoryID}>
                        <td>{item.reliefItemName}</td>
                        <td>{item.unit}</td>
                        <td>{item.quantity}</td>
                        <td>{new Date(item.lastUpdated).toLocaleString()}</td>
                      </tr>
                    ))}

                    {!inventoryLoading && inventoryList.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center", opacity: 0.7 }}>
                          No inventory data
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {/* PREPARE ORDERS */}
            <div className="panel-card report-card">
              <div className="panel-row">
                <div className="panel-card-title">Prepare Orders</div>
                <div style={{ opacity: 0.75, fontSize: 13 }}>
                  (Pending + Mission InProgress mới soạn được)
                </div>
              </div>

              <div className="product-box">
                <div className="product-list">
                  {orders.map((o) => {
                    const canPrepare =
                      o.status === "Pending" && o.missionStatus === "InProgress";

                    return (
                      <div className="product-item" key={o.reliefOrderID}>
                        <div>
                          <div className="product-name">Order: {o.reliefOrderID}</div>
                          <div className="product-meta">
                            <span>Status: {o.status}</span>
                            <span className="dot">•</span>
                            <span>Mission: {o.missionStatus}</span>
                            <span className="dot">•</span>
                            <span>{o.warehouseName}</span>
                          </div>
                        </div>

                        <div className="product-right">
                          <button
                            className="btn-yellow"
                            disabled={!canPrepare}
                            onClick={() => openPrepare(o)}
                          >
                            Soạn hàng
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {orders.length === 0 && (
                    <div style={{ opacity: 0.7, padding: 12 }}>No orders</div>
                  )}
                </div>
              </div>
            </div>
            {/* PRODUCT USAGE REPORT (full width) */}
            <div className="panel-card report-card">
              <div className="panel-row">
                <div className="panel-card-title">Product Usage Report</div>

                <button className="btn-yellow" onClick={handleExportProductsCSV}>
                  Export File
                </button>
              </div>

              <div className="report-layout">
                {/* LEFT FILTERS */}
                <div className="report-filters">
                  <div className="field">
                    <label>Team ID:</label>
                    <select value={reportTeam} onChange={(e) => setReportTeam(e.target.value)}>
                      <option value="">All Teams</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label>Time Period:</label>
                    <select value={reportPeriod} onChange={(e) => setReportPeriod(e.target.value)}>
                      <option value="week">Past Week</option>
                      <option value="month">Past Month</option>
                      <option value="quarter">Past Quarter</option>
                    </select>
                  </div>
                </div>

                {/* RIGHT TABLE */}
                <div className="report-tablebox">
                  <div className="report-tablehead">
                    <div className="report-title">Products Taken in the {reportPeriodLabel}</div>
                    <div className="report-sub">Total products retrieved: {totalRetrieved}</div>
                  </div>

                  <div className="modal-table-wrap">
                    <table className="report-table">
                      <thead>
                        <tr>
                          <th>Product Name</th>
                          <th>Quantity</th>
                          <th>Date Taken</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsage.map((item, idx) => (
                          <tr key={idx}>
                            <td>{item.productName}</td>
                            <td>{item.quantity}</td>
                            <td>{item.dateTaken}</td>
                          </tr>
                        ))}
                        {filteredUsage.length === 0 && (
                          <tr>
                            <td colSpan={3} style={{ textAlign: "center", opacity: 0.7 }}>
                              No data
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                </div>
              </div>
            </div>
          </div>

          {/* PREPARE MODAL */}
          {showPrepareModal && (
            <div className="mp-modal-overlay">
              <div className="mp-modal">
                <div className="mp-modal-title">
                  Soạn hàng cho Order {selectedId}
                </div>

                <div style={{ marginBottom: 12, opacity: 0.85 }}>
                  Mission: {selectedMission} • Kho: {selectedWarehouse}
                </div>

                <div className="modal-table-wrap">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Relief Item</th>
                        <th style={{ width: 140 }}>Quantity</th>
                        <th style={{ width: 120 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {prepareItems.map((x) => (
                        <tr key={x.reliefItemID}>
                          <td>{itemNameById.get(x.reliefItemID) || x.reliefItemID}</td>
                          <td>
                            <input
                              className="modal-table-input"
                              type="number"
                              min={0}
                              value={x.quantity}
                              onChange={(e) => setPrepareQty(x.reliefItemID, e.target.value)}
                            />
                          </td>
                        </tr>
                      ))}

                      {prepareItems.length === 0 && (
                        <tr>
                          <td colSpan={2} style={{ textAlign: "center", opacity: 0.7 }}>
                            No items
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mp-modal-actions">
                  <button type="button" className="btn-ghost" onClick={closePrepare}>
                    Cancel
                  </button>
                  <button type="button" className="btn-red" onClick={confirmPrepare}>
                    Xuất kho / Xác nhận soạn xong
                  </button>
                </div>
              </div>
            </div>
          )}
          {/*RECEIVEMODAL*/}
          {showReceiveModal && (
            <div className="mp-modal-overlay">
              <div className="mp-modal">
                <div className="mp-modal-title">Receive Inventory</div>

                <div className="field">
                  <label>Warehouse *</label>
                  <input
                    type="number"
                    min={1}
                    value={receiveWarehouseID}
                    onChange={(e) => setReceiveWarehouseID(e.target.value)}
                  />
                </div>

                <div className="report-tablewrap">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Relief Item</th>
                        <th style={{ width: 140 }}>Quantity</th>
                        <th style={{ width: 90 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {receiveItems.map((row, idx) => (
                        <tr key={idx}>
                          <td>
                            <select
                              className="modal-table-input"
                              value={row.reliefItemID}
                              onChange={(e) => updateReceiveRow(idx, { reliefItemID: e.target.value })}
                            >
                              <option value="">-- Select item --</option>
                              {products.map((p) => (
                                <option key={p.reliefItemID} value={p.reliefItemID}>
                                  {p.reliefItemName}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td>
                            <input
                              className="modal-table-input"
                              type="number"
                              min={0}
                              value={row.quantity}
                              onChange={(e) => updateReceiveRow(idx, { quantity: e.target.value })}
                            />
                          </td>

                          <td>
                            <button
                              type="button"
                              className="link link-danger"
                              onClick={() => removeReceiveRow(idx)}
                              disabled={receiveItems.length === 1}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: 10 }}>
                  <button type="button" className="btn-ghost" onClick={addReceiveRow}>
                    + Add item
                  </button>
                </div>

                <div className="mp-modal-actions">
                  <button type="button" className="btn-ghost" onClick={closeReceive}>
                    Cancel
                  </button>
                  <button type="button" className="btn-red" onClick={confirmReceive}>
                    Confirm Receive
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* ===== ADJUST INVENTORY MODAL ===== */}
          {showAdjustModal && (
            <div className="mp-modal-overlay">
              <div className="mp-modal">
                <div className="mp-modal-title">Adjust Inventory</div>

                <div className="field">
                  <label>Warehouse *</label>
                  <input
                    type="number"
                    min={1}
                    value={adjustWarehouseID}
                    onChange={(e) => setAdjustWarehouseID(e.target.value)}
                  />
                </div>

                <div className="modal-table-wrap">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Relief Item</th>
                        <th style={{ width: 160 }}>Adjustment Qty</th>
                        <th style={{ width: 90 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {adjustItems.map((row, idx) => (
                        <tr key={idx}>
                          <td>
                            <select
                              className="modal-table-input"
                              value={row.reliefItemID}
                              onChange={(e) =>
                                updateAdjustRow(idx, { reliefItemID: e.target.value })
                              }
                            >
                              <option value="">-- Select item --</option>
                              {products.map((p) => (
                                <option key={p.reliefItemID} value={p.reliefItemID}>
                                  {p.reliefItemName}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td>
                            <input
                              className="modal-table-input"
                              type="number"
                              value={row.adjustmentQuantity}
                              onChange={(e) =>
                                updateAdjustRow(idx, { adjustmentQuantity: e.target.value })
                              }
                            />
                          </td>

                          <td>
                            <button
                              type="button"
                              className="link link-danger"
                              onClick={() => removeAdjustRow(idx)}
                              disabled={adjustItems.length === 1}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: 10 }}>
                  <button type="button" className="btn-ghost" onClick={addAdjustRow}>
                    + Add item
                  </button>
                </div>

                <div className="mp-modal-actions">
                  <button type="button" className="btn-ghost" onClick={closeAdjust}>
                    Cancel
                  </button>
                  <button type="button" className="btn-red" onClick={confirmAdjust}>
                    Confirm Adjust
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* NEW ITEM MODAL (Create Relief Item) */}
          {showNewItemModal && (
            <div className="mp-modal-overlay">
              <div className="mp-modal">
                <div className="mp-modal-title">Add New Item</div>

                <form onSubmit={submitNewItem}>
                  <div className="field">
                    <label>Product Name *</label>
                    <input
                      required
                      value={newItemForm2.reliefItemName}
                      onChange={(e) =>
                        setNewItemForm2({ ...newItemForm2, reliefItemName: e.target.value })
                      }
                    />
                  </div>

                  <div className="field">
                    <label>Category *</label>
                    <select
                      required
                      value={newItemForm2.categoryID}
                      onChange={(e) =>
                        setNewItemForm2({ ...newItemForm2, categoryID: e.target.value })
                      }
                    >
                      <option value="">Select category</option>
                      {categories.map((c) => (
                        <option
                          key={c.categoryID ?? c.CategoryID}
                          value={c.categoryID ?? c.CategoryID}
                        >
                          {c.categoryName ?? c.CategoryName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label>Unit *</label>
                    <input
                      required
                      value={newItemForm2.unit}
                      onChange={(e) =>
                        setNewItemForm2({ ...newItemForm2, unit: e.target.value })
                      }
                    />
                  </div>

                  <div className="mp-modal-actions">
                    <button type="button" className="btn-ghost" onClick={closeNewItemModal}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-red">
                      Add
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div >
      </main >
    </div >
  );
}
