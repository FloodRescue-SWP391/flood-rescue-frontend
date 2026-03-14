import "./ManagerDashboard.css";
import { useEffect, useState } from "react";

import { reliefItemsService } from "../../services/reliefItemService";
import { inventoryService } from "../../services/inventoryService";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar
} from "recharts";

export default function ManagerDashboard() {

  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* =========================
      LOAD DATA
  ========================= */

  const loadData = async () => {

    try {

      setLoading(true);

      const productRes = await reliefItemsService.getAll();
      const inventoryRes = await inventoryService.getInventoryByWarehouse(1);

      if (productRes?.success) {
        setProducts(productRes.content || []);
      }

      if (inventoryRes?.success) {
        setInventory(inventoryRes.content || []);
      }

    } catch (err) {
      console.error(err);
      setError("Failed to load dashboard data.");
    }

    setLoading(false);

  };

  useEffect(() => {
    loadData();
  }, []);

  /* =========================
      KPI
  ========================= */

  const totalProducts = products.length;

  const totalInventory = inventory.length;

  const totalQuantity = inventory.reduce((sum, item) => {
    return sum + (item.quantity || 0);
  }, 0);

  /* =========================
      BAR CHART DATA
  ========================= */

  const barData = inventory.map(item => ({
    name: item.reliefItemName || "Item",
    quantity: item.quantity || 0
  }));

  /* =========================
      LINE CHART DATA
  ========================= */

  const grouped = {};

  inventory.forEach(item => {

    if (!item.lastUpdated) return;

    const date = new Date(item.lastUpdated).toLocaleDateString();

    if (!grouped[date]) grouped[date] = 0;

    grouped[date] += item.quantity || 0;

  });

  const lineData = Object.keys(grouped).map(date => ({
    date,
    quantity: grouped[date]
  }));

  /* =========================
      LOADING
  ========================= */

  if (loading) {
    return <div className="mp-wrap">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="mp-wrap">{error}</div>;
  }

  /* =========================
      UI
  ========================= */

  return (

    <div className="mp-wrap">

      {/* HEADER */}

      <div className="panel-card">

        <div className="panel-head">

          <div className="panel-icon">📊</div>

          <div>

            <div className="panel-title">
              Manager Dashboard
            </div>

            <div className="panel-sub">
              Manage warehouses, inventory and relief items
            </div>

          </div>

        </div>

      </div>

      {/* KPI */}

      <div className="panel-card">

        <div className="kpi-grid">

          <div className="kpi">
            <div className="kpi-label">Relief Items</div>
            <div className="kpi-value">{totalProducts}</div>
          </div>

          <div className="kpi">
            <div className="kpi-label">Inventory Records</div>
            <div className="kpi-value">{totalInventory}</div>
          </div>

          <div className="kpi">
            <div className="kpi-label">Total Quantity</div>
            <div className="kpi-value">{totalQuantity}</div>
          </div>

        </div>

      </div>

      {/* CHART GRID */}

      <div className="mp-grid">

        {/* LINE CHART */}

        <div className="panel-card">

          <div className="panel-card-title">
            Inventory Trend
          </div>

          <div className="chart-box">

            <ResponsiveContainer width="100%" height="100%">

              <LineChart data={lineData}>

                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />

                <Line
                  type="monotone"
                  dataKey="quantity"
                  stroke="#2563eb"
                  strokeWidth={3}
                />

              </LineChart>

            </ResponsiveContainer>

          </div>

        </div>

        {/* BAR CHART */}

        <div className="panel-card">

          <div className="panel-card-title">
            Inventory Distribution
          </div>

          <div className="chart-box">

            <ResponsiveContainer width="100%" height="100%">

              <BarChart data={barData}>

                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />

                <Bar
                  dataKey="quantity"
                  fill="#f59e0b"
                />

              </BarChart>

            </ResponsiveContainer>

          </div>

        </div>

      </div>

    </div>

  );

}