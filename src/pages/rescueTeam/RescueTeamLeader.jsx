import "./Dashboard.css";
import Header from "../../components/common/Header";
import { fetchWithAuth } from "../../services/apiClient";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  rescueMissionService,
  completeMission,
} from "../../services/rescueMissionService";
import { toast } from "react-hot-toast";
import {
  FaBell,
  FaCheckCircle,
  FaClipboardList,
  FaMapMarkerAlt,
} from "react-icons/fa";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
} from "react-leaflet";
import signalRService from "../../services/signalrService";
import { CLIENT_EVENTS } from "../../data/signalrConstants";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import RequestDetailModal from "./RequestDetailModal";
import IncidentReportForm from "./IncidentReportForm";
import { incidentReportService } from "../../services/incidentReportService";
import { useNavigate } from "react-router-dom";
import { reliefOrdersService } from "../../services/reliefOrdersService";
import { getWarehouseById } from "../../services/warehouseService";

const RESCUE_TEAM_AUTO_REFRESH_INTERVAL_MS = 10000;
const RESCUE_TEAM_NOTIFICATION_STORAGE_KEY = "rescue_team_leader_notifications";
const SHARED_PREPARED_ORDER_STORAGE_KEY = "shared_prepared_order_notifications";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const formatVNTime = (dateString) => {
  if (!dateString || dateString === "N/A") return "Không có thời gian";

  try {
    return new Date(dateString).toLocaleString("vi-VN", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Ho_Chi_Minh",
    });
  } catch {
    return dateString;
  }
};

const isPresent = (value) =>
  value !== undefined && value !== null && value !== "";

const pickFirstValue = (...values) => values.find((value) => isPresent(value));

const toComparable = (value) => String(value ?? "").trim().toLowerCase();

const sameValue = (left, right) =>
  Boolean(toComparable(left)) && toComparable(left) === toComparable(right);

const toValidCoordinate = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const extractPickupInfo = (source = {}) => {
  if (!source || typeof source !== "object") return null;

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
        (isPresent(item?.warehouseAddress) ||
          isPresent(item?.WarehouseAddress) ||
          isPresent(item?.pickupAddress) ||
          isPresent(item?.PickupAddress) ||
          isPresent(item?.warehouseID) ||
          isPresent(item?.warehouseId) ||
          isPresent(item?.warehouseName) ||
          isPresent(item?.warehouseLatitude) ||
          isPresent(item?.warehouseLongitude)),
    ) || {};
  const requestInfo =
    source?.rescueRequest || source?.requestInfo || source?.request || {};
  const warehouse =
    source?.warehouse || source?.pickupWarehouse || source?.assignedWarehouse || {};
  const pickupItemWarehouse =
    pickupItem?.warehouse ||
    pickupItem?.pickupWarehouse ||
    pickupItem?.assignedWarehouse ||
    {};

  const warehouseID = pickFirstValue(
    source?.warehouseID,
    source?.warehouseId,
    source?.WarehouseID,
    source?.WarehouseId,
    source?.pickupWarehouseID,
    source?.pickupWarehouseId,
    requestInfo?.warehouseID,
    requestInfo?.warehouseId,
    pickupItem?.warehouseID,
    pickupItem?.WarehouseID,
    pickupItem?.warehouseId,
    pickupItem?.WarehouseId,
    pickupItemWarehouse?.warehouseID,
    pickupItemWarehouse?.warehouseId,
    pickupItemWarehouse?.id,
    pickupItemWarehouse?.ID,
    warehouse?.warehouseID,
    warehouse?.warehouseId,
    warehouse?.id,
    warehouse?.ID,
  );

  const warehouseName = pickFirstValue(
    source?.warehouseName,
    source?.WarehouseName,
    source?.pickupWarehouseName,
    source?.PickupWarehouseName,
    requestInfo?.warehouseName,
    requestInfo?.WarehouseName,
    pickupItem?.warehouseName,
    pickupItem?.WarehouseName,
    pickupItem?.pickupWarehouseName,
    pickupItem?.PickupWarehouseName,
    pickupItemWarehouse?.warehouseName,
    pickupItemWarehouse?.WarehouseName,
    pickupItemWarehouse?.name,
    pickupItemWarehouse?.Name,
    warehouse?.warehouseName,
    warehouse?.WarehouseName,
    warehouse?.name,
    warehouse?.Name,
  );

  const pickupAddress = pickFirstValue(
    source?.pickupAddress,
    source?.PickupAddress,
    source?.warehouseAddress,
    source?.WarehouseAddress,
    source?.pickupLocationAddress,
    source?.PickupLocationAddress,
    source?.pickupPointAddress,
    source?.PickupPointAddress,
    requestInfo?.pickupAddress,
    requestInfo?.PickupAddress,
    requestInfo?.warehouseAddress,
    requestInfo?.WarehouseAddress,
    pickupItem?.pickupAddress,
    pickupItem?.PickupAddress,
    pickupItem?.warehouseAddress,
    pickupItem?.WarehouseAddress,
    pickupItemWarehouse?.address,
    pickupItemWarehouse?.Address,
    warehouse?.address,
    warehouse?.Address,
  );

  const pickupLatitude = toValidCoordinate(
    pickFirstValue(
      source?.pickupLatitude,
      source?.PickupLatitude,
      source?.pickupLat,
      source?.PickupLat,
      source?.warehouseLatitude,
      source?.WarehouseLatitude,
      source?.warehouseLat,
      source?.WarehouseLat,
      requestInfo?.pickupLatitude,
      requestInfo?.PickupLatitude,
      requestInfo?.pickupLat,
      requestInfo?.PickupLat,
      requestInfo?.warehouseLatitude,
      requestInfo?.WarehouseLatitude,
      requestInfo?.warehouseLat,
      requestInfo?.WarehouseLat,
      pickupItem?.pickupLatitude,
      pickupItem?.PickupLatitude,
      pickupItem?.pickupLat,
      pickupItem?.PickupLat,
      pickupItem?.warehouseLatitude,
      pickupItem?.WarehouseLatitude,
      pickupItem?.warehouseLat,
      pickupItem?.WarehouseLat,
      pickupItemWarehouse?.locationLat,
      pickupItemWarehouse?.LocationLat,
      pickupItemWarehouse?.latitude,
      pickupItemWarehouse?.Latitude,
      pickupItemWarehouse?.lat,
      pickupItemWarehouse?.Lat,
      warehouse?.locationLat,
      warehouse?.LocationLat,
      warehouse?.latitude,
      warehouse?.Latitude,
      warehouse?.lat,
      warehouse?.Lat,
    ),
  );

  const pickupLongitude = toValidCoordinate(
    pickFirstValue(
      source?.pickupLongitude,
      source?.PickupLongitude,
      source?.pickupLong,
      source?.PickupLong,
      source?.pickupLng,
      source?.PickupLng,
      source?.warehouseLongitude,
      source?.WarehouseLongitude,
      source?.warehouseLong,
      source?.WarehouseLong,
      source?.warehouseLng,
      source?.WarehouseLng,
      requestInfo?.pickupLongitude,
      requestInfo?.PickupLongitude,
      requestInfo?.pickupLong,
      requestInfo?.PickupLong,
      requestInfo?.pickupLng,
      requestInfo?.PickupLng,
      requestInfo?.warehouseLongitude,
      requestInfo?.WarehouseLongitude,
      requestInfo?.warehouseLong,
      requestInfo?.WarehouseLong,
      requestInfo?.warehouseLng,
      requestInfo?.WarehouseLng,
      pickupItem?.pickupLongitude,
      pickupItem?.PickupLongitude,
      pickupItem?.pickupLong,
      pickupItem?.PickupLong,
      pickupItem?.pickupLng,
      pickupItem?.PickupLng,
      pickupItem?.warehouseLongitude,
      pickupItem?.WarehouseLongitude,
      pickupItem?.warehouseLong,
      pickupItem?.WarehouseLong,
      pickupItem?.warehouseLng,
      pickupItem?.WarehouseLng,
      pickupItemWarehouse?.locationLong,
      pickupItemWarehouse?.LocationLong,
      pickupItemWarehouse?.longitude,
      pickupItemWarehouse?.Longitude,
      pickupItemWarehouse?.lng,
      pickupItemWarehouse?.Lng,
      pickupItemWarehouse?.lon,
      pickupItemWarehouse?.Lon,
      warehouse?.locationLong,
      warehouse?.LocationLong,
      warehouse?.longitude,
      warehouse?.Longitude,
      warehouse?.lng,
      warehouse?.Lng,
      warehouse?.lon,
      warehouse?.Lon,
    ),
  );

  if (
    !isPresent(warehouseID) &&
    !isPresent(warehouseName) &&
    !isPresent(pickupAddress) &&
    pickupLatitude == null &&
    pickupLongitude == null
  ) {
    return null;
  }

  return {
    warehouseID: warehouseID ?? null,
    warehouseName: warehouseName ?? "",
    pickupAddress: pickupAddress ?? "",
    pickupLatitude,
    pickupLongitude,
  };
};

