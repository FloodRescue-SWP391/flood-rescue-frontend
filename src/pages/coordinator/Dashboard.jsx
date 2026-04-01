// File này đã được chú thích lại để bạn biết các block realtime/API dùng để làm gì.
import React, { useState, useEffect, useRef } from "react";
import "./Dashboard.css";
import Header from "../../components/common/Header.jsx";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getAllRescueRequests } from "../../services/rescueRequestService.js";
import {
  getAllRescueTeams,
  getRescueTeamById,
} from "../../services/rescueTeamService.js";
import {
  rescueMissionService,
  completeMission,
} from "../../services/rescueMissionService.js";
import { incidentReportService } from "../../services/incidentReportService.js";
import { reliefOrdersService } from "../../services/reliefOrdersService.js";
import signalRService from "../../services/signalrService.js";
import { useNavigate } from "react-router-dom";
import { CLIENT_EVENTS } from "../../data/signalrConstants";

/* FIX ICON */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom icons cho các loại cứu hộ lũ lụt
const dotIcon = (color) =>
  L.divIcon({
    className: "custom-dot-icon",
    html: `<div style="
      background-color: ${color};
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 0 6px rgba(0,0,0,0.5);
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

const TEAM_MARKER_REFRESH_MS = 20000;
const teamIconCache = new Map();

const pickFirstValue = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== "");

const readTeamId = (team) =>
  team?.rescueTeamID ??
  team?.RescueTeamID ??
  team?.rescueTeamId ??
  team?.RescueTeamId ??
  team?.id ??
  team?.Id;

const getTeamLatitudeValue = (team) => {
  const lat = Number(
    pickFirstValue(
      team?.currentLatitude,
      team?.CurrentLatitude,
      team?.latitude,
      team?.Latitude,
    ),
  );

  return Number.isFinite(lat) && lat >= -90 && lat <= 90 ? lat : null;
};

const getTeamLongitudeValue = (team) => {
  const lng = Number(
    pickFirstValue(
      team?.currentLongitude,
      team?.CurrentLongitude,
      team?.longitude,
      team?.Longitude,
    ),
  );

  return Number.isFinite(lng) && lng >= -180 && lng <= 180 ? lng : null;
};

const hasValidTeamLocation = (team) =>
  getTeamLatitudeValue(team) !== null && getTeamLongitudeValue(team) !== null;

const normalizeTeamStatus = (status) => {
  const s = String(status || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (!s) return "unknown";
  if (["available", "idle", "ready"].includes(s)) return "available";
  if (
    [
      "assigned",
      "inprogress",
      "in_progress",
      "processing",
      "onmission",
      "on_mission",
      "busy",
    ].includes(s)
  ) {
    return "busy";
  }
  if (["offline", "inactive", "disabled"].includes(s)) return "offline";
  return "unknown";
};

const getTeamStatusMeta = (status) => {
  switch (normalizeTeamStatus(status)) {
    case "available":
      return {
        markerClass: "available",
        badgeClass: "available",
        label: "Sẵn sàng",
      };
    case "busy":
      return {
        markerClass: "busy",
        badgeClass: "busy",
        label: status || "Đang làm nhiệm vụ",
      };
    case "offline":
      return {
        markerClass: "offline",
        badgeClass: "offline",
        label: status || "Ngoại tuyến",
      };
    default:
      return {
        markerClass: "unknown",
        badgeClass: "unknown",
        label: status || "Chưa rõ",
      };
  }
};

const buildTeamMarkerIcon = (status) => {
  const { markerClass } = getTeamStatusMeta(status);

  if (!teamIconCache.has(markerClass)) {
    teamIconCache.set(
      markerClass,
      L.divIcon({
        className: "team-marker-wrapper",
        html: `
          <div class="team-marker team-marker--${markerClass}">
            <div class="team-marker__body">
              <svg class="team-marker__icon" viewBox="0 0 32 32" aria-hidden="true">
                <path fill="currentColor" d="M13 5h6v6h6v6h-6v6h-6v-6H7v-6h6z"></path>
              </svg>
            </div>
            <span class="team-marker__badge team-marker__badge--${markerClass}"></span>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 40],
        popupAnchor: [0, -34],
      }),
    );
  }

  return teamIconCache.get(markerClass);
};

const readApiJson = async (res) => {
  if (!res || typeof res.text !== "function") return null;

  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch (error) {
    console.error("Parse API JSON failed:", error);
    return null;
  }
};

const ChangeView = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom]);
  return null;
};

const normalizeEmergencyText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const normalizeRequestFlowToken = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

const readRequestType = (request) =>
  pickFirstValue(
    request?.rescueType,
    request?.RescueType,
    request?.requestType,
    request?.RequestType,
    request?.emergencyType,
    request?.EmergencyType,
    request?.type,
    request?.Type,
  );

const isExplicitReliefOrderType = (value) => {
  const token = normalizeRequestFlowToken(value);
  return token === "relieforder" || token === "supply";
};

const isExplicitRescueRequestType = (value) => {
  const token = normalizeRequestFlowToken(value);
  return token === "rescuerequest" || token === "rescue";
};

const resolveRequestFlowCategory = (request) => {
  const rawType = readRequestType(request);

  if (isExplicitReliefOrderType(rawType)) {
    return "supply";
  }

  if (isExplicitRescueRequestType(rawType)) {
    return "rescue";
  }

  const emergencyCategory = normalizeEmergencyText(request?.emergencyCategory);

  if (emergencyCategory === "supply") {
    return "supply";
  }

  if (
    emergencyCategory === "life_threatening" ||
    emergencyCategory === "lifethreatening" ||
    emergencyCategory === "rescue"
  ) {
    return "rescue";
  }

  const text = normalizeEmergencyText(rawType);

  if (
    text === "supply" ||
    text.includes("food") ||
    text.includes("water") ||
    text.includes("medicine") ||
    text.includes("thá»±c pháº©m") ||
    text.includes("nÆ°á»›c") ||
    text.includes("thuá»‘c") ||
    text.includes("Ã¡o phao") ||
    text.includes("thuyá»n")
  ) {
    return "supply";
  }

  return "rescue";
};

const isSupplyRequest = (request) => {
  return resolveRequestFlowCategory(request) === "supply";
  const text = normalizeEmergencyText(readRequestType(request));

  return (
    request?.emergencyCategory === "supply" ||
    text === "supply" ||
    text.includes("food") ||
    text.includes("water") ||
    text.includes("medicine") ||
    text.includes("thực phẩm") ||
    text.includes("nước") ||
    text.includes("thuốc") ||
    text.includes("áo phao") ||
    text.includes("thuyền")
  );
};

const isRescueRequest = (request) =>
  resolveRequestFlowCategory(request) === "rescue";

