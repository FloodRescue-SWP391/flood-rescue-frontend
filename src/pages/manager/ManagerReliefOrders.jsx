import "./ManagerDashboard.css";
import "./ManagerReliefOrders.css";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  getAllRescueRequests,
  getRescueRequestById,
} from "../../services/rescueRequestService";
import signalRService from "../../services/signalrService";
import { CLIENT_EVENTS } from "../../data/signalrConstants";
import { reliefItemsService } from "../../services/reliefItemService";
import {
  extractOrderItems,
  findAssignedTeamForOrder,
  findRelatedRequestForOrder,
  normalizeReliefOrder,
  normalizeReliefOrders,
  normalizeRescueRequestSummary,
  normalizeRescueRequests,
  reliefOrdersService,
} from "../../services/reliefOrdersService";
import { getWarehouseById, getWarehouses } from "../../services/warehouseService";

const DEFAULT_FILTERS = {
  statusesText: "Pending, Prepared",
  createdFromDate: "",
  createdToDate: "",
  preparedFromDate: "",
  preparedToDate: "",
  pageNumber: 1,
  pageSize: 12,
};

const NOTI_STORAGE_KEY = "manager_notifications";
const MANAGER_WAREHOUSE_STORAGE_KEY = "manager_dashboard_warehouse_id";
const MANAGER_RELIEF_ORDERS_ROUTE = "/manager/relief-orders";
const MANAGER_RELIEF_ORDERS_AUTO_REFRESH_INTERVAL_MS = 10000;
const SHARED_PREPARED_ORDER_STORAGE_KEY = "shared_prepared_order_notifications";

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

const DESCRIPTION_KEYS = [
  "description",
  "Description",
  "specialNeeds",
  "SpecialNeeds",
  "note",
  "Note",
  "details",
  "Details",
  "requestDescription",
  "RequestDescription",
  "incidentDescription",
  "IncidentDescription",
];

const getDescriptionValue = (source, fallback = "") =>
  pickFirst(source, DESCRIPTION_KEYS, fallback);

const resolveOrderDescription = (order = {}, relatedRequest = null) =>
  getDescriptionValue(relatedRequest, "") ||
  getDescriptionValue(order?.rescueRequest, "") ||
  getDescriptionValue(order?.requestInfo, "") ||
  getDescriptionValue(order, "");

const hasDisplayText = (value) => String(value ?? "").trim() !== "";

const extractApiObject = (payload) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return payload;
  }

  return payload?.content || payload?.data || payload;
};

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

const normalizeLookupToken = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const findMatchingReliefItem = (text, catalog = []) => {
  const normalizedText = normalizeLookupToken(text).replace(/\b\d+\b/g, " ").trim();
  if (!normalizedText) {
    return null;
  }

  const candidates = catalog
    .map((item) => ({
      item,
      token: normalizeLookupToken(item?.reliefItemName || item?.itemName || ""),
    }))
    .filter((entry) => entry.token)
    .sort((left, right) => right.token.length - left.token.length);

  return (
    candidates.find(
      (entry) =>
        normalizedText.includes(entry.token) || entry.token.includes(normalizedText),
    )?.item || null
  );
};

const inferRequestedItemsFromText = (text, catalog = []) => {
  if (!text || !Array.isArray(catalog) || catalog.length === 0) {
    return [];
  }

  const segments = String(text)
    .split(/\r?\n|,|;|\+|\/|&/g)
    .map((entry) => entry.trim())
    .filter(Boolean);

  const aggregated = new Map();

  segments.forEach((segment) => {
    const matchedItem = findMatchingReliefItem(segment, catalog);
    if (!matchedItem) {
      return;
    }

    const quantityMatch = normalizeLookupToken(segment).match(/\b(\d+)\b/);
    const quantity = Number(quantityMatch?.[1] || 1);
    const reliefItemID =
      matchedItem?.reliefItemID || matchedItem?.reliefItemId || matchedItem?.id || "";

    if (!reliefItemID) {
      return;
    }

    const existing = aggregated.get(String(reliefItemID));
    aggregated.set(String(reliefItemID), {
      ...(existing || matchedItem),
      reliefItemID,
      reliefItemId: reliefItemID,
      reliefItemName:
        matchedItem?.reliefItemName || matchedItem?.itemName || existing?.reliefItemName || "",
      quantity: (existing?.quantity || 0) + (Number.isFinite(quantity) ? quantity : 1),
      isInferred: true,
      sourceText: segment,
    });
  });

  return Array.from(aggregated.values());
};

const buildResolvableOrderItems = (order, relatedRequest = null, catalog = []) => {
  const directItems = extractOrderItems(order);
  if (directItems.length > 0) {
    return directItems;
  }

  return inferRequestedItemsFromText(resolveOrderDescription(order, relatedRequest), catalog);
};

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

const isPreparationLockedStatus = (status) =>
  [
    "sent",
    "dispatch",
    "delivered",
    "completed",
    "picked_up",
    "pickup",
    "done",
  ].some((value) => getOrderStatusToken(status).includes(value));

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

const hasAcceptedMissionSignal = (order, locallyAcceptedOrderIds = []) => {
  const reliefOrderId = String(order?.reliefOrderID || order?.reliefOrderId || "");

  return (
    Boolean(order?.acceptedAt) ||
    isMissionAcceptedStatus(order?.missionStatus || order?.status) ||
    (reliefOrderId !== "" && locallyAcceptedOrderIds.includes(reliefOrderId))
  );
};

const isPreparedOrder = (order) =>
  Boolean(order?.preparedAt) ||
  ["prepared", "preparing", "ready", "confirmed"].some((value) =>
    getOrderStatusToken(order?.orderStatus).includes(value),
  );