const mergePickupInfo = (...sources) => {
  const merged = sources.reduce(
    (accumulator, source) => {
      const info =
        source &&
        (Object.prototype.hasOwnProperty.call(source, "pickupAddress") ||
        Object.prototype.hasOwnProperty.call(source, "pickupLatitude") ||
        Object.prototype.hasOwnProperty.call(source, "pickupLongitude") ||
        Object.prototype.hasOwnProperty.call(source, "warehouseName") ||
        Object.prototype.hasOwnProperty.call(source, "warehouseID")
          ? source
          : extractPickupInfo(source));

      if (!info) return accumulator;

      return {
        warehouseID: accumulator.warehouseID ?? info.warehouseID ?? null,
        warehouseName: accumulator.warehouseName || info.warehouseName || "",
        pickupAddress: accumulator.pickupAddress || info.pickupAddress || "",
        pickupLatitude: accumulator.pickupLatitude ?? info.pickupLatitude ?? null,
        pickupLongitude:
          accumulator.pickupLongitude ?? info.pickupLongitude ?? null,
      };
    },
    {
      warehouseID: null,
      warehouseName: "",
      pickupAddress: "",
      pickupLatitude: null,
      pickupLongitude: null,
    },
  );

  return extractPickupInfo(merged);
};

const hasPickupInfo = (source) => Boolean(mergePickupInfo(source));

const formatCoordinateText = (latitude, longitude) => {
  const lat = toValidCoordinate(latitude);
  const lng = toValidCoordinate(longitude);

  if (lat == null || lng == null) return "";
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
};

const getPickupDisplayText = (source) => {
  const pickupInfo = mergePickupInfo(source);
  if (!pickupInfo) return "";

  if (pickupInfo.warehouseName && pickupInfo.pickupAddress) {
    return `${pickupInfo.warehouseName}: ${pickupInfo.pickupAddress}`;
  }

  if (pickupInfo.pickupAddress) {
    return pickupInfo.pickupAddress;
  }

  if (pickupInfo.warehouseName) {
    return pickupInfo.warehouseName;
  }

  return formatCoordinateText(
    pickupInfo.pickupLatitude,
    pickupInfo.pickupLongitude,
  );
};

const mergePickupInfoIntoMission = (mission, pickupInfo) => {
  const resolvedPickupInfo = mergePickupInfo(mission, pickupInfo);
  if (!resolvedPickupInfo) return mission;

  return {
    ...mission,
    warehouseID: mission?.warehouseID ?? resolvedPickupInfo.warehouseID ?? null,
    warehouseId: mission?.warehouseId ?? resolvedPickupInfo.warehouseID ?? null,
    warehouseName: mission?.warehouseName || resolvedPickupInfo.warehouseName || "",
    pickupAddress: mission?.pickupAddress || resolvedPickupInfo.pickupAddress || "",
    pickupLatitude:
      mission?.pickupLatitude ?? resolvedPickupInfo.pickupLatitude ?? null,
    pickupLongitude:
      mission?.pickupLongitude ?? resolvedPickupInfo.pickupLongitude ?? null,
    rescueRequest: {
      ...(mission?.rescueRequest || {}),
      warehouseID:
        mission?.rescueRequest?.warehouseID ??
        resolvedPickupInfo.warehouseID ??
        null,
      warehouseId:
        mission?.rescueRequest?.warehouseId ??
        resolvedPickupInfo.warehouseID ??
        null,
      warehouseName:
        mission?.rescueRequest?.warehouseName ||
        resolvedPickupInfo.warehouseName ||
        "",
      pickupAddress:
        mission?.rescueRequest?.pickupAddress ||
        resolvedPickupInfo.pickupAddress ||
        "",
      pickupLatitude:
        mission?.rescueRequest?.pickupLatitude ??
        resolvedPickupInfo.pickupLatitude ??
        null,
      pickupLongitude:
        mission?.rescueRequest?.pickupLongitude ??
        resolvedPickupInfo.pickupLongitude ??
        null,
    },
  };
};

