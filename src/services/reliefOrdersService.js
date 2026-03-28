import { API_BASE_URL, fetchWithAuth } from "./apiClient";

const BASE = `${API_BASE_URL}/ReliefOrders`;

const RELIEF_ORDER_ID_KEYS = [
  "reliefOrderID",
  "ReliefOrderID",
  "reliefOrderId",
  "ReliefOrderId",
  "orderID",
  "OrderID",
  "orderId",
  "OrderId",
  "id",
  "ID",
];

const RESCUE_REQUEST_ID_KEYS = [
  "rescueRequestID",
  "RescueRequestID",
  "rescueRequestId",
  "RescueRequestId",
  "requestID",
  "RequestID",
  "requestId",
  "RequestId",
];

const RESCUE_MISSION_ID_KEYS = [
  "rescueMissionID",
  "RescueMissionID",
  "rescueMissionId",
  "RescueMissionId",
  "missionID",
  "MissionID",
  "missionId",
  "MissionId",
];

const RESCUE_TEAM_ID_KEYS = [
  "rescueTeamID",
  "RescueTeamID",
  "rescueTeamId",
  "RescueTeamId",
  "assignedTeamID",
  "AssignedTeamID",
  "assignedTeamId",
  "AssignedTeamId",
  "teamID",
  "TeamID",
  "teamId",
  "TeamId",
  "TeamID",
  "TeamId",
];

const REQUEST_SHORT_CODE_KEYS = [
  "requestShortCode",
  "RequestShortCode",
  "shortCode",
  "ShortCode",
  "requestCode",
  "RequestCode",
];

const STATUS_KEYS = [
  "orderStatus",
  "OrderStatus",
  "status",
  "Status",
];

const MISSION_STATUS_KEYS = [
  "missionStatus",
  "MissionStatus",
  "currentStatus",
  "CurrentStatus",
];

const TEAM_NAME_KEYS = [
  "teamName",
  "TeamName",
  "rescueTeamName",
  "RescueTeamName",
  "name",
  "Name",
];

const ACCEPTED_AT_KEYS = [
  "acceptedAt",
  "AcceptedAt",
  "acceptAt",
  "AcceptAt",
  "acceptedTime",
  "AcceptedTime",
];

const ITEM_ARRAY_KEYS = [
  "items",
  "Items",
  "reliefItems",
  "ReliefItems",
  "orderItems",
  "OrderItems",
  "orderDetails",
  "OrderDetails",
  "details",
  "Details",
];

const isPresent = (value) =>
  value !== undefined && value !== null && value !== "";

const isPlainObject = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const pickFirstValue = (source, keys, fallback = null) => {
  for (const key of keys) {
    const value = source?.[key];
    if (isPresent(value)) {
      return value;
    }
  }

  return fallback;
};

const toComparable = (value) => String(value ?? "").trim().toLowerCase();

const valuesMatch = (left, right) =>
  isPresent(left) && isPresent(right) && toComparable(left) === toComparable(right);

const numberOrZero = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const getStatusToken = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const extractFallbackArray = (source) => {
  if (!isPlainObject(source)) return [];

  const directArray = Object.values(source).find(Array.isArray);
  return Array.isArray(directArray) ? directArray : [];
};

// NEW: Defensive payload unwraper so ReliefOrders service can digest
// ApiResponse { content }, { data }, nested objects, or direct arrays.
export const extractReliefOrderApiData = (payload, visited = new Set()) => {
  if (!isPresent(payload)) return null;
  if (Array.isArray(payload)) return payload;
  if (!isPlainObject(payload)) return payload;
  if (visited.has(payload)) return payload;

  visited.add(payload);

  const candidateKeys = [
    "content",
    "data",
    "items",
    "results",
    "result",
    "value",
    "payload",
    "object",
  ];

  for (const key of candidateKeys) {
    if (!Object.prototype.hasOwnProperty.call(payload, key)) continue;

    const extracted = extractReliefOrderApiData(payload[key], visited);
    if (isPresent(extracted)) {
      return extracted;
    }
  }

  const fallbackArray = extractFallbackArray(payload);
  if (fallbackArray.length > 0) {
    return fallbackArray;
  }

  return payload;
};

async function parseJsonSafe(res) {
  const rawText = await res.text();
  let payload = null;

  try {
    payload = rawText ? JSON.parse(rawText) : null;
  } catch (error) {
    console.warn("[reliefOrdersService] Response is not valid JSON:", error);
    payload = rawText || null;
  }

  if (!res.ok || payload?.success === false) {
    const error = new Error(
      payload?.message ||
        payload?.title ||
        rawText ||
        `Request failed (${res.status})`,
    );
    error.status = res.status;
    error.payload = payload;
    error.rawText = rawText;
    throw error;
  }

  return payload;
}

