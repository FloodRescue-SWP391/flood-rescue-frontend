// File này đã được chú thích lại để bạn biết các block realtime/API dùng để làm gì.
import "./ManagerDashboard.css";
import { useEffect, useState } from "react";
import { reliefItemsService } from "../../services/reliefItemService";
import { inventoryService } from "../../services/inventoryService";
import signalRService from "../../services/signalrService";
import { CLIENT_EVENTS } from "../../data/signalrConstants";
import * as XLSX from "xlsx";
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

  const loadProducts = async () => {
    try {
      const res = await reliefItemsService.getAll();
      if (res?.success) setProducts(res.content || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadInventory = async () => {
    try {
      const res = await inventoryService.getInventoryByWarehouse(1);
      if (res?.success) setInventory(res.content || []);
    } catch (err) {
      console.error(err);
    }
  };

  const exportReliefItemsAndInventory = () => {
    const wb = XLSX.utils.book_new();

    const productsSheet = XLSX.utils.json_to_sheet(products);
    const inventorySheet = XLSX.utils.json_to_sheet(inventory);

    XLSX.utils.book_append_sheet(wb, productsSheet, "ReliefItems");
    XLSX.utils.book_append_sheet(wb, inventorySheet, "Inventory");

    XLSX.writeFile(wb, "manager_relief_items_inventory.xlsx");
  };

  // useEffect(() => {
  //   const fetchData = async () => {
  //     loadProducts();
  //     loadInventory();
  //   };
  //   fetchData();
  // }, []);

  // /* =====================
  //     KPI
  // ===================== */

  // const totalProducts = products.length;

  // const totalInventory = inventory.length;

  // const totalQuantity = inventory.reduce((sum, i) => {
  //   return sum + (i.quantity || 0);
  // }, 0);

  // /* =====================
  //     BAR CHART DATA
  // ===================== */

  // const barData = inventory.map((i) => ({
  //   name: i.reliefItemName,
  //   quantity: i.quantity,
  // }));

  // /* =====================
  //     LINE CHART DATA
  // ===================== */

  // const grouped = {};

  // inventory.forEach((i) => {
  //   const date = new Date(i.lastUpdated).toLocaleDateString();

  //   if (!grouped[date]) grouped[date] = 0;

  //   grouped[date] += i.quantity;
  // });

  // const lineData = Object.keys(grouped).map((d) => ({
  //   date: d,
  //   quantity: grouped[d],
  // }));

  useEffect(() => {
    const handleReliefItemsChanged = () => {
      loadProducts();
      loadInventory();
    };

    const init = async () => {
      try {
        await signalRService.startConnection();
        await signalRService.on(
          CLIENT_EVENTS.RELIEF_ORDER_CREATED_COORDINATOR,
          handleReliefItemsChanged,
        );
        await signalRService.on(
          CLIENT_EVENTS.RELIEF_ITEM_CREATED,
          handleReliefItemsChanged,
        );
        await signalRService.on(
          CLIENT_EVENTS.RELIEF_ITEM_UPDATED,
          handleReliefItemsChanged,
        );
      } catch (err) {
        console.error("SignalR init error in ManagerDashboard:", err);
      }
    };
    init();
    return () => {
      signalRService.off(
        CLIENT_EVENTS.RELIEF_ORDER_CREATED_COORDINATOR,
        handleReliefItemsChanged,
      );
      signalRService.off(
        CLIENT_EVENTS.RELIEF_ITEM_CREATED,
        handleReliefItemsChanged,
      );
      signalRService.off(
        CLIENT_EVENTS.RELIEF_ITEM_UPDATED,
        handleReliefItemsChanged,
      );
    };
  }, []);

  const totalProducts = products.length;
  const totalInventory = inventory.length;
  const totalQuantity = inventory.reduce(
    (sum, i) => sum + (i.quantity || 0),
    0,
  );
  const barData = inventory.map((i) => ({
    name: i.reliefItemName,
    quantity: i.quantity,
  }));
  const grouped = {};
  inventory.forEach((i) => {
    const date = new Date(i.lastUpdated).toLocaleDateString();
    grouped[date] = (grouped[date] || 0) + i.quantity;
  });
  const lineData = Object.keys(grouped).map((d) => ({
    date: d,
    quantity: grouped[d],
  }));

  // /* =====================
  //     UI
  // ===================== */

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
                  <div className="dashboardManager-title">
                    Bảng điều khiển quản lý
                  </div>

                  <div className="panel-sub">
                    Quản lý kho, tồn kho và vật phẩm cứu trợ
                  </div>
                </div>
                <div>
                  <button
                    className="btn btn-primary"
                    onClick={exportReliefItemsAndInventory}
                  >
                    Xuất dữ liệu vật phẩm + tồn kho
                  </button>
                </div>
              </div>
            </div>

            {/* KPI */}

            <div className="panel-card">
              <div className="kpi-grid">
                <div className="kpi">
                  <div>
                    <div className="kpi-label">Vật phẩm cứu trợ</div>
                    <div className="kpi-value">{totalProducts}</div>
                  </div>
                </div>

                <div className="kpi">
                  <div>
                    <div className="kpi-label">Bản ghi tồn kho</div>
                    <div className="kpi-value">{totalInventory}</div>
                  </div>
                </div>

                <div className="kpi">
                  <div>
                    <div className="kpi-label">Tổng số lượng</div>
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
                  <div className="panel-card-title">Xu hướng tồn kho</div>
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
                  <div className="panel-card-title">Phân bố tồn kho</div>
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