const getManagerOrderState = (order) =>
  isPreparedOrder(order) ? "prepared" : "pending";

const getManagerOrderStatusMeta = (order) => {
  const state = getManagerOrderState(order);

  if (state === "prepared") {
    return { className: "is-processing", label: "Prepare" };
  }

  return { className: "is-pending", label: "Pending" };
};

const canPrepareOrderLocally = ({
  order,
  orderStatus,
  hasAssignedTeam,
  hasAcceptedMission,
}) =>
  Boolean(order?.reliefOrderID) &&
  hasAssignedTeam &&
  hasAcceptedMission &&
  !isPreparedOrder(order) &&
  !isPreparationLockedStatus(orderStatus);

const getOrderItemKey = (item, index) =>
  item?.reliefItemID ||
  item?.reliefItemId ||
  item?.itemID ||
  item?.itemId ||
  `${item?.itemName || item?.reliefItemName || "item"}-${index}`;

const buildPreparedItemsSnapshot = (order, draft = {}) =>
  extractOrderItems(order).map((item, index) => {
    const itemId = String(item?.reliefItemID || getOrderItemKey(item, index));
    const quantity = Number(draft[itemId] ?? item?.quantity ?? 0);

    return {
      ...item,
      quantity: Number.isFinite(quantity) ? quantity : Number(item?.quantity) || 0,
    };
  });

const normalizeWarehousePreparationMeta = (warehouse = {}) => {
  if (!warehouse || typeof warehouse !== "object") {
    return null;
  }

  const warehouseID = pickFirst(
    warehouse,
    ["warehouseID", "WarehouseID", "warehouseId", "WarehouseId", "id", "ID"],
    "",
  );

  if (!warehouseID) {
    return null;
  }

  const warehouseName = pickFirst(
    warehouse,
    ["warehouseName", "WarehouseName", "name", "Name"],
    "",
  );
  const warehouseAddress = pickFirst(
    warehouse,
    ["address", "Address", "warehouseAddress", "WarehouseAddress"],
    "",
  );
  const pickupLatitude = pickFirst(
    warehouse,
    ["locationLat", "LocationLat", "latitude", "Latitude", "lat", "Lat"],
    null,
  );
  const pickupLongitude = pickFirst(
    warehouse,
    [
      "locationLong",
      "LocationLong",
      "longitude",
      "Longitude",
      "lng",
      "Lng",
      "lon",
      "Lon",
    ],
    null,
  );

  return {
    warehouseID,
    warehouseId: warehouseID,
    warehouseName,
    warehouseAddress,
    pickupAddress: warehouseAddress,
    pickupLatitude,
    pickupLongitude,
  };
};

const extractPreparedOrderWarehouseMeta = (source = {}) => {
  if (!source || typeof source !== "object") {
    return null;
  }

  const itemSources = [
    ...(Array.isArray(source?.items) ? source.items : []),
    ...(Array.isArray(source?.Items) ? source.Items : []),
    ...(Array.isArray(source?.itemTrackings) ? source.itemTrackings : []),
    ...(Array.isArray(source?.ItemTrackings) ? source.ItemTrackings : []),
    ...(Array.isArray(source?.reliefItems) ? source.reliefItems : []),
    ...(Array.isArray(source?.ReliefItems) ? source.ReliefItems : []),
    ...(Array.isArray(source?.orderItems) ? source.orderItems : []),
    ...(Array.isArray(source?.OrderItems) ? source.OrderItems : []),
    ...(Array.isArray(source?.content?.items) ? source.content.items : []),
    ...(Array.isArray(source?.content?.Items) ? source.content.Items : []),
    ...(Array.isArray(source?.content?.itemTrackings)
      ? source.content.itemTrackings
      : []),
    ...(Array.isArray(source?.content?.ItemTrackings)
      ? source.content.ItemTrackings
      : []),
    ...(Array.isArray(source?.data?.items) ? source.data.items : []),
    ...(Array.isArray(source?.data?.Items) ? source.data.Items : []),
    ...(Array.isArray(source?.data?.itemTrackings) ? source.data.itemTrackings : []),
    ...(Array.isArray(source?.data?.ItemTrackings) ? source.data.ItemTrackings : []),
  ];
  const pickupItem =
    itemSources.find(
      (item) =>
        item &&
        typeof item === "object" &&
        (item?.warehouseAddress ||
          item?.WarehouseAddress ||
          item?.pickupAddress ||
          item?.PickupAddress ||
          item?.warehouseID ||
          item?.warehouseId ||
          item?.warehouseName),
    ) || {};

  const normalizedWarehouse = normalizeWarehousePreparationMeta(source);
  if (normalizedWarehouse) {
    return normalizedWarehouse;
  }

  const warehouseID = pickFirst(
    source,
    [
      "warehouseID",
      "WarehouseID",
      "warehouseId",
      "WarehouseId",
      "pickupWarehouseID",
      "PickupWarehouseID",
      "pickupWarehouseId",
      "PickupWarehouseId",
      "warehouseID",
      "WarehouseID",
      "warehouseId",
      "WarehouseId",
    ],
    "",
  ) ||
    pickFirst(
      pickupItem,
      [
        "warehouseID",
        "WarehouseID",
        "warehouseId",
        "WarehouseId",
        "pickupWarehouseID",
        "PickupWarehouseID",
        "pickupWarehouseId",
        "PickupWarehouseId",
      ],
      "",
    );
  const warehouseName = pickFirst(
    source,
    [
      "warehouseName",
      "WarehouseName",
      "pickupWarehouseName",
      "PickupWarehouseName",
    ],
    "",
  ) ||
    pickFirst(
      pickupItem,
      [
        "warehouseName",
        "WarehouseName",
        "pickupWarehouseName",
        "PickupWarehouseName",
      ],
      "",
    );
  const pickupAddress = pickFirst(
    source,
    [
      "pickupAddress",
      "PickupAddress",
      "warehouseAddress",
      "WarehouseAddress",
      "pickupLocationAddress",
      "PickupLocationAddress",
    ],
    "",
  ) ||
    pickFirst(
      pickupItem,
      [
        "pickupAddress",
        "PickupAddress",
        "warehouseAddress",
        "WarehouseAddress",
        "pickupLocationAddress",
        "PickupLocationAddress",
      ],
      "",
    );
  const pickupLatitude = pickFirst(
    source,
    [
      "pickupLatitude",
      "PickupLatitude",
      "pickupLat",
      "PickupLat",
      "warehouseLatitude",
      "WarehouseLatitude",
      "warehouseLat",
      "WarehouseLat",
    ],
    null,
  ) ??
    pickFirst(
      pickupItem,
      [
        "pickupLatitude",
        "PickupLatitude",
        "pickupLat",
        "PickupLat",
        "warehouseLatitude",
        "WarehouseLatitude",
        "warehouseLat",
        "WarehouseLat",
      ],
      null,
    );
  const pickupLongitude = pickFirst(
    source,
    [
      "pickupLongitude",
      "PickupLongitude",
      "pickupLng",
      "PickupLng",
      "pickupLong",
      "PickupLong",
      "warehouseLongitude",
      "WarehouseLongitude",
      "warehouseLng",
      "WarehouseLng",
      "warehouseLong",
      "WarehouseLong",
    ],
    null,
  ) ??
    pickFirst(
      pickupItem,
      [
        "pickupLongitude",
        "PickupLongitude",
        "pickupLng",
        "PickupLng",
        "pickupLong",
        "PickupLong",
        "warehouseLongitude",
        "WarehouseLongitude",
        "warehouseLng",
        "WarehouseLng",
        "warehouseLong",
        "WarehouseLong",
      ],
      null,
    );

  if (
    !warehouseID &&
    !warehouseName &&
    !pickupAddress &&
    pickupLatitude == null &&
    pickupLongitude == null
  ) {
    return null;
  }

  return {
    ...(warehouseID ? { warehouseID, warehouseId: warehouseID } : {}),
    warehouseName,
    warehouseAddress: pickupAddress,
    pickupAddress,
    pickupLatitude,
    pickupLongitude,
  };
};

