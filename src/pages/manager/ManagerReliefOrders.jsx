import "./ManagerDashboard.css";
import "./ManagerReliefOrders.css";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { getAllRescueRequests } from "../../services/rescueRequestService";
import { rescueMissionService } from "../../services/rescueMissionService";
import signalRService from "../../services/signalrService";
import { CLIENT_EVENTS } from "../../data/signalrConstants";
import {
  extractOrderItems,
  findAssignedMissionForOrder,
  findAssignedTeamForOrder,
  findRelatedRequestForOrder,
  normalizeReliefOrder,
  normalizeRescueMissions,
  normalizeRescueRequests,
  reliefOrdersService,
} from "../../services/reliefOrdersService";

const DEFAULT_FILTERS = {
  statusesText: "",
  createdFromDate: "",
  createdToDate: "",
  preparedFromDate: "",
  preparedToDate: "",
  pickedUpFromDate: "",
  pickedUpToDate: "",
  pageNumber: 1,
  pageSize: 12,
};

const NOTI_STORAGE_KEY = "manager_notifications";
const MANAGER_RELIEF_ORDERS_ROUTE = "/manager/relief-orders";

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

const toComparable = (value) => String(value ?? "").trim().toLowerCase();

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
    return { className: "is-pending", label: status || "Cho xu ly" };
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

const isPreparationLockedStatus = (status) =>
  [
    "prepared",
    "sent",
    "dispatch",
    "delivered",
    "completed",
    "picked_up",
    "pickup",
    "done",
  ].some((value) => getOrderStatusToken(status).includes(value));

const isSendCompletedStatus = (status) =>
  ["sent", "dispatch", "delivered", "completed", "picked_up", "pickup", "done"].some(
    (value) => getOrderStatusToken(status).includes(value),
  );

const isMissionAcceptedStatus = (status) =>
  [
    "accepted",
    "confirmed",
    "in_progress",
    "inprogress",
    "processing",
    "prepared",
    "pickup",
    "picked_up",
    "delivered",
    "completed",
    "done",
  ].some((value) => getOrderStatusToken(status).includes(value));

const isPreparedOrder = (order) =>
  Boolean(order?.preparedAt) ||
  ["prepared", "preparing", "ready", "confirmed"].some((value) =>
    getOrderStatusToken(order?.orderStatus).includes(value),
  );

const getOrderItemKey = (item, index) =>
  item?.reliefItemID ||
  item?.reliefItemId ||
  item?.itemID ||
  item?.itemId ||
  `${item?.itemName || item?.reliefItemName || "item"}-${index}`;