const createNotificationTimestamp = () =>
  new Date().toLocaleString("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  });

const mergeNotifications = (oldList, newList) => {
  const notificationMap = new Map();

  [...newList, ...oldList].forEach((item) => {
    const key = String(item.id);

    if (!notificationMap.has(key)) {
      notificationMap.set(key, item);
      return;
    }

    const previousItem = notificationMap.get(key);
    notificationMap.set(key, {
      ...previousItem,
      ...item,
      read: previousItem.read ?? item.read ?? false,
    });
  });

  return Array.from(notificationMap.values()).sort(
    (left, right) =>
      new Date(right.createdAt || right.timestamp).getTime() -
      new Date(left.createdAt || left.timestamp).getTime(),
  );
};

export default function RescueTeamLeader({ teamId }) {
  const missionsRef = useRef([]);
  const notificationsRef = useRef([]);
  const [assigned, setAssigned] = useState([]);
  const [inProgress, setInProgress] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMission, setSelectedMission] = useState(null);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [userFullName, setUserFullName] = useState("");

  const [incidentReports, setIncidentReports] = useState([]);
  const [notifications, setNotifications] = useState(() => {
    try {
      const savedNotifications = localStorage.getItem(
        RESCUE_TEAM_NOTIFICATION_STORAGE_KEY,
      );
      return savedNotifications ? JSON.parse(savedNotifications) : [];
    } catch (error) {
      console.error("Load rescue team notifications failed:", error);
      return [];
    }
  });

  useEffect(() => {
    try {
      const name =
        localStorage.getItem("fullName") ||
        localStorage.getItem("userFullName") ||
        "";

      setUserFullName(name);
    } catch (err) {
      console.error("Load fullName failed:", err);
    }
  }, []);

  useEffect(() => {
    missionsRef.current = missions;
  }, [missions]);

  useEffect(() => {
    notificationsRef.current = notifications;
    try {
      localStorage.setItem(
        RESCUE_TEAM_NOTIFICATION_STORAGE_KEY,
        JSON.stringify(notifications),
      );
    } catch (error) {
      console.error("Save rescue team notifications failed:", error);
    }
  }, [notifications]);

  const getMissionId = (mission) =>
    mission?.rescueMissionID || mission?.rescueMissionId || mission?.id;

  const getReliefOrderId = (mission) =>
    mission?.reliefOrderID || mission?.reliefOrderId || mission?.orderID;

  const getRequestId = (mission) =>
    mission?.rescueRequestID ||
    mission?.rescueRequestId ||
    mission?.requestID ||
    mission?.rescueRequest?.rescueRequestID ||
    mission?.rescueRequest?.rescueRequestId;

  const normalizeRequestFlowToken = (value) =>
    String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, "");

  const getMissionRequestType = (mission) =>
    pickFirstValue(
      mission?.requestType,
      mission?.RequestType,
      mission?.rescueType,
      mission?.RescueType,
      mission?.requestInfo?.requestType,
      mission?.requestInfo?.RequestType,
      mission?.requestInfo?.rescueType,
      mission?.requestInfo?.RescueType,
      mission?.rescueRequest?.requestType,
      mission?.rescueRequest?.RequestType,
      mission?.rescueRequest?.rescueType,
      mission?.rescueRequest?.RescueType,
    );

  const isReliefOrderRequestType = (value) => {
    const token = normalizeRequestFlowToken(value);
    return token === "relieforder" || token === "supply";
  };

  const isRescueRequestType = (value) => {
    const token = normalizeRequestFlowToken(value);
    return token === "rescuerequest" || token === "rescue";
  };

  const isReliefOrderMission = (mission) => {
    const requestType = getMissionRequestType(mission);

    if (isReliefOrderRequestType(requestType)) {
      return true;
    }

    if (isRescueRequestType(requestType)) {
      return false;
    }

    return Boolean(getReliefOrderId(mission));
  };

  const matchesMissionIdentifiers = (mission, identifiers = {}) =>
    sameValue(getMissionId(mission), identifiers?.rescueMissionID) ||
    sameValue(getReliefOrderId(mission), identifiers?.reliefOrderID) ||
    sameValue(getRequestId(mission), identifiers?.rescueRequestID);

  const findMissionByIdentifiers = (missionList = [], identifiers = {}) =>
    missionList.find((mission) => matchesMissionIdentifiers(mission, identifiers));

  const getMissionIdentifiers = (mission = {}) => ({
    rescueMissionID: getMissionId(mission),
    reliefOrderID: getReliefOrderId(mission),
    rescueRequestID: getRequestId(mission),
  });

  const getPreparedOrderTeamId = (source = {}) =>
    pickFirstValue(
      source?.rescueTeamID,
      source?.RescueTeamID,
      source?.rescueTeamId,
      source?.RescueTeamId,
      source?.assignedTeamID,
      source?.AssignedTeamID,
      source?.assignedTeamId,
      source?.AssignedTeamId,
      source?.teamID,
      source?.TeamID,
      source?.teamId,
      source?.TeamId,
      source?.team?.rescueTeamID,
      source?.team?.rescueTeamId,
      source?.assignedTeam?.rescueTeamID,
      source?.assignedTeam?.rescueTeamId,
    );

  const getCitizenName = (mission) => {
    return (
      mission?.citizenName ||
      mission?.citizen?.fullName ||
      mission?.rescueRequest?.citizenName ||
      mission?.rescueRequest?.fullName ||
      "Chưa có tên người dân"
    );
  };

  const getDescription = (mission) => {
    return (
      mission?.description ||
      mission?.rescueRequest?.description ||
      mission?.rescueRequest?.note ||
      "Chưa có mô tả"
    );
  };

  const getLatitude = (mission) => {
    return (
      mission?.locationLatitude ??
      mission?.latitude ??
      mission?.rescueRequest?.locationLatitude ??
      mission?.rescueRequest?.latitude ??
      null
    );
  };

  const getLongitude = (mission) => {
    return (
      mission?.locationLongitude ??
      mission?.longitude ??
      mission?.rescueRequest?.locationLongitude ??
      mission?.rescueRequest?.longitude ??
      null
    );
  };

  const normalizeStatusToken = (status) =>
    String(status || "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");

  const normalizeStatus = (status) => {
    const token = normalizeStatusToken(status);

    if (!token) return "Unknown";
    if (token === "assigned") return "Assigned";
    if (["accepted", "confirm", "confirmed"].includes(token)) {
      return "Accepted";
    }
    if (
      [
        "prepared",
        "ready",
        "ready_for_pickup",
        "readyforpickup",
        "awaiting_pickup",
        "pending_pickup",
      ].includes(token)
    ) {
      return "AwaitingPickup";
    }
    if (
      [
        "inprogress",
        "in_progress",
        "pickup",
        "picked_up",
        "pickup_confirmed",
        "delivering",
      ].includes(token)
    ) {
      return "InProgress";
    }
    if (token === "completed" || token === "complete") return "Completed";
    return status;
  };

  const getMissionStatus = (mission) => {
    const missionStatus =
      mission?.newMissionStatus ||
      mission?.missionStatus ||
      mission?.currentStatus ||
      mission?.status ||
      "";
    const normalizedMissionStatus = normalizeStatus(missionStatus);

    if (["Assigned", "InProgress", "Completed"].includes(normalizedMissionStatus)) {
      return normalizedMissionStatus;
    }

    if (isReliefOrderMission(mission) && mission?.orderStatus) {
      return normalizeStatus(mission.orderStatus);
    }

    if (missionStatus) {
      return normalizedMissionStatus;
    }

    return "Unknown";
  };

  const hasPickupConfirmed = (mission) =>
    Boolean(
      mission?.pickedUpAt ||
        mission?.pickupConfirmedAt ||
        mission?.deliveryStartedAt,
    ) ||
    ["pickup", "picked_up", "pickup_confirmed", "delivering"].some((value) =>
      normalizeStatusToken(mission?.orderStatus).includes(value),
    );

  const canConfirmPickupMission = (mission) => {
    const status = getMissionStatus(mission);

    return (
      isReliefOrderMission(mission) &&
      Boolean(getReliefOrderId(mission)) &&
      hasPickupInfo(mission) &&
      !hasPickupConfirmed(mission) &&
      ["Accepted", "AwaitingPickup", "InProgress"].includes(status)
    );
  };

  const canCompleteMission = (mission) => {
    const status = getMissionStatus(mission);

    if (isReliefOrderMission(mission)) {
      return status === "InProgress" && hasPickupConfirmed(mission);
    }

    return ["Accepted", "InProgress"].includes(status);
  };

  const isActivePickupMission = (mission) => {
    const status = getMissionStatus(mission);
    return ["Accepted", "AwaitingPickup", "InProgress"].includes(status);
  };

  const isValidCoord = (lat, lng) => {
    if (lat == null || lng == null) return false;
    const latNum = Number(lat);
    const lngNum = Number(lng);
    return !Number.isNaN(latNum) && !Number.isNaN(lngNum);
  };

  const enrichMissionDetail = async (mission) => {
    const missionId = getMissionId(mission);
    if (!missionId) return mission;

    try {
      const res = await fetchWithAuth(`/RescueMission/${missionId}`);

      if (!res.ok) {
        console.error("Load mission detail failed:", missionId, res.status);
        return mission;
      }

      const text = await res.text();
      const json = text ? JSON.parse(text) : null;
      const detail = json?.content || json?.data || json || {};
      const requestInfo =
        detail?.requestInfo ||
        detail?.rescueRequest ||
        mission?.rescueRequest ||
        {};
      const enrichedMission = {
        ...mission,
        ...detail,
        rescueRequest: {
          ...(mission?.rescueRequest || {}),
          ...(detail?.rescueRequest || {}),
          ...requestInfo,
        },

        citizenName:
          mission?.citizenName ||
          detail?.citizenName ||
          requestInfo?.citizenName ||
          requestInfo?.fullName ||
          null,

        citizenPhone:
          mission?.citizenPhone ||
          detail?.citizenPhone ||
          requestInfo?.citizenPhone ||
          requestInfo?.phoneNumber ||
          requestInfo?.phone ||
          null,

        citizenEmail:
          mission?.citizenEmail ||
          detail?.citizenEmail ||
          requestInfo?.citizenEmail ||
          requestInfo?.email ||
          null,

        address:
          mission?.address ||
          mission?.Address ||
          detail?.address ||
          detail?.Address ||
          detail?.requestInfo?.address ||
          detail?.requestInfo?.Address ||
          detail?.rescueRequest?.address ||
          detail?.rescueRequest?.Address ||
          requestInfo?.address ||
          requestInfo?.Address ||
          null,

        description:
          mission?.description ||
          detail?.description ||
          requestInfo?.description ||
          requestInfo?.note ||
          null,

        requestType:
          pickFirstValue(
            mission?.requestType,
            mission?.RequestType,
            mission?.rescueType,
            mission?.RescueType,
            detail?.requestType,
            detail?.RequestType,
            detail?.rescueType,
            detail?.RescueType,
            requestInfo?.requestType,
            requestInfo?.RequestType,
            requestInfo?.type,
            requestInfo?.Type,
            requestInfo?.rescueType,
            requestInfo?.RescueType,
            null,
          ),

        rescueType:
          pickFirstValue(
            mission?.rescueType,
            mission?.RescueType,
            detail?.rescueType,
            detail?.RescueType,
            requestInfo?.rescueType,
            requestInfo?.RescueType,
            requestInfo?.requestType,
            requestInfo?.RequestType,
            null,
          ),

        peopleCount:
          mission?.peopleCount ??
          detail?.peopleCount ??
          requestInfo?.peopleCount ??
          requestInfo?.numberOfPeople ??
          null,

        priorityLevel:
          mission?.priorityLevel ||
          detail?.priorityLevel ||
          requestInfo?.priorityLevel ||
          requestInfo?.priority ||
          null,

        locationLatitude:
          mission?.locationLatitude ??
          detail?.locationLatitude ??
          requestInfo?.locationLatitude ??
          requestInfo?.latitude ??
          null,

        locationLongitude:
          mission?.locationLongitude ??
          detail?.locationLongitude ??
          requestInfo?.locationLongitude ??
          requestInfo?.longitude ??
          null,

        requestCreatedTime:
          mission?.requestCreatedTime ||
          requestInfo?.createdTime ||
          requestInfo?.createdAt ||
          requestInfo?.requestCreatedTime ||
          detail?.requestCreatedTime ||
          detail?.createdAt ||
          detail?.createdTime ||
          null,

        assignedAt:
          mission?.assignedAt ||
          detail?.assignedAt ||
          detail?.dispatchedAt ||
          detail?.assignedTime ||
          detail?.updatedAt ||
          null,

        startedAt:
          mission?.startedAt ||
          mission?.startTime ||
          detail?.startedAt ||
          detail?.startTime ||
          detail?.acceptedAt ||
          null,

        completedAt:
          mission?.completedAt ||
          mission?.endTime ||
          detail?.completedAt ||
          detail?.endTime ||
          null,

        acceptedAt:
          mission?.acceptedAt ||
          detail?.acceptedAt ||
          detail?.respondedAt ||
          null,

        preparedAt:
          mission?.preparedAt ||
          detail?.preparedAt ||
          detail?.preparedTime ||
          null,

        pickedUpAt:
          mission?.pickedUpAt ||
          mission?.pickupConfirmedAt ||
          detail?.pickedUpAt ||
          detail?.pickupConfirmedAt ||
          detail?.deliveryStartedAt ||
          null,

        orderStatus:
          mission?.orderStatus ||
          detail?.orderStatus ||
          detail?.reliefOrderStatus ||
          null,

        missionStatus:
          mission?.missionStatus ||
          detail?.missionStatus ||
          detail?.status ||
          mission?.status ||
          null,

        teamName: mission?.teamName || detail?.teamName || null,
      };

      let resolvedPickupInfo = mergePickupInfo(mission, detail, requestInfo);
      const reliefOrderId = getReliefOrderId(enrichedMission);
      const reliefOrderMission = isReliefOrderMission(enrichedMission);

      if (
        reliefOrderMission &&
        reliefOrderId &&
        (!resolvedPickupInfo?.pickupAddress ||
          resolvedPickupInfo?.pickupLatitude == null ||
          resolvedPickupInfo?.pickupLongitude == null ||
          !resolvedPickupInfo?.warehouseName)
      ) {
        try {
          const orderDetail = reliefOrderId
            ? await reliefOrdersService.getById(reliefOrderId)
            : null;
          resolvedPickupInfo = mergePickupInfo(
            resolvedPickupInfo,
            orderDetail,
          );
        } catch (orderError) {
          console.warn("Load relief order detail for pickup failed:", orderError);
        }
      }

      if (resolvedPickupInfo?.warehouseID && !resolvedPickupInfo?.pickupAddress) {
        try {
          const warehouseDetail = await getWarehouseById(
            resolvedPickupInfo.warehouseID,
          );
          resolvedPickupInfo = mergePickupInfo(
            resolvedPickupInfo,
            warehouseDetail,
          );
        } catch (warehouseError) {
          console.warn("Load warehouse detail failed:", warehouseError);
        }
      }

      return mergePickupInfoIntoMission(enrichedMission, resolvedPickupInfo);
    } catch (err) {
      console.error("Enrich mission detail error:", missionId, err);
      return mission;
    }
  };
  const loadIncidentReports = async () => {
    if (!teamId) {
      setIncidentReports([]);
      return;
    }

    const params = new URLSearchParams({
      RescueTeamID: teamId,
      PageNumber: "1",
      PageSize: "20",
    });

    try {
      const res = await fetchWithAuth(
        `/IncidentReports/filter?${params.toString()}`,
      );

      if (!res.ok) {
        console.error("Load incident reports failed:", res.status);
        setIncidentReports([]);
        return;
      }

      const text = await res.text();
      const json = text ? JSON.parse(text) : null;

      let list =
        json?.content?.data || json?.content?.items || json?.content || [];

      if (!Array.isArray(list)) list = [];

      const normalized = list
        .map((r) => ({
          incidentReportID:
            r?.incidentReportID || r?.incidentReportId || r?.id || "",
          rescueMissionID: r?.rescueMissionID || r?.rescueMissionId || "",
          rescueTeamID: r?.rescueTeamID || r?.rescueTeamId || "",
          teamName:
            r?.teamName ||
            r?.rescueTeamName ||
            r?.team?.teamName ||
            "Đội cứu hộ",
          reporterName:
            r?.reporterName || r?.reportedBy || r?.createdByName || "Không rõ",
          title: r?.title || "Không có tiêu đề",
          description:
            r?.description || r?.incidentDescription || r?.message || "",
          status: r?.status || "Không rõ",
          createdTime: r?.createdTime || r?.createdAt || null,

          coordinatorNote: r?.coordinatorNote || r?.resolveNote || "",
          resolvedBy:
            r?.resolvedBy || r?.coordinatorName || r?.resolvedByName || "",
          resolvedTime:
            r?.resolvedTime || r?.updatedAt || r?.resolvedAt || null,

          missionStatus: r?.missionStatus || "",
          requestStatus: r?.requestStatus || "",
          teamStatus: r?.teamStatus || "",
        }))
        .sort(
          (a, b) =>
            new Date(b?.createdTime || 0) - new Date(a?.createdTime || 0),
        );

      setIncidentReports(normalized);
    } catch (err) {
      console.error("Load incident reports failed:", err);
      setIncidentReports([]);
    }

    console.log("teamId:", teamId);
    console.log(
      "incident filter url:",
      `/IncidentReports/filter?${params.toString()}`,
    );
  };

  const applyMissionGroups = (missionList = [], options = {}) => {
    const { suppressPickupNotifications = false } = options;
    const previousMissions = missionsRef.current;
    const assignedList = missionList.filter(
      (mission) => getMissionStatus(mission) === "Assigned",
    );
    const inProgressList = missionList.filter(
      (mission) =>
        ["Accepted", "AwaitingPickup", "InProgress"].includes(
          getMissionStatus(mission),
        ),
    );
    const completedList = missionList
      .filter((mission) => getMissionStatus(mission) === "Completed")
      .sort(
        (left, right) =>
          new Date(right?.completedAt || right?.endTime || 0) -
          new Date(left?.completedAt || left?.endTime || 0),
      );

    setMissions(missionList);
    setAssigned(assignedList);
    setInProgress(inProgressList);
    setCompleted(completedList);
    missionsRef.current = missionList;

    if (!suppressPickupNotifications) {
      missionList.forEach((mission) => {
        if (!isActivePickupMission(mission) || !hasPickupInfo(mission)) {
          return;
        }

        const identifiers = getMissionIdentifiers(mission);
        if (!identifiers.reliefOrderID && !identifiers.rescueMissionID) {
          return;
        }

        const previousMission = findMissionByIdentifiers(
          previousMissions,
          identifiers,
        );

        if (previousMission && hasPickupInfo(previousMission)) {
          return;
        }

        const notification = buildPreparedOrderNotification({
          reliefOrderId: identifiers.reliefOrderID,
          rescueMissionID: identifiers.rescueMissionID,
          managerName: "Manager",
          pickupInfo: mergePickupInfo(mission),
        });
        const alreadyExists = notificationsRef.current.some(
          (item) => String(item.id) === String(notification.id),
        );

        setNotifications((previousNotifications) =>
          mergeNotifications(previousNotifications, [notification]),
        );

        if (previousMissions.length > 0 && !alreadyExists) {
          toast.success(notification.message);
        }
      });
    }

    return missionList;
  };

  const updateMissionDataWithPickupInfo = (pickupInfo, identifiers = {}) => {
    const resolvedPickupInfo = mergePickupInfo(pickupInfo);
    if (!resolvedPickupInfo) return;

    const mergeList = (missionList = []) =>
      missionList.map((mission) =>
        matchesMissionIdentifiers(mission, identifiers)
          ? mergePickupInfoIntoMission(mission, resolvedPickupInfo)
          : mission,
      );

    setMissions((previousMissions) => {
      const nextMissions = mergeList(previousMissions);
      missionsRef.current = nextMissions;
      return nextMissions;
    });
    setAssigned((previousMissions) => mergeList(previousMissions));
    setInProgress((previousMissions) => mergeList(previousMissions));
    setCompleted((previousMissions) => mergeList(previousMissions));
    setSelectedMission((previousMission) =>
      previousMission && matchesMissionIdentifiers(previousMission, identifiers)
        ? mergePickupInfoIntoMission(previousMission, resolvedPickupInfo)
        : previousMission,
    );
  };

  const resolvePreparedOrderContext = async (data = {}) => {
    const identifiers = {
      reliefOrderID: pickFirstValue(
        data?.reliefOrderID,
        data?.ReliefOrderID,
        data?.reliefOrderId,
        data?.ReliefOrderId,
        data?.id,
        data?.ID,
      ),
      rescueMissionID: pickFirstValue(
        data?.rescueMissionID,
        data?.RescueMissionID,
        data?.rescueMissionId,
        data?.RescueMissionId,
        data?.missionID,
        data?.MissionID,
      ),
      rescueRequestID: pickFirstValue(
        data?.rescueRequestID,
        data?.RescueRequestID,
        data?.rescueRequestId,
        data?.RescueRequestId,
        data?.requestID,
        data?.RequestID,
      ),
    };

    let matchedMission = findMissionByIdentifiers(
      missionsRef.current,
      identifiers,
    );
    let resolvedPickupInfo = mergePickupInfo(data, matchedMission);

    if (identifiers.rescueMissionID) {
      try {
        const missionResponse = await rescueMissionService.getById(
          identifiers.rescueMissionID,
        );
        const missionDetail =
          missionResponse?.content || missionResponse?.data || missionResponse || {};

        matchedMission = mergePickupInfoIntoMission(
          matchedMission || missionDetail,
          missionDetail,
        );
        resolvedPickupInfo = mergePickupInfo(
          resolvedPickupInfo,
          missionDetail,
        );
      } catch (missionError) {
        console.warn("Load mission detail for prepared order failed:", missionError);
      }
    }

    let orderDetail = null;
    const needsOrderContext = Boolean(
      identifiers.reliefOrderID &&
        (!resolvedPickupInfo?.pickupAddress ||
          resolvedPickupInfo?.pickupLatitude == null ||
          resolvedPickupInfo?.pickupLongitude == null ||
          !resolvedPickupInfo?.warehouseName),
    );

    if (needsOrderContext) {
      try {
        orderDetail = await reliefOrdersService.getById(identifiers.reliefOrderID);
        identifiers.rescueMissionID =
          identifiers.rescueMissionID ||
          pickFirstValue(orderDetail?.rescueMissionID, orderDetail?.rescueMissionId);
        identifiers.rescueRequestID =
          identifiers.rescueRequestID ||
          pickFirstValue(orderDetail?.rescueRequestID, orderDetail?.rescueRequestId);

        matchedMission =
          matchedMission ||
          findMissionByIdentifiers(missionsRef.current, identifiers) ||
          matchedMission;
        resolvedPickupInfo = mergePickupInfo(resolvedPickupInfo, orderDetail);
      } catch (orderError) {
        console.warn("Load relief order detail for prepared order failed:", orderError);
      }
    }

    const warehouseId = pickFirstValue(
      resolvedPickupInfo?.warehouseID,
      data?.warehouseID,
      data?.warehouseId,
      matchedMission?.warehouseID,
      matchedMission?.warehouseId,
      orderDetail?.warehouseID,
      orderDetail?.warehouseId,
    );

    if (
      warehouseId &&
      (!resolvedPickupInfo?.pickupAddress ||
        resolvedPickupInfo?.pickupLatitude == null ||
        resolvedPickupInfo?.pickupLongitude == null ||
        !resolvedPickupInfo?.warehouseName)
    ) {
      try {
        const warehouseDetail = await getWarehouseById(warehouseId);
        resolvedPickupInfo = mergePickupInfo(
          resolvedPickupInfo,
          warehouseDetail,
        );
      } catch (warehouseError) {
        console.warn("Load warehouse detail for prepared order failed:", warehouseError);
      }
    }

    return {
      identifiers,
      matchedMission:
        matchedMission && hasPickupInfo(resolvedPickupInfo)
          ? mergePickupInfoIntoMission(matchedMission, resolvedPickupInfo)
          : matchedMission,
      pickupInfo: resolvedPickupInfo,
    };
  };

  const buildPreparedOrderNotification = ({
    reliefOrderId,
    rescueMissionID,
    managerName,
    pickupInfo,
  }) => {
    const actor = managerName || "Manager";
    const pickupAddressText =
      pickupInfo?.pickupAddress ||
      pickupInfo?.warehouseName ||
      getPickupDisplayText(pickupInfo);
    const locationNote = pickupAddressText
      ? ` Địa chỉ kho: ${pickupAddressText}.`
      : "";

    return {
      id: `order-prepared-${reliefOrderId || rescueMissionID || Date.now()}`,
      type: "pickup",
      title: "Đơn supply đã sẵn sàng",
      message: reliefOrderId
        ? `${actor} đã hoàn thành đơn supply #${reliefOrderId}.${locationNote}`
        : `${actor} đã hoàn thành đơn supply cho đội của bạn.${locationNote}`,
      reliefOrderId: reliefOrderId || "",
      reliefOrderID: reliefOrderId || "",
      rescueMissionID: rescueMissionID || "",
      warehouseID: pickupInfo?.warehouseID ?? null,
      warehouseName: pickupInfo?.warehouseName || "",
      pickupAddress: pickupInfo?.pickupAddress || "",
      pickupLatitude: pickupInfo?.pickupLatitude ?? null,
      pickupLongitude: pickupInfo?.pickupLongitude ?? null,
      timestamp: createNotificationTimestamp(),
      createdAt: new Date().toISOString(),
      read: false,
    };
  };

  const loadMissions = async (options = {}) => {
    const { force = false, suppressPickupNotifications = false } = options;

    if (!teamId || (!force && loading)) {
      return missionsRef.current;
    }

    setLoading(true);

    try {
      const json = await rescueMissionService.filter({
        rescueTeamID: teamId,
        pageNumber: 1,
        pageSize: 50,
      });

      if (!json?.success) {
        console.error("Filter missions failed:", json?.message);
        return;
      }

      let missionList =
        json?.content?.data || json?.content?.items || json?.content || [];

      if (!Array.isArray(missionList)) {
        missionList = Object.values(missionList).filter(
          (m) => m?.rescueMissionID || m?.rescueMissionId,
        );
      }

      const enrichedMissions = await Promise.all(
        missionList.map(enrichMissionDetail),
      );
      return applyMissionGroups(enrichedMissions, {
        suppressPickupNotifications,
      });
    } catch (err) {
      console.error("Load mission error:", err?.message);
      return missionsRef.current;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (teamId) {
      loadMissions();
      loadIncidentReports();
    }
  }, [teamId]);

  useEffect(() => {
    if (!teamId) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      Promise.allSettled([loadMissions({ force: true }), loadIncidentReports()]).then((results) => {
        results.forEach((result) => {
          if (result.status === "rejected") {
            console.warn("[RescueTeamLeader] Auto refresh failed:", result.reason);
          }
        });
      });
    }, RESCUE_TEAM_AUTO_REFRESH_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [teamId]);

  useEffect(() => {
    const handleMissionNotification = () => loadMissions({ force: true });

    const handlePreparedOrderUpdate = async (data = {}, options = {}) => {
      const showToast = options?.showToast !== false;
      const reliefOrderId =
        data?.reliefOrderID ||
        data?.ReliefOrderID ||
        data?.reliefOrderId ||
        data?.ReliefOrderId ||
        data?.id ||
        data?.ID ||
        "";
      const eventTeamId = getPreparedOrderTeamId(data);
      const managerName =
        data?.managerName ||
        data?.ManagerName ||
        data?.preparedBy ||
        data?.PreparedBy ||
        "Manager";

      const preparedOrderContext = await resolvePreparedOrderContext(data);
      const knownMission =
        preparedOrderContext.matchedMission ||
        findMissionByIdentifiers(
          missionsRef.current,
          preparedOrderContext.identifiers,
        );
      const shouldHandleEvent =
        sameValue(eventTeamId, teamId) || Boolean(knownMission);

      if (!shouldHandleEvent) {
        return false;
      }

      const refreshedMissions =
        options?.refreshMissions === false
          ? missionsRef.current
          : await loadMissions({
              force: true,
              suppressPickupNotifications: true,
            });
      const refreshedMission = findMissionByIdentifiers(
        refreshedMissions,
        preparedOrderContext.identifiers,
      );
      const pickupInfo = mergePickupInfo(
        preparedOrderContext.pickupInfo,
        preparedOrderContext.matchedMission,
        refreshedMission,
        data,
      );

      if (pickupInfo) {
        updateMissionDataWithPickupInfo(
          pickupInfo,
          preparedOrderContext.identifiers,
        );
      }

      const notification = buildPreparedOrderNotification({
        reliefOrderId,
        rescueMissionID: preparedOrderContext.identifiers?.rescueMissionID,
        managerName,
        pickupInfo,
      });

      let shouldShowToast = false;
      setNotifications((previousNotifications) => {
        shouldShowToast =
          showToast &&
          !previousNotifications.some(
            (item) => String(item.id) === String(notification.id),
          );

        return mergeNotifications(previousNotifications, [notification]);
      });

      if (shouldShowToast) {
        toast.success(notification.message);
      }

      return true;
    };

    const handleOrderPrepared = async (data) => {
      console.log("OrderPrepared:", data);
      await handlePreparedOrderUpdate(data);
    };

    const handleReceiveOrderResponse = async (data) => {
      console.log("ReceiveOrderResponse:", data);
      const handled = await handlePreparedOrderUpdate(data);

      if (!handled) {
        await loadMissions({ force: true });
      }
    };

    const syncSharedPreparedOrderEvents = async (
      rawValue,
      { showToast = false } = {},
    ) => {
      try {
        const parsedValue =
          typeof rawValue === "string" ? JSON.parse(rawValue) : rawValue;
        const sharedEvents = Array.isArray(parsedValue) ? parsedValue : [];
        const relevantEvents = sharedEvents
          .filter((entry) => entry && sameValue(getPreparedOrderTeamId(entry), teamId))
          .sort(
            (left, right) =>
              new Date(left?.createdAt || 0).getTime() -
              new Date(right?.createdAt || 0).getTime(),
          );

        for (const entry of relevantEvents) {
          await handlePreparedOrderUpdate(entry, {
            showToast,
            refreshMissions: false,
          });
        }
      } catch (error) {
        console.warn("Sync shared prepared order events failed:", error);
      }
    };

    const handleSharedPreparedOrderStorage = (event) => {
      if (event.key !== SHARED_PREPARED_ORDER_STORAGE_KEY) {
        return;
      }

      void syncSharedPreparedOrderEvents(event.newValue, { showToast: true });
    };

    const handleIncidentResolved = async (data) => {
      console.log("IncidentResolved:", data);
      await loadMissions({ force: true });
      await loadIncidentReports();
      window.alert(
        "Điều phối viên đã xử lý sự cố. Nhiệm vụ này sẽ được thu hồi để điều phối lại.",
      );
    };

    const init = async () => {
      try {
        await signalRService.startConnection();
        await signalRService.on(
          CLIENT_EVENTS.RECEIVE_MISSION_NOTIFICATION,
          handleMissionNotification,
        );
        await signalRService.on(
          CLIENT_EVENTS.ORDER_PREPARED,
          handleOrderPrepared,
        );
        await signalRService.on(
          CLIENT_EVENTS.RECEIVE_ORDER_RESPONSE,
          handleReceiveOrderResponse,
        );
        await signalRService.on(
          CLIENT_EVENTS.INCIDENT_RESOLVED,
          handleIncidentResolved,
        );
        window.addEventListener("storage", handleSharedPreparedOrderStorage);
        await syncSharedPreparedOrderEvents(
          localStorage.getItem(SHARED_PREPARED_ORDER_STORAGE_KEY),
        );
      } catch (err) {
        console.error("SignalR init error in RescueTeamLeader:", err);
      }
    };

    init();

    return () => {
      signalRService.off(
        CLIENT_EVENTS.RECEIVE_MISSION_NOTIFICATION,
        handleMissionNotification,
      );
      signalRService.off(CLIENT_EVENTS.ORDER_PREPARED, handleOrderPrepared);
      signalRService.off(
        CLIENT_EVENTS.RECEIVE_ORDER_RESPONSE,
        handleReceiveOrderResponse,
      );
      signalRService.off(
        CLIENT_EVENTS.INCIDENT_RESOLVED,
        handleIncidentResolved,
      );
      window.removeEventListener("storage", handleSharedPreparedOrderStorage);
    };
  }, [teamId]);

  const markAllNotificationsAsRead = () => {
    setNotifications((previousNotifications) =>
      previousNotifications.map((notification) => ({
        ...notification,
        read: true,
      })),
    );
  };

  const removeNotification = (notificationId) => {
    setNotifications((previousNotifications) =>
      previousNotifications.filter(
        (notification) => notification.id !== notificationId,
      ),
    );
  };

  const openNotificationDetail = async (notification) => {
    if (!notification) return;

    setNotifications((previousNotifications) =>
      previousNotifications.map((item) =>
        item.id === notification.id ? { ...item, read: true } : item,
      ),
    );
    setShowNotifications(false);

    const identifiers = {
      rescueMissionID: notification?.rescueMissionID,
      reliefOrderID: notification?.reliefOrderId || notification?.reliefOrderID,
    };

    let mission = findMissionByIdentifiers(missionsRef.current, identifiers);

    if (!mission) {
      const refreshedMissions = await loadMissions({ force: true });
      mission = findMissionByIdentifiers(refreshedMissions, identifiers);
    }

    if (mission) {
      handleShowDetail(mission);
      return;
    }

    const pickupInfo = mergePickupInfo(notification);
    if (pickupInfo) {
      handleShowDetail(
        mergePickupInfoIntoMission(
          {
            rescueMissionID: notification?.rescueMissionID || "",
            reliefOrderID:
              notification?.reliefOrderId || notification?.reliefOrderID || "",
            citizenName: notification?.title || "Đơn supply",
            description: notification?.message || "",
          },
          pickupInfo,
        ),
      );
    }
  };

  const handleShowDetail = (mission) => {
    setSelectedMission(mission);
    setShowDetailModal(true);
  };

  const handleCloseDetail = () => {
    setShowDetailModal(false);
    setSelectedMission(null);
  };

  const handleReportIncident = (mission) => {
    setSelectedMission(mission);
    setShowDetailModal(false);
    setShowIncidentModal(true);
  };

  const handleCloseIncident = () => {
    setShowIncidentModal(false);
    setSelectedMission(null);
  };

  const handleIncidentSubmit = async (formData) => {
    try {
      await incidentReportService.reportIncident(formData);
      await loadMissions({ force: true });
      await loadIncidentReports();
      setShowIncidentModal(false);
      setSelectedMission(null);
      toast.success("Đã gửi báo cáo sự cố.");
    } catch (err) {
      console.error("Failed to submit incident:", err);
      window.alert("Lỗi khi báo cáo sự cố.");
    }
  };

  const handleAccept = async (mission) => {
    try {
      const missionId = getMissionId(mission);
      if (!missionId) {
        console.error("Mission ID is missing", mission);
        return;
      }

      const res = await rescueMissionService.respond({
        rescueMissionID: missionId,
        isAccepted: true,
        rejectReason: "",
      });

      if (res?.success) {
        await loadMissions({ force: true });
      } else {
        console.error(res?.message || "Accept failed");
      }
    } catch (err) {
      console.error("Accept mission error:", err);
    }
  };

  const handleReject = async (mission) => {
    try {
      const missionId = getMissionId(mission);
      if (!missionId) {
        console.error("Mission ID is missing", mission);
        return;
      }

      const status = getMissionStatus(mission);
      if (status !== "Assigned") {
        window.alert(
          "Không thể từ chối: nhiệm vụ không ở trạng thái Được giao.",
        );
        return;
      }

      const res = await rescueMissionService.respond({
        rescueMissionID: missionId,
        isAccepted: false,
        rejectReason: "Team unavailable",
      });

      if (res?.success) {
        await loadMissions({ force: true });
      } else {
        console.error(res?.message || "Reject failed");
      }
    } catch (err) {
      console.error("Reject mission error:", err);
    }
  };

  const handlePickup = async (mission) => {
    try {
      if (!canConfirmPickupMission(mission)) {
        window.alert(
          "Đơn chưa ở trạng thái sẵn sàng lấy hàng hoặc đã được xác nhận pickup.",
        );
        return;
      }

      const rescueMissionID =
        mission.rescueMissionID || mission.rescueMissionId || mission.id;
      const reliefOrderID = mission.reliefOrderID || mission.reliefOrderId;

      if (!rescueMissionID || !reliefOrderID) {
        console.error("Missing rescueMissionID or reliefOrderID", {
          rescueMissionID,
          reliefOrderID,
          mission,
        });
        return;
      }

      await rescueMissionService.confirmPickup({
        rescueMissionID,
        reliefOrderID,
      });

      toast.success("Đã xác nhận lấy hàng từ kho.");
      await loadMissions({ force: true });
    } catch (err) {
      console.error("Confirm pickup error:", err);
    }
  };

  const handleComplete = async (mission) => {
    try {
      const missionId = getMissionId(mission);
      if (!missionId) {
        console.error("Mission ID is missing");
        return;
      }

      if (!canCompleteMission(mission)) {
        if (!isReliefOrderMission(mission)) {
          window.alert(
            "Khong the hoan thanh nhiem vu o trang thai hien tai.",
          );
          return;
        }
        window.alert(
          "Không thể hoàn thành: hãy xác nhận pickup trước khi kết thúc nhiệm vụ.",
        );
        return;
      }

      await completeMission(missionId);
      await loadMissions({ force: true });
    } catch (err) {
      console.error("Complete mission error:", err);
    }
  };

  const renderPickupSummary = (mission) => {
    if (!isReliefOrderMission(mission)) {
      return null;
    }

    const pickupInfo = mergePickupInfo(mission);
    const pickupLabel =
      pickupInfo?.pickupAddress ||
      pickupInfo?.warehouseName ||
      getPickupDisplayText(mission);

    if (!pickupLabel) {
      return null;
    }

    return (
      <div className="pickup-summary-card">
        <p className="pickup-summary-title">Điểm lấy hàng</p>
        {pickupLabel && <p className="pickup-summary-copy">{pickupLabel}</p>}
      </div>
    );
  };

  const mapMissions = useMemo(() => {
    const all = [...assigned, ...inProgress, ...completed];
    return all.filter((m) => isValidCoord(getLatitude(m), getLongitude(m)));
  }, [assigned, inProgress, completed]);

  const unreadNotificationCount = notifications.filter(
    (notification) => !notification.read,
  ).length;

  const firstMapPoint =
    mapMissions.length > 0
      ? {
          latitude: Number(getLatitude(mapMissions[0])),
          longitude: Number(getLongitude(mapMissions[0])),
        }
      : null;

  const defaultCenter =
    firstMapPoint
      ? [
          Number(firstMapPoint.latitude),
          Number(firstMapPoint.longitude),
        ]
      : [10.8231, 106.6297];

  const getNotificationStyleMeta = (type) => {
    switch (type) {
      case "pickup":
        return { bg: "#fff7ed", border: "#f97316", icon: "\uD83D\uDCE6" };
      default:
        return { bg: "#eff6ff", border: "#2563eb", icon: "\uD83D\uDD14" };
    }
  };

  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    navigate("/login");
  };

  return (
    <>
      <Header />
      <div className="dashboard-container">
        <div className="dashboard-content">
          <div className="dashboard-header">
            <div>
              <div className="dashboard-header-top">
                <h1 className="dashboard-title">Dashboard trưởng đội cứu hộ</h1>
                <div className="dashboard-header-actions">
                  <div className="rescue-notification-container">
                    <button
                      className={`rescue-notification-bell ${
                        unreadNotificationCount > 0 ? "active" : ""
                      }`}
                      type="button"
                      onClick={() => setShowNotifications((previous) => !previous)}
                    >
                      <FaBell className="rescue-notification-bell-icon" />
                      {unreadNotificationCount > 0 && (
                        <span className="rescue-notification-badge">
                          {unreadNotificationCount}
                        </span>
                      )}
                    </button>

                    {showNotifications && (
                      <div className="rescue-notification-panel">
                        <div className="rescue-notification-header">
                          <h3>Thông báo ({notifications.length})</h3>
                          <button
                            className="rescue-notification-mark-all"
                            type="button"
                            onClick={markAllNotificationsAsRead}
                          >
                            Đánh dấu đã đọc
                          </button>
                        </div>

                        <div className="rescue-notification-list">
                          {notifications.length === 0 ? (
                            <div className="rescue-no-notifications">
                              Chưa có thông báo mới
                            </div>
                          ) : (
                            notifications.map((notification) => {
                              const styleMeta = getNotificationStyleMeta(
                                notification.type,
                              );

                              return (
                                <div
                                  key={notification.id}
                                  className={`rescue-notification-item ${
                                    notification.read ? "read" : "unread"
                                  }`}
                                  style={{
                                    backgroundColor: styleMeta.bg,
                                    borderLeft: `4px solid ${styleMeta.border}`,
                                  }}
                                >
                                  <div className="rescue-notification-icon">
                                    {styleMeta.icon}
                                  </div>

                                  <div className="rescue-notification-content">
                                    <h4>{notification.title}</h4>
                                    <p>{notification.message}</p>

                                    <div className="rescue-notification-footer">
                                      <span className="rescue-notification-time">
                                        {notification.timestamp}
                                      </span>

                                      <button
                                        className="rescue-notification-action"
                                        type="button"
                                        onClick={() =>
                                          openNotificationDetail(notification)
                                        }
                                      >
                                        Xem chi tiết
                                      </button>
                                    </div>
                                  </div>

                                  <button
                                    className="rescue-notification-close"
                                    type="button"
                                    onClick={() =>
                                      removeNotification(notification.id)
                                    }
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

                  <button className="logout-btn2" onClick={handleLogout}>
                  🚪 Đăng xuất
                </button>
              </div>
              </div>
              <div className="a">
                <p className="dashboard-sub">
                  Đội cứu hộ #{teamId?.substring(0, 8) || "Không xác định"}
                </p>
                <p>|</p>
                {userFullName && (
                  <p
                    className="dashboard-sub"
                    style={{
                      color: "blue",
                      fontWeight: "600",
                      fontSize: "18px",
                    }}
                  >
                    👤 {userFullName}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="stats">
            <div className="stat-card blue">
              <div className="stat-info">
                <span>Nhiệm vụ được giao</span>
                <h3>{assigned.length}</h3>
              </div>
              <FaClipboardList className="stat-icon" />
            </div>

            <div className="stat-card green">
              <div className="stat-info">
                <span>Đang xử lý</span>
                <h3>{inProgress.length}</h3>
              </div>
              <FaCheckCircle className="stat-icon" />
            </div>

            <div className="stat-card gray">
              <div className="stat-info">
                <span>Đã hoàn thành</span>
                <h3>{completed.length}</h3>
              </div>
              <FaCheckCircle className="stat-icon" />
            </div>
          </div>

          <div className="panels">
            <div className="panel">
              <div className="panel-title">Nhiệm vụ được giao</div>

              {assigned.length === 0 && <p>Không có nhiệm vụ nào</p>}

              {assigned.map((mission) => (
                <div className="request-card" key={getMissionId(mission)}>
                  <p>
                    <b>{getCitizenName(mission)}</b>
                  </p>

                  <p>{getDescription(mission)}</p>

                  <p>
                    <small>
                      📝 Nhận nhiệm vụ:{" "}
                      {mission?.assignedAt
                        ? formatVNTime(mission.assignedAt)
                        : "Không có thời gian"}
                    </small>
                  </p>

                  <p>
                    <small>
                      📤 Giao lúc:{" "}
                      {mission?.assignedAt
                        ? formatVNTime(mission.assignedAt)
                        : "Không có thời gian"}
                    </small>
                  </p>

                  <p>
                    <FaMapMarkerAlt />{" "}
                    <span>
                      {mission?.address ||
                        mission?.rescueRequest?.address ||
                        "Chưa có địa chỉ"}
                    </span>
                  </p>

                  {renderPickupSummary(mission)}

                  <div className="btn-group">
                    <button
                      className="btn-accept"
                      onClick={() => handleAccept(mission)}
                    >
                      Chấp nhận
                    </button>

                    <button
                      className="btn-reject"
                      onClick={() => handleReject(mission)}
                    >
                      Từ chối
                    </button>

                    <button
                      className="btn-report"
                      onClick={() => handleReportIncident(mission)}
                    >
                      Báo cáo sự cố
                    </button>

                    <button
                      className="btn-info"
                      onClick={() => handleShowDetail(mission)}
                    >
                      Xem chi tiết
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="panel">
              <div className="panel-title">Đang xử lý</div>

              {inProgress.length === 0 && (
                <p>Không có nhiệm vụ nào đang xử lý</p>
              )}

              {inProgress.map((mission) => (
                <div className="request-card" key={getMissionId(mission)}>
                  <p>
                    <b>{getCitizenName(mission)}</b>
                  </p>

                  <p>{getDescription(mission)}</p>

                  <p>
                    <small>
                      📝 Tạo lúc:{" "}
                      {mission?.requestCreatedTime
                        ? formatVNTime(mission.requestCreatedTime)
                        : "Không có thời gian"}
                    </small>
                  </p>

                  <p>
                    <small>
                      🚒 Bắt đầu lúc:{" "}
                      {mission?.startedAt || mission?.startTime
                        ? formatVNTime(mission?.startedAt || mission?.startTime)
                        : "Không có thời gian"}
                    </small>
                  </p>

                  <p>
                    <FaMapMarkerAlt />{" "}
                    <span>
                      {mission?.address ||
                        mission?.rescueRequest?.address ||
                        "Chưa có địa chỉ"}
                    </span>
                  </p>

                  {renderPickupSummary(mission)}

                  {isReliefOrderMission(mission) &&
                    !canConfirmPickupMission(mission) &&
                    !canCompleteMission(mission) && (
                      <p>
                        <small>
                          Đang chờ manager prepare đơn và gửi thông tin kho.
                        </small>
                      </p>
                    )}

                  {canConfirmPickupMission(mission) && (
                    <button
                      className="btn-accept"
                      onClick={() => handlePickup(mission)}
                    >
                      Xác nhận lấy hàng
                    </button>
                  )}

                  <div className="btn-group">
                    {canCompleteMission(mission) && (
                      <button
                        className="btn-complete"
                        onClick={() => handleComplete(mission)}
                      >
                        Hoàn thành nhiệm vụ
                      </button>
                    )}

                    <button
                      className="btn-report"
                      onClick={() => handleReportIncident(mission)}
                    >
                      Báo cáo sự cố
                    </button>

                    <button
                      className="btn-info"
                      onClick={() => handleShowDetail(mission)}
                    >
                      Xem chi tiết
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 30 }}>
            <MapContainer
              center={defaultCenter}
              zoom={13}
              style={{ height: "400px" }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

              {mapMissions.map((m) => (
                <Marker
                  key={getMissionId(m)}
                  position={[Number(getLatitude(m)), Number(getLongitude(m))]}
                >
                  <Popup>
                    <b>{getCitizenName(m)}</b>
                    <br />
                    {getDescription(m)}
                    <br />
                    Trạng thái: {getMissionStatus(m)}
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          <div
            style={{
              marginTop: 50,
              display: "flex",
              gap: "20px",
              alignItems: "stretch",
            }}
          >
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div
                className="panel-title"
                style={{
                  marginBottom: "15px",
                  fontSize: "1.2rem",
                  fontWeight: "bold",
                }}
              >
                Lịch sử cứu hộ
              </div>

              <div
                className="panels"
                style={{ display: "flex", flexDirection: "column" }}
              >
                <div
                  className="panel"
                  style={{ width: "100%", height: "500px", overflowY: "auto" }}
                >
                  {completed.length === 0 && (
                    <p>Chưa có nhiệm vụ nào hoàn thành</p>
                  )}

                  {completed.map((mission) => (
                    <div className="request-card" key={getMissionId(mission)}>
                      <p>
                        <b>{getCitizenName(mission)}</b>
                      </p>

                      <p>{getDescription(mission)}</p>

                      <p>
                        <small>
                          📝 Nhận nhiệm vụ:{" "}
                          {mission?.assignedAt
                            ? formatVNTime(mission.assignedAt)
                            : "Không có thời gian"}
                        </small>
                      </p>

                      <p>
                        <small>
                          ✅ Hoàn thành lúc:{" "}
                          {mission?.completedAt || mission?.endTime
                            ? formatVNTime(
                                mission?.completedAt || mission?.endTime,
                              )
                            : "Không có thời gian"}
                        </small>
                      </p>

                      <p>
                        <FaMapMarkerAlt />{" "}
                        <span>
                          {mission?.address ||
                            mission?.rescueRequest?.address ||
                            "Chưa có địa chỉ"}
                        </span>
                      </p>

                      {renderPickupSummary(mission)}

                      <div className="btn-group">
                        <button
                          className="btn-info"
                          onClick={() => handleShowDetail(mission)}
                        >
                          Xem chi tiết
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div
                className="panel-title"
                style={{
                  marginBottom: "15px",
                  fontSize: "1.2rem",
                  fontWeight: "bold",
                }}
              >
                Lịch sử báo cáo sự cố
              </div>

              <div
                className="panels"
                style={{ display: "flex", flexDirection: "column" }}
              >
                <div
                  className="panel"
                  style={{
                    width: "100%",
                    height: "500px",
                    overflowY: "auto",
                  }}
                >
                  {incidentReports.length === 0 && <p>Chưa có báo cáo sự cố</p>}

                  {incidentReports.map((r) => (
                    <div
                      className="request-card"
                      key={r?.incidentReportID || r?.incidentReportId || r?.id}
                    >
                      <p>
                        <b>{r?.teamName || "Đội cứu hộ"}</b>
                      </p>

                      <p>👤 Người báo cáo: {r?.reporterName || "Không rõ"}</p>

                      <p>📄 Tiêu đề: {r?.title || "Không có tiêu đề"}</p>

                      {r?.description && (
                        <p>📝 Nội dung sự cố: {r.description}</p>
                      )}

                      <p>
                        <small>
                          🕒 Báo cáo lúc:{" "}
                          {r?.createdTime
                            ? formatVNTime(r.createdTime)
                            : "Không có thời gian"}
                        </small>
                      </p>

                      <p>
                        <small>
                          📌 Trạng thái sự cố: {r?.status || "Không rõ"}
                        </small>
                      </p>

                      {r?.missionStatus && (
                        <p>
                          <small>
                            🚒 Trạng thái nhiệm vụ: {r.missionStatus}
                          </small>
                        </p>
                      )}

                      {r?.requestStatus && (
                        <p>
                          <small>
                            📨 Trạng thái yêu cầu: {r.requestStatus}
                          </small>
                        </p>
                      )}

                      {r?.resolvedBy && (
                        <p>
                          <small>✅ Người xử lý: {r.resolvedBy}</small>
                        </p>
                      )}

                      {r?.resolvedTime && (
                        <p>
                          <small>
                            ⏱ Xử lý lúc: {formatVNTime(r.resolvedTime)}
                          </small>
                        </p>
                      )}

                      {r?.coordinatorNote && (
                        <div
                          style={{
                            marginTop: "8px",
                            padding: "10px 12px",
                            background: "#f6f8fb",
                            borderLeft: "4px solid #2563eb",
                            borderRadius: "8px",
                          }}
                        >
                          <small>
                            <b>Ghi chú điều phối viên:</b> {r.coordinatorNote}
                          </small>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {showDetailModal && selectedMission && (
            <RequestDetailModal
              mission={selectedMission}
              onClose={handleCloseDetail}
              onReportIncident={handleReportIncident}
            />
          )}

          {showIncidentModal && selectedMission && (
            <IncidentReportForm
              mission={selectedMission}
              onClose={handleCloseIncident}
              onSubmit={handleIncidentSubmit}
            />
          )}
        </div>
      </div>
    </>
  );
}