const getSelectedManagerWarehouseId = () => {
  try {
    return localStorage.getItem(MANAGER_WAREHOUSE_STORAGE_KEY) || "";
  } catch (error) {
    console.warn("Load selected manager warehouse failed:", error);
    return "";
  }
};

const loadSelectedManagerWarehouseMeta = async (warehouseId = "", warehouseList = []) => {
  const selectedWarehouseId = warehouseId || getSelectedManagerWarehouseId();
  if (!selectedWarehouseId) return null;

  const matchedWarehouse = Array.isArray(warehouseList)
    ? warehouseList.find(
        (warehouse) => getWarehouseOptionId(warehouse) === String(selectedWarehouseId),
      )
    : null;
  const fallbackMeta =
    normalizeWarehousePreparationMeta(matchedWarehouse) || {
      warehouseID: selectedWarehouseId,
      warehouseId: selectedWarehouseId,
    };

  try {
    const warehouseDetail = await getWarehouseById(selectedWarehouseId);
    return normalizeWarehousePreparationMeta(warehouseDetail) || fallbackMeta;
  } catch (error) {
    console.warn("Load manager warehouse detail failed:", error);
    return fallbackMeta;
  }
};

const getWarehouseOptionId = (warehouse) =>
  String(warehouse?.warehouseId || warehouse?.warehouseID || warehouse?.id || "");

