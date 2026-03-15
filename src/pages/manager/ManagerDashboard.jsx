import "./ManagerDashboard.css";
import Header from "../../components/common/Header";
import ManagerSidebar from "../../components/manager/ManagerSidebar";
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
  Bar,
} from "recharts";

export default function ManagerDashboard() {
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);

  /* =====================
      LOAD DATA
  ===================== */

  const loadProducts = async () => {
    try {
      const res = await reliefItemsService.getAll();

      if (res?.success) {
        setProducts(res.content || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadInventory = async () => {
    try {
      const res = await inventoryService.getInventoryByWarehouse(1);

      if (res?.success) {
        setInventory(res.content || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      loadProducts();
      loadInventory();
    };
    fetchData();
  }, []);

  /* =====================
      KPI
  ===================== */

  const totalProducts = products.length;

  const totalInventory = inventory.length;

  const totalQuantity = inventory.reduce((sum, i) => {
    return sum + (i.quantity || 0);
  }, 0);

  /* =====================
      BAR CHART DATA
  ===================== */

  const barData = inventory.map((i) => ({
    name: i.reliefItemName,
    quantity: i.quantity,
  }));

  /* =====================
      LINE CHART DATA
  ===================== */

  const grouped = {};

  inventory.forEach((i) => {
    const date = new Date(i.lastUpdated).toLocaleDateString();

    if (!grouped[date]) grouped[date] = 0;

    grouped[date] += i.quantity;
  });

  const lineData = Object.keys(grouped).map((d) => ({
    date: d,
    quantity: grouped[d],
  }));

  /* =====================
      UI
  ===================== */

  return (
    <>
      <div className="manager-layout">
        {/* CONTENT */}
        <div className="manager-content">
          <div className="mp-wrap">
            {/* HEADER */}

            <div className="panel-header">
              <div className="panel-head">
              

                <div>
                  <div className="dashboardManager-title">Manager Dashboard</div>

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
                  <div>
                    <div className="kpi-label">Relief Items</div>
                    <div className="kpi-value">{totalProducts}</div>
                  </div>
                </div>

                <div className="kpi">
                  <div>
                    <div className="kpi-label">Inventory Records</div>
                    <div className="kpi-value">{totalInventory}</div>
                  </div>
                </div>

                <div className="kpi">
                  <div>
                    <div className="kpi-label">Total Quantity</div>
                    <div className="kpi-value">{totalQuantity}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* CHART GRID */}

            <div className="mp-grid">
              {/* LINE */}

              <div className="panel-card">
                <div className="panel-row">
                  <div className="panel-card-title">Inventory Trend</div>
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
                        stroke="#ff3b3b"
                        strokeWidth={3}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* BAR */}

              <div className="panel-card">
                <div className="panel-row">
                  <div className="panel-card-title">Inventory Distribution</div>
                </div>

                <div className="chart-box">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData}>
                      <CartesianGrid strokeDasharray="3 3" />

                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />

                      <Bar dataKey="quantity" fill="#ff7a00" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