const normalizeDateValue = (value) => {
  if (!isPresent(value)) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString();
};

const pickNestedValue = (source, readers, fallback = null) => {
  for (const read of readers) {
    const value = read(source);
    if (isPresent(value)) {
      return value;
    }
  }

  return fallback;
};

export function normalizeRescueTeam(team = {}) {
  const rescueTeamID = pickFirstValue(team, RESCUE_TEAM_ID_KEYS, null);
  const teamName = pickFirstValue(team, TEAM_NAME_KEYS, "");

  return {
    ...team,
    id: rescueTeamID,
    rescueTeamID,
    rescueTeamId: rescueTeamID,
    teamID: rescueTeamID,
    teamId: rescueTeamID,
    teamName,
  };
}

export function normalizeRescueTeams(teams) {
  if (!Array.isArray(teams)) return [];
  return teams.map((team) => normalizeRescueTeam(team));
}

export function normalizeRescueRequestSummary(request = {}) {
  const rescueRequestID = pickFirstValue(request, RESCUE_REQUEST_ID_KEYS, null);
  const shortCode = pickFirstValue(
    request,
    REQUEST_SHORT_CODE_KEYS,
    pickFirstValue(request, ["requestId", "RequestId"], null),
  );
  const assignedTeamID = pickNestedValue(
    request,
    [
      (item) => pickFirstValue(item, RESCUE_TEAM_ID_KEYS, null),
      (item) => pickFirstValue(item?.assignedTeam, RESCUE_TEAM_ID_KEYS, null),
      (item) => pickFirstValue(item?.team, RESCUE_TEAM_ID_KEYS, null),
    ],
    null,
  );
  const assignedTeamName = pickNestedValue(
    request,
    [
      (item) => pickFirstValue(item, TEAM_NAME_KEYS, ""),
      (item) => pickFirstValue(item?.assignedTeam, TEAM_NAME_KEYS, ""),
      (item) => pickFirstValue(item?.team, TEAM_NAME_KEYS, ""),
      (item) => pickFirstValue(item, ["assignedTeamName", "AssignedTeamName"], ""),
    ],
    "",
  );
  const rescueMissionID = pickNestedValue(
    request,
    [
      (item) => pickFirstValue(item, RESCUE_MISSION_ID_KEYS, null),
      (item) => pickFirstValue(item?.mission, RESCUE_MISSION_ID_KEYS, null),
      (item) => pickFirstValue(item?.rescueMission, RESCUE_MISSION_ID_KEYS, null),
    ],
    null,
  );

  return {
    ...request,
    id: rescueRequestID,
    rescueRequestID,
    rescueRequestId: rescueRequestID,
    shortCode,
    requestShortCode: shortCode,
    assignedTeamID,
    assignedTeamId: assignedTeamID,
    assignedTeamName,
    rescueMissionID,
    rescueMissionId: rescueMissionID,
  };
}

export function normalizeRescueRequests(requests) {
  if (!Array.isArray(requests)) return [];
  return requests.map((request) => normalizeRescueRequestSummary(request));
}

export function normalizeRescueMission(mission = {}) {
  const rescueMissionID = pickFirstValue(mission, RESCUE_MISSION_ID_KEYS, null);
  const rescueRequestID = pickNestedValue(
    mission,
    [
      (item) => pickFirstValue(item, RESCUE_REQUEST_ID_KEYS, null),
      (item) => pickFirstValue(item?.rescueRequest, RESCUE_REQUEST_ID_KEYS, null),
      (item) => pickFirstValue(item?.requestInfo, RESCUE_REQUEST_ID_KEYS, null),
    ],
    null,
  );
  const requestShortCode = pickNestedValue(
    mission,
    [
      (item) => pickFirstValue(item, REQUEST_SHORT_CODE_KEYS, null),
      (item) => pickFirstValue(item?.rescueRequest, REQUEST_SHORT_CODE_KEYS, null),
      (item) => pickFirstValue(item?.requestInfo, REQUEST_SHORT_CODE_KEYS, null),
    ],
    null,
  );
  const rescueTeamID = pickNestedValue(
    mission,
    [
      (item) => pickFirstValue(item, RESCUE_TEAM_ID_KEYS, null),
      (item) => pickFirstValue(item?.team, RESCUE_TEAM_ID_KEYS, null),
      (item) => pickFirstValue(item?.assignedTeam, RESCUE_TEAM_ID_KEYS, null),
    ],
    null,
  );
  const teamName = pickNestedValue(
    mission,
    [
      (item) => pickFirstValue(item, TEAM_NAME_KEYS, ""),
      (item) => pickFirstValue(item?.team, TEAM_NAME_KEYS, ""),
      (item) => pickFirstValue(item?.assignedTeam, TEAM_NAME_KEYS, ""),
    ],
    "",
  );
  const reliefOrderID = pickFirstValue(mission, RELIEF_ORDER_ID_KEYS, null);
  const status = pickFirstValue(
    mission,
    [...MISSION_STATUS_KEYS, ...STATUS_KEYS],
    "",
  );

  return {
    ...mission,
    id: rescueMissionID,
    rescueMissionID,
    rescueMissionId: rescueMissionID,
    missionID: rescueMissionID,
    missionId: rescueMissionID,
    rescueRequestID,
    rescueRequestId: rescueRequestID,
    requestShortCode,
    shortCode: requestShortCode,
    rescueTeamID,
    rescueTeamId: rescueTeamID,
    teamID: rescueTeamID,
    teamId: rescueTeamID,
    teamName,
    reliefOrderID,
    reliefOrderId: reliefOrderID,
    missionStatus: status,
    status,
  };
}