const publishPreparedOrderSharedEvent = ({
  order,
  warehouseMeta,
  preparedOrderResult,
}) => {
  const normalizedOrder = normalizeReliefOrder(order);
  const normalizedPreparedOrder =
    preparedOrderResult && typeof preparedOrderResult === "object"
      ? normalizeReliefOrder(preparedOrderResult)
      : {};

  const teamId = pickFirst(
    normalizedPreparedOrder,
    [
      "rescueTeamID",
      "rescueTeamId",
      "assignedTeamID",
      "assignedTeamId",
      "teamID",
      "teamId",
    ],
    pickFirst(
      normalizedOrder,
      [
        "rescueTeamID",
        "rescueTeamId",
        "assignedTeamID",
        "assignedTeamId",
        "teamID",
        "teamId",
      ],
      "",
    ),
  );

  if (!teamId) {
    return;
  }

  const managerName = (() => {
    try {
      return (
        localStorage.getItem("fullName") ||
        localStorage.getItem("userFullName") ||
        "Manager"
      );
    } catch {
      return "Manager";
    }
  })();
  const resolvedWarehouseMeta =
    (warehouseMeta && typeof warehouseMeta === "object" ? warehouseMeta : null) ||
    extractPreparedOrderWarehouseMeta(preparedOrderResult) ||
    extractPreparedOrderWarehouseMeta(normalizedPreparedOrder) ||
    extractPreparedOrderWarehouseMeta(normalizedOrder);

  const payload = {
    id: `prepared-${normalizedOrder?.reliefOrderID || Date.now()}`,
    source: "manager_prepare_order",
    teamId: String(teamId),
    reliefOrderID:
      normalizedPreparedOrder?.reliefOrderID || normalizedOrder?.reliefOrderID || "",
    rescueMissionID:
      normalizedPreparedOrder?.rescueMissionID || normalizedOrder?.rescueMissionID || "",
    rescueRequestID:
      normalizedPreparedOrder?.rescueRequestID || normalizedOrder?.rescueRequestID || "",
    managerName,
    createdAt: new Date().toISOString(),
    ...(resolvedWarehouseMeta || {}),
  };

  try {
    const raw = localStorage.getItem(SHARED_PREPARED_ORDER_STORAGE_KEY);
    const currentList = raw ? JSON.parse(raw) : [];
    const nextList = Array.isArray(currentList) ? currentList : [];
    const deduped = nextList.filter(
      (entry) =>
        String(entry?.id || "") !== payload.id &&
        String(entry?.reliefOrderID || "") !== String(payload.reliefOrderID || ""),
    );

    deduped.unshift(payload);
    localStorage.setItem(
      SHARED_PREPARED_ORDER_STORAGE_KEY,
      JSON.stringify(deduped.slice(0, 50)),
    );
  } catch (error) {
    console.warn("Publish shared prepared order event failed:", error);
  }
};

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
  const responseItems = extractOrderItems(
    responseOrder && typeof responseOrder === "object" ? responseOrder : {},
  );
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
  const nextItems =
    responseItems.length > 0
      ? responseItems.map((item, index) => ({
          ...(preparedItems[index] || {}),
          ...item,
          quantity:
            Number(item?.quantity) ||
            Number(preparedItems[index]?.quantity) ||
            0,
        }))
      : preparedItems.length > 0
        ? preparedItems
        : extractOrderItems(normalizedSource);

  return {
    ...sourceOrder,
    ...(responseOrder && typeof responseOrder === "object" ? responseOrder : {}),
    reliefOrderID:
      normalizedSource?.reliefOrderID || normalizedResponse?.reliefOrderID || "",
    reliefOrderId:
      normalizedSource?.reliefOrderID || normalizedResponse?.reliefOrderID || "",
    status: nextStatus,
    orderStatus: nextStatus,
    missionStatus:
      normalizedResponse?.missionStatus || normalizedSource?.missionStatus || "",
    description:
      normalizedResponse?.description ||
      normalizedSource?.description ||
      sourceOrder?.description ||
      "",
    preparedAt,
    updatedAt: preparedAt,
    items: nextItems,
  };
};

const mergePickedUpOrderLocally = (sourceOrder, responseOrder = null) => {
  const normalizedSource = normalizeReliefOrder(sourceOrder);
  const normalizedResponse =
    responseOrder && typeof responseOrder === "object"
      ? normalizeReliefOrder(responseOrder)
      : {};
  const pickedUpAt =
    normalizedResponse?.pickedUpAt ||
    normalizedResponse?.updatedAt ||
    normalizedSource?.pickedUpAt ||
    new Date().toISOString();
  const nextOrderStatus =
    normalizedResponse?.orderStatus ||
    normalizedResponse?.status ||
    normalizedSource?.orderStatus ||
    normalizedSource?.status ||
    "PickedUp";
  const nextMissionStatus =
    normalizedResponse?.missionStatus || normalizedSource?.missionStatus || "";

  return {
    ...sourceOrder,
    ...(responseOrder && typeof responseOrder === "object" ? responseOrder : {}),
    reliefOrderID:
      normalizedSource?.reliefOrderID || normalizedResponse?.reliefOrderID || "",
    reliefOrderId:
      normalizedSource?.reliefOrderID || normalizedResponse?.reliefOrderID || "",
    status: nextOrderStatus,
    orderStatus: nextOrderStatus,
    missionStatus: nextMissionStatus,
    pickedUpAt,
    updatedAt: pickedUpAt,
  };
};

