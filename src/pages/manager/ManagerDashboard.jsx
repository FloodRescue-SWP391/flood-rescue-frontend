import "./Dashboard.css";
import Header from "../../components/common/Header.jsx"
import "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { BarChart3, TrendingUp, Activity, PieChart } from "lucide-react";
import { categoryService } from "../../services/categoryService.js";
import { reliefItemsService } from "../../services/reliefItemService.js";


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
          setCategories(res.data || []);
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

  const [products, setProducts] = useState([]);
  const loadItems = async () => {
    try {
      const res = await reliefItemsService.getAll();
      if (res?.success) setProducts(res.data || []);
      else setProducts([]);
    } catch (err) {
      console.error("Load relief items failed:", err);
      setProducts([]);
    }
  };
  useEffect(() => {
    loadItems();
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

  // ====== MODAL ======
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [formData, setFormData] = useState({
    reliefItemName: "",
    categoryID: "",
    unit: "",
  });

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
  const openAdd = () => {
    setEditingProduct(null);
    setFormData({ reliefItemName: "", categoryID: "", unit: "" });
    setShowModal(true);
  };

  const openEdit = (p) => {
    setEditingProduct(p);
    setFormData({
      reliefItemName: p.reliefItemName || "",
      categoryID: Number(p.categoryID ?? p.CategoryID ?? 0),
      unit: p.unit || "",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
  };

  const submit = async(e) => {
    e.preventDefault();

    const payload = {
      reliefItemName: formData.reliefItemName,
      categoryID: Number(formData.categoryID),
      unit: formData.unit,
    };
    try {
      if (editingProduct) {
        await reliefItemsService.update(editingProduct.reliefItemID, payload);
      } else {
        await reliefItemsService.create(payload);
      }
      await loadItems(); // reload lại list từ API
      closeModal();
    } catch (err) {
      console.error("Save relief item failed:", err);
      alert("Save failed!");
    }
  };

  const del = async (id) => {
    if (!confirm("Delete this product?")) return;

    try {
      await reliefItemsService.remove(id);
      await loadItems();
    } catch (err) {
      console.error("Delete relief item failed:", err);
      alert("Delete failed!");
    }
  };

  const badgeClass = (st) => {
    if (st === "available") return "badge badge-available";
    if (st === "out-of-stock") return "badge badge-outofstock";
    return "badge";
  };

  const badgeLabel = (st) => (st === "out-of-stock" ? "out of stock" : "available");


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
        p.categoryID ?? p.CategoryID,
        categoryNameById.get(Number(p.categoryID ?? p.CategoryID)) || "",
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

  const reportPeriodLabel =
    reportPeriod === "week" ? "Past Week" : reportPeriod === "month" ? "Past Month" : "Past Quarter";

  const totalRetrieved = filteredUsage.reduce((s, x) => s + x.quantity, 0);

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
                <ResponsiveContainer width="100%" height="100%">
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
                <ResponsiveContainer width="100%" height="100%">
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
                <ResponsiveContainer width="100%" height="100%">
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
                <button className="btn-yellow" onClick={openAdd}>
                  Add New Product
                </button>
              </div>

              <div className="product-box">
                <div className="product-list">
                  {products.map((p) => (
                    <div
                      className="product-item"
                      key={p.reliefItemID}
                      role="button"
                      tabIndex={0}
                      onClick={() => openEdit(p)}
                      onKeyDown={(e) => e.key === "Enter" && openEdit(p)}
                      style={{ cursor: "pointer" }}
                    >
                      <div>
                        <div className="product-name">{p.reliefItemName}</div>
                        <div className="product-meta">
                          <span>{categoryNameById.get(Number(p.categoryID ?? p.CategoryID)) || `Category #${p.categoryID ?? p.CategoryID}`}</span>
                          <span className="dot">•</span>
                          <span>Unit: {p.unit}</span>
                        </div>
                      </div>

                      <div className="product-right">
                        <button
                          className="link link-danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            del(p.reliefItemID);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
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

                  <div className="report-tablewrap">
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

          {/* MODAL */}
          {showModal && (
            <div className="mp-modal-overlay">
              <div className="mp-modal">
                <div className="mp-modal-title">{editingProduct ? "Edit Product" : "Add New Product"}</div>

                <form onSubmit={submit}>
                  <div className="field">
                    <label>Product Name *</label>
                    <input
                      required
                      value={formData.reliefItemName}
                      onChange={(e) => setFormData({ ...formData, reliefItemName: e.target.value })}
                    />
                  </div>

                  <div className="field">
                    <label>Category *</label>
                    <select
                      required
                      value={formData.categoryID}
                      onChange={(e) => setFormData({ ...formData, categoryID: Number(e.target.value) })}
                    >
                      <option value="">Select category</option>
                      {categories.map((c) => (
                        <option key={c.categoryID} value={c.categoryID}>
                          {c.categoryName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label>Unit *</label>
                    <input
                      type="text"
                      required
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    />
                  </div>

                  <div className="mp-modal-actions">
                    <button type="button" className="btn-ghost" onClick={closeModal}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-red">
                      {editingProduct ? "Update" : "Add"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )
          }
        </div >
      </main >
    </div >
  );
}