export function normalizeRescueMissions(missions) {
  if (!Array.isArray(missions)) return [];
  return missions.map((mission) => normalizeRescueMission(mission));
}

export function normalizeReliefOrderItem(item = {}) {
  const reliefItemID = pickNestedValue(
    item,
    [
      (entry) =>
        pickFirstValue(
          entry,
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
          null,
        ),
      (entry) =>
        pickFirstValue(
          entry?.reliefItem,
          [
            "reliefItemID",
            "ReliefItemID",
            "reliefItemId",
            "ReliefItemId",
            "id",
            "ID",
          ],
          null,
        ),
    ],
    null,
  );
  const itemName = pickNestedValue(
    item,
    [
      (entry) =>
        pickFirstValue(
          entry,
          [
            "reliefItemName",
            "ReliefItemName",
            "itemName",
            "ItemName",
            "name",
            "Name",
          ],
          "",
        ),
      (entry) =>
        pickFirstValue(
          entry?.reliefItem,
          [
            "reliefItemName",
            "ReliefItemName",
            "itemName",
            "ItemName",
            "name",
            "Name",
          ],
          "",
        ),
    ],
    "",
  );
  const categoryName = pickNestedValue(
    item,
    [
      (entry) =>
        pickFirstValue(entry, ["categoryName", "CategoryName"], ""),
      (entry) =>
        pickFirstValue(entry?.category, ["name", "Name"], ""),
      (entry) =>
        pickFirstValue(entry?.reliefItem?.category, ["name", "Name"], ""),
    ],
    "",
  );
  const unitName = pickNestedValue(
    item,
    [
      (entry) => pickFirstValue(entry, ["unitName", "UnitName"], ""),
      (entry) => pickFirstValue(entry?.unit, ["name", "Name"], ""),
      (entry) => pickFirstValue(entry?.reliefItem?.unit, ["name", "Name"], ""),
    ],
    "",
  );
  const quantity = numberOrZero(
    pickFirstValue(
      item,
      [
        "quantity",
        "Quantity",
        "requestedQuantity",
        "RequestedQuantity",
        "preparedQuantity",
        "PreparedQuantity",
      ],
      0,
    ),
  );
  const availableStock = pickFirstValue(
    item,
    [
      "availableStock",
      "AvailableStock",
      "stockQuantity",
      "StockQuantity",
      "inventoryQuantity",
      "InventoryQuantity",
    ],
    null,
  );

  return {
    ...item,
    id: reliefItemID,
    reliefItemID,
    reliefItemId: reliefItemID,
    itemID: reliefItemID,
    itemId: reliefItemID,
    reliefItemName: itemName,
    itemName,
    categoryName,
    unitName,
    availableStock,
    quantity,
  };
}

// NEW: Safe item extractor because backend may return Items/orderDetails/reliefItems.
export function extractOrderItems(order = {}) {
  const itemArrays = [
    ...ITEM_ARRAY_KEYS.map((key) => order?.[key]),
    order?.content?.items,
    order?.content?.Items,
    order?.data?.items,
    order?.data?.Items,
  ];

  const firstArray = itemArrays.find(Array.isArray);
  if (!Array.isArray(firstArray)) {
    return [];
  }

  return firstArray.map((item) => normalizeReliefOrderItem(item));
}