const buildFilterParams = (filters) => ({
  statuses: normalizeStatusFilterValues(filters?.statusesText),
  createdFromDate: filters?.createdFromDate || "",
  createdToDate: filters?.createdToDate || "",
  preparedFromDate: filters?.preparedFromDate || "",
  preparedToDate: filters?.preparedToDate || "",
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

const buildOrderNotification = (order, requests = []) => {
  const normalizedOrder = normalizeReliefOrder(order);
  const relatedRequest = findRelatedRequestForOrder(normalizedOrder, requests);
  const requestLabel =
    relatedRequest?.shortCode ||
    relatedRequest?.requestShortCode ||
    normalizedOrder?.requestShortCode ||
    relatedRequest?.rescueRequestID ||
    normalizedOrder?.rescueRequestID ||
    "";
  const description = resolveOrderDescription(normalizedOrder, relatedRequest);
  const teamName =
    normalizedOrder?.teamName || relatedRequest?.assignedTeamName || "";
  const messageParts = [];

  if (requestLabel) {
    messageParts.push(`Có đơn cứu trợ cho yêu cầu #${requestLabel}.`);
  } else {
    messageParts.push("Có đơn cứu trợ cần manager xử lý.");
  }

  if (teamName) {
    messageParts.push(`Đội nhận đơn: ${teamName}.`);
  }

  if (hasDisplayText(description)) {
    messageParts.push(`Mô tả: ${String(description).trim()}`);
  }

  return {
    id:
      `order-${normalizedOrder?.reliefOrderID || normalizedOrder?.rescueRequestID || normalizedOrder?.requestShortCode || Date.now()}`,
    type: "order",
    title: "Đơn cứu trợ",
    message: messageParts.join(" "),
    referenceId: normalizedOrder?.reliefOrderID || "",
    targetRoute: buildManagerReliefOrdersRoute(normalizedOrder?.reliefOrderID || ""),
    timestamp: createTimestamp(),
    createdAt: normalizedOrder?.createdAt || new Date().toISOString(),
    read: false,
  };
};

export default function ManagerReliefOrders() {
  const navigate = useNavigate();
  const location = useLocation();
  const orderCardRefs = useRef({});
  const ordersSnapshotRef = useRef([]);
  const rescueRequestDetailCacheRef = useRef(new Map());

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
  const [locallyAcceptedOrderIds, setLocallyAcceptedOrderIds] = useState([]);
  const [reliefItemCatalog, setReliefItemCatalog] = useState([]);
  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(() =>
    getSelectedManagerWarehouseId(),
  );
  const [prepareDialogOrderId, setPrepareDialogOrderId] = useState("");
  const [prepareWarehouseId, setPrepareWarehouseId] = useState(() =>
    getSelectedManagerWarehouseId(),
  );

  const hydrateRescueRequestsForOrders = async (
    orderItems = [],
    requestItems = [],
  ) => {
    const normalizedOrders = normalizeReliefOrders(orderItems);
    const requestMap = new Map(
      normalizeRescueRequests(requestItems).map((request) => [
        toComparable(request?.rescueRequestID || request?.id || ""),
        request,
      ]),
    );
    const requestIdsToFetch = Array.from(
      new Set(
        normalizedOrders
          .map((order) => order?.rescueRequestID || order?.rescueRequestId || "")
          .filter(Boolean),
      ),
    ).filter((requestId) => {
      const existingRequest = requestMap.get(toComparable(requestId));
      return !hasDisplayText(resolveOrderDescription(existingRequest));
    });

    if (requestIdsToFetch.length === 0) {
      return Array.from(requestMap.values());
    }

    const detailResults = await Promise.allSettled(
      requestIdsToFetch.map(async (requestId) => {
        const cacheKey = toComparable(requestId);

        if (rescueRequestDetailCacheRef.current.has(cacheKey)) {
          return rescueRequestDetailCacheRef.current.get(cacheKey);
        }

        const response = await getRescueRequestById(requestId);
        const normalizedRequest = normalizeRescueRequestSummary(
          extractApiObject(response),
        );

        if (normalizedRequest?.rescueRequestID) {
          rescueRequestDetailCacheRef.current.set(cacheKey, normalizedRequest);
        }

        return normalizedRequest;
      }),
    );

    detailResults.forEach((result, index) => {
      if (result.status !== "fulfilled") {
        console.warn(
          "[ManagerReliefOrders] Load rescue request detail failed:",
          requestIdsToFetch[index],
          result.reason,
        );
        return;
      }

      const normalizedRequest = normalizeRescueRequestSummary(result.value || {});
      const requestId = normalizedRequest?.rescueRequestID || normalizedRequest?.id || "";

      if (!requestId) {
        return;
      }

      const cacheKey = toComparable(requestId);
      const previousRequest = requestMap.get(cacheKey) || {};

      requestMap.set(cacheKey, {
        ...previousRequest,
        ...normalizedRequest,
      });
    });

    return Array.from(requestMap.values());
  };

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
        const resolvedStatus =
          normalizedDetail?.status || normalizedSummary?.status || "";
        const resolvedOrderStatus =
          normalizedDetail?.orderStatus ||
          normalizedSummary?.orderStatus ||
          resolvedStatus;
        const resolvedMissionStatus =
          normalizedDetail?.missionStatus || normalizedSummary?.missionStatus || "";
        const resolvedCreatedAt =
          normalizedDetail?.createdAt || normalizedSummary?.createdAt || null;
        const resolvedAcceptedAt =
          normalizedDetail?.acceptedAt || normalizedSummary?.acceptedAt || null;
        const resolvedPreparedAt =
          normalizedDetail?.preparedAt || normalizedSummary?.preparedAt || null;
        const resolvedPickedUpAt =
          normalizedDetail?.pickedUpAt || normalizedSummary?.pickedUpAt || null;
        const resolvedUpdatedAt =
          normalizedDetail?.updatedAt ||
          normalizedSummary?.updatedAt ||
          resolvedPickedUpAt ||
          resolvedPreparedAt ||
          resolvedCreatedAt;

        return {
          ...orderSummary,
          ...detail,
          ...normalizedSummary,
          ...normalizedDetail,
          ...(resolvedCanPrepare === undefined ? {} : { canPrepare: resolvedCanPrepare }),
          status: resolvedOrderStatus || resolvedMissionStatus || resolvedStatus,
          orderStatus: resolvedOrderStatus,
          missionStatus: resolvedMissionStatus,
          createdAt: resolvedCreatedAt,
          acceptedAt: resolvedAcceptedAt,
          preparedAt: resolvedPreparedAt,
          pickedUpAt: resolvedPickedUpAt,
          updatedAt: resolvedUpdatedAt,
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
    let nextOrders = [];
    let nextRescueRequests = [];

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
      nextOrders = hydratedOrders.items || [];

      setOrders(nextOrders);
      setTotalCount(resolvedTotalCount);
      if (hydratedOrders.errors.length > 0) {
        errors.push(hydratedOrders.errors.join(" "));
      }
    } else {
      nextOrders = [];
      setOrders([]);
      setTotalCount(0);
      errors.push(
        ordersResult.reason?.message || "Không thể tải danh sách đơn cứu trợ.",
      );
    }

    if (requestsResult.status === "fulfilled") {
      nextRescueRequests = normalizeRescueRequests(extractList(requestsResult.value));
    } else {
      nextRescueRequests = [];
      errors.push(
        requestsResult.reason?.message || "Không thể tải danh sách yêu cầu cứu hộ.",
      );
    }

    if (nextOrders.length > 0) {
      nextRescueRequests = await hydrateRescueRequestsForOrders(
        nextOrders,
        nextRescueRequests,
      );

      setNotifications((prev) =>
        mergeNotifications(
          prev,
          nextOrders.map((order) => buildOrderNotification(order, nextRescueRequests)),
        ),
      );
    }

    setRescueRequests(nextRescueRequests);

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
    const intervalId = window.setInterval(() => {
      loadPageData(appliedFilters).catch((loadError) => {
        console.warn("[ManagerReliefOrders] Auto refresh failed:", loadError);
      });
    }, MANAGER_RELIEF_ORDERS_AUTO_REFRESH_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [appliedFilters]);

  useEffect(() => {
    reliefItemsService
      .getAll()
      .then((items) => {
        setReliefItemCatalog(items.map((item, index) => normalizeInventoryOption(item, index)));
      })
      .catch((loadError) => {
        console.warn("[ManagerReliefOrders] Load relief item catalog failed:", loadError);
        setReliefItemCatalog([]);
      });
  }, []);

  useEffect(() => {
    getWarehouses()
      .then((items) => {
        setWarehouseOptions(Array.isArray(items) ? items : []);
      })
      .catch((loadError) => {
        console.warn("[ManagerReliefOrders] Load warehouses failed:", loadError);
        setWarehouseOptions([]);
      });
  }, []);

  useEffect(() => {
    try {
      if (selectedWarehouseId) {
        localStorage.setItem(MANAGER_WAREHOUSE_STORAGE_KEY, selectedWarehouseId);
      } else {
        localStorage.removeItem(MANAGER_WAREHOUSE_STORAGE_KEY);
      }
    } catch (error) {
      console.warn("Save selected manager warehouse failed:", error);
    }
  }, [selectedWarehouseId]);

  useEffect(() => {
    if (selectedWarehouseId || warehouseOptions.length !== 1) {
      return;
    }

    const onlyWarehouseId = getWarehouseOptionId(warehouseOptions[0]);
    if (onlyWarehouseId) {
      setSelectedWarehouseId(onlyWarehouseId);
    }
  }, [selectedWarehouseId, warehouseOptions]);

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
    if (!detailOrderId && !prepareDialogOrderId) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        if (prepareDialogOrderId) {
          setPrepareDialogOrderId("");
          return;
        }

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
  }, [detailOrderId, prepareDialogOrderId]);

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
      const relatedRequest = findRelatedRequestForOrder(
        normalizedOrder,
        rescueRequests,
      );
      const items = buildResolvableOrderItems(
        normalizedOrder,
        relatedRequest,
        reliefItemCatalog,
      );
      const resolvedDescription = resolveOrderDescription(
        normalizedOrder,
        relatedRequest,
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
        resolvedDescription,
        "Chưa có mô tả từ rescue request.",
      );
      const hasAcceptedMission = hasAcceptedMissionSignal(
        normalizedOrder,
        locallyAcceptedOrderIds,
      );
      const managerOrderState = getManagerOrderState(normalizedOrder);
      const canPrepareLocally = canPrepareOrderLocally({
        order: normalizedOrder,
        orderStatus,
        hasAssignedTeam,
        hasAcceptedMission,
      });
      const canPrepare =
        !isPreparedOrder(normalizedOrder) &&
        (normalizedOrder?.canPrepare === true ||
          (normalizedOrder?.canPrepare !== false && canPrepareLocally));
      const prepareDisabledReason = !normalizedOrder?.reliefOrderID
        ? "Don chua co ReliefOrderID hop le."
        : managerOrderState === "prepared"
          ? "Don da o trang thai Prepare."
        : !hasAssignedTeam
          ? "Don chua duoc coordinator gan doi cuu ho."
        : isPreparationLockedStatus(orderStatus)
          ? "Don da duoc doi nhan hoac da hoan tat."
        : normalizedOrder?.canPrepare !== true && !hasAcceptedMission
          ? "Don chua duoc doi cuu ho chap nhan nhiem vu."
        : !canPrepare
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
        description: resolvedDescription,
        relatedRequest,
        assignedTeam,
        assignedTeamName:
          assignedTeam?.teamName ||
          normalizedOrder?.teamName ||
          relatedRequest?.assignedTeamName ||
          "",
        descriptionText,
        managerOrderState,
        statusMeta: getManagerOrderStatusMeta(normalizedOrder),
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

      if (reliefOrderId) {
        setLocallyAcceptedOrderIds((prev) =>
          prev.includes(String(reliefOrderId))
            ? prev
            : [...prev, String(reliefOrderId)],
        );
      }

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
      setFormFilters((prev) => ({
        ...prev,
        pageNumber: 1,
      }));
      setAppliedFilters((prev) => ({
        ...prev,
        pageNumber: 1,
      }));
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
      if (reliefOrderId) {
        setHighlightedOrderId(reliefOrderId);
      }
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

      if (reliefOrderId) {
        setOrders((prev) =>
          prev.map((entry) => {
            const currentOrderId = String(normalizeReliefOrder(entry)?.reliefOrderID || "");
            if (currentOrderId !== String(reliefOrderId)) {
              return entry;
            }

            return mergePickedUpOrderLocally(entry, data);
          }),
        );
      }

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

  const handlePrepareWarehouseChange = (event) => {
    const nextWarehouseId = event.target.value || "";
    setPrepareWarehouseId(nextWarehouseId);
    setSelectedWarehouseId(nextWarehouseId);
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

  const openPrepareDialog = (order) => {
    const orderId = String(order?.reliefOrderID || "");
    if (!orderId) {
      toast.error("KhÃ´ng tÃ¬m tháº¥y ReliefOrderID há»£p lá»‡.");
      return false;
    }

    if (!order?.canPrepare) {
      toast.error(order?.prepareDisabledReason || "Don chua du dieu kien de Prepare.");
      return false;
    }

    const defaultWarehouseId =
      selectedWarehouseId ||
      getWarehouseOptionId(warehouseOptions[0]) ||
      "";

    if (!defaultWarehouseId) {
      toast.error("Chua tai duoc danh sach kho de chon.");
      return false;
    }

    setPrepareWarehouseId(defaultWarehouseId);
    setPrepareDialogOrderId(orderId);
    return true;
  };

  const closePrepareDialog = () => {
    setPrepareDialogOrderId("");
  };

  const handlePrepareOrder = async (order, warehouseId) => {
    const orderId = String(order?.reliefOrderID || "");
    if (!orderId) {
      toast.error("Không tìm thấy ReliefOrderID hợp lệ.");
      return false;
    }

    if (!warehouseId) {
      toast.error("Hãy chọn kho xuất hàng trước khi Prepare.");
      return false;
    }

    const preparedItemsSnapshot = buildPreparedItemsSnapshot(order);
    const selectedWarehouseMeta = await loadSelectedManagerWarehouseMeta(
      warehouseId,
      warehouseOptions,
    );
    const preparedItemsWithWarehouse = preparedItemsSnapshot.map((item) => ({
      ...item,
      ...(selectedWarehouseMeta || {}),
    }));
    const items = preparedItemsSnapshot
      .map((item) => ({
        reliefItemID: item?.reliefItemID,
        quantity: Number(item?.quantity ?? 0),
        ...(selectedWarehouseMeta || {}),
      }))
      .filter(
        (item) => item?.reliefItemID && Number.isFinite(item.quantity) && item.quantity > 0,
      );

    if (items.length === 0) {
      setDetailOrderId(orderId);
    }

    if (items.length === 0) {
      toast.error("Cần ít nhất 1 vật phẩm hợp lệ để chuẩn bị.");
      return false;
    }

    setSavingOrderIds((prev) => ({
      ...prev,
      [orderId]: true,
    }));

    try {
      const preparedOrderResponse = await reliefOrdersService.prepareOrder({
        reliefOrderID: order.reliefOrderID,
        items,
        ...(selectedWarehouseMeta || {}),
      });
      const preparedOrderResult =
        selectedWarehouseMeta &&
        preparedOrderResponse &&
        typeof preparedOrderResponse === "object"
          ? {
              ...preparedOrderResponse,
              ...selectedWarehouseMeta,
            }
          : preparedOrderResponse;

      publishPreparedOrderSharedEvent({
        order,
        warehouseMeta: selectedWarehouseMeta,
        preparedOrderResult,
      });

      setOrders((prev) =>
        prev.map((entry) => {
          const currentOrderId = String(normalizeReliefOrder(entry)?.reliefOrderID || "");
          if (currentOrderId !== orderId) {
            return entry;
          }

          return mergePreparedOrderLocally(
            entry,
            preparedItemsWithWarehouse,
            preparedOrderResult,
          );
        }),
      );

      setSelectedWarehouseId(warehouseId);
      setPrepareDialogOrderId("");
      toast.success(
        `Đã hoàn thành chuẩn bị cho đơn ${formatDisplayValue(order.reliefOrderID)}.`,
      );
      return true;
    } catch (prepareError) {
      console.error("[ManagerReliefOrders] prepareOrder failed:", prepareError);
      toast.error(prepareError?.message || "Không thể cập nhật chuẩn bị cho đơn cứu trợ.");
      return false;
    } finally {
      setSavingOrderIds((prev) => ({
        ...prev,
        [orderId]: false,
      }));
    }
  };

  const pendingCount = orderCards.filter(
    (order) => order.managerOrderState === "pending",
  ).length;
  const preparedCount = orderCards.filter(
    (order) => order.managerOrderState === "prepared",
  ).length;

  const canGoPrev = appliedFilters.pageNumber > 1;
  const hasNextPage =
    totalCount > appliedFilters.pageNumber * appliedFilters.pageSize ||
    orderCards.length === appliedFilters.pageSize;
  const bellCount = notifications.length;
  const selectedWarehouseOption = warehouseOptions.find(
    (warehouse) =>
      String(
        warehouse?.warehouseId || warehouse?.warehouseID || warehouse?.id || "",
      ) === String(prepareWarehouseId || selectedWarehouseId || ""),
  );
  const detailModalOrder = orderCards.find(
    (order) =>
      String(order?.reliefOrderID || order?.orderKey || "").toLowerCase() ===
      String(detailOrderId || "").toLowerCase(),
  );
  const prepareDialogOrder = orderCards.find(
    (order) =>
      String(order?.reliefOrderID || order?.orderKey || "").toLowerCase() ===
      String(prepareDialogOrderId || "").toLowerCase(),
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
            </div>
            <div className="manager-relief-order-modal-field" hidden>
              <span className="manager-relief-order-modal-label">Váº­t pháº©m</span>
              <div className="manager-relief-order-items-box">
                {detailModalOrder?.items?.length > 0 ? (
                  <div className="manager-relief-order-item-editor">
                    {detailModalOrder?.items?.map((item, index) => (
                      <div
                        className="manager-relief-order-item-row"
                        key={`${item?.reliefItemID || item?.itemID || index}`}
                      >
                        <div className="manager-relief-order-item-copy">
                          <strong>
                            {formatDisplayValue(
                              item?.reliefItemName || item?.itemName,
                              `Váº­t pháº©m ${index + 1}`,
                            )}
                          </strong>
                          <span>
                            MÃ£ váº­t pháº©m: {formatDisplayValue(item?.reliefItemID, "ChÆ°a cÃ³")}
                          </span>
                          {item?.isInferred && (
                            <span>
                              Suy ra tá»« mÃ´ táº£: {formatDisplayValue(item?.sourceText, "KhÃ´ng rÃµ")}
                            </span>
                          )}
                        </div>
                        <div className="manager-relief-order-prepare-field">
                          <span>Sá»‘ lÆ°á»£ng</span>
                          <input type="number" value={Number(item?.quantity) || 0} readOnly />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="manager-relief-order-modal-description">
                    ChÆ°a map Ä‘Æ°á»£c váº­t pháº©m tá»« dá»¯ liá»‡u Ä‘Æ¡n.
                  </div>
                )}
              </div>
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
                placeholder="Pending, Prepared"
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
                      onClick={() => openPrepareDialog(order)}
                      disabled={
                        !order.canPrepare ||
                        savingOrderIds[orderId]
                      }
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

      {prepareDialogOrder && (
        <div
          className="manager-relief-order-modal-backdrop"
          onClick={closePrepareDialog}
          role="presentation"
        >
          <div
            className="manager-relief-order-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="manager-relief-order-prepare-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="manager-relief-order-modal-head">
              <div className="manager-relief-order-modal-title-group">
                <span>Chọn kho để Prepare đơn</span>
                <h3 id="manager-relief-order-prepare-modal-title">
                  {formatDisplayValue(prepareDialogOrder.reliefOrderID)}
                </h3>
              </div>

              <button
                className="manager-relief-order-modal-close"
                type="button"
                onClick={closePrepareDialog}
              >
                Đóng
              </button>
            </div>

            <div className="manager-relief-order-modal-field">
              <span className="manager-relief-order-modal-label">Đội nhận đơn</span>
              <div className="manager-relief-order-modal-description">
                {formatDisplayValue(
                  prepareDialogOrder.assignedTeamName,
                  "Chưa xác định đội cứu hộ",
                )}
              </div>
            </div>

            <div className="manager-relief-order-modal-field">
              <span className="manager-relief-order-modal-label">Mô tả yêu cầu</span>
              <div className="manager-relief-order-modal-description">
                {prepareDialogOrder.descriptionText}
              </div>
            </div>

            <div className="manager-relief-order-modal-field">
              <span className="manager-relief-order-modal-label">Kho xuất hàng</span>
              <div className="manager-relief-orders-warehouse-picker">
                <select
                  id="manager-relief-orders-warehouse"
                  value={prepareWarehouseId}
                  onChange={handlePrepareWarehouseChange}
                >
                  <option value="">Chọn kho để hoàn thành đơn</option>
                  {warehouseOptions.map((warehouse) => {
                    const warehouseId =
                      warehouse?.warehouseId ||
                      warehouse?.warehouseID ||
                      warehouse?.id ||
                      "";

                    return (
                      <option key={warehouseId} value={warehouseId}>
                        {warehouse?.warehouseName ||
                          warehouse?.name ||
                          `Kho ${warehouseId}`}
                      </option>
                    );
                  })}
                </select>
                <small>
                  {selectedWarehouseOption?.address ||
                    selectedWarehouseOption?.warehouseAddress ||
                    "Địa chỉ kho sẽ gửi sang RescueTeamLeader sau khi Prepare."}
                </small>
              </div>
            </div>

            <div className="manager-relief-order-modal-field">
              <span className="manager-relief-order-modal-label">Vật phẩm</span>
              <div className="manager-relief-order-items-box">
                {prepareDialogOrder?.items?.length > 0 ? (
                  <div className="manager-relief-order-item-editor">
                    {prepareDialogOrder.items.map((item, index) => (
                      <div
                        className="manager-relief-order-item-row"
                        key={`${item?.reliefItemID || item?.itemID || index}`}
                      >
                        <div className="manager-relief-order-item-copy">
                          <strong>
                            {formatDisplayValue(
                              item?.reliefItemName || item?.itemName,
                              `Vật phẩm ${index + 1}`,
                            )}
                          </strong>
                          <span>
                            Mã vật phẩm: {formatDisplayValue(item?.reliefItemID, "Chưa có")}
                          </span>
                        </div>
                        <div className="manager-relief-order-prepare-field">
                          <span>Số lượng</span>
                          <input type="number" value={Number(item?.quantity) || 0} readOnly />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="manager-relief-order-modal-description">
                    Chưa map được vật phẩm từ dữ liệu đơn.
                  </div>
                )}
              </div>
            </div>

            <div className="manager-relief-order-actions">
              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={closePrepareDialog}
              >
                Hủy
              </button>

              <button
                className="btn btn-primary relief-order-action-btn"
                type="button"
                onClick={() => handlePrepareOrder(prepareDialogOrder, prepareWarehouseId)}
                disabled={
                  !prepareWarehouseId ||
                  savingOrderIds[String(prepareDialogOrder?.reliefOrderID || "")]
                }
              >
                {savingOrderIds[String(prepareDialogOrder?.reliefOrderID || "")]
                  ? "Đang hoàn thành..."
                  : "Xác nhận hoàn thành"}
              </button>
            </div>
          </div>
        </div>
      )}

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