const buildFilterParams = (filters) => ({
  statuses: String(filters?.statusesText || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
  createdFromDate: filters?.createdFromDate || "",
  createdToDate: filters?.createdToDate || "",
  preparedFromDate: filters?.preparedFromDate || "",
  preparedToDate: filters?.preparedToDate || "",
  pickedUpFromDate: filters?.pickedUpFromDate || "",
  pickedUpToDate: filters?.pickedUpToDate || "",
  pageNumber: Number(filters?.pageNumber) || 1,
  pageSize: Number(filters?.pageSize) || 12,
});

const buildManagerReliefOrdersRoute = (orderId = "") =>
  orderId
    ? `${MANAGER_RELIEF_ORDERS_ROUTE}?orderId=${encodeURIComponent(orderId)}`
    : MANAGER_RELIEF_ORDERS_ROUTE;

const createTimestamp = () => new Date().toLocaleString("vi-VN");
const BELL_ICON = "\uD83D\uDD14";

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

export default function ManagerReliefOrders() {
  const navigate = useNavigate();
  const location = useLocation();
  const orderCardRefs = useRef({});

  const [formFilters, setFormFilters] = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const [orders, setOrders] = useState([]);
  const [rescueRequests, setRescueRequests] = useState([]);
  const [rescueMissions, setRescueMissions] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [prepareDrafts, setPrepareDrafts] = useState({});
  const [savingOrderIds, setSavingOrderIds] = useState({});
  const [highlightedOrderId, setHighlightedOrderId] = useState("");
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem(NOTI_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (loadError) {
      console.error("Load manager notifications failed:", loadError);
      return [];
    }
  });
  const [showNotifications, setShowNotifications] = useState(false);

  const hydrateReliefOrders = async (orderSummaries = []) => {
    if (!Array.isArray(orderSummaries) || orderSummaries.length === 0) {
      return {
        items: [],
        errors: [],
      };
    }

    const detailResults = await Promise.allSettled(
      orderSummaries.map(async (orderSummary) => {
        const normalizedSummary = normalizeReliefOrder(orderSummary);
        const orderId = normalizedSummary?.reliefOrderID;

        if (!orderId) {
          return normalizedSummary;
        }

        const detail = await reliefOrdersService.getById(orderId);
        const normalizedDetail = normalizeReliefOrder(detail);

        return {
          ...orderSummary,
          ...detail,
          ...normalizedSummary,
          ...normalizedDetail,
          items:
            normalizedDetail.items?.length > 0
              ? normalizedDetail.items
              : normalizedSummary.items,
        };
      }),
    );

    const nextOrders = [];
    const detailErrors = [];

    detailResults.forEach((result, index) => {
      if (result.status === "fulfilled") {
        nextOrders.push(result.value);
        return;
      }

      const fallbackOrder = normalizeReliefOrder(orderSummaries[index]);
      const fallbackOrderId = fallbackOrder?.reliefOrderID || `index-${index}`;

      nextOrders.push(fallbackOrder);
      detailErrors.push(
        `Không thể tải chi tiết đơn ${formatDisplayValue(fallbackOrderId)}.`,
      );
      console.error("[ManagerReliefOrders] getById failed:", result.reason);
    });

    return {
      items: nextOrders,
      errors: detailErrors,
    };
  };

  const loadPageData = async (filtersToUse = appliedFilters) => {
    setLoading(true);
    setError("");

    const [ordersResult, requestsResult, missionsResult] = await Promise.allSettled([
      reliefOrdersService.filterReliefOrders(buildFilterParams(filtersToUse)),
      getAllRescueRequests(),
      rescueMissionService.filter({
        pageNumber: 1,
        pageSize: 200,
      }),
    ]);

    const errors = [];

    if (ordersResult.status === "fulfilled") {
      const hydratedOrders = await hydrateReliefOrders(ordersResult.value?.items || []);

      setOrders(hydratedOrders.items || []);
      setTotalCount(Number(ordersResult.value?.totalCount) || 0);
      if (hydratedOrders.errors.length > 0) {
        errors.push(hydratedOrders.errors.join(" "));
      }
    } else {
      setOrders([]);
      setTotalCount(0);
      errors.push(
        ordersResult.reason?.message || "Không thể tải danh sách đơn cứu trợ.",
      );
    }

    if (requestsResult.status === "fulfilled") {
      setRescueRequests(normalizeRescueRequests(extractList(requestsResult.value)));
    } else {
      setRescueRequests([]);
      errors.push(
        requestsResult.reason?.message || "Không thể tải danh sách yêu cầu cứu hộ.",
      );
    }

    if (missionsResult.status === "fulfilled") {
      setRescueMissions(normalizeRescueMissions(extractList(missionsResult.value)));
    } else {
      setRescueMissions([]);
      errors.push(
        missionsResult.reason?.message || "Không thể tải danh sách nhiệm vụ cứu hộ.",
      );
    }

    if (errors.length > 0) {
      setError(errors.join(" | "));
    }

    setLoading(false);
  };

  useEffect(() => {
    loadPageData(appliedFilters).catch((loadError) => {
      console.error("[ManagerReliefOrders] Initial load failed:", loadError);
      setError(loadError?.message || "Không thể tải dữ liệu đơn cứu trợ.");
      setLoading(false);
    });
  }, [appliedFilters]);

  useEffect(() => {
    try {
      localStorage.setItem(NOTI_STORAGE_KEY, JSON.stringify(notifications));
    } catch (saveError) {
      console.error("Save manager notifications failed:", saveError);
    }
  }, [notifications]);

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

    if (targetRoute) {
      navigate(targetRoute);
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case "order":
        return { bg: "#fef3c7", border: "#f59e0b", icon: "ðŸ“¦" };
      case "supply":
        return { bg: "#dcfce7", border: "#16a34a", icon: "ðŸ†•" };
      case "inventory":
        return { bg: "#dbeafe", border: "#2563eb", icon: "ðŸ“" };
      default:
        return { bg: "#f3f4f6", border: "#6b7280", icon: "ðŸ””" };
    }
  };

  const getNotificationStyleMeta = (type) => {
    switch (type) {
      case "order":
        return { bg: "#fef3c7", border: "#f59e0b", icon: "\uD83D\uDCE6" };
      case "supply":
        return { bg: "#dcfce7", border: "#16a34a", icon: "\u271A" };
      case "inventory":
        return { bg: "#dbeafe", border: "#2563eb", icon: "\uD83D\uDCCB" };
      default:
        return { bg: "#f3f4f6", border: "#6b7280", icon: BELL_ICON };
    }
  };

  const orderCards = orders
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
      const assignedTeam = findAssignedTeamForOrder(
        normalizedOrder,
        rescueMissions,
        rescueRequests,
        [],
      );
      const orderStatus =
        normalizedOrder?.status ||
        normalizedOrder?.orderStatus ||
        normalizedOrder?.missionStatus ||
        "Pending";
      const missionStatus =
        assignedMission?.missionStatus ||
        normalizedOrder?.missionStatus ||
        assignedMission?.status ||
        "";
      const hasValidItems = items.some((item) => item?.reliefItemID);
      const teamAccepted =
        isMissionAcceptedStatus(missionStatus) ||
        isPreparationLockedStatus(orderStatus) ||
        isSendCompletedStatus(orderStatus);
      const totalItemQuantity = items.reduce(
        (sum, item) => sum + (Number(item?.quantity) || 0),
        0,
      );
      const canPrepare =
        Boolean(normalizedOrder?.reliefOrderID) &&
        hasValidItems &&
        teamAccepted &&
        !isPreparationLockedStatus(orderStatus);
      const prepareDisabledReason = !normalizedOrder?.reliefOrderID
        ? "Don chua co ReliefOrderID hop le."
        : !hasValidItems
          ? "Don chua co vat pham hop le de soan."
          : !teamAccepted
            ? "Doi cuu ho chua xac nhan nhiem vu nen manager chua the soan hang."
            : isPreparationLockedStatus(orderStatus)
              ? "Don da qua buoc soan hoac da ban giao."
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
        missionStatus,
        teamAccepted,
        canPrepare,
        prepareDisabledReason,
        disabledReason: !normalizedOrder?.reliefOrderID
          ? "Đơn chưa có ReliefOrderID hợp lệ."
          : !items.some((item) => item?.reliefItemID)
            ? "Đơn chưa có vật phẩm hợp lệ để chuẩn bị."
            : isPreparationLockedStatus(orderStatus)
              ? "Đơn đã qua bước chuẩn bị hoặc bàn giao."
              : "",
      };
    })
    .sort((left, right) => {
      const leftDate = new Date(
        left?.pickedUpAt || left?.preparedAt || left?.updatedAt || left?.createdAt || 0,
      ).getTime();
      const rightDate = new Date(
        right?.pickedUpAt || right?.preparedAt || right?.updatedAt || right?.createdAt || 0,
      ).getTime();

      return rightDate - leftDate;
    });

  useEffect(() => {
    setPrepareDrafts((prev) => {
      const nextDrafts = {};

      orderCards.forEach((order) => {
        const orderId = String(order?.reliefOrderID || order?.orderKey || "");
        if (!orderId) return;

        nextDrafts[orderId] = {};
        order.items.forEach((item, index) => {
          const itemId = String(item?.reliefItemID || getOrderItemKey(item, index));
          nextDrafts[orderId][itemId] = String(Number(item?.quantity) || 0);
        });
      });

      const previousKeys = Object.keys(prev);
      const nextKeys = Object.keys(nextDrafts);
      const hasSameKeys =
        previousKeys.length === nextKeys.length &&
        previousKeys.every((key) => key in nextDrafts);

      if (!hasSameKeys) {
        return nextDrafts;
      }

      return nextDrafts;
    });
  }, [orders]);

  useEffect(() => {
    const focusedOrderId =
      new URLSearchParams(location.search).get("orderId") || "";

    if (!focusedOrderId || orderCards.length === 0) return undefined;

    const timer = window.setTimeout(() => {
      setHighlightedOrderId(focusedOrderId);
      orderCardRefs.current[String(focusedOrderId)]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 120);

    return () => window.clearTimeout(timer);
  }, [location.search, orderCards.length]);

  useEffect(() => {
    if (!highlightedOrderId) return undefined;

    const timer = window.setTimeout(() => {
      setHighlightedOrderId("");
    }, 3200);

    return () => window.clearTimeout(timer);
  }, [highlightedOrderId]);

  useEffect(() => {
    const handleReliefOrderCreated = async (data) => {
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
        messageParts.push(`Có đơn cứu trợ mới cho yêu cầu #${requestCode}.`);
      } else {
        messageParts.push("Có đơn cứu trợ mới cần được xử lý.");
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
            targetRoute: buildManagerReliefOrdersRoute(reliefOrderId || ""),
            timestamp: createTimestamp(),
            createdAt: new Date().toISOString(),
            read: false,
          },
        ]),
      );

      await loadPageData(appliedFilters);
    };

    const handleReliefItemCreated = async (data) => {
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
            id: `item-created-${itemId || itemName}`,
            type: "supply",
            title: "Thêm vật phẩm cứu trợ",
            message: `${itemName} vừa được thêm vào danh mục vật phẩm.`,
            referenceId: itemId || itemName,
            targetRoute: "/manager/inventory",
            timestamp: createTimestamp(),
            createdAt: new Date().toISOString(),
            read: false,
          },
        ]),
      );
    };

    const handleReliefItemUpdated = async (data) => {
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
            title: "Cập nhật vật phẩm",
            message: `${itemName} vừa được cập nhật trong hệ thống.`,
            referenceId: itemId || itemName,
            targetRoute: "/manager/inventory",
            timestamp: createTimestamp(),
            createdAt: new Date().toISOString(),
            read: false,
          },
        ]),
      );
    };

    const handleDeliveryStarted = async (data) => {
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
              ? `${teamName} đã xác nhận nhận hàng cho đơn ${reliefOrderId || "cứu trợ"}.`
              : `Đã có xác nhận nhận hàng cho đơn ${reliefOrderId || "cứu trợ"}.`,
            referenceId: reliefOrderId || "",
            targetRoute: buildManagerReliefOrdersRoute(reliefOrderId || ""),
            timestamp: createTimestamp(),
            createdAt: new Date().toISOString(),
            read: false,
          },
        ]),
      );

      await loadPageData(appliedFilters);
    };

    const handleOrderPrepared = async (data) => {
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
      const managerName = pickFirst(
        data,
        ["managerName", "ManagerName", "preparedBy", "PreparedBy"],
        "",
      );

      setNotifications((prev) =>
        mergeNotifications(prev, [
          {
            id: `order-prepared-${reliefOrderId || Date.now()}`,
            type: "order",
            title: "Đơn cứu trợ đã được chuẩn bị",
            message: managerName
              ? `${managerName} đã cập nhật chuẩn bị cho đơn ${reliefOrderId || "cứu trợ"}.`
              : `Đơn ${reliefOrderId || "cứu trợ"} đã được cập nhật chuẩn bị.`,
            referenceId: reliefOrderId || "",
            targetRoute: buildManagerReliefOrdersRoute(reliefOrderId || ""),
            timestamp: createTimestamp(),
            createdAt: new Date().toISOString(),
            read: false,
          },
        ]),
      );

      await loadPageData(appliedFilters);
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
        await signalRService.on(
          CLIENT_EVENTS.ORDER_PREPARED,
          handleOrderPrepared,
        );
      } catch (signalRError) {
        console.error("SignalR init error in ManagerReliefOrders:", signalRError);
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
      signalRService.off(CLIENT_EVENTS.ORDER_PREPARED, handleOrderPrepared);
    };
  }, [appliedFilters]);

  const handleFilterInputChange = (event) => {
    const { name, value } = event.target;
    setFormFilters((prev) => ({
      ...prev,
      [name]:
        name === "pageNumber" || name === "pageSize"
          ? Number(value) || 1
          : value,
    }));
  };

  const handleApplyFilters = (event) => {
    event.preventDefault();
    setAppliedFilters((prev) => ({
      ...prev,
      ...formFilters,
      pageNumber: 1,
      pageSize: Number(formFilters.pageSize) || prev.pageSize || 12,
    }));
  };

  const handleResetFilters = () => {
    setFormFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
  };

  const updateDraftQuantity = (orderId, itemId, value) => {
    const nextValue = value === "" ? "" : String(Math.max(0, Number(value) || 0));

    setPrepareDrafts((prev) => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] || {}),
        [itemId]: nextValue,
      },
    }));
  };

  const handlePrepareOrder = async (order) => {
    const orderId = String(order?.reliefOrderID || "");
    if (!orderId) {
      toast.error("Không tìm thấy ReliefOrderID hợp lệ.");
      return;
    }

    const draft = prepareDrafts[orderId] || {};
    const items = order.items
      .map((item, index) => {
        const itemId = String(item?.reliefItemID || getOrderItemKey(item, index));
        return {
          reliefItemID: item?.reliefItemID,
          quantity: Number(draft[itemId] ?? item?.quantity ?? 0),
        };
      })
      .filter(
        (item) => item?.reliefItemID && Number.isFinite(item.quantity) && item.quantity > 0,
      );

    if (items.length === 0) {
      toast.error("Cần ít nhất 1 vật phẩm hợp lệ để chuẩn bị.");
      return;
    }

    setSavingOrderIds((prev) => ({
      ...prev,
      [orderId]: true,
    }));

    try {
      await reliefOrdersService.prepareOrder({
        reliefOrderID: order.reliefOrderID,
        items,
      });

      toast.success(
        `Đã cập nhật chuẩn bị cho đơn ${formatDisplayValue(order.reliefOrderID)}.`,
      );
      await loadPageData(appliedFilters);
    } catch (prepareError) {
      console.error("[ManagerReliefOrders] prepareOrder failed:", prepareError);
      toast.error(prepareError?.message || "Không thể cập nhật chuẩn bị cho đơn cứu trợ.");
    } finally {
      setSavingOrderIds((prev) => ({
        ...prev,
        [orderId]: false,
      }));
    }
  };

  const pendingCount = orderCards.filter((order) =>
    getOrderStatusToken(order.orderStatus).includes("pending"),
  ).length;
  const preparedCount = orderCards.filter((order) => isPreparedOrder(order)).length;
  const pickedUpCount = orderCards.filter((order) =>
    ["picked_up", "pickup"].some((value) =>
      getOrderStatusToken(order.orderStatus).includes(value),
    ),
  ).length;

  const canGoPrev = appliedFilters.pageNumber > 1;
  const hasNextPage =
    totalCount > appliedFilters.pageNumber * appliedFilters.pageSize ||
    orderCards.length === appliedFilters.pageSize;
  const bellCount = notifications.length;

  return (
    <div className="manager-relief-orders-page">
      <div className="mp-wrap">
        <div className="panel-card manager-relief-orders-hero">
          <div className="manager-relief-orders-hero-copy">
            <div className="dashboardManager-title">Đơn cứu trợ cho quản lý</div>
            <div className="panel-sub">
              Tiếp nhận danh sách vật phẩm, soạn đồ, điều chỉnh số lượng và cập nhật chuẩn bị.
            </div>
            <div className="manager-relief-orders-summary">
              <span>Đang hiển thị {orderCards.length} đơn</span>
              <span>Tổng kết quả: {totalCount}</span>
              <span>Chờ xử lý: {pendingCount}</span>
              <span>Đã chuẩn bị: {preparedCount}</span>
              <span>Đã nhận: {pickedUpCount}</span>
            </div>
          </div>

          <div className="manager-relief-orders-actions">
            <div className="notification-container">
              <button
                className={`notification-bell ${bellCount > 0 ? "active" : ""}`}
                onClick={() => setShowNotifications((prev) => !prev)}
              >
                <span className="bell-icon">ðŸ””</span>
                {bellCount > 0 && (
                  <span className="notification-badge">{bellCount}</span>
                )}
              </button>

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
                        const color = getNotificationStyleMeta(notification.type);

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
                              Ã—
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              className="btn btn-primary relief-orders-refresh-btn"
              onClick={() => loadPageData(appliedFilters)}
              disabled={loading}
            >
              {loading ? "Đang tải..." : "Làm mới danh sách"}
            </button>
          </div>
        </div>

        <form className="panel-card manager-relief-orders-filter" onSubmit={handleApplyFilters}>
          <div className="panel-card-title">Bộ lọc đơn cứu trợ</div>

          <div className="manager-relief-orders-filter-grid">
            <label className="manager-relief-orders-field">
              <span>Trạng thái</span>
              <input
                type="text"
                name="statusesText"
                value={formFilters.statusesText}
                onChange={handleFilterInputChange}
                placeholder="Chờ xử lý, Đã chuẩn bị"
              />
            </label>

            <label className="manager-relief-orders-field">
              <span>Tạo từ</span>
              <input
                type="datetime-local"
                name="createdFromDate"
                value={formFilters.createdFromDate}
                onChange={handleFilterInputChange}
              />
            </label>

            <label className="manager-relief-orders-field">
              <span>Tạo đến</span>
              <input
                type="datetime-local"
                name="createdToDate"
                value={formFilters.createdToDate}
                onChange={handleFilterInputChange}
              />
            </label>

            <label className="manager-relief-orders-field">
              <span>Chuẩn bị từ</span>
              <input
                type="datetime-local"
                name="preparedFromDate"
                value={formFilters.preparedFromDate}
                onChange={handleFilterInputChange}
              />
            </label>

            <label className="manager-relief-orders-field">
              <span>Chuẩn bị đến</span>
              <input
                type="datetime-local"
                name="preparedToDate"
                value={formFilters.preparedToDate}
                onChange={handleFilterInputChange}
              />
            </label>

            <label className="manager-relief-orders-field">
              <span>Nhận hàng từ</span>
              <input
                type="datetime-local"
                name="pickedUpFromDate"
                value={formFilters.pickedUpFromDate}
                onChange={handleFilterInputChange}
              />
            </label>

            <label className="manager-relief-orders-field">
              <span>Nhận hàng đến</span>
              <input
                type="datetime-local"
                name="pickedUpToDate"
                value={formFilters.pickedUpToDate}
                onChange={handleFilterInputChange}
              />
            </label>

            <label className="manager-relief-orders-field">
              <span>Số dòng mỗi trang</span>
              <select
                name="pageSize"
                value={formFilters.pageSize}
                onChange={handleFilterInputChange}
              >
                <option value="6">6</option>
                <option value="12">12</option>
                <option value="24">24</option>
                <option value="50">50</option>
              </select>
            </label>
          </div>

          <div className="manager-relief-orders-filter-actions">
            <button className="btn btn-primary" type="submit" disabled={loading}>
              Áp dụng bộ lọc
            </button>

            <button
              className="btn btn-outline-secondary"
              type="button"
              onClick={handleResetFilters}
              disabled={loading}
            >
              Đặt lại
            </button>
          </div>
        </form>

        {error && (
          <div className="panel-card relief-orders-state relief-orders-state-error">
            {error}
          </div>
        )}

        {loading && orderCards.length === 0 && (
          <div className="panel-card relief-orders-state">Đang tải đơn cứu trợ...</div>
        )}

        {!loading && orderCards.length === 0 && !error && (
          <div className="panel-card relief-orders-state">
            Chưa có đơn cứu trợ phù hợp với bộ lọc hiện tại.
          </div>
        )}

        {orderCards.length > 0 && (
          <div className="manager-relief-orders-grid">
            {orderCards.map((order) => {
              const orderId = String(order?.reliefOrderID || order?.orderKey || "");
              const draft = prepareDrafts[orderId] || {};
              const preparedDraftQuantity = order.items.reduce((sum, item, index) => {
                const itemId = String(item?.reliefItemID || getOrderItemKey(item, index));
                return sum + (Number(draft[itemId] ?? item?.quantity ?? 0) || 0);
              }, 0);

              return (
                <article
                  key={order.orderKey}
                  ref={(node) => {
                    if (!node || !orderId) return;
                    orderCardRefs.current[orderId] = node;
                  }}
                  className={`relief-order-card manager-relief-order-card ${
                    highlightedOrderId &&
                    String(highlightedOrderId).toLowerCase() === orderId.toLowerCase()
                      ? "is-highlighted"
                      : ""
                  }`}
                >
                  <div className="relief-order-card-head">
                    <div>
                      <div className="relief-order-eyebrow">Đơn cứu trợ</div>
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
                    </div>
                  </div>

                  <div className="relief-order-meta-grid">
                    <div className="relief-order-meta">
                      <span>Yêu cầu cứu hộ</span>
                      <strong>{formatDisplayValue(order.requestDisplay)}</strong>
                      <small>ID: {formatDisplayValue(order.rescueRequestID)}</small>
                      <small>
                        Team:{" "}
                        {formatDisplayValue(
                          order?.missionStatus,
                          order.teamAccepted ? "Da xac nhan" : "Cho xac nhan",
                        )}
                      </small>
                    </div>

                    <div className="relief-order-meta">
                      <span>Đội được phân công</span>
                      <strong>
                        {formatDisplayValue(order.assignedTeamName, "Chưa xác định đội")}
                      </strong>
                      <small>
                        Mã đội: {formatDisplayValue(order?.assignedTeam?.rescueTeamID)}
                      </small>
                    </div>

                    <div className="relief-order-meta">
                      <span>Nhiệm vụ cứu hộ</span>
                      <strong>
                        {formatDisplayValue(
                          order?.assignedMission?.rescueMissionID || order?.rescueMissionID,
                        )}
                      </strong>
                      <small>
                        Mã ngắn:{" "}
                        {formatDisplayValue(
                          order?.relatedRequest?.shortCode || order?.requestShortCode,
                        )}
                      </small>
                    </div>

                    <div className="relief-order-meta">
                      <span>Mốc thời gian</span>
                      <strong>Tạo: {formatDateTime(order.createdAt)}</strong>
                      <small>Chuẩn bị: {formatDateTime(order.preparedAt)}</small>
                      <small>Nhận hàng: {formatDateTime(order.pickedUpAt)}</small>
                    </div>
                  </div>

                  <div className="relief-order-items-box manager-relief-order-items-box">
                    <div className="relief-order-items-head">
                      <span>
                        Vật phẩm ({order.totalItems || order.items.length})
                      </span>
                      <strong>Số lượng yêu cầu: {order.totalItemQuantity}</strong>
                    </div>

                    {order.items.length > 0 ? (
                      <div className="manager-relief-order-item-editor">
                        {order.items.map((item, index) => {
                          const itemId = String(
                            item?.reliefItemID || getOrderItemKey(item, index),
                          );

                          return (
                            <div
                              className="manager-relief-order-item-row"
                              key={getOrderItemKey(item, index)}
                            >
                              <div className="manager-relief-order-item-copy">
                                <strong>
                                  {formatDisplayValue(
                                    item?.reliefItemName || item?.itemName,
                                    "Không rõ vật phẩm",
                                  )}
                                </strong>
                                <span>Yêu cầu: x{Number(item?.quantity) || 0}</span>
                                {item?.availableStock !== null &&
                                  item?.availableStock !== undefined && (
                                    <span>Tồn hiện tại: {item.availableStock}</span>
                                  )}
                              </div>

                              <label className="manager-relief-order-prepare-field">
                                <span>Soạn</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={draft[itemId] ?? String(Number(item?.quantity) || 0)}
                                  onChange={(event) =>
                                    updateDraftQuantity(
                                      orderId,
                                      itemId,
                                      event.target.value,
                                    )
                                  }
                                  disabled={
                                    !order.canPrepare ||
                                    !item?.reliefItemID ||
                                    savingOrderIds[orderId]
                                  }
                                />
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="relief-order-empty-items">Không có vật phẩm hợp lệ.</div>
                    )}
                  </div>

                  <div className="relief-order-footer">
                    <div className="relief-order-footer-copy">
                      {order.canPrepare ? (
                        <span>
                          Payload chuẩn bị hiện tại có tổng số lượng {preparedDraftQuantity}. Quản
                          lý có thể sửa từng vật phẩm trước khi gửi.
                        </span>
                      ) : (
                        <span>{order.prepareDisabledReason}</span>
                      )}
                    </div>

                    <button
                      className="btn btn-primary relief-order-action-btn"
                      onClick={() => handlePrepareOrder(order)}
                      disabled={!order.canPrepare || savingOrderIds[orderId]}
                      title={order.prepareDisabledReason || ""}
                    >
                      {savingOrderIds[orderId] ? "Đang cập nhật..." : "Cập nhật chuẩn bị"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="panel-card manager-relief-orders-pagination">
          <button
            className="btn btn-outline-secondary"
            type="button"
            onClick={() =>
              setAppliedFilters((prev) => ({
                ...prev,
                pageNumber: Math.max(1, prev.pageNumber - 1),
              }))
            }
            disabled={!canGoPrev || loading}
          >
            Trang trước
          </button>

          <span>
            Trang {appliedFilters.pageNumber} / Hiển thị {orderCards.length} đơn
          </span>

          <button
            className="btn btn-outline-secondary"
            type="button"
            onClick={() =>
              setAppliedFilters((prev) => ({
                ...prev,
                pageNumber: prev.pageNumber + 1,
              }))
            }
            disabled={!hasNextPage || loading}
          >
            Trang sau
          </button>
        </div>
      </div>
    </div>
  );
}