const Dashboard = () => {
  const [allRequests, setAllRequests] = useState([]);
  const [teams, setTeams] = useState([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamsError, setTeamsError] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [dispatching, setDispatching] = useState(false);
  const [dispatchError, setDispatchError] = useState("");
  const [dispatchSuccess, setDispatchSuccess] = useState("");

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [mapCenter, setMapCenter] = useState([10.775, 106.686]);
  const [mapZoom, setMapZoom] = useState(13);
  const [statusFilter, setStatusFilter] = useState("active");
  const [typeFilter, setTypeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [showCompleted, setShowCompleted] = useState(false);
  const [floodLevelFilter, setFloodLevelFilter] = useState("all"); // Lọc theo mức nước

  //incident Report
  const [pendingIncidents, setPendingIncidents] = useState([]);
  const [incidentHistory, setIncidentHistory] = useState([]);
  const [incidentLoading, setIncidentLoading] = useState(false);
  const [incidentError, setIncidentError] = useState("");
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [resolveNote, setResolveNote] = useState("");
  const [resolvingIncident, setResolvingIncident] = useState(false);
  // State cho thông báo
  const NOTI_STORAGE_KEY = "coordinator_notifications";
  const REJECTED_STORAGE_KEY = "coordinator_rejected_requests";

  // Bộ lọc mới
  const [requestBoxType, setRequestBoxType] = useState("rescue");
  // rescue | supply | rejected
  const [teamRejectedRequests, setTeamRejectedRequests] = useState(() => {
    try {
      const saved = localStorage.getItem(REJECTED_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error("Load rejected requests from localStorage failed:", error);
      return [];
    }
  });
  const [rejectedToast, setRejectedToast] = useState(null);

  const [requestStatusTab, setRequestStatusTab] = useState("new");
  // new | processing | completed

  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem(NOTI_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error("Load notifications from localStorage failed:", error);
      return [];
    }
  });
  const [showNotifications, setShowNotifications] = useState(false);
  const [addressMap, setAddressMap] = useState({});

  const navigate = useNavigate();

  const refreshRequestsInBackground = () => {
    loadRealRequests();
    //setTimeout(() => loadRealRequests(), 800);
    setTimeout(() => loadRealRequests(), 2000);
    // setTimeout(() => loadRealRequests(), 3500);
  };

  // Lưu tên user hệ thống
  const [userFullName, setUserFullName] = useState("");

  const moveRequestBackToPending = (incident) => {
    const missionId =
      incident?.rescueMissionID ??
      incident?.RescueMissionID ??
      incident?.missionId ??
      incident?.MissionId;

    const requestId =
      incident?.rescueRequestID ??
      incident?.RescueRequestID ??
      incident?.requestId ??
      incident?.RequestId;

    const incidentTeamId =
      incident?.rescueTeamID ??
      incident?.RescueTeamID ??
      incident?.teamId ??
      incident?.TeamId ??
      incident?.reportedTeamId ??
      incident?.ReportedTeamId ??
      null;

    const incidentTeamName =
      incident?.teamName ??
      incident?.TeamName ??
      incident?.rescueTeamName ??
      incident?.RescueTeamName ??
      null;

    if (!missionId && !requestId) return;

    setAllRequests((prev) =>
      prev.map((req) => {
        const matched =
          (missionId && String(req.rescueMissionId) === String(missionId)) ||
          (requestId && String(req.id) === String(requestId));

        if (!matched) return req;

        const effectiveTeamId = req.assignedTeamId || incidentTeamId;
        const effectiveTeamName = req.assignedTeamName || incidentTeamName;

        return {
          ...req,
          status: "pending",
          rawStatus: "Pending",
          missionStatus: "",
          assignedTeamId: "",
          assignedTeamName: "",
          rescueMissionId: null,
          isNew: true,
          rejectedTeamIds: Array.from(
            new Set([
              ...(req.rejectedTeamIds || []),
              ...(effectiveTeamId ? [String(effectiveTeamId)] : []),
            ]),
          ),
          rejectedTeamNames: Array.from(
            new Set([
              ...(req.rejectedTeamNames || []),
              ...(effectiveTeamName ? [effectiveTeamName] : []),
            ]),
          ),
          hasIncident: true,
          incidentResolved: true,
          incidentReportID:
            incident?.incidentReportID ?? incident?.IncidentReportID ?? null,
        };
      }),
    );

    setSelectedRequest((prev) => {
      if (!prev) return prev;

      const matched =
        (missionId && String(prev.rescueMissionId) === String(missionId)) ||
        (requestId && String(prev.id) === String(requestId));

      if (!matched) return prev;

      const effectiveTeamId = prev.assignedTeamId || incidentTeamId;
      const effectiveTeamName = prev.assignedTeamName || incidentTeamName;

      return {
        ...prev,
        status: "pending",
        rawStatus: "Pending",
        missionStatus: "",
        assignedTeamId: "",
        assignedTeamName: "",
        rescueMissionId: null,
        isNew: true,
        rejectedTeamIds: Array.from(
          new Set([
            ...(prev.rejectedTeamIds || []),
            ...(effectiveTeamId ? [String(effectiveTeamId)] : []),
          ]),
        ),
        rejectedTeamNames: Array.from(
          new Set([
            ...(prev.rejectedTeamNames || []),
            ...(effectiveTeamName ? [effectiveTeamName] : []),
          ]),
        ),
        hasIncident: true,
        incidentResolved: true,
        incidentReportID:
          incident?.incidentReportID ?? incident?.IncidentReportID ?? null,
      };
    });
  };

  // Hàm lọc trạng thái
  const matchRequestStatusTab = (request, tab) => {
    if (tab === "new") {
      return request.status === "pending";
    }

    if (tab === "processing") {
      return request.status === "in_progress";
    }

    if (tab === "completed") {
      return request.status === "completed";
    }

    return true;
  };

  useEffect(() => {
    try {
      const savedFullName =
        localStorage.getItem("fullName") ||
        localStorage.getItem("userFullName") ||
        "";

      setUserFullName(savedFullName);
    } catch (error) {
      console.error("Load fullName failed:", error);
    }
  }, []);

  // Phân trang cho List of requirements
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    try {
      localStorage.setItem(NOTI_STORAGE_KEY, JSON.stringify(notifications));
    } catch (error) {
      console.error("Save notifications to localStorage failed:", error);
    }
  }, [notifications]);

  useEffect(() => {
    try {
      localStorage.setItem(
        REJECTED_STORAGE_KEY,
        JSON.stringify(teamRejectedRequests),
      );
    } catch (error) {
      console.error("Save rejected requests to localStorage failed:", error);
    }
  }, [teamRejectedRequests]);

  useEffect(() => {
    setTeamRejectedRequests((prev) =>
      prev.filter((item) => {
        const matchedRequest = allRequests.find(
          (req) =>
            String(req.requestId) === String(item.shortCode) ||
            String(req.id) === String(item.originalRequestId),
        );

        // nếu backend chưa trả lại request này thì cứ giữ tạm
        if (!matchedRequest) return true;

        const isStillWaitingRedispatch =
          String(matchedRequest.status || "").toLowerCase() === "pending" &&
          !matchedRequest.assignedTeamId &&
          !matchedRequest.rescueMissionId;

        return isStillWaitingRedispatch;
      }),
    );
  }, [allRequests]);

  // tránh trùng và lọc request chưa xử lý
  const isUnprocessedStatus = (status) => {
    if (!status) return true;

    const s = String(status).toLowerCase();

    return ![
      "completed",
      "done",
      "cancelled",
      "canceled",
      "rejected",
      "delivered",
    ].includes(s);
  };

  const mergeNotifications = (oldList, newList) => {
    const map = new Map();

    [...newList, ...oldList].forEach((item) => {
      const key = String(item.requestId || item.id);

      if (!map.has(key)) {
        map.set(key, item);
      } else {
        const oldItem = map.get(key);
        map.set(key, {
          ...oldItem,
          ...item,
          read: oldItem.read ?? item.read ?? false,
        });
      }
    });

    return Array.from(map.values()).sort(
      (a, b) =>
        new Date(b.createdAt || b.timestamp).getTime() -
        new Date(a.createdAt || a.timestamp).getTime(),
    );
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [
    statusFilter,
    typeFilter,
    priorityFilter,
    floodLevelFilter,
    showCompleted,
  ]);
  // Logout thì dừng SignalR để tránh connection cũ còn sống sau khi ra khỏi màn.
  const handleLogout = async () => {
    try {
      await signalRService.stopConnection();
    } catch (e) {
      console.warn("SignalR stop failed", e);
    }

    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userFullName");
    navigate("/login");
  };
  const mapStatusToUI = (status, missionStatus) => {
    const s = String(status || "")
      .trim()
      .toLowerCase();
    const m = String(missionStatus || "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");

    if (s === "pending") return "pending";
    if (m === "completed" || s === "completed") return "completed";
    if (m === "delivered" || s === "delivered") return "completed";

    if (
      m === "inprogress" ||
      m === "in_progress" ||
      m === "processing" ||
      m === "accepted" ||
      s === "processing" ||
      s === "in_progress" ||
      s === "inprogress" ||
      s === "accepted"
    ) {
      return "in_progress";
    }

    return "pending";
  };
  const getAddressFromCoordinates = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`,
        {
          headers: {
            "Accept-Language": "vi",
          },
        },
      );

      if (!res.ok) {
        throw new Error(`Reverse geocoding failed: ${res.status}`);
      }

      const data = await res.json();
      return data?.display_name || "";
    } catch (error) {
      console.error("Reverse geocoding failed:", error);
      return "";
    }
  };

  // Lưu Lại team đã reject vào request gốc
  const mapRequestToUI = (r) => {
    const lat = Number(r.LocationLatitude ?? r.locationLatitude ?? 0);
    const lng = Number(r.LocationLongitude ?? r.locationLongitude ?? 0);

    const rawStatus = r.Status ?? r.status ?? "";
    const requestStatusNormalized = String(rawStatus)
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");

    const rawMissionStatus =
      r.MissionStatus ??
      r.missionStatus ??
      r.RescueMissionStatus ??
      r.rescueMissionStatus ??
      "";

    const hasIncidentFlag =
      (r.hasIncident ?? r.HasIncident ?? false) ||
      (r.incidentResolved ?? r.IncidentResolved ?? false) ||
      ["pending", "reported", "unresolved"].includes(
        String(r.incidentStatus ?? r.IncidentStatus ?? "")
          .trim()
          .toLowerCase(),
      );

    const shouldIgnoreMission =
      requestStatusNormalized === "pending" || hasIncidentFlag;

    const safeMissionStatus = shouldIgnoreMission ? "" : rawMissionStatus;

    const uiStatus = mapStatusToUI(rawStatus, safeMissionStatus);
    const isPendingAgain = uiStatus === "pending";

    const requestType =
      r.RescueType ??
      r.rescueType ??
      r.RequestType ??
      r.requestType ??
      "Unknown";
    const requestFlowCategory = resolveRequestFlowCategory({
      ...r,
      requestType,
      rescueType: requestType,
    });

    const createdTimeRaw = r.CreatedTime ?? r.createdTime ?? null;

    return {
      id: r.RescueRequestID ?? r.rescueRequestID ?? r.id ?? r.Id,
      requestId: r.ShortCode ?? r.shortCode ?? "",

      fullName:
        r.CitizenName ?? r.citizenName ?? r.FullName ?? r.fullName ?? "Citizen",

      phoneNumber:
        r.CitizenPhone ??
        r.citizenPhone ??
        r.PhoneNumber ??
        r.phoneNumber ??
        "",

      address:
        r.Address ??
        r.address ??
        (Number.isFinite(lat) && Number.isFinite(lng)
          ? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
          : "Chưa có địa chỉ"),

      location: { lat, lng },

      emergencyType: requestType,
      rescueType: requestType,
      requestType,
      emergencyCategory:
        requestFlowCategory === "supply" ? "supply" : "life_threatening",

      description: r.Description ?? r.description ?? "",

      status: uiStatus,
      rawStatus: rawStatus || "",
      missionStatus: safeMissionStatus || "",

      createdAtRaw: createdTimeRaw,
      timestamp: createdTimeRaw
        ? new Date(createdTimeRaw).toLocaleString("vi-VN")
        : "",

      imageUrl:
        (Array.isArray(r.ImageUrls) && r.ImageUrls.length > 0
          ? r.ImageUrls[0]
          : null) ||
        (Array.isArray(r.imageUrls) && r.imageUrls.length > 0
          ? r.imageUrls[0]
          : "") ||
        "",

      isNew: uiStatus === "pending",

      waterLevel: r.WaterLevel ?? r.waterLevel ?? "0m",
      peopleCount: Number(r.PeopleCount ?? r.peopleCount ?? 0),

      priorityLevel:
        r.PriorityLevel ??
        r.priorityLevel ??
        (requestFlowCategory === "supply" ? "Medium" : "Critical"),

      assignedTeamId: isPendingAgain
        ? ""
        : (r.RescueTeamID ??
          r.rescueTeamID ??
          r.AssignedTeamId ??
          r.assignedTeamId ??
          ""),

      assignedTeamName: isPendingAgain
        ? ""
        : (r.TeamName ??
          r.teamName ??
          r.AssignedTeamName ??
          r.assignedTeamName ??
          ""),

      rescueMissionId: isPendingAgain
        ? null
        : (r.RescueMissionID ?? r.rescueMissionID ?? null),

      hasIncident: r.hasIncident ?? r.HasIncident ?? false,

      wasRejected: r.wasRejected ?? r.WasRejected ?? false,

      incidentResolved: r.incidentResolved ?? r.IncidentResolved ?? false,

      incidentReportID: r.incidentReportID ?? r.IncidentReportID ?? null,

      rejectedTeamIds: Array.isArray(r.rejectedTeamIds)
        ? r.rejectedTeamIds
        : [],
      rejectedTeamNames: Array.isArray(r.rejectedTeamNames)
        ? r.rejectedTeamNames
        : [],
    };
  };

  // Hàm phân loại Request

  useEffect(() => {
    const loadSelectedAddress = async () => {
      if (!selectedRequest?.id) return;

      if (addressMap[selectedRequest.id]) return;

      const lat = selectedRequest?.location?.lat;
      const lng = selectedRequest?.location?.lng;

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const address = await getAddressFromCoordinates(lat, lng);

      setAddressMap((prev) => ({
        ...prev,
        [selectedRequest.id]: address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      }));
    };

    loadSelectedAddress();
  }, [selectedRequest, addressMap]);

  const extractApiData = (res) => {
    if (!res) return null;

    if (Array.isArray(res)) return res;

    if (Array.isArray(res.data)) return res.data;

    if (Array.isArray(res.content)) return res.content;

    if (Array.isArray(res.content?.data)) return res.content.data;

    if (Array.isArray(res.data?.data)) return res.data.data;

    if (Array.isArray(res.data?.content)) return res.data.content;

    return [];
  };

  const extractApiObject = (res) => {
    if (!res || Array.isArray(res)) return null;

    if (res.content && !Array.isArray(res.content)) {
      if (res.content.data && !Array.isArray(res.content.data)) {
        return res.content.data;
      }
      return res.content;
    }

    if (res.data && !Array.isArray(res.data)) {
      if (res.data.data && !Array.isArray(res.data.data)) {
        return res.data.data;
      }
      if (res.data.content && !Array.isArray(res.data.content)) {
        return res.data.content;
      }
      return res.data;
    }

    return res;
  };

  const hydrateTeamsWithLocation = async (teamList) => {
    if (!Array.isArray(teamList) || teamList.length === 0) return [];

    const missingLocationTeams = teamList.filter(
      (team) => readTeamId(team) && !hasValidTeamLocation(team),
    );

    if (missingLocationTeams.length === 0) {
      return teamList;
    }

    const detailEntries = await Promise.all(
      missingLocationTeams.map(async (team) => {
        const teamId = readTeamId(team);

        try {
          const res = await getRescueTeamById(teamId);

          if (!res?.ok) {
            console.warn(
              "Load rescue team detail failed:",
              teamId,
              res?.status,
            );
            return [String(teamId), null];
          }

          const json = await readApiJson(res);
          const detail = extractApiObject(json);

          return [String(teamId), detail];
        } catch (error) {
          console.warn("Load rescue team detail threw:", teamId, error);
          return [String(teamId), null];
        }
      }),
    );

    const detailMap = new Map(detailEntries);

    return teamList.map((team) => {
      const teamId = readTeamId(team);
      const detail = detailMap.get(String(teamId));

      if (!detail) return team;

      return {
        ...detail,
        ...team,
        currentLatitude: pickFirstValue(
          team?.currentLatitude,
          team?.CurrentLatitude,
          detail?.currentLatitude,
          detail?.CurrentLatitude,
          detail?.latitude,
          detail?.Latitude,
        ),
        currentLongitude: pickFirstValue(
          team?.currentLongitude,
          team?.CurrentLongitude,
          detail?.currentLongitude,
          detail?.CurrentLongitude,
          detail?.longitude,
          detail?.Longitude,
        ),
        currentStatus: pickFirstValue(
          team?.currentStatus,
          team?.CurrentStatus,
          detail?.currentStatus,
          detail?.CurrentStatus,
        ),
        teamName: pickFirstValue(
          team?.teamName,
          team?.TeamName,
          detail?.teamName,
          detail?.TeamName,
          detail?.rescueTeamName,
          detail?.RescueTeamName,
        ),
        city: pickFirstValue(
          team?.city,
          team?.City,
          detail?.city,
          detail?.City,
        ),
      };
    });
  };

  useEffect(() => {
    //Khi nhận event reject, câp nhật trạng thái request, reload request/mission.
    const handleTeamResponse = async (data) => {
      console.log("ReceiveTeamResponse:", data);

      const code =
        data.requestShortCode || data.RequestShortCode || data.ShortCode;
      const type = String(
        data.notificationType || data.NotificationType || "",
      ).toLowerCase();
      const rejected =
        type.includes("reject") ||
        type.includes("decline") ||
        type.includes("refuse");
      const teamName = data.teamName || data.TeamName || "Đội cứu hộ";
      const teamId =
        data.rescueTeamID ||
        data.RescueTeamID ||
        data.teamId ||
        data.TeamId ||
        null;
      const missionId = data.rescueMissionID || data.RescueMissionID || null;
      const requestId = data.rescueRequestID || data.RescueRequestID || null;

      // Sẽ cập nhật state dưới đây
      setAllRequests((prev) =>
        prev.map((r) => {
          const matched =
            String(r.requestId) === String(code) ||
            (requestId && String(r.id) === String(requestId));

          if (!matched) return r;

          if (!rejected) {
            // Accepted
            return {
              ...r,
              status: "in_progress",
              rawStatus: "Processing",
              missionStatus: "InProgress",
              assignedTeamName: teamName,
              assignedTeamId: teamId ? String(teamId) : r.assignedTeamId,
              rescueMissionId: missionId,
            };
          } else {
            // Rejected
            const nextRejectedTeamIds = Array.from(
              new Set([
                ...(Array.isArray(r.rejectedTeamIds) ? r.rejectedTeamIds : []),
                ...(teamId ? [String(teamId)] : []),
              ]),
            );
            const nextRejectedTeamNames = Array.from(
              new Set([
                ...(Array.isArray(r.rejectedTeamNames)
                  ? r.rejectedTeamNames
                  : []),
                ...(teamName ? [teamName] : []),
              ]),
            );

            const updatedRequest = {
              ...r,
              status: "pending",
              rawStatus: "Pending",
              missionStatus: "",
              assignedTeamName: "",
              assignedTeamId: "",
              rescueMissionId: null,
              isNew: true,
              wasRejected: true,
              rejectedTeamIds: nextRejectedTeamIds,
              rejectedTeamNames: nextRejectedTeamNames,
            };

            // LƯU LẠI ĐỂ DÙNG SAU
            window.__rejectedRequestSnapshot = updatedRequest;

            return updatedRequest;
          }
        }),
      );

      setSelectedRequest((prev) => {
        if (!prev) return prev;
        const matched =
          String(prev.requestId) === String(code) ||
          (requestId && String(prev.id) === String(requestId));
        if (!matched) return prev;

        if (!rejected) {
          // accepted
          return {
            ...prev,
            status: "in_progress",
            rawStatus: "Processing",
            missionStatus: "InProgress",
            assignedTeamName: teamName,
            assignedTeamId: teamId ? String(teamId) : prev.assignedTeamId,
            rescueMissionId: missionId,
          };
        } else {
          // rejected
          const nextRejectedTeamIds = Array.from(
            new Set([
              ...(Array.isArray(prev.rejectedTeamIds)
                ? prev.rejectedTeamIds
                : []),
              ...(teamId ? [String(teamId)] : []),
            ]),
          );
          const nextRejectedTeamNames = Array.from(
            new Set([
              ...(Array.isArray(prev.rejectedTeamNames)
                ? prev.rejectedTeamNames
                : []),
              ...(teamName ? [teamName] : []),
            ]),
          );
          return {
            ...prev,
            status: "pending",
            rawStatus: "Pending",
            missionStatus: "",
            assignedTeamName: "",
            assignedTeamId: "",
            rescueMissionId: null,
            isNew: true,
            wasRejected: true,
            rejectedTeamIds: nextRejectedTeamIds,
            rejectedTeamNames: nextRejectedTeamNames,
          };
        }
      });

      if (rejected) {
        // Lấy snapshot đã lưu
        const rejectedRequestSnapshot = window.__rejectedRequestSnapshot;
        delete window.__rejectedRequestSnapshot; // clean

        if (rejectedRequestSnapshot) {
          const rejectedItem = {
            ...rejectedRequestSnapshot,
            id: `rejected-${code}-${Date.now()}`,
            originalRequestId: requestId || rejectedRequestSnapshot.id || code,
            shortCode: code,
            rejectedByTeamId: teamId ? String(teamId) : "",
            rejectedByTeamName: teamName,
            rejectedTeamIds:
              rejectedRequestSnapshot.rejectedTeamIds ||
              (teamId ? [String(teamId)] : []),
            rejectedTeamNames:
              rejectedRequestSnapshot.rejectedTeamNames ||
              (teamName ? [teamName] : []),
            message: `[${teamName}] đã từ chối nhận nhiệm vụ có ID [${code}]`,
            createdAt: new Date().toISOString(),
          };

          setTeamRejectedRequests((prev) => {
            const filtered = prev.filter(
              (item) => String(item.shortCode) !== String(code),
            );
            return [rejectedItem, ...filtered];
          });

          setRejectedToast(rejectedItem);

          setNotifications((prev) =>
            mergeNotifications(prev, [
              {
                id: `reject-${code}`,
                type: "critical",
                title: "Đội cứu hộ từ chối nhiệm vụ",
                message: `[${teamName}] đã từ chối nhận nhiệm vụ có ID [${code}]`,
                requestId: String(code),
                rawRequestId: String(requestId || code),
                timestamp: new Date().toLocaleString("vi-VN"),
                createdAt: new Date().toISOString(),
                read: false,
                status: "pending",
              },
            ]),
          );
        }
      }

      refreshRequestsInBackground();
    };

    // Mission hoàn thành -> coordinator cập nhật thông báo và reload danh sách.
    const handleMissionCompleted = async (data) => {
      console.log("MissionCompletedNotification:", data);

      const code = String(
        data?.requestShortCode ||
          data?.RequestShortCode ||
          data?.shortCode ||
          data?.ShortCode ||
          "",
      ).trim();

      const requestId = String(
        data?.rescueRequestID ||
          data?.RescueRequestID ||
          data?.requestId ||
          data?.RequestId ||
          "",
      ).trim();

      const missionId = String(
        data?.rescueMissionID ||
          data?.RescueMissionID ||
          data?.missionId ||
          data?.MissionId ||
          "",
      ).trim();

      setAllRequests((prev) =>
        prev.map((r) => {
          const matched =
            (code && String(r.requestId || "").trim() === code) ||
            (requestId && String(r.id || "").trim() === requestId) ||
            (missionId && String(r.rescueMissionId || "").trim() === missionId);

          if (!matched) return r;

          return {
            ...r,
            status: "completed",
            rawStatus: "Completed",
            missionStatus: "Completed",
          };
        }),
      );

      setSelectedRequest((prev) => {
        if (!prev) return prev;

        const matched =
          (code && String(prev.requestId || "").trim() === code) ||
          (requestId && String(prev.id || "").trim() === requestId) ||
          (missionId &&
            String(prev.rescueMissionId || "").trim() === missionId);

        if (!matched) return prev;

        return {
          ...prev,
          status: "completed",
          rawStatus: "Completed",
          missionStatus: "Completed",
        };
      });

      refreshRequestsInBackground();
    };

    const handleIncidentReported = async (data) => {
      console.log("IncidentReportedNotification:", data);

      const missionId =
        data?.rescueMissionID ??
        data?.RescueMissionID ??
        data?.missionId ??
        data?.MissionId ??
        null;

      const requestId =
        data?.rescueRequestID ??
        data?.RescueRequestID ??
        data?.requestId ??
        data?.RequestId ??
        null;

      const incidentReportID =
        data?.incidentReportID ?? data?.IncidentReportID ?? null;

      setAllRequests((prev) =>
        prev.map((req) => {
          const matched =
            (missionId && String(req.rescueMissionId) === String(missionId)) ||
            (requestId && String(req.id) === String(requestId));

          if (!matched) return req;

          const prevTeamId = req.assignedTeamId;
          const prevTeamName = req.assignedTeamName;

          return {
            ...req,
            status: "pending",
            rawStatus: "Pending",
            missionStatus: "",
            assignedTeamId: "",
            assignedTeamName: "",
            rescueMissionId: null,
            isNew: true,
            hasIncident: true,
            incidentResolved: false,
            incidentReportID: incidentReportID || req.incidentReportID || null,
            rejectedTeamIds: Array.from(
              new Set([
                ...(req.rejectedTeamIds || []),
                ...(prevTeamId ? [String(prevTeamId)] : []),
              ]),
            ),
            rejectedTeamNames: Array.from(
              new Set([
                ...(req.rejectedTeamNames || []),
                ...(prevTeamName ? [prevTeamName] : []),
              ]),
            ),
          };
        }),
      );

      setSelectedRequest((prev) => {
        if (!prev) return prev;

        const matched =
          (missionId && String(prev.rescueMissionId) === String(missionId)) ||
          (requestId && String(prev.id) === String(requestId));

        if (!matched) return prev;

        const prevTeamId = prev.assignedTeamId;
        const prevTeamName = prev.assignedTeamName;

        return {
          ...prev,
          status: "pending",
          rawStatus: "Pending",
          missionStatus: "",
          assignedTeamId: "",
          assignedTeamName: "",
          rescueMissionId: null,
          isNew: true,
          hasIncident: true,
          incidentResolved: false,
          incidentReportID: incidentReportID || prev.incidentReportID || null,
          rejectedTeamIds: Array.from(
            new Set([
              ...(prev.rejectedTeamIds || []),
              ...(prevTeamId ? [String(prevTeamId)] : []),
            ]),
          ),
          rejectedTeamNames: Array.from(
            new Set([
              ...(prev.rejectedTeamNames || []),
              ...(prevTeamName ? [prevTeamName] : []),
            ]),
          ),
        };
      });

      setRequestStatusTab("new");

      await loadPendingIncidents();
      refreshRequestsInBackground();
    };

    const handleNewRescueRequest = async (data) => {
      console.log("🔔 NewRescueRequest event:", data);

      const code =
        data.ShortCode ||
        data.shortCode ||
        data.RequestShortCode ||
        data.requestShortCode ||
        "UNKNOWN";

      const requestId =
        data.RescueRequestID ||
        data.rescueRequestID ||
        data.RequestID ||
        data.requestID ||
        code;

      const newNotification = {
        id: `req-${requestId}`,
        type: "critical",
        title: "New Rescue Request",
        message: `New rescue request #${code}`,
        requestId: String(code),
        rawRequestId: String(requestId),
        timestamp: new Date().toLocaleString("vi-VN"),
        createdAt: new Date().toISOString(),
        read: false,
        status: "pending",
      };

      setNotifications((prev) => mergeNotifications(prev, [newNotification]));
      await loadRealRequests();
    };

    const initSignalR = async () => {
      try {
        await signalRService.startConnection();

        console.log("✅ SignalR connected");

        // signalRService.on("ReceiveTeamResponse", handleTeamAccepted);
        // signalRService.on("MissionCompleted", handleMissionCompleted);
        // signalRService.on("IncidentReported", handleIncidentReported);
        // signalRService.on("NewRescueRequest", handleNewRescueRequest);

        signalRService.on(
          CLIENT_EVENTS.RECEIVE_TEAM_RESPONSE,
          handleTeamResponse,
        );
        signalRService.on(
          CLIENT_EVENTS.MISSION_COMPLETED,
          handleMissionCompleted,
        );
        signalRService.on(
          CLIENT_EVENTS.INCIDENT_REPORTED,
          handleIncidentReported,
        );
        signalRService.on(
          CLIENT_EVENTS.NEW_RESCUE_REQUEST,
          handleNewRescueRequest,
        );
      } catch (err) {
        console.error("❌ SignalR init error:", err);
      }
    };

    initSignalR();

    return () => {
      console.log("🛑 SignalR cleanup");

      // signalRService.off("ReceiveTeamResponse", handleTeamAccepted);
      // signalRService.off("MissionCompleted", handleMissionCompleted);
      // signalRService.off("IncidentReported", handleIncidentReported);
      // signalRService.off("NewRescueRequest", handleNewRescueRequest);
      signalRService.off(
        CLIENT_EVENTS.RECEIVE_TEAM_RESPONSE,
        handleTeamResponse,
      );
      signalRService.off(
        CLIENT_EVENTS.MISSION_COMPLETED,
        handleMissionCompleted,
      );
      signalRService.off(
        CLIENT_EVENTS.INCIDENT_REPORTED,
        handleIncidentReported,
      );
      signalRService.off(
        CLIENT_EVENTS.NEW_RESCUE_REQUEST,
        handleNewRescueRequest,
      );
    };
  }, []);

  useEffect(() => {
    if (!rejectedToast) return;

    const timer = setTimeout(() => {
      setRejectedToast(null);
    }, 5000);

    return () => clearTimeout(timer);
  }, [rejectedToast]);

  const loadPendingIncidents = async () => {
    try {
      setIncidentLoading(true);
      setIncidentError("");

      const res = await incidentReportService.getPendingReports();
      const data = extractApiData(res);
      console.log("Teams extracted:", data);

      setPendingIncidents(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setIncidentError("Failed to load pending incidents.");
    } finally {
      setIncidentLoading(false);
    }
  };

  const loadIncidentHistory = async () => {
    try {
      const res = await incidentReportService.getIncidentHistory();
      const data = extractApiData(res);
      console.log("Teams extracted:", data);

      setIncidentHistory(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
  };
  useEffect(() => {
    loadPendingIncidents();
    loadIncidentHistory();
  }, []);
  const handleResolveIncident = async (incidentReportID) => {
    if (!incidentReportID) return;

    if (!resolveNote.trim()) {
      alert("Vui lòng nhập ghi chú của điều phối viên.");
      return;
    }

    try {
      setResolvingIncident(true);
      setIncidentError("");

      const incident = pendingIncidents.find(
        (x) => String(x.incidentReportID) === String(incidentReportID),
      );

      const incidentMissionId =
        incident?.rescueMissionID ??
        incident?.RescueMissionID ??
        incident?.missionId ??
        incident?.MissionId;

      const incidentRequestId =
        incident?.rescueRequestID ??
        incident?.RescueRequestID ??
        incident?.requestId ??
        incident?.RequestId;

      const relatedRequestBeforeResolve = allRequests.find(
        (req) =>
          (incidentMissionId &&
            String(req.rescueMissionId) === String(incidentMissionId)) ||
          (incidentRequestId && String(req.id) === String(incidentRequestId)),
      );

      const res = await incidentReportService.resolveIncident({
        incidentReportID,
        coordinatorNote: resolveNote.trim(),
      });

      moveRequestBackToPending(incident);

      alert(res?.message || "Xử lý sự cố thành công.");

      setResolveNote("");
      setSelectedIncident(null);
      setRequestStatusTab("new");
      setSelectedTeamId("");
      setDispatchError("");
      setDispatchSuccess("");

      const relatedType =
        relatedRequestBeforeResolve?.requestType ??
        incident?.requestType ??
        incident?.RequestType ??
        "";

      setRequestBoxType(
        resolveRequestFlowCategory({
          requestType: relatedType,
          rescueType: relatedType,
        }) === "supply"
          ? "supply"
          : "rescue",
      );

      await loadPendingIncidents();
      await loadIncidentHistory();
      refreshRequestsInBackground();
    } catch (e) {
      console.error(e);
      setIncidentError("Không thể xử lý sự cố.");
    } finally {
      setResolvingIncident(false);
    }
  };

  // Thống kê theo chủ đề lũ lụt
  const stats = {
    totalActive: allRequests.filter((req) => req.status !== "completed").length,
    pending: allRequests.filter((req) => req.status === "pending").length,
    inProgress: allRequests.filter((req) => req.status === "in_progress")
      .length,
    completed: allRequests.filter((req) => req.status === "completed").length,
    critical: allRequests.filter((req) => req.priorityLevel === "Critical")
      .length,
    peopleAffected: allRequests.reduce((sum, req) => sum + req.peopleCount, 0),
    newRequests: allRequests.filter(
      (req) => req.isNew && req.status !== "completed",
    ).length,
    highWaterLevel: allRequests.filter(
      (req) => parseFloat(req.waterLevel) >= 1.5,
    ).length,
  };

  // Lọc requests
  const getDisplayedRequests = () => {
    if (requestBoxType === "rejected") {
      return teamRejectedRequests;
    }

    let source = [...allRequests];

    if (requestBoxType === "rescue") {
      source = source.filter(isRescueRequest);
    }

    if (requestBoxType === "supply") {
      source = source.filter(isSupplyRequest);
    }

    source = source.filter((request) =>
      matchRequestStatusTab(request, requestStatusTab),
    );

    source.sort((a, b) => {
      const priorityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 };
      const aPriority = priorityOrder[a.priorityLevel] ?? 99;
      const bPriority = priorityOrder[b.priorityLevel] ?? 99;

      if (a.hasIncident && !b.hasIncident) return -1;
      if (!a.hasIncident && b.hasIncident) return 1;

      if (aPriority !== bPriority) return aPriority - bPriority;
      if (a.isNew && !b.isNew) return -1;
      if (!a.isNew && b.isNew) return 1;

      return 0;
    });

    return source;
  };

  const displayedRequests = getDisplayedRequests();
  const totalPages = Math.ceil(displayedRequests.length / itemsPerPage);

  const paginatedRequests = displayedRequests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const availableTeams = teams;
  const trackedTeams = teams.filter((team) => hasValidTeamLocation(team));

  //load team
  useEffect(() => {
    const loadTeams = async () => {
      try {
        setTeamsLoading(true);
        setTeamsError("");

        const res = await getAllRescueTeams();
        console.log("teams API:", res);

        const data = extractApiData(res);
        console.log("Teams extracted:", data);

        if (Array.isArray(data)) {
          const hydratedTeams = await hydrateTeamsWithLocation(data);

          setTeams(hydratedTeams);
          setSelectedTeamId((prevSelectedTeamId) => {
            if (!prevSelectedTeamId) return "";

            const stillExists = hydratedTeams.some(
              (team) => String(readTeamId(team)) === String(prevSelectedTeamId),
            );

            return stillExists ? prevSelectedTeamId : "";
          });
          setDispatchError("");
          setDispatchSuccess("");
        } else {
          setTeams([]);
          setTeamsError(res?.message || "Không thể tải danh sách đội cứu hộ");
        }
      } catch (err) {
        console.error("Load teams error:", err);
        setTeams([]);
        setTeamsError("Không thể tải danh sách đội cứu hộ");
      } finally {
        setTeamsLoading(false);
      }
    };

    loadTeams();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(async () => {
      try {
        const res = await getAllRescueTeams({ noCache: true });
        const data = extractApiData(res);

        if (!Array.isArray(data)) return;

        const hydratedTeams = await hydrateTeamsWithLocation(data);

        setTeams(hydratedTeams);
        setSelectedTeamId((prevSelectedTeamId) => {
          if (!prevSelectedTeamId) return "";

          const stillExists = hydratedTeams.some(
            (team) => String(readTeamId(team)) === String(prevSelectedTeamId),
          );

          return stillExists ? prevSelectedTeamId : "";
        });
      } catch (error) {
        console.warn("Refresh rescue teams failed:", error);
      }
    }, TEAM_MARKER_REFRESH_MS);

    return () => window.clearInterval(intervalId);
  }, []);

  //F5 vẫn giữ số lượng chuông
  const loadRealRequests = async () => {
    try {
      const res = await getAllRescueRequests();
      console.log("GET /RescueRequests:", res);

      const data = extractApiData(res);

      if (!Array.isArray(data)) {
        setAllRequests([]);
        setSelectedRequest(null);
        return;
      }

      let latestMapped = [];

      setAllRequests((prev) => {
        latestMapped = data
          .map(mapRequestToUI)
          .map((item) => {
            const oldItem = prev.find(
              (req) => String(req.id) === String(item.id),
            );

            const keepPendingAfterIncident =
              oldItem?.incidentResolved === true &&
              oldItem?.hasIncident === true &&
              oldItem?.status === "pending";
            if (keepPendingAfterIncident) {
              return {
                ...item,
                status: "pending",
                rawStatus: "Pending",
                missionStatus: "",
                assignedTeamId: "",
                assignedTeamName: "",
                rescueMissionId: null,
                isNew: true,
                hasIncident: true,
                incidentResolved: true,
                incidentReportID:
                  item.incidentReportID || oldItem?.incidentReportID || null,
                rejectedTeamIds:
                  item.rejectedTeamIds?.length > 0
                    ? item.rejectedTeamIds
                    : oldItem?.rejectedTeamIds || [],
                rejectedTeamNames:
                  item.rejectedTeamNames?.length > 0
                    ? item.rejectedTeamNames
                    : oldItem?.rejectedTeamNames || [],
              };
            }

            return {
              ...item,
              wasRejected: item.wasRejected || oldItem?.wasRejected || false,
              hasIncident: item.hasIncident || oldItem?.hasIncident || false,
              incidentResolved:
                item.incidentResolved || oldItem?.incidentResolved || false,
              incidentReportID:
                item.incidentReportID || oldItem?.incidentReportID || null,
              rejectedTeamIds:
                item.rejectedTeamIds?.length > 0
                  ? item.rejectedTeamIds
                  : oldItem?.rejectedTeamIds || [],
              rejectedTeamNames:
                item.rejectedTeamNames?.length > 0
                  ? item.rejectedTeamNames
                  : oldItem?.rejectedTeamNames || [],
            };
          })
          .filter(
            (item) =>
              item?.id &&
              Number.isFinite(item?.location?.lat) &&
              Number.isFinite(item?.location?.lng),
          );

        return latestMapped;
      });

      console.log("Requests mapped:", latestMapped);

      setSelectedRequest((prev) => {
        if (!prev) return prev;

        const fresh = latestMapped.find(
          (item) => String(item.id) === String(prev.id),
        );

        if (!fresh) return null;

        const keepPendingAfterIncident =
          prev?.incidentResolved === true &&
          prev?.hasIncident === true &&
          prev?.status === "pending";

        if (keepPendingAfterIncident) {
          return {
            ...fresh,
            status: "pending",
            rawStatus: "Pending",
            missionStatus: "",
            assignedTeamId: "",
            assignedTeamName: "",
            rescueMissionId: null,
            isNew: true,
            hasIncident: true,
            incidentResolved: true,
            incidentReportID:
              fresh.incidentReportID || prev?.incidentReportID || null,
            rejectedTeamIds:
              fresh.rejectedTeamIds?.length > 0
                ? fresh.rejectedTeamIds
                : prev?.rejectedTeamIds || [],
            rejectedTeamNames:
              fresh.rejectedTeamNames?.length > 0
                ? fresh.rejectedTeamNames
                : prev?.rejectedTeamNames || [],
          };
        }

        return {
          ...fresh,
          wasRejected: fresh.wasRejected || prev?.wasRejected || false,
          hasIncident: fresh.hasIncident || prev?.hasIncident || false,
          incidentResolved:
            fresh.incidentResolved || prev?.incidentResolved || false,
          incidentReportID:
            fresh.incidentReportID || prev?.incidentReportID || null,
          rejectedTeamIds:
            fresh.rejectedTeamIds?.length > 0
              ? fresh.rejectedTeamIds
              : prev?.rejectedTeamIds || [],
          rejectedTeamNames:
            fresh.rejectedTeamNames?.length > 0
              ? fresh.rejectedTeamNames
              : prev?.rejectedTeamNames || [],
        };
      });

      const unresolvedNotifications = latestMapped
        .filter((item) => isUnprocessedStatus(item.status))
        .map((item) => ({
          id: `req-${item.id}`,
          type: item.emergencyCategory === "supply" ? "supply" : "critical",
          title:
            item.emergencyCategory === "supply"
              ? "Yêu cầu cung ứng mới"
              : "Yêu cầu cứu hộ mới",
          message:
            item.emergencyCategory === "supply"
              ? `Có yêu cầu cung ứng #${item.requestId}`
              : `Có yêu cầu cứu hộ #${item.requestId}`,
          requestId: String(item.requestId),
          rawRequestId: String(item.id),
          timestamp: item.timestamp || new Date().toLocaleString("vi-VN"),
          createdAt: item.createdAtRaw
            ? new Date(item.createdAtRaw).toISOString()
            : new Date().toISOString(),
          read: false,
          status: item.status,
        }));

      setNotifications((prev) => {
        const merged = mergeNotifications(prev, unresolvedNotifications);

        return merged.filter((noti) => {
          const matched = latestMapped.find(
            (req) =>
              String(req.requestId) === String(noti.requestId) ||
              String(req.id) === String(noti.rawRequestId),
          );

          if (!matched) return true;

          return isUnprocessedStatus(matched.status);
        });
      });
    } catch (error) {
      console.warn("Load rescue requests failed:", error);
      setAllRequests([]);
      setSelectedRequest(null);
    }
  };

  useEffect(() => {
    loadRealRequests();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      loadRealRequests();
    }, 2000);

    return () => window.clearInterval(intervalId);
  }, []);
  // Các hàm xử lý
  const handleRequestClick = (request) => {
    const latestRequest = allRequests.find(
      (req) => String(req.id) === String(request.id),
    );

    const mergedRequest = latestRequest
      ? {
          ...latestRequest,
          rejectedTeamIds:
            latestRequest.rejectedTeamIds?.length > 0
              ? latestRequest.rejectedTeamIds
              : request.rejectedTeamIds || [],
          rejectedTeamNames:
            latestRequest.rejectedTeamNames?.length > 0
              ? latestRequest.rejectedTeamNames
              : request.rejectedTeamNames || [],
        }
      : request;

    setSelectedRequest(mergedRequest);
    setMapCenter([mergedRequest.location.lat, mergedRequest.location.lng]);
    setMapZoom(16);
    setDispatchError("");
    setDispatchSuccess("");

    if (mergedRequest?.assignedTeamId)
      setSelectedTeamId(String(mergedRequest.assignedTeamId));
    else setSelectedTeamId("");

    if (mergedRequest.isNew) {
      setAllRequests((prev) =>
        prev.map((req) =>
          req.id === mergedRequest.id ? { ...req, isNew: false } : req,
        ),
      );
    }
  };

  // Cho ô “Nhiệm vụ bị từ chối” mở lại request gốc
  const handleRejectedRequestClick = (item) => {
    const originalRequest = allRequests.find(
      (req) =>
        String(req.requestId) === String(item.shortCode) ||
        String(req.id) === String(item.originalRequestId),
    );

    if (!originalRequest) return;

    const mergedRequest = {
      ...originalRequest,
      rejectedTeamIds:
        item.rejectedTeamIds || originalRequest.rejectedTeamIds || [],
      rejectedTeamNames:
        item.rejectedTeamNames || originalRequest.rejectedTeamNames || [],
    };

    setSelectedRequest(mergedRequest);
    setSelectedTeamId("");
    setDispatchError("");
    setDispatchSuccess("");
    setMapCenter([mergedRequest.location.lat, mergedRequest.location.lng]);
    setMapZoom(16);
  };

  const handleDispatchMission = async () => {
    setDispatchError("");
    setDispatchSuccess("");

    if (!selectedRequest?.id) {
      setDispatchError("Vui lòng chọn yêu cầu cứu hộ trước.");
      return;
    }

    if (selectedRequest.status !== "pending") {
      setDispatchError(
        "Chỉ các yêu cầu đang chờ xử lý mới có thể được phân công.",
      );
      return;
    }

    if (!selectedTeamId) {
      setDispatchError("Vui lòng chọn đội cứu hộ.");
      return;
    }

    const rejectedTeamIds = selectedRequest?.rejectedTeamIds || [];

    if (rejectedTeamIds.some((id) => String(id) === String(selectedTeamId))) {
      setDispatchError("Đội này vừa từ chối nhiệm vụ, vui lòng chọn đội khác.");
      return;
    }

    try {
      setDispatching(true);

      const isSupplyOrder = isSupplyRequest(selectedRequest);
      const assignedTeamName = findTeamLabelById(selectedTeamId);

      if (isSupplyOrder) {
        const createdOrder = await reliefOrdersService.createReliefOrder({
          rescueRequestID: selectedRequest.id,
          rescueTeamID: selectedTeamId,
          description: selectedRequest.description?.trim() || "",
        });

        console.log("Create supply ReliefOrder response:", createdOrder);

        const createdOrderData = Array.isArray(createdOrder)
          ? createdOrder[0]
          : createdOrder;

        const createdReliefOrderId = pickFirstValue(
          createdOrderData?.reliefOrderID,
          createdOrderData?.ReliefOrderID,
          createdOrderData?.reliefOrderId,
          createdOrderData?.ReliefOrderId,
          createdOrderData?.id,
          createdOrderData?.ID,
          null,
        );
        const createdRescueMissionId = pickFirstValue(
          createdOrderData?.rescueMissionID,
          createdOrderData?.RescueMissionID,
          createdOrderData?.rescueMissionId,
          createdOrderData?.RescueMissionId,
          createdOrderData?.missionID,
          createdOrderData?.MissionID,
          createdOrderData?.missionId,
          createdOrderData?.MissionId,
          null,
        );
        const createdMissionStatus = pickFirstValue(
          createdOrderData?.missionStatus,
          createdOrderData?.MissionStatus,
          createdOrderData?.newMissionStatus,
          createdOrderData?.NewMissionStatus,
          createdOrderData?.status,
          createdOrderData?.Status,
          "Pending",
        );

        if (!createdReliefOrderId) {
          throw new Error(
            "Tạo đơn supply thành công nhưng không nhận được ReliefOrderID.",
          );
        }

        updateRequestAfterDispatch(selectedRequest.id, {
          assignedTeamId: selectedTeamId,
          assignedTeamName,
          rescueMissionId: createdRescueMissionId,
          reliefOrderId: createdReliefOrderId,
          missionStatus: createdMissionStatus,
        });

        setTeamRejectedRequests((prev) =>
          prev.filter(
            (item) =>
              String(item.shortCode) !== String(selectedRequest.requestId),
          ),
        );

        setDispatchSuccess(
          `Đã tạo đơn supply #${createdReliefOrderId} cho yêu cầu #${selectedRequest.requestId} và gán cho ${assignedTeamName}.`,
        );
        return;
      }

      const res = await rescueMissionService.dispatch({
        rescueRequestID: selectedRequest.id,
        rescueTeamID: selectedTeamId,
      });

      console.log("Dispatch API response:", res);

      if (res?.success === false) {
        setDispatchError(res?.message || "Không thể phân công nhiệm vụ.");
        return;
      }

      const data = res?.content || res?.data || res || {};

      const missionId = pickFirstValue(
        data?.rescueMissionID,
        data?.RescueMissionID,
        data?.id,
        data?.ID,
        res?.rescueMissionID,
        res?.RescueMissionID,
        res?.id,
        res?.ID,
        null,
      );

      let createdReliefOrderId = pickFirstValue(
        data?.reliefOrderID,
        data?.ReliefOrderID,
        data?.reliefOrderId,
        data?.ReliefOrderId,
        res?.reliefOrderID,
        res?.ReliefOrderID,
        res?.reliefOrderId,
        res?.ReliefOrderId,
        null,
      );

      updateRequestAfterDispatch(selectedRequest.id, {
        assignedTeamId: selectedTeamId,
        assignedTeamName,
        rescueMissionId: missionId,
        reliefOrderId: createdReliefOrderId,
      });

      setTeamRejectedRequests((prev) =>
        prev.filter(
          (item) =>
            String(item.shortCode) !== String(selectedRequest.requestId),
        ),
      );

      if (createdReliefOrderId) {
        setDispatchSuccess(
          `Đã điều phối ${assignedTeamName} cho yêu cầu cứu hộ #${selectedRequest.requestId} và tạo đơn #${createdReliefOrderId}.`,
        );
      } else {
        setDispatchSuccess(
          `Đã điều phối ${assignedTeamName} cho yêu cầu cứu hộ #${selectedRequest.requestId}`,
        );
      }

      refreshRequestsInBackground();
    } catch (e) {
      const isSupplyOrder = isSupplyRequest(selectedRequest);

      if (isSupplyOrder) {
        console.error("[Coordinator] Tạo Relief Order thất bại.", {
          endpoint: e?.endpoint || "/api/ReliefOrders",
          payload: e?.requestPayload || {
            rescueRequestID: selectedRequest?.id || null,
            rescueTeamID: selectedTeamId || null,
            description: selectedRequest?.description?.trim() || "",
          },
          status: e?.status || null,
          message: e?.message || "Unknown error",
          response: e?.payload || e?.rawText || null,
        });
      } else {
        console.error("[Coordinator] Điều phối nhiệm vụ thất bại.", {
          rescueRequestID: selectedRequest?.id || null,
          rescueTeamID: selectedTeamId || null,
          message: e?.message || "Unknown error",
          response: e?.payload || e?.rawText || null,
        });
      }

      setDispatchError(
        isSupplyOrder
          ? `Tạo Relief Order thất bại: ${e?.message || "Không rõ lỗi."}`
          : e?.message || "Dispatch mission failed.",
      );
    } finally {
      setDispatching(false);
    }
  };

  const updateRequestAfterDispatch = (requestId, payload) => {
    setAllRequests((prev) =>
      prev.map((req) => {
        if (req.id !== requestId) return req;

        return {
          ...req,
          status: payload.status || "in_progress",
          rawStatus: payload.rawStatus || "Processing",
          missionStatus:
            payload.missionStatus ||
            (isSupplyRequest(req) ? "Processing" : "InProgress"),
          assignedTeamId: payload.assignedTeamId,
          assignedTeamName: payload.assignedTeamName,
          rescueMissionId: payload.rescueMissionId,
          reliefOrderId: payload.reliefOrderId,
          wasRejected: false,
        };
      }),
    );

    if (selectedRequest?.id === requestId) {
      setSelectedRequest((prev) => ({
        ...prev,
        status: payload.status || "in_progress",
        rawStatus: payload.rawStatus || prev?.rawStatus || "Processing",
        missionStatus:
          payload.missionStatus ||
          (prev && isSupplyRequest(prev) ? "Processing" : "InProgress"),
        assignedTeamId: payload.assignedTeamId,
        assignedTeamName: payload.assignedTeamName,
        rescueMissionId: payload.rescueMissionId,
        reliefOrderId: payload.reliefOrderId,
        wasRejected: false,
      }));
    }
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((noti) => ({ ...noti, read: true })));
  };

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((noti) => noti.id !== id));
  };

  const goToRequestFromNotification = (requestId, rawRequestId = null) => {
    const request = allRequests.find(
      (req) =>
        String(req.requestId) === String(requestId) ||
        (rawRequestId && String(req.id) === String(rawRequestId)),
    );

    if (request) {
      handleRequestClick(request);
      setShowNotifications(false);
    }
  };

  // Màu sắc cho thông báo
  const getNotificationColor = (type) => {
    switch (type) {
      case "critical":
        return { bg: "#fee2e2", border: "#dc2626", icon: "🚨" };
      case "medical":
        return { bg: "#dbeafe", border: "#3b82f6", icon: "💊" };
      case "supply":
        return { bg: "#fef3c7", border: "#f59e0b", icon: "📦" };
      case "evacuation":
        return { bg: "#ede9fe", border: "#8b5cf6", icon: "🚨" };
      case "equipment":
        return { bg: "#dcfce7", border: "#10b981", icon: "🛟" };
      default:
        return { bg: "#f3f4f6", border: "#6b7280", icon: "🌧️" };
    }
  };

  // Lấy danh sách loại emergency unique
  const emergencyTypes = [
    "all",
    ...new Set(allRequests.map((req) => req.emergencyType)),
  ];
  //team Id
  const getTeamId = (t) => t?.rescueTeamID ?? t?.RescueTeamID ?? t?.id ?? t?.Id;
  //teamLabel
  const getTeamLabel = (t) =>
    t?.teamName ??
    t?.name ??
    t?.rescueTeamName ??
    t?.RescueTeamName ??
    `Team #${getTeamId(t)}`;

  const findTeamLabelById = (id) => {
    if (!id) return "";
    const team = teams.find((t) => String(getTeamId(t)) === String(id));
    return team ? getTeamLabel(team) : `Team #${id}`;
  };

  const bellCount = notifications.length;

  //Loại team vừa reject khỏi dropdown điều phối
  const dispatchableTeams = teams.filter((team) => {
    const teamId = String(getTeamId(team));

    const rejectedTeamIds = selectedRequest?.rejectedTeamIds || [];

    const isRejectedBefore = rejectedTeamIds.some(
      (id) => String(id) === teamId,
    );

    return !isRejectedBefore;
  });

  const getCardStatus = (request) => {
    const status = String(request?.status || "")
      .trim()
      .toLowerCase();
    const missionStatus = String(request?.missionStatus || "")
      .trim()
      .toLowerCase();
    const rawStatus = String(request?.rawStatus || "")
      .trim()
      .toLowerCase();

    if (status === "pending") return "pending";
    if (status === "completed") return "completed";
    if (status === "in_progress") return "in_progress";

    if (
      missionStatus === "completed" ||
      missionStatus === "delivered" ||
      rawStatus === "completed" ||
      rawStatus === "delivered" ||
      rawStatus === "done"
    ) {
      return "completed";
    }

    if (
      missionStatus === "inprogress" ||
      missionStatus === "in_progress" ||
      missionStatus === "processing" ||
      missionStatus === "accepted" ||
      rawStatus === "in_progress" ||
      rawStatus === "inprogress" ||
      rawStatus === "processing" ||
      rawStatus === "accepted"
    ) {
      return "in_progress";
    }

    return "pending";
  };

  const getCardStatusLabel = (request) => {
    if (request?.hasIncident && request?.status === "pending") {
      return "⚠️ Có sự cố - chờ điều phối lại";
    }

    const status = getCardStatus(request);
    const supply = isSupplyRequest(request);

    if (status === "completed") {
      return supply ? "📦 Đã giao hàng cứu trợ" : "✅ Hoàn thành";
    }

    if (status === "in_progress") {
      return supply ? "📦 Đang cung ứng cứu hộ" : "🚤 Đang thực hiện cứu hộ";
    }

    return "⏳ Chờ xử lý";
  };

  return (
    <div className="dashboard-container">
      <Header />

      <div className="top-user-actions">
        <div className="user-chip">
          <div className="user-info">
            <span className="user-greeting">
              Xin chào,{" "}
              <span className="user-name">{userFullName || "Người dùng"}</span>
            </span>
          </div>
        </div>
        <button className="logout-btn3" onClick={handleLogout}>
          <span>🚪 Đăng xuất</span>
        </button>
      </div>

      <div className="dashboard-content">
        {/* Dashboard Header */}
        <div className="dashboard-header">
          <div className="noti">
            <h1>🌊 Bảng điều phối cứu trợ lũ lụt</h1>

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
          </div>

          {/* Notification Bell */}
          <div className="notification-container">
            {/* Notification Panel */}
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
                                  goToRequestFromNotification(
                                    notification.requestId,
                                    notification.rawRequestId,
                                  )
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

          {rejectedToast && (
            <div className="rejected-toast">
              <div className="rejected-toast-icon">🚨</div>
              <div className="rejected-toast-content">
                <h4>Đội cứu hộ từ chối nhiệm vụ</h4>
                <p>{rejectedToast.message}</p>
              </div>
            </div>
          )}
        </div>

        {/* Stats Cards cho lũ lụt */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon total">🌊</div>
            <div className="stat-info">
              <h3>Yêu cầu đang hoạt động</h3>
              <div className="stat-number">{stats.totalActive}</div>
              <div className="stat-sub">({stats.newRequests} MỚI)</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon people">👥</div>
            <div className="stat-info">
              <h3>Số người cần được cứu hộ</h3>
              <div className="stat-number">{stats.peopleAffected}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon critical">🚨</div>
            <div className="stat-info">
              <h3>Tình huống khẩn cấp</h3>
              <div className="stat-number">{stats.critical}</div>
            </div>
          </div>
        </div>

        {/* Alert Banner cho tình huống nguy cấp */}
        {allRequests.some(
          (req) =>
            req.isNew &&
            req.priorityLevel === "Critical" &&
            req.status !== "completed",
        ) && <div className="critical-alert-banner"></div>}

        {/* Main Content */}
        <div className="main-content">
          {/* Left: Requests List */}
          <div className="requests-panel">
            <div className="panel-header request-mode-header">
              <h4
                style={{ fontSize: "26px", color: "brown", fontWeight: "700" }}
              >
                Danh sách yêu cầu
              </h4>
              <div className="request-mode-grid1">
                <button
                  className={`request-mode-card ${requestBoxType === "rescue" ? "active" : ""} `}
                  onClick={() => {
                    setRequestBoxType("rescue");
                    setRequestStatusTab("new");
                    setCurrentPage(1);
                    setSelectedRequest(null);
                  }}
                >
                  <div className="request-mode-icon">🚨</div>
                  <div className="request-mode-content">
                    <h3>Yêu cầu cứu hộ</h3>
                    <strong>
                      {allRequests.filter(isRescueRequest).length}
                    </strong>
                  </div>
                </button>

                <button
                  className={`request-mode-card ${requestBoxType === "supply" ? "active" : ""}`}
                  onClick={() => {
                    setRequestBoxType("supply");
                    setRequestStatusTab("new");
                    setCurrentPage(1);
                    setSelectedRequest(null);
                  }}
                >
                  <div className="request-mode-icon">📦</div>
                  <div className="request-mode-content">
                    <h3>Cung ứng cứu hộ</h3>

                    <strong>
                      {allRequests.filter(isSupplyRequest).length}
                    </strong>
                  </div>
                </button>

                <button
                  className={`request-mode-card rejected ${requestBoxType === "rejected" ? "active" : ""} ${teamRejectedRequests.length > 0 ? "has-alert" : ""}`}
                  onClick={() => {
                    setRequestBoxType("rejected");
                    setCurrentPage(1);
                    setSelectedRequest(null);
                  }}
                >
                  <div className="request-mode-icon">⚠️</div>
                  <div className="request-mode-content">
                    <h3> Nhiệm vụ bị từ chối</h3>

                    <strong>{teamRejectedRequests.length}</strong>
                  </div>
                  {teamRejectedRequests.length > 0 && (
                    <span className="pulse-dot"></span>
                  )}
                </button>
              </div>

              {requestBoxType !== "rejected" && (
                <div className="request-status-filter">
                  <button
                    className={requestStatusTab === "new" ? "active" : ""}
                    onClick={() => {
                      setRequestStatusTab("new");
                      setCurrentPage(1);
                      setSelectedRequest(null);
                    }}
                  >
                    Mới nhận
                  </button>

                  <button
                    className={
                      requestStatusTab === "processing" ? "active" : ""
                    }
                    onClick={() => {
                      setRequestStatusTab("processing");
                      setCurrentPage(1);
                      setSelectedRequest(null);
                    }}
                  >
                    Đang xử lý
                  </button>

                  <button
                    className={requestStatusTab === "completed" ? "active" : ""}
                    onClick={() => {
                      setRequestStatusTab("completed");
                      setCurrentPage(1);
                      setSelectedRequest(null);
                    }}
                  >
                    Hoàn thành
                  </button>
                </div>
              )}
            </div>

            <div className="requests-list">
              {displayedRequests.length === 0 ? (
                <div className="no-requests">
                  <p>
                    {requestBoxType === "rejected"
                      ? "Chưa có yêu cầu nào bị từ chối trả về"
                      : requestStatusTab === "new"
                        ? "Không có yêu cầu mới nhận"
                        : requestStatusTab === "processing"
                          ? "Không có yêu cầu đang xử lý"
                          : "Không có yêu cầu đã hoàn thành"}
                  </p>
                </div>
              ) : requestBoxType === "rejected" ? (
                paginatedRequests.map((item) => (
                  <div
                    key={item.id}
                    className="request-card rejected-card"
                    onClick={() => handleRejectedRequestClick(item)}
                  >
                    <div className="request-card-header">
                      <div className="request-id">#{item.shortCode}</div>
                      <div className="status-badge pending">↩️ Bị từ chối</div>
                    </div>

                    <div className="request-card-body">
                      <h4 className="request-title">⚠️ Nhiệm vụ bị trả về</h4>

                      <div className="request-details">
                        <div className="detail-row">
                          <span className="detail-label">🚑 Đội cứu hộ:</span>
                          <span className="detail-value">
                            {item.rejectedByTeamName ||
                              item.teamName ||
                              "Đội cứu hộ"}
                          </span>
                        </div>

                        <div className="detail-row">
                          <span className="detail-label">📝 Thông báo:</span>
                          <span className="detail-value">{item.message}</span>
                        </div>
                      </div>
                    </div>

                    <div className="request-card-footer">
                      <div
                        className="priority-tag"
                        style={{ backgroundColor: "#fee2e2", color: "#dc2626" }}
                      >
                        CẦN ĐIỀU PHỐI LẠI
                      </div>
                      <div className="request-time">
                        {new Date(item.createdAt).toLocaleString("vi-VN")}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                paginatedRequests.map((request) => (
                  <div
                    key={request.id}
                    className={`request-card ${selectedRequest?.id === request.id ? "selected" : ""} ${request.isNew ? "new" : ""}`}
                    onClick={() => handleRequestClick(request)}
                  >
                    <div className="request-card-header">
                      <div className="request-id">#{request.requestId}</div>

                      <div className={`status-badge ${getCardStatus(request)}`}>
                        {getCardStatusLabel(request)}
                      </div>
                    </div>

                    <div className="request-card-body">
                      <h4 className="request-title">
                        {isSupplyRequest(request)
                          ? "📦 Yêu cầu cung ứng cứu hộ"
                          : "🚨 Yêu cầu cứu hộ"}

                        {request.emergencyCategory === "life_threatening" && (
                          <span className="category-tag critical">
                            KHẨN CẤP
                          </span>
                        )}

                        {request.emergencyCategory === "supply" && (
                          <span className="category-tag supply">
                            NHU YẾU PHẨM
                          </span>
                        )}
                      </h4>

                      <div className="request-details">
                        <div className="detail-row">
                          <span className="detail-label">
                            👤 Người yêu cầu:
                          </span>
                          <span className="detail-value">
                            {request.fullName}
                          </span>
                        </div>

                        <div className="detail-row">
                          <span className="detail-label">📍 Địa chỉ:</span>
                          <span className="detail-value">
                            {selectedRequest?.id === request.id
                              ? addressMap[request.id] || request.address
                              : request.address}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="request-card-footer">
                      <div
                        className="priority-tag"
                        style={{
                          backgroundColor:
                            request.priorityLevel === "Critical"
                              ? "#fee2e2"
                              : request.priorityLevel === "High"
                                ? "#ffedd5"
                                : request.priorityLevel === "Medium"
                                  ? "#fef3c7"
                                  : "#dcfce7",
                          color:
                            request.priorityLevel === "Critical"
                              ? "#dc2626"
                              : request.priorityLevel === "High"
                                ? "#ea580c"
                                : request.priorityLevel === "Medium"
                                  ? "#ca8a04"
                                  : "#16a34a",
                        }}
                      >
                        {request.priorityLevel === "Critical"
                          ? "🚨 NGHIÊM TRỌNG"
                          : request.priorityLevel === "High"
                            ? "⚠️ CAO"
                            : request.priorityLevel === "Medium"
                              ? "📋 TRUNG BÌNH"
                              : "📄 THẤP"}
                      </div>

                      <div className="request-time">{request.timestamp}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {displayedRequests.length > 0 && (
              <div className="pagination">
                <button
                  className="pagination-btn"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                >
                  ← Trước
                </button>

                <div className="pagination-pages">
                  {Array.from({ length: totalPages }, (_, index) => {
                    const page = index + 1;
                    return (
                      <button
                        key={page}
                        className={`pagination-page ${currentPage === page ? "active" : ""}`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>

                <button
                  className="pagination-btn"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                >
                  Tiếp theo →
                </button>
              </div>
            )}
          </div>

          {/* Right: Map and Details */}

          <div className="map-details-panel">
            <div className="map-section">
              <div className="map-wrapper">
                <div className="panel-header">
                  <h2>🗺️ Bản đồ lũ</h2>

                  <div className="map-legend">
                    <div className="legend-item">
                      <span className="legend-dot critical"></span>
                      <span>Khẩn cấp</span>
                    </div>

                    <div className="legend-item">
                      <span className="legend-dot supply"></span>
                      <span>Cứu trợ</span>
                    </div>

                    <div className="legend-item">
                      <span className="legend-dot team"></span>
                      <span>Rescue team</span>
                    </div>
                  </div>
                </div>

                <div className="map-container">
                  <MapContainer
                    center={mapCenter}
                    zoom={mapZoom}
                    style={{
                      height: "100%",
                      width: "100%",
                      borderRadius: "18px",
                    }}
                  >
                    <ChangeView center={mapCenter} zoom={mapZoom} />

                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution="&copy; OpenStreetMap contributors"
                    />

                    {allRequests
                      .filter((req) =>
                        !showCompleted ? req.status !== "completed" : true,
                      )
                      .filter(
                        (req) =>
                          req.location &&
                          Number.isFinite(req.location.lat) &&
                          Number.isFinite(req.location.lng),
                      )
                      .map((request) => (
                        <Marker
                          key={request.id}
                          position={[
                            request.location.lat,
                            request.location.lng,
                          ]}
                          icon={
                            request.emergencyCategory === "life_threatening"
                              ? dotIcon("red")
                              : request.emergencyCategory === "supply"
                                ? dotIcon("gold")
                                : dotIcon("gray")
                          }
                          eventHandlers={{
                            click: () => handleRequestClick(request),
                          }}
                        >
                          <Popup>
                            <div className="map-popup">
                              <strong>
                                {isSupplyRequest(request)
                                  ? "📦 Yêu cầu cung ứng cứu hộ"
                                  : "🚨 Yêu cầu cứu hộ"}
                              </strong>
                              <br />
                              <small>Mã: {request.requestId}</small>
                              <br />
                              <small>Loại: {request.emergencyType}</small>
                              <br />
                              <small>Số người: {request.peopleCount}</small>
                              <br />
                              {request.isNew && <small>🆕 MỚI</small>}
                            </div>
                          </Popup>
                        </Marker>
                      ))}

                    {trackedTeams.map((team) => {
                      const teamLat = getTeamLatitudeValue(team);
                      const teamLng = getTeamLongitudeValue(team);
                      const teamStatus = getTeamStatusMeta(team?.currentStatus);

                      return (
                        <Marker
                          key={`team-${getTeamId(team)}`}
                          position={[teamLat, teamLng]}
                          icon={buildTeamMarkerIcon(team?.currentStatus)}
                          zIndexOffset={700}
                          eventHandlers={{
                            click: () => {
                              setMapCenter([teamLat, teamLng]);
                              setMapZoom((prevZoom) => Math.max(prevZoom, 15));
                            },
                          }}
                        >
                          <Popup>
                            <div className="team-popup">
                              <div className="team-popup__title">
                                {getTeamLabel(team)}
                              </div>

                              <div
                                className={`team-popup__status team-popup__status--${teamStatus.badgeClass}`}
                              >
                                {teamStatus.label}
                              </div>

                              <div className="team-popup__meta">
                                <strong>Thành phố:</strong>{" "}
                                {team?.city || team?.City || "Chưa cập nhật"}
                              </div>
                              <div className="team-popup__meta">
                                <strong>Tọa độ:</strong> {teamLat.toFixed(5)},{" "}
                                {teamLng.toFixed(5)}
                              </div>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}
                  </MapContainer>
                </div>

                {/* PANEL NỔI */}
                <div
                  className={`details-overlay ${selectedRequest ? "open" : ""}`}
                >
                  {selectedRequest && requestBoxType !== "rejected" && (
                    <div className="details-section floating">
                      <div className="request-details-card1">
                        <div className="details-header1">
                          <h3>
                            📋 Chi tiết yêu cầu #{selectedRequest.requestId}
                          </h3>

                          <div style={{ display: "flex", gap: "10px" }}>
                            {selectedRequest.isNew && (
                              <span className="new-tag">🆕 MỚI</span>
                            )}

                            <button
                              className="details-close-btn"
                              onClick={() => setSelectedRequest(null)}
                            >
                              ×
                            </button>
                          </div>
                        </div>

                        <div className="details-grid1">
                          <div className="detail-group1">
                            <h4>👤 Thông tin người gửi</h4>

                            <div className="detail-item1">
                              <span className="detail-label1">
                                Họ tên:
                                <span className="detail-value1">
                                  {selectedRequest.fullName}
                                </span>
                              </span>
                            </div>

                            <div className="detail-item1">
                              <span className="detail-label1">
                                Số điện thoại:
                                {selectedRequest.phoneNumber ? (
                                  <a
                                    href={`tel:${selectedRequest.phoneNumber}`}
                                    className="detail-value link"
                                  >
                                    {selectedRequest.phoneNumber}
                                  </a>
                                ) : (
                                  <span className="detail-value">Không có</span>
                                )}
                              </span>
                            </div>
                          </div>

                          <div className="detail-group1">
                            <h4>🌊 Tình trạng lũ</h4>

                            <div className="detail-item1">
                              <span className="detail-label1">
                                Loại yêu cầu:
                                <span className="detail-value badge">
                                  {isSupplyRequest(selectedRequest)
                                    ? "Cung ứng cứu hộ"
                                    : "Cứu hộ khẩn cấp"}
                                </span>
                              </span>
                            </div>

                            <div className="detail-item1">
                              <span className="detail-label1">
                                Phân loại từ hệ thống:
                                <span className="detail-value1">
                                  {selectedRequest.emergencyType || "Không có"}
                                </span>
                              </span>
                            </div>
                          </div>

                          {isSupplyRequest(selectedRequest) && (
                            <div className="detail-group1 full-width1">
                              <h4>📦 Nội dung cung ứng</h4>

                              <div className="detail-item1">
                                <span className="detail-label1">
                                  Mô tả chi tiết:
                                  <span className="detail-value">
                                    {selectedRequest.description ||
                                      "Không có mô tả"}
                                  </span>
                                </span>
                              </div>
                            </div>
                          )}

                          <div className="detail-group1 full-width1">
                            <h4>📍 Vị trí</h4>

                            <div className="detail-item1">
                              <span className="detail-label1">
                                Địa chỉ:
                                <span className="detail-value">
                                  {addressMap[selectedRequest.id] ||
                                    selectedRequest.address}
                                </span>
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="action-buttons1">
                          <div className="dispatch-box">
                            <div className="dispatch-header">
                              <h4>
                                {isSupplyRequest(selectedRequest)
                                  ? "📦 Điều phối cung ứng cứu hộ"
                                  : "🚑 Điều phối đội cứu hộ"}
                              </h4>
                            </div>

                            <div className="dispatch-form">
                              <select
                                className="team-select"
                                value={selectedTeamId}
                                onChange={(e) =>
                                  setSelectedTeamId(e.target.value)
                                }
                                disabled={
                                  dispatching ||
                                  selectedRequest.status !== "pending" ||
                                  teamsLoading
                                }
                              >
                                <option value="">
                                  {teamsLoading
                                    ? "Đang tải đội..."
                                    : dispatchableTeams.length === 0
                                      ? "Không còn đội phù hợp"
                                      : isSupplyRequest(selectedRequest)
                                        ? "Chọn đội để cung ứng vật tư"
                                        : "Chọn đội cứu hộ"}
                                </option>

                                {dispatchableTeams.map((team) => (
                                  <option
                                    key={getTeamId(team)}
                                    value={getTeamId(team)}
                                    disabled={
                                      String(
                                        team.currentStatus,
                                      ).toLowerCase() !== "available"
                                    }
                                  >
                                    {getTeamLabel(team)} ({team.currentStatus})
                                  </option>
                                ))}
                              </select>
                              <button
                                className="btn btn-primary"
                                onClick={handleDispatchMission}
                                disabled={
                                  dispatching ||
                                  !selectedTeamId ||
                                  selectedRequest.status !== "pending"
                                }
                              >
                                {dispatching
                                  ? "Đang điều phối..."
                                  : "🚀 Điều phối nhiệm vụ"}
                              </button>
                            </div>

                            {selectedRequest.assignedTeamName && (
                              <div className="dispatch-info">
                                <strong>Đội đã phân công:</strong>{" "}
                                {selectedRequest.assignedTeamName}
                                {selectedRequest.rescueMissionId && (
                                  <span>
                                    {" "}
                                    | Mã nhiệm vụ: #
                                    {selectedRequest.rescueMissionId}
                                  </span>
                                )}
                              </div>
                            )}

                            {dispatchError && (
                              <p className="dispatch-error">{dispatchError}</p>
                            )}
                            {dispatchSuccess && (
                              <p className="dispatch-success">
                                {dispatchSuccess}
                              </p>
                            )}
                            {teamsError && (
                              <p className="dispatch-error">{teamsError}</p>
                            )}
                          </div>

                          <div className="status-info1">
                            <span className="status-label1">
                              Trạng thái hiện tại:
                            </span>

                            <span
                              className={`status-badge ${getCardStatus(selectedRequest)}`}
                            >
                              {getCardStatusLabel(selectedRequest)}
                            </span>
                          </div>

                          <div className="button-row1">
                            <button
                              className="btn btn-secondary"
                              onClick={() =>
                                window.open(
                                  `https://maps.google.com/?q=${selectedRequest.location.lat},${selectedRequest.location.lng}`,
                                  "_blank",
                                )
                              }
                            >
                              🗺️ Xem bản đồ
                            </button>

                            <button
                              className="btn btn-emergency"
                              onClick={() => {
                                if (!selectedRequest.phoneNumber) return;
                                window.open(
                                  `tel:${selectedRequest.phoneNumber}`,
                                );
                              }}
                              disabled={!selectedRequest.phoneNumber}
                            >
                              📞 Gọi
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="incident-section">
          <div className="panel-header">
            <h2>⚠️ Báo cáo sự cố đang chờ xử lý</h2>
          </div>

          {incidentLoading && (
            <p className="incident-state">Đang tải báo cáo sự cố...</p>
          )}
          {incidentError && <p className="incident-error">{incidentError}</p>}

          {!incidentLoading && pendingIncidents.length === 0 && (
            <p className="incident-state">
              Không có báo cáo sự cố nào đang chờ xử lý.
            </p>
          )}

          <div className="incident-list">
            {pendingIncidents.map((incident) => (
              <div
                key={incident.incidentReportID}
                className={`incident-card ${selectedIncident?.incidentReportID === incident.incidentReportID ? "selected" : ""}`}
                onClick={() => {
                  setSelectedIncident(incident);
                  setResolveNote("");
                }}
              >
                <div className="incident-card-header">
                  <div className="incident-id">
                    #{incident.incidentReportID}
                  </div>
                  <div className="incident-status pending">Đang chờ</div>
                </div>

                <div className="incident-card-body">
                  <h4 className="incident-title">⚠️ {incident.title}</h4>

                  <div className="incident-details">
                    <div className="incident-row">
                      <span className="incident-label">Đội cứu hộ:</span>
                      <span className="incident-value">
                        {incident.teamName}
                      </span>
                    </div>

                    <div className="incident-row">
                      <span className="incident-label">Người báo cáo:</span>
                      <span className="incident-value">
                        {incident.reporterName}
                      </span>
                    </div>

                    <div className="incident-row">
                      <span className="incident-label">Mô tả:</span>
                      <span className="incident-value">
                        {incident.description}
                      </span>
                    </div>

                    <div className="incident-row">
                      <span className="incident-label">Thời gian tạo:</span>
                      <span className="incident-value">
                        {incident.createdTime
                          ? new Date(incident.createdTime).toLocaleString()
                          : ""}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {selectedIncident && (
          <div className="incident-section">
            <div className="panel-header">
              <h2>🛠 Xử lý sự cố</h2>
            </div>

            <div className="request-details-card">
              <div className="details-grid">
                <div className="detail-group full-width">
                  <h4>Tiêu đề</h4>
                  <div className="description-box">
                    {selectedIncident.title}
                  </div>
                </div>

                <div className="detail-group full-width">
                  <h4>Mô tả</h4>
                  <div className="description-box">
                    {selectedIncident.description}
                  </div>
                </div>

                <div className="detail-group">
                  <h4>Đội cứu hộ</h4>
                  <div className="special-needs">
                    {selectedIncident.teamName}
                  </div>
                </div>

                <div className="detail-group">
                  <h4>Người báo cáo</h4>
                  <div className="special-needs">
                    {selectedIncident.reporterName}
                  </div>
                </div>

                <div className="detail-group full-width">
                  <h4>Ghi chú của điều phối viên</h4>
                  <textarea
                    value={resolveNote}
                    onChange={(e) => setResolveNote(e.target.value)}
                    rows={4}
                    placeholder="Nhập ghi chú của điều phối viên..."
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "8px",
                    }}
                  />
                </div>
              </div>

              <div className="button-row1">
                <button
                  className="btn btn-success"
                  onClick={() =>
                    handleResolveIncident(selectedIncident.incidentReportID)
                  }
                  disabled={resolvingIncident || !resolveNote.trim()}
                >
                  {resolvingIncident ? "Đang xử lý..." : "✅ Xử lý sự cố"}
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="incident-section">
          <div className="panel-header">
            <h2>📜 Lịch sử sự cố</h2>
          </div>

          {incidentHistory.length === 0 ? (
            <p>Chưa có sự cố nào được xử lý.</p>
          ) : (
            <div className="history-tablewrap">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Tiêu đề</th>
                    <th>Đội cứu hộ</th>
                    <th>Người báo cáo</th>
                    <th>Người xử lý</th>
                    <th>Thời gian tạo</th>
                    <th>Thời gian xử lý</th>
                  </tr>
                </thead>
                <tbody>
                  {incidentHistory.map((item) => (
                    <tr key={item.incidentReportID}>
                      <td>{item.title}</td>
                      <td>{item.teamName}</td>
                      <td>{item.reporterName}</td>
                      <td>{item.resolverName}</td>
                      <td>
                        {item.createdTime
                          ? new Date(item.createdTime).toLocaleString()
                          : ""}
                      </td>
                      <td>
                        {item.resolvedTime
                          ? new Date(item.resolvedTime).toLocaleString()
                          : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