export function normalizeReliefOrder(order = {}) {
  if (!isPlainObject(order)) {
    return order;
  }

  const reliefOrderID = pickFirstValue(order, RELIEF_ORDER_ID_KEYS, null);
  const rescueRequestID = pickNestedValue(
    order,
    [
      (item) => pickFirstValue(item, RESCUE_REQUEST_ID_KEYS, null),
      (item) => pickFirstValue(item?.rescueRequest, RESCUE_REQUEST_ID_KEYS, null),
      (item) => pickFirstValue(item?.requestInfo, RESCUE_REQUEST_ID_KEYS, null),
    ],
    null,
  );
  const requestShortCode = pickNestedValue(
    order,
    [
      (item) => pickFirstValue(item, REQUEST_SHORT_CODE_KEYS, null),
      (item) => pickFirstValue(item?.rescueRequest, REQUEST_SHORT_CODE_KEYS, null),
      (item) => pickFirstValue(item?.requestInfo, REQUEST_SHORT_CODE_KEYS, null),
    ],
    null,
  );
  const rescueMissionID = pickNestedValue(
    order,
    [
      (item) => pickFirstValue(item, RESCUE_MISSION_ID_KEYS, null),
      (item) => pickFirstValue(item?.mission, RESCUE_MISSION_ID_KEYS, null),
      (item) => pickFirstValue(item?.rescueMission, RESCUE_MISSION_ID_KEYS, null),
    ],
    null,
  );
  const rescueTeamID = pickNestedValue(
    order,
    [
      (item) => pickFirstValue(item, RESCUE_TEAM_ID_KEYS, null),
      (item) => pickFirstValue(item?.team, RESCUE_TEAM_ID_KEYS, null),
      (item) => pickFirstValue(item?.assignedTeam, RESCUE_TEAM_ID_KEYS, null),
      (item) => pickFirstValue(item?.rescueMission, RESCUE_TEAM_ID_KEYS, null),
    ],
    null,
  );
  const teamName = pickNestedValue(
    order,
    [
      (item) => pickFirstValue(item, TEAM_NAME_KEYS, ""),
      (item) => pickFirstValue(item?.team, TEAM_NAME_KEYS, ""),
      (item) => pickFirstValue(item?.assignedTeam, TEAM_NAME_KEYS, ""),
      (item) => pickFirstValue(item?.rescueMission, TEAM_NAME_KEYS, ""),
    ],
    "",
  );
  const orderStatus = pickFirstValue(order, STATUS_KEYS, "");
  const missionStatus = pickFirstValue(order, MISSION_STATUS_KEYS, "");
  const createdAt = pickFirstValue(
    order,
    ["createdAt", "CreatedAt", "createdTime", "CreatedTime", "createTime", "CreateTime"],
    null,
  );
  const preparedAt = pickFirstValue(
    order,
    ["preparedAt", "PreparedAt", "preparedTime", "PreparedTime"],
    null,
  );
  const acceptedAt = pickNestedValue(
    order,
    [
      (item) => pickFirstValue(item, ACCEPTED_AT_KEYS, null),
      (item) => pickFirstValue(item?.mission, ACCEPTED_AT_KEYS, null),
      (item) => pickFirstValue(item?.rescueMission, ACCEPTED_AT_KEYS, null),
    ],
    null,
  );
  const pickedUpAt = pickFirstValue(
    order,
    ["pickedUpAt", "PickedUpAt", "pickedUpTime", "PickedUpTime"],
    null,
  );
  const updatedAt = pickFirstValue(
    order,
    [
      "updatedAt",
      "UpdatedAt",
      "modifiedAt",
      "ModifiedAt",
      "preparedTime",
      "PreparedTime",
      "pickedUpTime",
      "PickedUpTime",
    ],
    null,
  );

  return {
    ...order,
    id: reliefOrderID,
    reliefOrderID,
    reliefOrderId: reliefOrderID,
    rescueRequestID,
    rescueRequestId: rescueRequestID,
    requestShortCode,
    shortCode: requestShortCode,
    rescueMissionID,
    rescueMissionId: rescueMissionID,
    missionID: rescueMissionID,
    missionId: rescueMissionID,
    rescueTeamID,
    rescueTeamId: rescueTeamID,
    assignedTeamID: rescueTeamID,
    assignedTeamId: rescueTeamID,
    teamID: rescueTeamID,
    teamId: rescueTeamID,
    teamName,
    orderStatus,
    missionStatus,
    status: orderStatus || missionStatus || "",
    items: extractOrderItems(order),
    description: pickFirstValue(order, ["description", "Description"], ""),
    createdAt: normalizeDateValue(createdAt),
    acceptedAt: normalizeDateValue(acceptedAt),
    preparedAt: normalizeDateValue(preparedAt),
    pickedUpAt: normalizeDateValue(pickedUpAt),
    updatedAt: normalizeDateValue(updatedAt),
    totalItems: numberOrZero(
      pickFirstValue(order, ["totalItems", "TotalItems"], extractOrderItems(order).length),
    ),
  };
}

