import "./ManagerDashboard.css";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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

const NOTI_STORAGE_KEY = "manager_notifications";

const extractList = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.content)) return res.content;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data?.content)) return res.data.content;
  return [];
};

const pickFirst = (source, keys, fallback = "") => {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return fallback;
};

const createTimestamp = () => new Date().toLocaleString("vi-VN");

const mergeNotifications = (oldList, newList) => {
  const map = new Map();

  [...newList, ...oldList].forEach((item) => {
    const key = String(item.id);

    if (!map.has(key)) {
      map.set(key, item);
      return;
    }

    const oldItem = map.get(key);
    map.set(key, {
      ...oldItem,
      ...item,
      read: oldItem.read ?? item.read ?? false,
    });
  });

  return Array.from(map.values()).sort(
    (a, b) =>
      new Date(b.createdAt || b.timestamp).getTime() -
      new Date(a.createdAt || a.timestamp).getTime(),
  );
};

export default function ManagerDashboard() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem(NOTI_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error("Load manager notifications failed:", error);
      return [];
    }
  });
  const [showNotifications, setShowNotifications] = useState(false);
  const [userFullName, setUserFullName] = useState("");

  const loadProducts = async () => {
    try {
      const res = await reliefItemsService.getAll();
      setProducts(extractList(res));
    } catch (err) {
      console.error("Load products failed:", err);
      setProducts([]);
    }
  };

  const loadInventory = async () => {
    try {
      const res = await inventoryService.getInventoryByWarehouse(1);
      setInventory(extractList(res));
    } catch (err) {
      console.error("Load inventory failed:", err);
      setInventory([]);
    }
  };

  const loadDashboardData = async () => {
    await Promise.all([loadProducts(), loadInventory()]);
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    try {
      const savedFullName =
        localStorage.getItem("fullName") ||
        localStorage.getItem("userFullName") ||
        "";

      setUserFullName(savedFullName);
    } catch (error) {
      console.error("Load manager fullName failed:", error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(NOTI_STORAGE_KEY, JSON.stringify(notifications));
    } catch (error) {
      console.error("Save manager notifications failed:", error);
    }
  }, [notifications]);

  const exportReliefItemsAndInventory = () => {
    const wb = XLSX.utils.book_new();

    const productsSheet = XLSX.utils.json_to_sheet(products);
    const inventorySheet = XLSX.utils.json_to_sheet(inventory);

    XLSX.utils.book_append_sheet(wb, productsSheet, "ReliefItems");
    XLSX.utils.book_append_sheet(wb, inventorySheet, "Inventory");

    XLSX.writeFile(wb, "manager_relief_items_inventory.xlsx");
  };

  const handleLogout = async () => {
    try {
      await signalRService.stopConnection();
    } catch (error) {
      console.warn("SignalR stop failed:", error);
    }

    localStorage.removeItem("auth");
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("isAuth");
    localStorage.removeItem("fullName");
    localStorage.removeItem("userFullName");
    localStorage.removeItem("userId");
    localStorage.removeItem("teamId");
    localStorage.removeItem("isLeader");

    navigate("/login", { replace: true });
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  };

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  };

  const goToNotificationDetail = (notification) => {
    if (!notification) return;

    setNotifications((prev) =>
      prev.map((item) =>
        item.id === notification.id ? { ...item, read: true } : item,
      ),
    );
    setShowNotifications(false);

    if (notification.targetRoute === "/manager/orders") {
      navigate(notification.targetRoute, {
        state: notification.referenceId
          ? { openOrderId: notification.referenceId }
          : undefined,
      });
      return;
    }

    if (notification.targetRoute) {
      navigate(notification.targetRoute);
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case "order":
        return { bg: "#fef3c7", border: "#f59e0b", icon: "📦" };
      case "supply":
        return { bg: "#dcfce7", border: "#16a34a", icon: "🆕" };
      case "inventory":
        return { bg: "#dbeafe", border: "#2563eb", icon: "📝" };
      default:
        return { bg: "#f3f4f6", border: "#6b7280", icon: "🔔" };
    }
  };

  useEffect(() => {
    const handleReliefOrderCreated = async (data) => {
      console.log("ReliefOrderCreatedCoordinator:", data);

      const reliefOrderId = pickFirst(data, [
        "reliefOrderID",
        "ReliefOrderID",
        "reliefOrderId",
        "ReliefOrderId",
        "id",
        "ID",
      ]);
      const requestCode = pickFirst(data, [
        "requestShortCode",
        "RequestShortCode",
        "shortCode",
        "ShortCode",
        "rescueRequestCode",
        "RescueRequestCode",
        "rescueRequestID",
        "RescueRequestID",
        "rescueRequestId",
        "RescueRequestId",
      ]);
      const teamName = pickFirst(data, ["teamName", "TeamName"]);
      const messageParts = [];

      if (requestCode) {
        messageParts.push(`Có đơn cứu trợ mới cho yêu cầu #${requestCode}.`);
      } else {
        messageParts.push("Có đơn cứu trợ mới cần được chuẩn bị.");
      }

      if (teamName) {
        messageParts.push(`Đội nhận đơn: ${teamName}.`);
      }

      setNotifications((prev) =>
        mergeNotifications(prev, [
          {
            id: `order-${reliefOrderId || requestCode || Date.now()}`,
            type: "order",
            title: "Đơn cứu trợ mới",
            message: messageParts.join(" "),
            referenceId: reliefOrderId || "",
            targetRoute: "/manager/orders",
            timestamp: createTimestamp(),
            createdAt: new Date().toISOString(),
            read: false,
          },
        ]),
      );

      await loadDashboardData();
    };

    const handleReliefItemCreated = async (data) => {
      console.log("ReliefItemCreated:", data);

      const itemId = pickFirst(data, [
        "reliefItemID",
        "ReliefItemID",
        "reliefItemId",
        "ReliefItemId",
        "id",
        "ID",
      ]);
      const itemName = pickFirst(
        data,
        [
          "reliefItemName",
          "ReliefItemName",
          "itemName",
          "ItemName",
          "name",
          "Name",
        ],
        "Vật phẩm mới",
      );

      setNotifications((prev) =>
        mergeNotifications(prev, [
          {
            id: `item-created-${itemId || itemName}`,
            type: "supply",
            title: "Thêm vật phẩm cứu trợ",
            message: `${itemName} vừa được thêm vào danh mục vật phẩm.`,
            referenceId: itemId || itemName,
            targetRoute: "/manager/items",
            timestamp: createTimestamp(),
            createdAt: new Date().toISOString(),
            read: false,
          },
        ]),
      );

      await loadDashboardData();
    };

    const handleReliefItemUpdated = async (data) => {
      console.log("ReliefItemUpdated:", data);

      const itemId = pickFirst(data, [
        "reliefItemID",
        "ReliefItemID",
        "reliefItemId",
        "ReliefItemId",
        "id",
        "ID",
      ]);
      const itemName = pickFirst(
        data,
        [
          "reliefItemName",
          "ReliefItemName",
          "itemName",
          "ItemName",
          "name",
          "Name",
        ],
        "Vật phẩm cứu trợ",
      );

      setNotifications((prev) =>
        mergeNotifications(prev, [
          {
            id: `item-updated-${itemId || itemName}`,
            type: "inventory",
            title: "Cập nhật vật phẩm",
            message: `${itemName} vừa được cập nhật trong hệ thống.`,
            referenceId: itemId || itemName,
            targetRoute: "/manager/items",
            timestamp: createTimestamp(),
            createdAt: new Date().toISOString(),
            read: false,
          },
        ]),
      );

      await loadDashboardData();
    };

    const init = async () => {
      try {
        await signalRService.startConnection();
        await signalRService.on(
          CLIENT_EVENTS.RELIEF_ORDER_CREATED_COORDINATOR,
          handleReliefOrderCreated,
        );
        await signalRService.on(
          CLIENT_EVENTS.RELIEF_ITEM_CREATED,
          handleReliefItemCreated,
        );
        await signalRService.on(
          CLIENT_EVENTS.RELIEF_ITEM_UPDATED,
          handleReliefItemUpdated,
        );
      } catch (err) {
        console.error("SignalR init error in ManagerDashboard:", err);
      }
    };

    init();

    return () => {
      signalRService.off(
        CLIENT_EVENTS.RELIEF_ORDER_CREATED_COORDINATOR,
        handleReliefOrderCreated,
      );
      signalRService.off(
        CLIENT_EVENTS.RELIEF_ITEM_CREATED,
        handleReliefItemCreated,
      );
      signalRService.off(
        CLIENT_EVENTS.RELIEF_ITEM_UPDATED,
        handleReliefItemUpdated,
      );
    };
  }, []);

  const totalProducts = products.length;
  const totalInventory = inventory.length;
  const totalQuantity = inventory.reduce(
    (sum, item) => sum + (item.quantity || 0),
    0,
  );
  const barData = inventory.map((item) => ({
    name: item.reliefItemName,
    quantity: item.quantity,
  }));

  const grouped = {};
  inventory.forEach((item) => {
    const date = new Date(item.lastUpdated).toLocaleDateString();
    grouped[date] = (grouped[date] || 0) + (item.quantity || 0);
  });

  const lineData = Object.keys(grouped).map((date) => ({
    date,
    quantity: grouped[date],
  }));

  const bellCount = notifications.length;

  return (
    <div className="manager-dashboard-page">
      <div className="mp-wrap">
        <div className="top-user-actions">
          <div className="user-chip">
            <div className="user-info">
              <span className="user-greeting">
                Xin chào, <span className="user-name">{userFullName || "Người dùng"}</span>
              </span>
            </div>
          </div>

          <button className="logout-btn3" onClick={handleLogout}>
            <span className="logout-icon">↩</span>
            <span>Đăng xuất</span>
          </button>
        </div>

        <div className="panel-card manager-dashboard-header">
          <div className="panel-head manager-panel-head">
            <div className="manager-dashboard-copy">
              <div className="dashboardManager-title">
                Bảng điều khiển quản lý
              </div>

              <div className="panel-sub">
                Quản lý kho, tồn kho và vật phẩm cứu trợ
              </div>
            </div>

            <div className="manager-header-actions">
              <div className="button">
                <button
                  className={`notification-bell ${bellCount > 0 ? "active" : ""}`}
                  onClick={() => setShowNotifications((prev) => !prev)}
                >
                  <span className="bell-icon">🔔</span>
                  {bellCount > 0 && (
                    <span className="notification-badge">{bellCount}</span>
                  )}
                </button>
              </div>

              <button
                className="btn btn-primary manager-export-btn"
                onClick={exportReliefItemsAndInventory}
              >
                Xuất dữ liệu vật phẩm + tồn kho
              </button>
            </div>
          </div>

          <div className="notification-container">
            {showNotifications && (
              <div className="notification-panel">
                <div className="notification-header">
                  <h3>Thông báo ({notifications.length})</h3>
                  <button className="mark-all-read" onClick={markAllAsRead}>
                    Đánh dấu đã đọc
                  </button>
                </div>

                <div className="notification-list">
                  {notifications.length === 0 ? (
                    <div className="no-notifications">
                      Không có thông báo mới
                    </div>
                  ) : (
                    notifications.map((notification) => {
                      const color = getNotificationColor(notification.type);

                      return (
                        <div
                          key={notification.id}
                          className={`notification-item ${
                            notification.read ? "read" : "unread"
                          }`}
                          style={{
                            backgroundColor: color.bg,
                            borderLeft: `4px solid ${color.border}`,
                          }}
                        >
                          <div className="notification-icon">{color.icon}</div>

                          <div className="notification-content">
                            <h4>{notification.title}</h4>
                            <p>{notification.message}</p>

                            <div className="notification-footer">
                              <span className="notification-time">
                                {notification.timestamp}
                              </span>

                              <button
                                className="notification-action"
                                onClick={() =>
                                  goToNotificationDetail(notification)
                                }
                              >
                                Xem chi tiết
                              </button>
                            </div>
                          </div>

                          <button
                            className="notification-close"
                            onClick={() => removeNotification(notification.id)}
                          >
                            ×
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

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

        <div className="mp-grid">
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

          <div className="panel-card">
            <div className="panel-row">
              <div className="panel-card-title">Phân bổ tồn kho</div>
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
  );
}
