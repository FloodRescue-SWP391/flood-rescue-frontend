import "./ManagerDashboard.css";
import "./ManagerReliefOrders.css";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { getAllRescueRequests } from "../../services/rescueRequestService";
import signalRService from "../../services/signalrService";
import { CLIENT_EVENTS } from "../../data/signalrConstants";
import {
  extractOrderItems,
  findAssignedTeamForOrder,
  findRelatedRequestForOrder,
  normalizeReliefOrder,
  normalizeReliefOrders,
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

const formatDisplayValue = (value, fallback = "Không rõ") =>
  value !== undefined && value !== null && value !== "" ? String(value) : fallback;

const toComparable = (value) => String(value ?? "").trim().toLowerCase();

const valuesMatch = (left, right) =>
  Boolean(toComparable(left)) && toComparable(left) === toComparable(right);

const ACCEPTED_AT_KEYS = [
  "acceptedAt",
  "AcceptedAt",
  "acceptAt",
  "AcceptAt",
  "acceptedTime",
  "AcceptedTime",
];

const RELIEF_ORDER_EVENT_ID_KEYS = [
  "reliefOrderID",
  "ReliefOrderID",
  "reliefOrderId",
  "ReliefOrderId",
  "id",
  "ID",
];

const REQUEST_EVENT_ID_KEYS = [
  "rescueRequestID",
  "RescueRequestID",
  "rescueRequestId",
  "RescueRequestId",
  "requestID",
  "RequestID",
  "requestId",
  "RequestId",
];

const REQUEST_EVENT_CODE_KEYS = [
  "requestShortCode",
  "RequestShortCode",
  "shortCode",
  "ShortCode",
  "rescueRequestCode",
  "RescueRequestCode",
];

const MISSION_EVENT_ID_KEYS = [
  "rescueMissionID",
  "RescueMissionID",
  "rescueMissionId",
  "RescueMissionId",
  "missionID",
  "MissionID",
  "missionId",
  "MissionId",
];

const TEAM_EVENT_ID_KEYS = [
  "rescueTeamID",
  "RescueTeamID",
  "rescueTeamId",
  "RescueTeamId",
  "teamID",
  "TeamID",
  "teamId",
  "TeamId",
];

const TEAM_EVENT_NAME_KEYS = [
  "teamName",
  "TeamName",
  "rescueTeamName",
  "RescueTeamName",
];

const TEAM_RESPONSE_TYPE_KEYS = [
  "notificationType",
  "NotificationType",
  "responseType",
  "ResponseType",
  "type",
  "Type",
];

const resolveAcceptedReliefOrderId = (data, currentOrders = []) => {
  const directReliefOrderId = pickFirst(data, RELIEF_ORDER_EVENT_ID_KEYS, "");
  if (directReliefOrderId) {
    return String(directReliefOrderId);
  }

  const requestId = pickFirst(data, REQUEST_EVENT_ID_KEYS, "");
  const requestCode = pickFirst(data, REQUEST_EVENT_CODE_KEYS, "");
  const missionId = pickFirst(data, MISSION_EVENT_ID_KEYS, "");
  const teamId = pickFirst(data, TEAM_EVENT_ID_KEYS, "");
  const teamName = pickFirst(data, TEAM_EVENT_NAME_KEYS, "");
  const normalizedOrders = Array.isArray(currentOrders)
    ? currentOrders.map((order) => normalizeReliefOrder(order))
    : [];

  const teamMatches = (order) =>
    (teamId &&
      [
        order?.assignedTeamID,
        order?.assignedTeamId,
        order?.rescueTeamID,
        order?.rescueTeamId,
        order?.teamID,
        order?.teamId,
      ].some((value) => valuesMatch(value, teamId))) ||
    (teamName && valuesMatch(order?.teamName, teamName));

  const matchers = [
    (order) => missionId && valuesMatch(order?.rescueMissionID, missionId),
    (order) =>
      requestId &&
      valuesMatch(order?.rescueRequestID, requestId) &&
      (!teamId && !teamName ? true : teamMatches(order)),
    (order) =>
      requestCode &&
      valuesMatch(order?.requestShortCode, requestCode) &&
      (!teamId && !teamName ? true : teamMatches(order)),
    (order) => requestId && valuesMatch(order?.rescueRequestID, requestId),
    (order) => requestCode && valuesMatch(order?.requestShortCode, requestCode),
  ];

  for (const matcher of matchers) {
    const matchedOrder = normalizedOrders.find(matcher);
    if (matchedOrder?.reliefOrderID) {
      return String(matchedOrder.reliefOrderID);
    }
  }

  return "";
};

const normalizeLooseToken = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const STATUS_FILTER_OPTIONS = [
  {
    apiValue: "Pending",
    tokens: ["pending", "cho_xu_ly", "new", "created", "awaiting"],
  },
  {
    apiValue: "Prepared",
    tokens: ["prepared", "da_chuan_bi", "ready"],
  },
  {
    apiValue: "PickedUp",
    tokens: ["picked_up", "pickup", "da_nhan", "nhan_hang"],
  },
  {
    apiValue: "Completed",
    tokens: ["completed", "done", "hoan_thanh"],
  },
  {
    apiValue: "Cancelled",
    tokens: ["cancelled", "canceled", "rejected", "failed", "da_huy", "huy"],
  },
  {
    apiValue: "InProgress",
    tokens: ["in_progress", "inprogress", "processing", "preparing", "dang_xu_ly"],
  },
];

const normalizeStatusFilterValues = (value) => {
  const rawValues = Array.isArray(value)
    ? value
    : String(value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

  return Array.from(
    new Set(
      rawValues.map((entry) => {
        const token = normalizeLooseToken(entry);
        const matchedStatus = STATUS_FILTER_OPTIONS.find((option) =>
          option.tokens.some(
            (candidate) => token === candidate || token.includes(candidate),
          ),
        );

        return matchedStatus?.apiValue || entry;
      }),
    ),
  );
};

const matchesStatusFilters = (order, statuses = []) => {
  if (!Array.isArray(statuses) || statuses.length === 0) {
    return true;
  }

  const orderToken = normalizeLooseToken(
    order?.status || order?.orderStatus || order?.missionStatus,
  );

  return statuses.some((status) => {
    const token = normalizeLooseToken(status);
    const matchedStatus = STATUS_FILTER_OPTIONS.find(
      (option) => normalizeLooseToken(option.apiValue) === token,
    );

    if (matchedStatus) {
      return matchedStatus.tokens.some((candidate) => orderToken.includes(candidate));
    }

    return orderToken.includes(token);
  });
};

const toTimestamp = (value) => {
  if (!value) return null;

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
};

const isWithinOptionalRange = (value, from, to) => {
  const targetTimestamp = toTimestamp(value);
  const fromTimestamp = toTimestamp(from);
  const toTimestampValue = toTimestamp(to);

  if (fromTimestamp === null && toTimestampValue === null) {
    return true;
  }

  if (targetTimestamp === null) {
    return false;
  }

  if (fromTimestamp !== null && targetTimestamp < fromTimestamp) {
    return false;
  }

  if (toTimestampValue !== null && targetTimestamp > toTimestampValue) {
    return false;
  }

  return true;
};

const isPermissionLikeError = (error) => {
  const status = Number(error?.status || 0);
  const message = String(error?.message || "");

  return status === 403 || /\b403\b/.test(message) || /forbidden/i.test(message);
};

const filterOrdersLocally = (orders, filters = {}) =>
  normalizeReliefOrders(orders).filter((order) => {
    if (!matchesStatusFilters(order, filters?.statuses)) {
      return false;
    }

    if (
      !isWithinOptionalRange(
        order?.createdAt,
        filters?.createdFromDate,
        filters?.createdToDate,
      )
    ) {
      return false;
    }

    if (
      !isWithinOptionalRange(
        order?.preparedAt,
        filters?.preparedFromDate,
        filters?.preparedToDate,
      )
    ) {
      return false;
    }

    if (
      !isWithinOptionalRange(
        order?.pickedUpAt,
        filters?.pickedUpFromDate,
        filters?.pickedUpToDate,
      )
    ) {
      return false;
    }

    return true;
  });

const paginateOrders = (orders, pageNumber = 1, pageSize = 12) => {
  const safePageNumber = Math.max(1, Number(pageNumber) || 1);
  const safePageSize = Math.max(1, Number(pageSize) || 12);
  const startIndex = (safePageNumber - 1) * safePageSize;

  return orders.slice(startIndex, startIndex + safePageSize);
};

const normalizeInventoryOption = (item = {}, index = 0) => {
  const reliefItemID = pickFirst(
    item,
    ["reliefItemID", "ReliefItemID", "reliefItemId", "ReliefItemId", "id", "ID"],
    "",
  );
  const reliefItemName = pickFirst(
    item,
    ["reliefItemName", "ReliefItemName", "itemName", "ItemName", "name", "Name"],
    `Vật phẩm ${index + 1}`,
  );
  const availableStock = Number(
    pickFirst(item, ["quantity", "Quantity", "availableStock", "AvailableStock"], 0),
  );

  return {
    ...item,
    reliefItemID: reliefItemID || "",
    reliefItemId: reliefItemID || "",
    reliefItemName,
    availableStock: Number.isFinite(availableStock) ? availableStock : 0,
  };
};

const createEmptyManualItem = () => ({
  reliefItemID: "",
  quantity: "",
});

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

const isSupplyLikeValue = (value) =>
  normalizeLooseToken(value).includes("supply");

const isSupplyReliefOrder = (order, relatedRequest = null) =>
  [
    relatedRequest?.emergencyCategory,
    relatedRequest?.EmergencyCategory,
    relatedRequest?.requestType,
    relatedRequest?.RequestType,
    relatedRequest?.rescueType,
    relatedRequest?.RescueType,
    relatedRequest?.emergencyType,
    relatedRequest?.EmergencyType,
    order?.requestType,
    order?.RequestType,
    order?.rescueType,
    order?.RescueType,
    order?.orderType,
    order?.OrderType,
  ].some((value) => isSupplyLikeValue(value));

const buildPreparedItemsSnapshot = (order, draft = {}) =>
  extractOrderItems(order).map((item, index) => {
    const itemId = String(item?.reliefItemID || getOrderItemKey(item, index));
    const quantity = Number(draft[itemId] ?? item?.quantity ?? 0);

    return {
      ...item,
      quantity: Number.isFinite(quantity) ? quantity : Number(item?.quantity) || 0,
    };
  });

const mergePreparedOrderLocally = (
  sourceOrder,
  preparedItems = [],
  responseOrder = null,
) => {
  const normalizedSource = normalizeReliefOrder(sourceOrder);
  const normalizedResponse =
    responseOrder && typeof responseOrder === "object"
      ? normalizeReliefOrder(responseOrder)
      : {};
  const preparedAt =
    normalizedResponse?.preparedAt ||
    normalizedResponse?.updatedAt ||
    new Date().toISOString();
  const nextStatus =
    normalizedResponse?.orderStatus ||
    normalizedResponse?.status ||
    normalizedSource?.orderStatus ||
    normalizedSource?.status ||
    "Prepared";

  return {
    ...sourceOrder,
    ...(responseOrder && typeof responseOrder === "object" ? responseOrder : {}),
    reliefOrderID:
      normalizedSource?.reliefOrderID || normalizedResponse?.reliefOrderID || "",
    reliefOrderId:
      normalizedSource?.reliefOrderID || normalizedResponse?.reliefOrderID || "",
    status: nextStatus,
    orderStatus: nextStatus,
    preparedAt,
    updatedAt: preparedAt,
    items: preparedItems.length > 0 ? preparedItems : extractOrderItems(normalizedSource),
  };
};

const buildFilterParams = (filters) => ({
  statuses: normalizeStatusFilterValues(filters?.statusesText),
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
  const ordersSnapshotRef = useRef([]);

  const [formFilters, setFormFilters] = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const [orders, setOrders] = useState([]);
  const [rescueRequests, setRescueRequests] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savingOrderIds, setSavingOrderIds] = useState({});
  const [highlightedOrderId, setHighlightedOrderId] = useState("");
  const [detailOrderId, setDetailOrderId] = useState("");
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
        const resolvedCanPrepare =
          normalizedDetail?.canPrepare ?? normalizedSummary?.canPrepare;

        return {
          ...orderSummary,
          ...detail,
          ...normalizedSummary,
          ...normalizedDetail,
          ...(resolvedCanPrepare === undefined ? {} : { canPrepare: resolvedCanPrepare }),
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
    const filterParams = buildFilterParams(filtersToUse);

    const [ordersResult, requestsResult] = await Promise.allSettled([
      reliefOrdersService.filterReliefOrders(filterParams),
      getAllRescueRequests(),
    ]);

    const errors = [];

    if (ordersResult.status === "fulfilled") {
      let orderSummaries = ordersResult.value?.items || [];
      let resolvedTotalCount = Number(ordersResult.value?.totalCount) || orderSummaries.length;

      if (orderSummaries.length === 0) {
        try {
          const fallbackOrdersResponse =
            await reliefOrdersService.getManagerReliefOrders();
          const fallbackOrders = normalizeReliefOrders(
            extractList(fallbackOrdersResponse),
          );
          const locallyFilteredOrders = filterOrdersLocally(
            fallbackOrders,
            filterParams,
          );

          orderSummaries = paginateOrders(
            locallyFilteredOrders,
            filterParams.pageNumber,
            filterParams.pageSize,
          );
          resolvedTotalCount = locallyFilteredOrders.length;

        } catch (fallbackError) {
          console.error(
            "[ManagerReliefOrders] Fallback getManagerReliefOrders failed:",
            fallbackError,
          );
        }
      }

      const hydratedOrders = await hydrateReliefOrders(orderSummaries);

      setOrders(hydratedOrders.items || []);
      setTotalCount(resolvedTotalCount);
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

    // RescueMission route is not available for manager, so this screen skips it.

    if (errors.length > 0) {
      const nextError = errors.join(" | ");

      if (
        ordersResult.status === "fulfilled" &&
        errors.every((errorMessage) => isPermissionLikeError({ message: errorMessage }))
      ) {
        console.warn(
          "[ManagerReliefOrders] Bỏ qua lỗi quyền truy cập không ảnh hưởng đến danh sách đơn:",
          nextError,
        );
        setError("");
      } else {
        setError(nextError);
      }
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
    ordersSnapshotRef.current = orders;
  }, [orders]);

  useEffect(() => {
    try {
      localStorage.setItem(NOTI_STORAGE_KEY, JSON.stringify(notifications));
    } catch (saveError) {
      console.error("Save manager notifications failed:", saveError);
    }
  }, [notifications]);

  useEffect(() => {
    if (!detailOrderId) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setDetailOrderId("");
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [detailOrderId]);

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
      const assignedTeam = findAssignedTeamForOrder(
        normalizedOrder,
        [],
        rescueRequests,
        [],
      );
      const orderStatus =
        normalizedOrder?.status ||
        normalizedOrder?.orderStatus ||
        normalizedOrder?.missionStatus ||
        "Pending";
      const hasAssignedTeam = Boolean(
        assignedTeam?.rescueTeamID ||
          normalizedOrder?.teamID ||
          normalizedOrder?.teamId ||
          normalizedOrder?.teamName ||
          relatedRequest?.assignedTeamName,
      );
      const descriptionText = formatDisplayValue(
        normalizedOrder?.description || relatedRequest?.description,
        "Chưa có mô tả cung ứng.",
      );
      const canPrepare =
        Boolean(normalizedOrder?.reliefOrderID) &&
        Boolean(normalizedOrder?.canPrepare) &&
        !isPreparationLockedStatus(orderStatus);
      const prepareDisabledReason = !normalizedOrder?.reliefOrderID
        ? "Don chua co ReliefOrderID hop le."
        : isPreparationLockedStatus(orderStatus)
          ? "Don da qua buoc soan hoac da ban giao."
        : normalizedOrder?.canPrepare !== true
          ? "Don chua du dieu kien de manager hoan thanh."
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
        assignedTeam,
        assignedTeamName:
          assignedTeam?.teamName ||
          normalizedOrder?.teamName ||
          relatedRequest?.assignedTeamName ||
          "",
        descriptionText,
        statusMeta: getOrderStatusMeta(orderStatus),
        orderStatus,
        hasAssignedTeam,
        canPrepare,
        prepareDisabledReason,
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
    const handleTeamResponse = async (data) => {
      const responseType = String(
        pickFirst(data, TEAM_RESPONSE_TYPE_KEYS, ""),
      ).toLowerCase();
      const acceptedAtValue = pickFirst(data, ACCEPTED_AT_KEYS, "");
      const isRejected = ["reject", "decline", "refuse"].some((value) =>
        responseType.includes(value),
      );
      const isAccepted =
        Boolean(acceptedAtValue) ||
        ["accept", "accepted", "confirm"].some((value) =>
          responseType.includes(value),
        );

      if (isRejected || !isAccepted) {
        return;
      }

      const reliefOrderId = resolveAcceptedReliefOrderId(
        data,
        ordersSnapshotRef.current,
      );

      if (!reliefOrderId) {
        console.warn(
          "[ManagerReliefOrders] Nhận event đội phản hồi nhưng chưa map được sang relief order cụ thể. Sẽ tải lại danh sách để đồng bộ.",
          data,
        );
      }

      const teamName = pickFirst(data, TEAM_EVENT_NAME_KEYS, "");
      setNotifications((prev) =>
        mergeNotifications(prev, [
          {
            id: `team-accepted-${reliefOrderId || Date.now()}`,
            type: "order",
            title: "Đội cứu hộ đã chấp nhận nhiệm vụ",
            message: teamName
              ? reliefOrderId
                ? `${teamName} đã chấp nhận nhiệm vụ cho đơn ${reliefOrderId}.`
                : `${teamName} đã chấp nhận một nhiệm vụ cứu trợ.`
              : reliefOrderId
                ? `Đơn ${reliefOrderId} đã được đội cứu hộ chấp nhận.`
                : "Một đội cứu hộ vừa chấp nhận nhiệm vụ cứu trợ.",
            referenceId: reliefOrderId || "",
            targetRoute: buildManagerReliefOrdersRoute(reliefOrderId || ""),
            timestamp: createTimestamp(),
            createdAt: new Date().toISOString(),
            read: false,
          },
        ]),
      );
      await loadPageData(appliedFilters);
      if (reliefOrderId) {
        setHighlightedOrderId(reliefOrderId);
      }
    };

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
const handleReceiveOrderResponse = (data) => {
  console.log("ReceiveOrderResponse:", data);

  // hiện thông báo
  // toast.success(data?.message || "Đơn hàng vừa có phản hồi");

  // load lại danh sách order
  loadPageData(appliedFilters);
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

      if (reliefOrderId) {
        setOrders((prev) =>
          prev.map((entry) => {
            const currentOrderId = String(normalizeReliefOrder(entry)?.reliefOrderID || "");
            if (currentOrderId !== String(reliefOrderId)) {
              return entry;
            }

            return mergePreparedOrderLocally(
              entry,
              extractOrderItems(entry),
              data,
            );
          }),
        );
      }
    };

    const init = async () => {
      try {
        await signalRService.startConnection();
        await signalRService.on(
          CLIENT_EVENTS.RECEIVE_TEAM_RESPONSE,
          handleTeamResponse,
        );
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
            await signalrService.on(
      CLIENT_EVENTS.RECEIVE_ORDER_RESPONSE,
      handleReceiveOrderResponse
    );
      } catch (signalRError) {
        console.error("SignalR init error in ManagerReliefOrders:", signalRError);
      }
    };

    init();

    return () => {
      signalRService.off(
        CLIENT_EVENTS.RECEIVE_TEAM_RESPONSE,
        handleTeamResponse,
      );
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
           signalrService.off(
      CLIENT_EVENTS.RECEIVE_ORDER_RESPONSE,
      handleReceiveOrderResponse
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

  const handlePrepareOrder = async (order) => {
    const orderId = String(order?.reliefOrderID || "");
    if (!orderId) {
      toast.error("Không tìm thấy ReliefOrderID hợp lệ.");
      return;
    }

    const preparedItemsSnapshot = buildPreparedItemsSnapshot(order);
    const items = preparedItemsSnapshot
      .map((item) => ({
        reliefItemID: item?.reliefItemID,
        quantity: Number(item?.quantity ?? 0),
      }))
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
      const preparedOrderResponse = await reliefOrdersService.prepareOrder({
        reliefOrderID: order.reliefOrderID,
        items,
      });

      setOrders((prev) =>
        prev.map((entry) => {
          const currentOrderId = String(normalizeReliefOrder(entry)?.reliefOrderID || "");
          if (currentOrderId !== orderId) {
            return entry;
          }

          return mergePreparedOrderLocally(
            entry,
            preparedItemsSnapshot,
            preparedOrderResponse,
          );
        }),
      );

      toast.success(
        `Đã hoàn thành chuẩn bị cho đơn ${formatDisplayValue(order.reliefOrderID)}.`,
      );
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
  const detailModalOrder = orderCards.find(
    (order) =>
      String(order?.reliefOrderID || order?.orderKey || "").toLowerCase() ===
      String(detailOrderId || "").toLowerCase(),
  );

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

                  <div className="relief-order-meta-grid manager-relief-order-compact-grid">
                    <div className="relief-order-meta manager-relief-order-meta">
                      <span>Đội được phân công</span>
                      <strong>
                        {formatDisplayValue(order.assignedTeamName, "Chưa xác định đội")}
                      </strong>
                      <small>
                        Mã đội: {formatDisplayValue(order?.assignedTeam?.rescueTeamID, "Chưa có")}
                      </small>
                    </div>

                    <div className="relief-order-meta manager-relief-order-meta">
                      <span>Mốc thời gian</span>
                      <strong>Tạo: {formatDateTime(order.createdAt)}</strong>
                      <small>Chuẩn bị: {formatDateTime(order.preparedAt)}</small>
                      <small>Nhận hàng: {formatDateTime(order.pickedUpAt)}</small>
                    </div>
                  </div>

                  <div className="manager-relief-order-actions">
                    <button
                      className="btn btn-outline-primary manager-relief-order-detail-btn"
                      type="button"
                      onClick={() => setDetailOrderId(orderId)}
                    >
                      Xem chi tiết
                    </button>

                    <button
                      className="btn btn-primary relief-order-action-btn"
                      onClick={() => handlePrepareOrder(order)}
                      disabled={!order.canPrepare || savingOrderIds[orderId]}
                      title={order.prepareDisabledReason || ""}
                    >
                      {savingOrderIds[orderId] ? "Đang hoàn thành..." : "Hoàn thành"}
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

      {detailModalOrder && (
        <div
          className="manager-relief-order-modal-backdrop"
          onClick={() => setDetailOrderId("")}
          role="presentation"
        >
          <div
            className="manager-relief-order-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="manager-relief-order-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="manager-relief-order-modal-head">
              <div className="manager-relief-order-modal-title-group">
                <span>Chi tiết đơn cứu trợ</span>
                <h3 id="manager-relief-order-modal-title">
                  {formatDisplayValue(detailModalOrder.reliefOrderID)}
                </h3>
              </div>

              <button
                className="manager-relief-order-modal-close"
                type="button"
                onClick={() => setDetailOrderId("")}
              >
                Đóng
              </button>
            </div>

            <div className="manager-relief-order-modal-field">
              <span className="manager-relief-order-modal-label">Mô tả</span>
              <div className="manager-relief-order-modal-description">
                {detailModalOrder.descriptionText}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