export function normalizeReliefOrders(orders) {
  if (!Array.isArray(orders)) return [];
  return orders.map((order) => normalizeReliefOrder(order));
}

export function findRelatedRequestForOrder(order, requests = []) {
  const normalizedOrder = normalizeReliefOrder(order);
  const normalizedRequests = normalizeRescueRequests(requests);

  return (
    normalizedRequests.find((request) =>
      valuesMatch(request.rescueRequestID, normalizedOrder.rescueRequestID),
    ) ||
    normalizedRequests.find((request) =>
      valuesMatch(request.shortCode, normalizedOrder.requestShortCode),
    ) ||
    normalizedRequests.find((request) =>
      valuesMatch(request.requestShortCode, normalizedOrder.requestShortCode),
    ) ||
    null
  );
}

export function findAssignedMissionForOrder(order, missions = [], requests = []) {
  const normalizedOrder = normalizeReliefOrder(order);
  const normalizedMissions = normalizeRescueMissions(missions);
  const relatedRequest = findRelatedRequestForOrder(normalizedOrder, requests);

  const candidateScores = normalizedMissions
    .map((mission) => {
      let score = 0;

      if (valuesMatch(mission.rescueMissionID, normalizedOrder.rescueMissionID)) {
        score += 100;
      }

      if (valuesMatch(mission.reliefOrderID, normalizedOrder.reliefOrderID)) {
        score += 90;
      }

      if (valuesMatch(mission.rescueRequestID, normalizedOrder.rescueRequestID)) {
        score += 80;
      }

      if (valuesMatch(mission.requestShortCode, normalizedOrder.requestShortCode)) {
        score += 70;
      }

      if (valuesMatch(mission.rescueMissionID, relatedRequest?.rescueMissionID)) {
        score += 60;
      }

      if (valuesMatch(mission.rescueRequestID, relatedRequest?.rescueRequestID)) {
        score += 50;
      }

      if (valuesMatch(mission.requestShortCode, relatedRequest?.shortCode)) {
        score += 40;
      }

      if (isPresent(mission.rescueTeamID)) {
        score += 5;
      }

      const missionStatusToken = getStatusToken(
        mission.missionStatus || mission.status,
      );

      if (
        ["completed", "in_progress", "assigned", "accepted", "confirmed"].some(
          (value) => missionStatusToken.includes(value),
        )
      ) {
        score += 15;
      }

      if (
        ["declined", "rejected", "cancelled", "canceled", "failed"].some((value) =>
          missionStatusToken.includes(value),
        )
      ) {
        score -= 30;
      }

      return { mission, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);

  return candidateScores[0]?.mission || null;
}

// NEW: Team mapping priority
// 1. TeamID on order
// 2. rescue request -> rescue mission -> assigned rescue team
// 3. request assigned team fallback.
export function extractAssignedTeamId(order, missions = [], requests = []) {
  const normalizedOrder = normalizeReliefOrder(order);

  if (isPresent(normalizedOrder.rescueTeamID)) {
    return normalizedOrder.rescueTeamID;
  }

  const assignedMission = findAssignedMissionForOrder(
    normalizedOrder,
    missions,
    requests,
  );

  if (isPresent(assignedMission?.rescueTeamID)) {
    return assignedMission.rescueTeamID;
  }

  const relatedRequest = findRelatedRequestForOrder(normalizedOrder, requests);
  if (isPresent(relatedRequest?.assignedTeamID)) {
    return relatedRequest.assignedTeamID;
  }

  return null;
}

export function findAssignedTeamForOrder(
  order,
  missions = [],
  requests = [],
  teams = [],
) {
  const normalizedTeams = normalizeRescueTeams(teams);
  const teamId = extractAssignedTeamId(order, missions, requests);
  const normalizedOrder = normalizeReliefOrder(order);
  const assignedMission = findAssignedMissionForOrder(order, missions, requests);
  const relatedRequest = findRelatedRequestForOrder(order, requests);

  return (
    normalizedTeams.find((team) => valuesMatch(team.rescueTeamID, teamId)) || {
      rescueTeamID: teamId,
      rescueTeamId: teamId,
      teamName:
        normalizedOrder.teamName ||
        assignedMission?.teamName ||
        relatedRequest?.assignedTeamName ||
        "",
    }
  );
}

export function buildSendReliefOrderPayload(order, missions = [], requests = []) {
  const normalizedOrder = normalizeReliefOrder(order);
  const assignedMission = findAssignedMissionForOrder(
    normalizedOrder,
    missions,
    requests,
  );
  const relatedRequest = findRelatedRequestForOrder(normalizedOrder, requests);
  const rescueTeamID = extractAssignedTeamId(normalizedOrder, missions, requests);
  const items = extractOrderItems(normalizedOrder)
    .map((item) => ({
      reliefItemID: item?.reliefItemID,
      quantity: numberOrZero(item?.quantity),
    }))
    .filter((item) => isPresent(item.reliefItemID));

  return {
    reliefOrderID: normalizedOrder.reliefOrderID,
    rescueRequestID:
      normalizedOrder.rescueRequestID ||
      assignedMission?.rescueRequestID ||
      relatedRequest?.rescueRequestID ||
      null,
    rescueMissionID:
      normalizedOrder.rescueMissionID ||
      assignedMission?.rescueMissionID ||
      relatedRequest?.rescueMissionID ||
      null,
    rescueTeamID,
    items,
  };
}

const normalizeReliefOrderResult = (payload) => {
  const data = extractReliefOrderApiData(payload);

  if (Array.isArray(data)) {
    return normalizeReliefOrders(data);
  }

  if (isPlainObject(data)) {
    return normalizeReliefOrder(data);
  }

  return data;
};

const extractCollectionItems = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  const candidates = [
    payload?.data?.content?.data,
    payload?.data?.content?.items,
    payload?.data?.content?.Items,
    payload?.data?.data,
    payload?.data?.items,
    payload?.data?.Items,
    payload?.content?.data,
    payload?.content?.items,
    payload?.content?.Items,
    payload?.items,
    payload?.Items,
  ];

  const firstArray = candidates.find(Array.isArray);
  if (Array.isArray(firstArray)) {
    return firstArray;
  }

  const extracted = extractReliefOrderApiData(payload);
  return Array.isArray(extracted) ? extracted : [];
};

const extractCollectionTotalCount = (payload, fallbackCount = 0) => {
  const collectionSources = [
    payload?.data?.content,
    payload?.data,
    payload?.content,
    payload,
  ];

  for (const source of collectionSources) {
    if (!isPlainObject(source)) continue;

    const totalCount = pickFirstValue(source, ["totalCount", "TotalCount"], null);
    if (isPresent(totalCount)) {
      return numberOrZero(totalCount);
    }
  }

  return fallbackCount;
};

const buildReliefOrderFilterSearchParams = (params = {}, keyStyle = "pascal") => {
  const searchParams = new URLSearchParams();
  const statuses = Array.isArray(params?.statuses)
    ? params.statuses
    : String(params?.statuses || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

  const keyMap =
    keyStyle === "camel"
      ? {
          statuses: "statuses",
          createdFromDate: "createdFromDate",
          createdToDate: "createdToDate",
          preparedFromDate: "preparedFromDate",
          preparedToDate: "preparedToDate",
          pickedUpFromDate: "pickedUpFromDate",
          pickedUpToDate: "pickedUpToDate",
          pageNumber: "pageNumber",
          pageSize: "pageSize",
        }
      : {
          statuses: "Statuses",
          createdFromDate: "CreatedFromDate",
          createdToDate: "CreatedToDate",
          preparedFromDate: "PreparedFromDate",
          preparedToDate: "PreparedToDate",
          pickedUpFromDate: "PickedUpFromDate",
          pickedUpToDate: "PickedUpToDate",
          pageNumber: "PageNumber",
          pageSize: "PageSize",
        };

  statuses.forEach((status) => {
    searchParams.append(keyMap.statuses, status);
  });

  const dateParams = [
    [keyMap.createdFromDate, params?.createdFromDate],
    [keyMap.createdToDate, params?.createdToDate],
    [keyMap.preparedFromDate, params?.preparedFromDate],
    [keyMap.preparedToDate, params?.preparedToDate],
    [keyMap.pickedUpFromDate, params?.pickedUpFromDate],
    [keyMap.pickedUpToDate, params?.pickedUpToDate],
  ];

  dateParams.forEach(([key, value]) => {
    if (isPresent(value)) {
      searchParams.append(key, value);
    }
  });

  searchParams.append(keyMap.pageNumber, String(params?.pageNumber || 1));
  searchParams.append(keyMap.pageSize, String(params?.pageSize || 20));

  return searchParams;
};

const hasActiveReliefOrderFilters = (params = {}) =>
  (Array.isArray(params?.statuses) && params.statuses.length > 0) ||
  [
    params?.createdFromDate,
    params?.createdToDate,
    params?.preparedFromDate,
    params?.preparedToDate,
    params?.pickedUpFromDate,
    params?.pickedUpToDate,
  ].some((value) => isPresent(value));

const parseReliefOrderCollectionPayload = (payload) => {
  const items = normalizeReliefOrders(extractCollectionItems(payload));

  return {
    items,
    totalCount: extractCollectionTotalCount(payload, items.length),
    payload,
  };
};

async function requestReliefOrder(url, options = {}) {
  const res = await fetchWithAuth(url, options);
  const payload = await parseJsonSafe(res);
  return normalizeReliefOrderResult(payload);
}

export async function getAllReliefOrders() {
  const endpoints = [
    `${BASE}/pending`,
    `${BASE}/filter?pageNumber=1&pageSize=200`,
    `${BASE}/filter?PageNumber=1&PageSize=200`,
  ];
  const attemptedEndpoints = [];
  let lastError = null;

  for (const endpoint of endpoints) {
    attemptedEndpoints.push(endpoint);

    try {
      return await requestReliefOrder(endpoint, { method: "GET" });
    } catch (error) {
      lastError = error;
      const status = Number(error?.status || 0);
      const canTryNext = status === 404 || status === 405;

      console.warn(
        "[reliefOrdersService.getAllReliefOrders] Endpoint failed:",
        endpoint,
        error,
      );

      if (!canTryNext) {
        error.attemptedEndpoints = attemptedEndpoints;
        throw error;
      }
    }
  }

  if (lastError) {
    lastError.attemptedEndpoints = attemptedEndpoints;
    throw lastError;
  }

  return [];
}

// NEW: Manager dashboard should prioritize pending orders that need preparation,
// so we avoid calling endpoints that are known to 405 for Manager role first.
export async function getManagerReliefOrders() {
  const endpoints = [
    `${BASE}/pending`,
    `${BASE}/filter?pageNumber=1&pageSize=200`,
    `${BASE}/filter?PageNumber=1&PageSize=200`,
  ];
  const attemptedEndpoints = [];
  let lastError = null;

  for (const endpoint of endpoints) {
    attemptedEndpoints.push(endpoint);

    try {
      return await requestReliefOrder(endpoint, { method: "GET" });
    } catch (error) {
      lastError = error;
      const status = Number(error?.status || 0);
      const canTryNext = status === 404 || status === 405;

      console.warn(
        "[reliefOrdersService.getManagerReliefOrders] Endpoint failed:",
        endpoint,
        error,
      );

      if (!canTryNext) {
        error.attemptedEndpoints = attemptedEndpoints;
        throw error;
      }
    }
  }

  if (lastError) {
    lastError.attemptedEndpoints = attemptedEndpoints;
    throw lastError;
  }

  return [];
}

export async function filterReliefOrders(params = {}) {
  const hasActiveFilters = hasActiveReliefOrderFilters(params);
  const pascalQuery = buildReliefOrderFilterSearchParams(params, "pascal").toString();
  const camelQuery = buildReliefOrderFilterSearchParams(params, "camel").toString();
  const endpoints = hasActiveFilters
    ? [
        `${BASE}/filter?${pascalQuery}`,
        `${BASE}/filter?${camelQuery}`,
      ]
    : [
        `${BASE}/pending`,
        `${BASE}/filter?${pascalQuery}`,
        `${BASE}/filter?${camelQuery}`,
      ];

  const attemptedEndpoints = [];
  let lastSuccessfulEmptyResult = null;
  let lastError = null;

  for (const endpoint of endpoints) {
    attemptedEndpoints.push(endpoint);

    try {
      const res = await fetchWithAuth(endpoint, { method: "GET" });
      const payload = await parseJsonSafe(res);
      const parsedResult = parseReliefOrderCollectionPayload(payload);

      console.log("[reliefOrdersService.filterReliefOrders] Endpoint payload:", {
        endpoint,
        itemCount: parsedResult.items.length,
        totalCount: parsedResult.totalCount,
        payload,
      });

      if (
        parsedResult.items.length > 0 ||
        parsedResult.totalCount > 0 ||
        hasActiveFilters ||
        endpoint === endpoints[endpoints.length - 1]
      ) {
        return parsedResult;
      }

      lastSuccessfulEmptyResult = parsedResult;
    } catch (error) {
      lastError = error;
      const status = Number(error?.status || 0);
      const canTryNext = !hasActiveFilters && (status === 404 || status === 405);

      console.warn(
        "[reliefOrdersService.filterReliefOrders] Endpoint failed:",
        endpoint,
        error,
      );

      if (!canTryNext) {
        error.attemptedEndpoints = attemptedEndpoints;
        throw error;
      }
    }
  }

  if (lastSuccessfulEmptyResult) {
    return lastSuccessfulEmptyResult;
  }

  if (lastError) {
    lastError.attemptedEndpoints = attemptedEndpoints;
    throw lastError;
  }

  return {
    items: [],
    totalCount: 0,
    payload: null,
  };
}

export async function createReliefOrder(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("payload is required");
  }

  const normalizedPayload = {
    rescueRequestID: payload?.rescueRequestID ?? payload?.rescueRequestId ?? null,
    rescueTeamID: payload?.rescueTeamID ?? payload?.rescueTeamId ?? null,
  };

  if (!isPresent(normalizedPayload.rescueRequestID)) {
    throw new Error("rescueRequestID is required");
  }

  if (!isPresent(normalizedPayload.rescueTeamID)) {
    throw new Error("rescueTeamID is required");
  }

  const res = await fetchWithAuth(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(normalizedPayload),
  });

  const responsePayload = await parseJsonSafe(res);
  return normalizeReliefOrderResult(responsePayload);
}

