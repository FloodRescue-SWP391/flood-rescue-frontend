import "./ManagerDashboard.css";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  reliefItemsService,
  normalizeReliefItems,
} from "../../services/reliefItemService";
import {
  getWarehouses,
  normalizeWarehouses,
} from "../../services/warehouseService";
import { inventoryService } from "../../services/inventoryService";
import { getAllRescueRequests } from "../../services/rescueRequestService";
import { rescueMissionService } from "../../services/rescueMissionService";
import {
  buildSendReliefOrderPayload,
  extractAssignedTeamId,
  extractOrderItems,
  findAssignedMissionForOrder,
  findAssignedTeamForOrder,
  findRelatedRequestForOrder,
  getManagerReliefOrders,
  normalizeReliefOrder,
  normalizeReliefOrders,
  normalizeRescueMissions,
  normalizeRescueRequests,
  sendReliefOrderToAssignedTeam,
} from "../../services/reliefOrdersService";
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
const MANAGER_WAREHOUSE_STORAGE_KEY = "manager_dashboard_warehouse_id";
const MANAGER_RELIEF_ORDERS_ROUTE = "/manager/relief-orders";
const INVENTORY_TREND_STORAGE_KEY = "manager_inventory_trend_history";
const INVENTORY_TREND_MAX_POINTS = 24;
const SHOW_RELIEF_ORDERS_ON_DASHBOARD = false;
const SHOW_RELIEF_ORDER_SUMMARY_CARD = false;
const SHOW_DASHBOARD_NOTIFICATION_BELL = false;
const SHOW_DASHBOARD_ORDER_SHORTCUT = false;

const buildManagerReliefOrdersRoute = (orderId = "") =>
  orderId
    ? `${MANAGER_RELIEF_ORDERS_ROUTE}?orderId=${encodeURIComponent(orderId)}`
    : MANAGER_RELIEF_ORDERS_ROUTE;

const extractList = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.content)) return res.content;
  if (Array.isArray(res?.content?.data)) return res.content.data;
  if (Array.isArray(res?.content?.items)) return res.content.items;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.content)) return res.data.content;
  if (Array.isArray(res?.data?.content?.data)) return res.data.content.data;
  if (Array.isArray(res?.data?.items)) return res.data.items;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.results)) return res.results;

  if (res && typeof res === "object") {
    const nestedArray = Object.values(res).find(Array.isArray);
    if (Array.isArray(nestedArray)) {
      return nestedArray;
    }
  }

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

const pickFirstDefined = (...values) => {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return "";
};

const getWarehouseIdValue = (warehouse) =>
  pickFirst(
    warehouse,
    [
      "warehouseId",
      "WarehouseId",
      "warehouseID",
      "WarehouseID",
      "id",
      "ID",
    ],
    "",
  );

const getWarehouseDisplayName = (warehouse) =>
  pickFirst(
    warehouse,
    [
      "warehouseName",
      "WarehouseName",
      "name",
      "Name",
    ],
    "",
  );

const normalizeInventoryRecord = (item = {}) => {
  const inventoryID = pickFirst(
    item,
    [
      "inventoryID",
      "InventoryID",
      "inventoryId",
      "InventoryId",
      "id",
      "ID",
    ],
    null,
  );
  const reliefItemID = pickFirst(
    item,
    [
      "reliefItemID",
      "ReliefItemID",
      "reliefItemId",
      "ReliefItemId",
      "id",
      "ID",
    ],
    null,
  );
  const reliefItemName = pickFirst(
    item,
    [
      "reliefItemName",
      "ReliefItemName",
      "itemName",
      "ItemName",
      "name",
      "Name",
    ],
    "",
  );
  const quantityValue = pickFirst(
    item,
    ["quantity", "Quantity", "stockQuantity", "StockQuantity"],
    0,
  );
  const lastUpdated = pickFirst(
    item,
    [
      "lastUpdated",
      "LastUpdated",
      "updatedAt",
      "UpdatedAt",
      "modifiedAt",
      "ModifiedAt",
    ],
    null,
  );
  const quantity = Number(quantityValue);

  return {
    ...item,
    inventoryID,
    inventoryId: inventoryID,
    reliefItemID,
    reliefItemId: reliefItemID,
    reliefItemName,
    quantity: Number.isFinite(quantity) ? quantity : 0,
    lastUpdated,
  };
};

const normalizeInventoryList = (items) => {
  if (!Array.isArray(items)) return [];
  return items.map((item) => normalizeInventoryRecord(item));
};

const createTimestamp = () => new Date().toLocaleString("vi-VN");

const getInventoryTrendStorageKey = (warehouseId) =>
  `${INVENTORY_TREND_STORAGE_KEY}_${warehouseId || "default"}`;

const readInventoryTrendHistory = (warehouseId) => {
  if (!warehouseId) return [];

  try {
    const raw = localStorage.getItem(getInventoryTrendStorageKey(warehouseId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Load inventory trend history failed:", error);
    return [];
  }
};

const saveInventoryTrendSnapshot = (warehouseId, inventoryItems = []) => {
  if (!warehouseId) return;

  const totalQuantity = inventoryItems.reduce(
    (sum, item) => sum + (Number(item?.quantity) || 0),
    0,
  );
  const history = readInventoryTrendHistory(warehouseId);
  const now = new Date().toISOString();
  const lastPoint = history[history.length - 1];
  const lastTimestamp = new Date(lastPoint?.timestamp || 0).getTime();
  const shouldAppend =
    !lastPoint ||
    Number(lastPoint?.quantity) !== totalQuantity ||
    Date.now() - lastTimestamp > 5 * 60 * 1000;

  if (!shouldAppend) {
    return;
  }

  try {
    const nextHistory = [
      ...history,
      {
        timestamp: now,
        quantity: totalQuantity,
      },
    ].slice(-INVENTORY_TREND_MAX_POINTS);

    localStorage.setItem(
      getInventoryTrendStorageKey(warehouseId),
      JSON.stringify(nextHistory),
    );
  } catch (error) {
    console.warn("Save inventory trend history failed:", error);
  }
};

const formatTrendLabel = (value) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const buildInventoryTrendData = (inventoryItems = [], warehouseId = "") => {
  const history = readInventoryTrendHistory(warehouseId);

  if (history.length >= 2) {
    return history.map((entry) => ({
      date: formatTrendLabel(entry.timestamp),
      quantity: Number(entry.quantity) || 0,
    }));
  }

  return inventoryItems
    .filter((item) => item?.lastUpdated)
    .map((item) => ({
      timestamp: item.lastUpdated,
      date: formatTrendLabel(item.lastUpdated),
      quantity: Number(item?.quantity) || 0,
    }))
    .sort(
      (left, right) =>
        new Date(left.timestamp || 0).getTime() -
        new Date(right.timestamp || 0).getTime(),
    );
};

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

const toComparable = (value) => String(value ?? "").trim().toLowerCase();

const sameEntityValue = (left, right) =>
  left !== undefined &&
  left !== null &&
  left !== "" &&
  right !== undefined &&
  right !== null &&
  right !== "" &&
  toComparable(left) === toComparable(right);

const formatDisplayValue = (value, fallback = "Không rõ") =>
  value !== undefined && value !== null && value !== "" ? String(value) : fallback;

const formatDateTime = (value) => {
  if (!value) return "Chưa có";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("vi-VN");
};

const getOrderStatusToken = (status) =>
  String(status || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const getOrderStatusMeta = (status) => {
  const token = getOrderStatusToken(status);

  if (
    ["pending", "new", "created", "queued", "awaiting"].some((value) =>
      token.includes(value),
    )
  ) {
    return { className: "is-pending", label: status || "Chờ xử lý" };
  }

  if (
    [
      "prepared",
      "processing",
      "in_progress",
      "preparing",
      "confirmed",
    ].some((value) => token.includes(value))
  ) {
    return { className: "is-processing", label: status || "Đang xử lý" };
  }

  if (
    [
      "sent",
      "dispatch",
      "delivered",
      "completed",
      "picked_up",
      "pickup",
      "done",
    ].some((value) => token.includes(value))
  ) {
    return { className: "is-success", label: status || "Hoàn thành" };
  }

  if (
    ["cancelled", "canceled", "rejected", "failed"].some((value) =>
      token.includes(value),
    )
  ) {
    return { className: "is-danger", label: status || "Đã hủy" };
  }

  return { className: "is-neutral", label: status || "Không rõ" };
};

const isSendCompletedStatus = (status) =>
  ["sent", "dispatch", "delivered", "completed", "picked_up", "pickup"].some(
    (value) => getOrderStatusToken(status).includes(value),
  );

const getRequestTypeToken = (request = {}) =>
  toComparable(
    pickFirst(
      request,
      [
        "requestType",
        "RequestType",
        "emergencyType",
        "EmergencyType",
        "type",
        "Type",
      ],
      "",
    ),
  );

const isSupplyRequest = (request = {}) => {
  const token = getRequestTypeToken(request);
  return token.includes("supply") || token.includes("supplies");
};

const getRequestStatus = (request = {}) =>
  pickFirst(
    request,
    [
      "status",
      "Status",
      "requestStatus",
      "RequestStatus",
      "missionStatus",
      "MissionStatus",
    ],
    "Pending",
  );

const getRequestCitizenName = (request = {}) =>
  pickFirst(
    request,
    [
      "citizenName",
      "CitizenName",
      "fullName",
      "FullName",
      "requesterName",
      "RequesterName",
    ],
    "",
  );

const getRequestAddress = (request = {}) =>
  pickFirst(
    request,
    [
      "address",
      "Address",
      "citizenAddress",
      "CitizenAddress",
      "locationAddress",
      "LocationAddress",
      "formattedAddress",
      "FormattedAddress",
      "fullAddress",
      "FullAddress",
    ],
    "",
  );

const getRequestDescription = (request = {}) =>
  pickFirst(
    request,
    [
      "description",
      "Description",
      "specialNeeds",
      "SpecialNeeds",
      "note",
      "Note",
      "details",
      "Details",
    ],
    "",
  );

const getRequestCreatedAt = (request = {}) =>
  pickFirst(
    request,
    [
      "createdAt",
      "CreatedAt",
      "createdTime",
      "CreatedTime",
      "requestTime",
      "RequestTime",
    ],
    null,
  );

const getRequestUpdatedAt = (request = {}) =>
  pickFirst(
    request,
    [
      "updatedAt",
      "UpdatedAt",
      "modifiedAt",
      "ModifiedAt",
      "assignedAt",
      "AssignedAt",
    ],
    null,
  );

const getOrderItemKey = (item, index) =>
  pickFirst(
    item,
    [
      "reliefItemID",
      "ReliefItemID",
      "reliefItemId",
      "ReliefItemId",
      "itemID",
      "ItemID",
      "itemId",
      "ItemId",
      "id",
      "ID",
    ],
    `item-${index}`,
  );

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const reliefOrdersSectionRef = useRef(null);
  const orderCardRefs = useRef({});
  const pendingFocusOrderIdRef = useRef("");

  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [activeWarehouseId, setActiveWarehouseId] = useState("");
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState("");
  const [reliefOrders, setReliefOrders] = useState([]);
  const [rescueRequests, setRescueRequests] = useState([]);
  const [rescueTeams, setRescueTeams] = useState([]);
  const [rescueMissions, setRescueMissions] = useState([]);
  const [reliefOrdersLoading, setReliefOrdersLoading] = useState(false);
  const [reliefOrdersError, setReliefOrdersError] = useState("");
  const [sendingOrderIds, setSendingOrderIds] = useState({});
  const [highlightedOrderId, setHighlightedOrderId] = useState("");
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

  const fetchProductsData = async () => {
    const res = await reliefItemsService.getAll();
    const normalizedProducts = normalizeReliefItems(extractList(res));
    console.log("[ManagerDashboard] ReliefItems normalized:", normalizedProducts);
    return normalizedProducts;
  };

  const fetchWarehousesData = async () => {
    const res = await getWarehouses();
    const normalizedWarehouses = normalizeWarehouses(extractList(res));
    console.log("[ManagerDashboard] Warehouses normalized:", normalizedWarehouses);
    return normalizedWarehouses;
  };

  const fetchInventoryData = async (warehouseId) => {
    if (!warehouseId) return [];

    console.log("[ManagerDashboard] Loading inventory for warehouse:", warehouseId);
    const res = await inventoryService.getInventoryByWarehouse(warehouseId);
    const normalizedInventory = normalizeInventoryList(extractList(res));
    console.log("[ManagerDashboard] Inventory normalized:", normalizedInventory);
    return normalizedInventory;
  };

  const fetchReliefOrdersData = async () => {
    try {
      const res = await getManagerReliefOrders();
      const normalizedOrders = normalizeReliefOrders(extractList(res));
      console.log("[ManagerDashboard] ReliefOrders normalized:", normalizedOrders);
      return normalizedOrders;
    } catch (error) {
      const status = Number(error?.status || 0);
      const isMethodIssue = status === 404 || status === 405;

      if (isMethodIssue) {
        console.warn(
          "[ManagerDashboard] ReliefOrders endpoint unavailable for current backend, fallback empty list:",
          error,
        );
        return [];
      }

      throw error;
    }
  };

  const fetchRescueRequestsData = async () => {
    const res = await getAllRescueRequests();
    const normalizedRequests = normalizeRescueRequests(extractList(res));
    console.log("[ManagerDashboard] RescueRequests normalized:", normalizedRequests);
    return normalizedRequests;
  };

  const fetchRescueTeamsData = async () => {
    console.info(
      "[ManagerDashboard] Skip RescueTeams fetch on Manager dashboard. Team mapping uses rescue mission/request data.",
    );
    return [];
  };

  const fetchRescueMissionsData = async () => {
    const res = await rescueMissionService.filter({
      pageNumber: 1,
      pageSize: 200,
    });
    const normalizedMissions = normalizeRescueMissions(extractList(res));
    console.log("[ManagerDashboard] RescueMissions normalized:", normalizedMissions);
    return normalizedMissions;
  };

  const loadDashboardData = async (preferredWarehouseId = "") => {
    console.log("[ManagerDashboard] loadDashboardData:start", {
      preferredWarehouseId,
      activeWarehouseId,
    });

    setDashboardLoading(true);
    setDashboardError("");

    try {
      const [productsList, warehouseList] = await Promise.all([
        fetchProductsData(),
        fetchWarehousesData(),
      ]);
      const resolvedWarehouseId = pickFirstDefined(
        preferredWarehouseId,
        activeWarehouseId,
        getWarehouseIdValue(warehouseList?.[0]),
      );

      console.log("[ManagerDashboard] Resolved warehouseId:", resolvedWarehouseId);
      setProducts(productsList);
      setWarehouses(warehouseList);
      setActiveWarehouseId(resolvedWarehouseId || "");

      try {
        if (resolvedWarehouseId) {
          localStorage.setItem(
            MANAGER_WAREHOUSE_STORAGE_KEY,
            String(resolvedWarehouseId),
          );
        } else {
          localStorage.removeItem(MANAGER_WAREHOUSE_STORAGE_KEY);
        }
      } catch (storageError) {
        console.warn("Save manager warehouse selection failed:", storageError);
      }

      if (!resolvedWarehouseId) {
        console.warn("[ManagerDashboard] No warehouse found. Inventory will stay empty.");
        setInventory([]);
        return {
          products: productsList,
          warehouses: warehouseList,
          inventory: [],
        };
      }

      const inventoryList = await fetchInventoryData(resolvedWarehouseId);
      setInventory(inventoryList);
      saveInventoryTrendSnapshot(resolvedWarehouseId, inventoryList);

      return {
        products: productsList,
        warehouses: warehouseList,
        inventory: inventoryList,
      };
    } catch (err) {
      const message = err?.message || "Không thể tải dữ liệu dashboard Manager.";
      console.error("[ManagerDashboard] loadDashboardData failed:", err);
      setDashboardError(message);
      setProducts([]);
      setWarehouses([]);
      setInventory([]);
      return {
        products: [],
        warehouses: [],
        inventory: [],
      };
    } finally {
      setDashboardLoading(false);
    }
  };

  const handleWarehouseChange = async (event) => {
    const nextWarehouseId = String(event?.target?.value || "");

    setActiveWarehouseId(nextWarehouseId);
    setDashboardLoading(true);
    setDashboardError("");

    try {
      if (nextWarehouseId) {
        localStorage.setItem(MANAGER_WAREHOUSE_STORAGE_KEY, nextWarehouseId);
      } else {
        localStorage.removeItem(MANAGER_WAREHOUSE_STORAGE_KEY);
      }
    } catch (storageError) {
      console.warn("Save manager warehouse selection failed:", storageError);
    }

    try {
      if (!nextWarehouseId) {
        setInventory([]);
        return;
      }

      const inventoryList = await fetchInventoryData(nextWarehouseId);
      setInventory(inventoryList);
      saveInventoryTrendSnapshot(nextWarehouseId, inventoryList);
    } catch (error) {
      console.error("[ManagerDashboard] handleWarehouseChange failed:", error);
      setInventory([]);
      setDashboardError(
        error?.message || "Không thể tải tồn kho của kho đã chọn.",
      );
    } finally {
      setDashboardLoading(false);
    }
  };

  // NEW: Relief Orders context loader keeps order/request/mission/team data
  // synchronized so the team mapping always follows coordinator assignment.
  const loadReliefOrdersContext = async (silent = false) => {
    if (!silent) {
      setReliefOrdersLoading(true);
    }

    setReliefOrdersError("");

    const results = await Promise.allSettled([
      fetchReliefOrdersData(),
      fetchRescueRequestsData(),
      fetchRescueTeamsData(),
      fetchRescueMissionsData(),
    ]);

    const [
      reliefOrdersResult,
      rescueRequestsResult,
      rescueTeamsResult,
      rescueMissionsResult,
    ] = results;

    const errors = [];

    if (reliefOrdersResult.status === "fulfilled") {
      setReliefOrders(reliefOrdersResult.value);
    } else {
      console.error("[ManagerDashboard] loadReliefOrders failed:", reliefOrdersResult.reason);
      setReliefOrders([]);
      errors.push(
        reliefOrdersResult.reason?.message || "Không thể tải Relief Orders.",
      );
    }

    if (rescueRequestsResult.status === "fulfilled") {
      setRescueRequests(rescueRequestsResult.value);
    } else {
      console.error("[ManagerDashboard] loadRescueRequests failed:", rescueRequestsResult.reason);
      setRescueRequests([]);
      errors.push(
        rescueRequestsResult.reason?.message || "Không thể tải Rescue Requests.",
      );
    }

    if (rescueTeamsResult.status === "fulfilled") {
      setRescueTeams(rescueTeamsResult.value);
    } else {
      console.error("[ManagerDashboard] loadRescueTeams failed:", rescueTeamsResult.reason);
      setRescueTeams([]);
    }

    if (rescueMissionsResult.status === "fulfilled") {
      setRescueMissions(rescueMissionsResult.value);
    } else {
      console.error("[ManagerDashboard] loadRescueMissions failed:", rescueMissionsResult.reason);
      setRescueMissions([]);
      errors.push(
        rescueMissionsResult.reason?.message || "Không thể tải Rescue Missions.",
      );
    }

    if (errors.length > 0) {
      setReliefOrdersError(errors.join(" | "));
    }

    if (!silent) {
      setReliefOrdersLoading(false);
    }
  };

  const scrollToReliefOrders = (orderId = "", behavior = "smooth") => {
    reliefOrdersSectionRef.current?.scrollIntoView({
      behavior,
      block: "start",
    });

    if (orderId) {
      setHighlightedOrderId(String(orderId));

      window.setTimeout(() => {
        const targetNode = orderCardRefs.current[String(orderId)];
        targetNode?.scrollIntoView({
          behavior,
          block: "center",
        });
      }, 120);
    }
  };

  useEffect(() => {
    let preferredWarehouseId = "";

    try {
      preferredWarehouseId =
        localStorage.getItem(MANAGER_WAREHOUSE_STORAGE_KEY) || "";
    } catch (error) {
      console.warn("Load manager warehouse selection failed:", error);
    }

    Promise.all([
      loadDashboardData(preferredWarehouseId),
      loadReliefOrdersContext(),
    ]).catch((error) => {
      console.error("[ManagerDashboard] Initial load failed:", error);
    });
  }, []);

  useEffect(() => {
    if (location.hash !== "#relief-orders") return;

    const timer = window.setTimeout(() => {
      scrollToReliefOrders(pendingFocusOrderIdRef.current, "smooth");
      pendingFocusOrderIdRef.current = "";
    }, 150);

    return () => window.clearTimeout(timer);
  }, [location.hash, reliefOrders.length]);

  useEffect(() => {
    if (!highlightedOrderId) return undefined;

    const timer = window.setTimeout(() => {
      setHighlightedOrderId("");
    }, 3200);

    return () => window.clearTimeout(timer);
  }, [highlightedOrderId]);

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

    const targetRoute =
      notification.targetRoute === "/manager/orders" ||
      notification.targetRoute === "/manager#relief-orders"
        ? buildManagerReliefOrdersRoute(notification.referenceId || "")
        : notification.targetRoute;

    if (
      typeof targetRoute === "string" &&
      targetRoute.startsWith(MANAGER_RELIEF_ORDERS_ROUTE)
    ) {
      pendingFocusOrderIdRef.current = notification.referenceId || "";
      navigate(targetRoute);
      return;
    }

    if (targetRoute) {
      navigate(targetRoute);
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

  const handleSendOrderToTeam = async (order) => {
    const normalizedOrder = normalizeReliefOrder(order);
    const payload = buildSendReliefOrderPayload(
      normalizedOrder,
      rescueMissions,
      rescueRequests,
    );
    const orderId = normalizedOrder?.reliefOrderID;

    if (!orderId) {
      toast.error("Không tìm thấy reliefOrderID hợp lệ.");
      return;
    }

    if (!payload?.rescueTeamID) {
      toast.error("Không map được đội đã được coordinator phân công.");
      return;
    }

    if (!Array.isArray(payload?.items) || payload.items.length === 0) {
      toast.error("Relief Order chưa có item hợp lệ để gửi cho đội.");
      return;
    }

    setSendingOrderIds((prev) => ({
      ...prev,
      [String(orderId)]: true,
    }));

    // UPDATED: optimistic UI before reloading from API.
    setReliefOrders((prev) =>
      prev.map((entry) => {
        const currentOrder = normalizeReliefOrder(entry);
        if (!sameEntityValue(currentOrder?.reliefOrderID, orderId)) {
          return entry;
        }

        return {
          ...entry,
          rescueTeamID: payload.rescueTeamID,
          rescueTeamId: payload.rescueTeamID,
          rescueMissionID:
            payload.rescueMissionID || currentOrder?.rescueMissionID || null,
          rescueMissionId:
            payload.rescueMissionID || currentOrder?.rescueMissionID || null,
          rescueRequestID:
            payload.rescueRequestID || currentOrder?.rescueRequestID || null,
          rescueRequestId:
            payload.rescueRequestID || currentOrder?.rescueRequestID || null,
          status: "Đang gửi cho đội",
          orderStatus: "Đang gửi cho đội",
        };
      }),
    );

    try {
      console.log("[ManagerDashboard] sendReliefOrderToAssignedTeam payload:", payload);
      const response = await sendReliefOrderToAssignedTeam(payload);
      console.log("[ManagerDashboard] sendReliefOrderToAssignedTeam success:", response);

      toast.success(
        `Đã gửi Relief Order ${formatDisplayValue(orderId)} cho đội ${formatDisplayValue(payload.rescueTeamID)}.`,
      );

      await loadReliefOrdersContext(true);
    } catch (error) {
      console.error("[ManagerDashboard] sendReliefOrderToAssignedTeam failed:", {
        error,
        order,
        payload,
      });
      toast.error(error?.message || "Không thể gửi Relief Order cho đội.");
      await loadReliefOrdersContext(true);
    } finally {
      setSendingOrderIds((prev) => ({
        ...prev,
        [String(orderId)]: false,
      }));
    }
  };

  useEffect(() => {
    const handleReliefOrderCreated = async (data) => {
      console.log("ReliefOrderCreatedCoordinator:", data);

      const reliefOrderId = pickFirst(
        data,
        [
          "reliefOrderID",
          "ReliefOrderID",
          "reliefOrderId",
          "ReliefOrderId",
          "id",
          "ID",
        ],
        "",
      );
      const requestCode = pickFirst(
        data,
        [
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
        ],
        "",
      );
      const teamName = pickFirst(data, ["teamName", "TeamName"], "");
      const messageParts = [];

      if (requestCode) {
        messageParts.push(`Co don cuu tro moi cho yeu cau #${requestCode}.`);
      } else {
        messageParts.push("Co don cuu tro moi can duoc xu ly.");
      }

      if (teamName) {
        messageParts.push(`Team nhan don: ${teamName}.`);
      }

      setNotifications((prev) =>
        mergeNotifications(prev, [
          {
            id: `order-${reliefOrderId || requestCode || Date.now()}`,
            type: "order",
            title: "Don cuu tro moi",
            message: messageParts.join(" "),
            referenceId: reliefOrderId || "",
            targetRoute: buildManagerReliefOrdersRoute(reliefOrderId || ""),
            timestamp: createTimestamp(),
            createdAt: new Date().toISOString(),
            read: false,
          },
        ]),
      );

      await Promise.all([
        loadDashboardData(activeWarehouseId),
        loadReliefOrdersContext(true),
      ]);
    };

    const handleReliefItemCreated = async (data) => {
      console.log("ReliefItemCreated:", data);

      const itemId = pickFirst(
        data,
        [
          "reliefItemID",
          "ReliefItemID",
          "reliefItemId",
          "ReliefItemId",
          "id",
          "ID",
        ],
        "",
      );
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
            title: "Them vat pham cuu tro",
            message: `${itemName} vua duoc them vao danh muc vat pham.`,
            referenceId: itemId || itemName,
            targetRoute: "/manager/inventory",
            timestamp: createTimestamp(),
            createdAt: new Date().toISOString(),
            read: false,
          },
        ]),
      );

      await loadDashboardData(activeWarehouseId);
    };

    const handleReliefItemUpdated = async (data) => {
      console.log("ReliefItemUpdated:", data);

      const itemId = pickFirst(
        data,
        [
          "reliefItemID",
          "ReliefItemID",
          "reliefItemId",
          "ReliefItemId",
          "id",
          "ID",
        ],
        "",
      );
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
            title: "Cap nhat vat pham",
            message: `${itemName} vua duoc cap nhat trong he thong.`,
            referenceId: itemId || itemName,
            targetRoute: "/manager/inventory",
            timestamp: createTimestamp(),
            createdAt: new Date().toISOString(),
            read: false,
          },
        ]),
      );

      await loadDashboardData(activeWarehouseId);
    };

    const handleDeliveryStarted = async (data) => {
      console.log("DeliveryStarted:", data);

      const reliefOrderId = pickFirst(
        data,
        [
          "reliefOrderID",
          "ReliefOrderID",
          "reliefOrderId",
          "ReliefOrderId",
          "id",
          "ID",
        ],
        "",
      );
      const teamName = pickFirst(
        data,
        ["teamName", "TeamName", "rescueTeamName", "RescueTeamName"],
        "",
      );

      setNotifications((prev) =>
        mergeNotifications(prev, [
          {
            id: `delivery-started-${reliefOrderId || Date.now()}`,
            type: "inventory",
            title: "Đội cứu hộ đã nhận hàng",
            message: teamName
              ? `${teamName} đã xác nhận nhận hàng cho đơn ${reliefOrderId || "cứu trợ"}. Kiểm tra tồn kho nếu backend chưa đồng bộ tự động.`
              : `Đã có xác nhận nhận hàng cho đơn ${reliefOrderId || "cứu trợ"}. Kiểm tra tồn kho nếu backend chưa đồng bộ tự động.`,
            referenceId: reliefOrderId || "",
            targetRoute: buildManagerReliefOrdersRoute(reliefOrderId || ""),
            timestamp: createTimestamp(),
            createdAt: new Date().toISOString(),
            read: false,
          },
        ]),
      );

      await Promise.all([
        loadDashboardData(activeWarehouseId),
        loadReliefOrdersContext(true),
      ]);
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
        await signalRService.on(
          CLIENT_EVENTS.DELIVERY_STARTED,
          handleDeliveryStarted,
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
      signalRService.off(
        CLIENT_EVENTS.DELIVERY_STARTED,
        handleDeliveryStarted,
      );
    };
  }, [activeWarehouseId]);

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

  const lineData = buildInventoryTrendData(inventory, activeWarehouseId);
  const canRenderTrendChart = lineData.length > 1;
  const canRenderDistributionChart =
    inventory.length > 0 && Boolean(activeWarehouseId);

  const bellCount = notifications.length;
  const activeWarehouse = warehouses.find(
    (warehouse) =>
      String(getWarehouseIdValue(warehouse)) === String(activeWarehouseId),
  );
  const activeWarehouseName =
    getWarehouseDisplayName(activeWarehouse) ||
    (activeWarehouseId ? `Warehouse ${activeWarehouseId}` : "");

  const reliefOrderCards = reliefOrders
    .map((order) => {
      const normalizedOrder = normalizeReliefOrder(order);
      const items = extractOrderItems(normalizedOrder);
      const relatedRequest = findRelatedRequestForOrder(
        normalizedOrder,
        rescueRequests,
      );
      const assignedMission = findAssignedMissionForOrder(
        normalizedOrder,
        rescueMissions,
        rescueRequests,
      );
      const assignedTeamId = extractAssignedTeamId(
        normalizedOrder,
        rescueMissions,
        rescueRequests,
      );
      const assignedTeam = findAssignedTeamForOrder(
        normalizedOrder,
        rescueMissions,
        rescueRequests,
        rescueTeams,
      );
      const orderStatus =
        normalizedOrder?.status ||
        normalizedOrder?.orderStatus ||
        normalizedOrder?.missionStatus ||
        "Pending";
      const totalItemQuantity = items.reduce(
        (sum, item) => sum + (Number(item?.quantity) || 0),
        0,
      );
      const hasValidItems = items.some((item) => item?.reliefItemID);
      const hasAssignedTeam = Boolean(assignedTeamId);
      const canSend =
        Boolean(normalizedOrder?.reliefOrderID) &&
        hasValidItems &&
        hasAssignedTeam &&
        !isSendCompletedStatus(orderStatus);
      const disabledReason = !normalizedOrder?.reliefOrderID
        ? "Order chưa có ReliefOrderID hợp lệ."
        : !hasAssignedTeam
          ? "Không tìm thấy đội được coordinator phân công."
          : !hasValidItems
            ? "Order chưa có item hợp lệ để gửi."
            : isSendCompletedStatus(orderStatus)
              ? "Order đã ở trạng thái đã gửi/hoàn tất."
              : "";

      return {
        ...normalizedOrder,
        orderKey:
          normalizedOrder?.reliefOrderID ||
          normalizedOrder?.rescueRequestID ||
          normalizedOrder?.requestShortCode ||
          `${Math.random()}`,
        items,
        relatedRequest,
        assignedMission,
        assignedTeam,
        assignedTeamId,
        assignedTeamName:
          assignedTeam?.teamName ||
          normalizedOrder?.teamName ||
          relatedRequest?.assignedTeamName ||
          "",
        requestDisplay:
          normalizedOrder?.requestShortCode ||
          relatedRequest?.shortCode ||
          normalizedOrder?.rescueRequestID ||
          "",
        totalItemQuantity,
        statusMeta: getOrderStatusMeta(orderStatus),
        orderStatus,
        canSend,
        disabledReason,
      };
    })
    .sort((left, right) => {
      const leftDate = new Date(
        left?.updatedAt || left?.createdAt || 0,
      ).getTime();
      const rightDate = new Date(
        right?.updatedAt || right?.createdAt || 0,
      ).getTime();

      return rightDate - leftDate;
    });

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
              <div className="dashboardManager-title">Bảng điều khiển quản lý</div>

              <div className="panel-sub">
                Quản lý kho, tồn kho và vật phẩm cứu trợ. Đơn cứu trợ đã được tách sang
                trang riêng cho quản lý.
              </div>

              {activeWarehouseName && (
                <div className="panel-sub">
                  Kho đang dùng cho dashboard/report: {activeWarehouseName}
                </div>
              )}

              {warehouses.length > 0 && (
                <div className="manager-warehouse-picker">
                  <label
                    className="manager-warehouse-label"
                    htmlFor="manager-dashboard-warehouse"
                  >
                    Chọn kho hiển thị
                  </label>

                  <select
                    id="manager-dashboard-warehouse"
                    className="manager-warehouse-select"
                    value={activeWarehouseId}
                    onChange={handleWarehouseChange}
                    disabled={dashboardLoading}
                  >
                    {warehouses.map((warehouse) => {
                      const warehouseId = String(getWarehouseIdValue(warehouse));
                      const warehouseName =
                        getWarehouseDisplayName(warehouse) ||
                        `Kho ${warehouseId}`;

                      return (
                        <option key={warehouseId} value={warehouseId}>
                          {warehouseName}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {dashboardLoading && (
                <div className="panel-sub">
                  Đang tải ReliefItems, Warehouses và Inventory...
                </div>
              )}

              {dashboardError && (
                <div className="panel-sub" style={{ color: "#b91c1c" }}>
                  {dashboardError}
                </div>
              )}
            </div>

            <div className="manager-header-actions">
              <div
                className="button"
                style={{ display: SHOW_DASHBOARD_NOTIFICATION_BELL ? undefined : "none" }}
              >
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
                className="btn btn-outline-primary manager-relief-orders-link-btn"
                onClick={() => navigate(MANAGER_RELIEF_ORDERS_ROUTE)}
                style={{ display: SHOW_DASHBOARD_ORDER_SHORTCUT ? undefined : "none" }}
              >
                Mở trang Đơn cứu trợ
              </button>

              <button
                className="btn btn-primary manager-export-btn"
                onClick={exportReliefItemsAndInventory}
              >
                Xuất dữ liệu vật phẩm + tồn kho
              </button>
            </div>
          </div>

          <div
            className="notification-container"
            style={{ display: SHOW_DASHBOARD_NOTIFICATION_BELL ? undefined : "none" }}
          >
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
                    <div className="no-notifications">Không có thông báo mới</div>
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
                                onClick={() => goToNotificationDetail(notification)}
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

        {SHOW_RELIEF_ORDER_SUMMARY_CARD && !SHOW_RELIEF_ORDERS_ON_DASHBOARD && (
          <div className="panel-card manager-relief-orders-summary-card">
            <div>
              <div className="panel-card-title">Relief Orders</div>
              <div className="relief-orders-subtitle">
                Relief order da duoc tach khoi trang tong quan. Manager vao trang rieng de
                loc don, soan do va goi PUT prepare.
              </div>
            </div>

            <button
              className="btn btn-primary relief-orders-refresh-btn"
              onClick={() => navigate(MANAGER_RELIEF_ORDERS_ROUTE)}
            >
              Den trang Relief Orders
            </button>
          </div>
        )}

        {SHOW_RELIEF_ORDERS_ON_DASHBOARD && (
        <div
          className="panel-card relief-orders-panel"
          id="relief-orders"
          ref={reliefOrdersSectionRef}
        >
          <div className="panel-row relief-orders-header">
            <div>
              <div className="panel-card-title">Relief Orders</div>
              <div className="relief-orders-subtitle">
                Map đội theo đúng luồng coordinator assign - rescue request - mission - assigned rescue team.
              </div>
            </div>

            <button
              className="btn btn-primary relief-orders-refresh-btn"
              onClick={() => loadReliefOrdersContext()}
              disabled={reliefOrdersLoading}
            >
              {reliefOrdersLoading ? "Đang tải..." : "Làm mới Relief Orders"}
            </button>
          </div>

          {reliefOrdersError && (
            <div className="relief-orders-state relief-orders-state-error">
              <div>{reliefOrdersError}</div>
            </div>
          )}

          {reliefOrdersLoading && reliefOrderCards.length === 0 && (
            <div className="relief-orders-state">Đang tải Relief Orders...</div>
          )}

          {!reliefOrdersLoading &&
            reliefOrderCards.length === 0 &&
            !reliefOrdersError && (
              <div className="relief-orders-state">
                Chưa có Relief Order nào trên dashboard.
              </div>
            )}

          {reliefOrderCards.length > 0 && (
            <div className="relief-orders-grid">
              {reliefOrderCards.map((order) => (
                <article
                  key={order.orderKey}
                  ref={(node) => {
                    if (!node) return;
                    orderCardRefs.current[String(order.orderKey)] = node;
                    if (order?.reliefOrderID) {
                      orderCardRefs.current[String(order.reliefOrderID)] = node;
                    }
                  }}
                  className={`relief-order-card ${
                    highlightedOrderId &&
                    (sameEntityValue(highlightedOrderId, order.orderKey) ||
                      sameEntityValue(highlightedOrderId, order.reliefOrderID))
                      ? "is-highlighted"
                      : ""
                  }`}
                >
                  <div className="relief-order-card-head">
                    <div>
                      <div className="relief-order-eyebrow">Relief Order</div>
                      <h3 className="relief-order-title">
                        {formatDisplayValue(order.reliefOrderID)}
                      </h3>
                    </div>

                    <div className="relief-order-badges">
                      <span
                        className={`relief-order-status-badge ${order.statusMeta.className}`}
                      >
                        {order.statusMeta.label}
                      </span>

                      {order?.missionStatus &&
                        order?.missionStatus !== order?.orderStatus && (
                          <span className="relief-order-status-badge is-neutral">
                            Nhiệm vụ: {order.missionStatus}
                          </span>
                        )}
                    </div>
                  </div>

                  <div className="relief-order-meta-grid">
                    <div className="relief-order-meta">
                      <span>Rescue Request</span>
                      <strong>{formatDisplayValue(order.requestDisplay)}</strong>
                      <small>ID: {formatDisplayValue(order.rescueRequestID)}</small>
                    </div>

                    <div className="relief-order-meta">
                      <span>Đội được phân công</span>
                      <strong>
                        {formatDisplayValue(
                          order.assignedTeamName,
                          "Chưa xác định đội",
                        )}
                      </strong>
                      <small>
                        Team ID: {formatDisplayValue(order.assignedTeamId)}
                      </small>
                    </div>

                    <div className="relief-order-meta">
                      <span>Rescue Mission</span>
                      <strong>
                        {formatDisplayValue(
                          order?.assignedMission?.rescueMissionID ||
                            order?.rescueMissionID,
                        )}
                      </strong>
                      <small>
                        Request ShortCode:{" "}
                        {formatDisplayValue(
                          order?.relatedRequest?.shortCode ||
                            order?.requestShortCode,
                        )}
                      </small>
                    </div>

                    <div className="relief-order-meta">
                      <span>Tạo lúc / Cập nhật</span>
                      <strong>{formatDateTime(order.createdAt)}</strong>
                      <small>{formatDateTime(order.updatedAt)}</small>
                    </div>
                  </div>

                  <div className="relief-order-items-box">
                    <div className="relief-order-items-head">
                      <span>Vật phẩm ({order.items.length})</span>
                      <strong>Tổng SL: {order.totalItemQuantity}</strong>
                    </div>

                    {order.items.length > 0 ? (
                      <div className="relief-order-item-list">
                        {order.items.map((item, index) => (
                          <div
                            className="relief-order-item-chip"
                            key={getOrderItemKey(item, index)}
                          >
                            <span className="relief-order-item-name">
                              {formatDisplayValue(
                                item?.reliefItemName || item?.itemName,
                                "Không rõ vật phẩm",
                              )}
                            </span>
                            <span className="relief-order-item-qty">
                              x{Number(item?.quantity) || 0}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="relief-order-empty-items">
                        Không có item hợp lệ.
                      </div>
                    )}
                  </div>

                  <div className="relief-order-footer">
                    <div className="relief-order-footer-copy">
                      {order.canSend ? (
                        <span>
                          Payload sẽ gửi đúng Team ID{" "}
                          <strong>{formatDisplayValue(order.assignedTeamId)}</strong>
                          {order?.assignedMission?.rescueMissionID && (
                            <>
                              {" "}
                              qua nhiệm vụ{" "}
                              <strong>
                                {formatDisplayValue(
                                  order.assignedMission.rescueMissionID,
                                )}
                              </strong>
                            </>
                          )}
                          .
                        </span>
                      ) : (
                        <span>{order.disabledReason}</span>
                      )}
                    </div>

                    <button
                      className="btn btn-primary relief-order-action-btn"
                      onClick={() => handleSendOrderToTeam(order)}
                      disabled={
                        !order.canSend || sendingOrderIds[String(order.reliefOrderID)]
                      }
                    >
                      {sendingOrderIds[String(order.reliefOrderID)]
                        ? "Đang gửi..."
                        : "Gửi cho đội"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
        )}

        <div className="mp-grid">
          <div className="panel-card">
            <div className="panel-row">
              <div className="panel-card-title">Xu hướng tồn kho</div>
            </div>

            <div className="chart-box">
              {canRenderTrendChart ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" minTickGap={28} />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="linear"
                      dataKey="quantity"
                      stroke="#ff3b3b"
                      strokeWidth={3}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty-state">
                  Chưa có dữ liệu tồn kho để hiển thị biểu đồ.
                </div>
              )}
            </div>
          </div>

          <div className="panel-card">
            <div className="panel-row">
              <div className="panel-card-title">Phân bổ tồn kho</div>
            </div>

            <div className="chart-box">
              {canRenderDistributionChart ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="quantity" fill="#ff7a00" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty-state">
                  Chưa có dữ liệu tồn kho để hiển thị biểu đồ.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