const SEND_RELIEF_ORDER_ENDPOINTS = [
  `${BASE}/send-to-team`,
  `${BASE}/assign-to-team`,
  `${BASE}/send-to-assigned-team`,
  `${BASE}/assign`,
  `${BASE}/dispatch`,
];

export async function sendReliefOrderToAssignedTeam(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("payload is required");
  }

  const normalizedPayload = {
    ...payload,
    reliefOrderID: payload?.reliefOrderID ?? payload?.reliefOrderId ?? null,
    rescueRequestID:
      payload?.rescueRequestID ?? payload?.rescueRequestId ?? null,
    rescueMissionID:
      payload?.rescueMissionID ?? payload?.rescueMissionId ?? null,
    rescueTeamID: payload?.rescueTeamID ?? payload?.rescueTeamId ?? null,
    items: Array.isArray(payload?.items) ? payload.items : [],
  };

  if (!isPresent(normalizedPayload.reliefOrderID)) {
    throw new Error("reliefOrderID is required");
  }

  if (!isPresent(normalizedPayload.rescueTeamID)) {
    throw new Error("rescueTeamID is required");
  }

  const attemptedEndpoints = [];

  for (const endpoint of SEND_RELIEF_ORDER_ENDPOINTS) {
    attemptedEndpoints.push(endpoint);

    try {
      console.log(
        "[reliefOrdersService.sendReliefOrderToAssignedTeam] Trying endpoint:",
        endpoint,
        normalizedPayload,
      );

      const res = await fetchWithAuth(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalizedPayload),
      });

      const responsePayload = await parseJsonSafe(res);
      const normalizedResult = normalizeReliefOrderResult(responsePayload);

      return {
        endpoint,
        payload: normalizedPayload,
        result: normalizedResult,
      };
    } catch (error) {
      const status = Number(error?.status || 0);
      const shouldTryNext = status === 404 || status === 405;

      console.warn(
        "[reliefOrdersService.sendReliefOrderToAssignedTeam] Endpoint failed:",
        endpoint,
        error,
      );

      if (!shouldTryNext) {
        error.attemptedEndpoints = attemptedEndpoints;
        throw error;
      }
    }
  }

  const error = new Error(
    "Không tìm thấy endpoint phù hợp để gửi Relief Order cho đội đã được phân công.",
  );
  error.attemptedEndpoints = attemptedEndpoints;
  throw error;
}

export const reliefOrdersService = {
  prepareOrder: async (payload) =>
    await requestReliefOrder(`${BASE}/prepare`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  getAll: async () => await getAllReliefOrders(),

  getAllReliefOrders: async () => await getAllReliefOrders(),

  getManagerReliefOrders: async () => await getManagerReliefOrders(),

  filterReliefOrders: async (params) => await filterReliefOrders(params),

  createReliefOrder: async (payload) => await createReliefOrder(payload),

  getById: async (id) =>
    await requestReliefOrder(`${BASE}/${id}`, {
      method: "GET",
    }),

  getPending: async () =>
    await requestReliefOrder(`${BASE}/pending`, {
      method: "GET",
    }),

  getPendingSupply: async () =>
    await requestReliefOrder(`${BASE}/pending`, {
      method: "GET",
    }),

  getByRequestType: async (requestType) =>
    await requestReliefOrder(
      `${BASE}?requestType=${encodeURIComponent(requestType)}`,
      {
        method: "GET",
      },
    ),

  sendReliefOrderToAssignedTeam: async (payload) =>
    await sendReliefOrderToAssignedTeam(payload),
};

export default reliefOrdersService;
