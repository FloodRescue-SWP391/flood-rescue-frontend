// File này đã được chú thích lại để bạn biết các block realtime/API dùng để làm gì.
import React, { useState, useEffect, useRef } from "react";
import "./Dashboard.css";
import Header from "../../components/common/Header.jsx";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getAllRescueRequests } from "../../services/rescueRequestService.js";
import { getAllRescueTeams } from "../../services/rescueTeamService.js";
import {
  rescueMissionService,
  completeMission,
} from "../../services/rescueMissionService.js";
import { incidentReportService } from "../../services/incidentReportService.js";
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

const ChangeView = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom]);
  return null;
};

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
  const [notifications, setNotifications] = useState([]);

  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [addressMap, setAddressMap] = useState({});

  const navigate = useNavigate();

  // Phân trang cho List of requirements
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

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
    navigate("/login");
  };
  const mapStatusToUI = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "pending") return "pending";
    if (s === "processing" || s === "in_progress") return "in_progress";
    if (s === "completed") return "completed";
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
  const mapRequestToUI = (r) => {
    const lat = Number(r.LocationLatitude ?? r.locationLatitude ?? 0);
    const lng = Number(r.LocationLongitude ?? r.locationLongitude ?? 0);

    const uiStatus = mapStatusToUI(r.Status ?? r.status);

    return {
      id: r.RescueRequestID ?? r.rescueRequestID,
      requestId: r.ShortCode ?? r.shortCode,
      fullName: r.CitizenName ?? r.citizenName ?? "Citizen",
      phoneNumber: r.CitizenPhone ?? r.citizenPhone ?? "",
      address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      location: { lat, lng },

      emergencyType: r.RequestType ?? r.requestType ?? "Unknown",

      emergencyCategory:
        (r.RequestType ?? r.requestType)?.toLowerCase() === "supply"
          ? "supply"
          : "life_threatening",

      description: r.Description ?? r.description ?? "",

      status: uiStatus,

      timestamp: r.CreatedTime
        ? new Date(r.CreatedTime).toLocaleString("vi-VN")
        : "",

      imageUrl:
        Array.isArray(r.ImageUrls) && r.ImageUrls.length > 0
          ? r.ImageUrls[0]
          : "",

      isNew: uiStatus === "pending",

      waterLevel: "0m",
      peopleCount: 0,
    };
  };

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

  useEffect(() => {
    // const handleTeamAccepted = (data) => {
    //   console.log("TeamAcceptedNotification:", data);

    //   setAllRequests((prev) =>
    //     prev.map((r) =>
    //       r.requestId === (data.requestShortCode || data.ShortCode)
    //         ? {
    //             ...r,
    //             status: "in_progress",
    //             assignedTeamName: data.teamName,
    //             rescueMissionId: data.rescueMissionID,
    //           }
    //         : r,
    //     ),
    //   );
    // };
    // Rescue Team Leader accept/reject -> coordinator reload request/mission để thấy trạng thái mới.
    const handleTeamResponse = async (data) => {
      console.log("ReceiveTeamResponse:", data);

      const code =
        data.requestShortCode || data.RequestShortCode || data.ShortCode;
      const type = String(
        data.notificationType || data.NotificationType || "",
      ).toLowerCase();
      const nextStatus = type.includes("reject") ? "pending" : "in_progress";

      setAllRequests((prev) =>
        prev.map((r) =>
          r.requestId === code
            ? {
                ...r,
                status: nextStatus,
                assignedTeamName:
                  data.teamName || data.TeamName || r.assignedTeamName,
                rescueMissionId:
                  data.rescueMissionID ||
                  data.RescueMissionID ||
                  r.rescueMissionId,
              }
            : r,
        ),
      );

      await loadRealRequests();
    };

    // const handleMissionCompleted = (data) => {
    //   console.log("MissionCompletedNotification:", data);

    //   setAllRequests((prev) =>
    //     prev.map((r) =>
    //       r.requestId === data.requestShortCode
    //         ? { ...r, status: "completed" }
    //         : r,
    //     ),
    //   );
    // };

    // Mission hoàn thành -> coordinator cập nhật thông báo và reload danh sách.
    const handleMissionCompleted = async (data) => {
      console.log("MissionCompletedNotification:", data);

      setAllRequests((prev) =>
        prev.map((r) =>
          r.requestId === (data.requestShortCode || data.RequestShortCode)
            ? { ...r, status: "completed" }
            : r,
        ),
      );

      await loadRealRequests();
    };

    // const handleIncidentReported = (data) => {
    //   console.log("IncidentReportedNotification:", data);

    //   setPendingIncidents((prev) => [
    //     {
    //       incidentReportID: data.incidentReportID,
    //       rescueMissionID: data.rescueMissionID,
    //       teamName: data.teamName,
    //       title: data.title,
    //       description: data.description,
    //       createdTime: new Date(data.createdTime),
    //     },
    //     ...prev,
    //   ]);
    // };

    const handleIncidentReported = async (data) => {
      console.log("IncidentReportedNotification:", data);

      setPendingIncidents((prev) => [
        {
          incidentReportID: data.incidentReportID,
          rescueMissionID: data.rescueMissionID,
          teamName: data.teamName,
          title: data.title,
          description: data.description,
          createdTime: new Date(data.createdTime),
        },
        ...prev,
      ]);
      await loadPendingIncidents();
    };

    // const handleNewRescueRequest = (data) => {
    //   console.log("🔔 NewRescueRequest event:", data);

    //   const code = data.ShortCode || data.shortCode || "UNKNOWN";

    //   setNotifications((prev) => [
    //     {
    //       id: Date.now(),
    //       type: "critical",
    //       title: "New Rescue Request",
    //       message: `New rescue request #${code}`,
    //       requestId: code,
    //       timestamp: new Date().toLocaleString(),
    //       read: false,
    //     },
    //     ...prev,
    //   ]);
    // };
    const handleNewRescueRequest = async (data) => {
      console.log("🔔 NewRescueRequest event:", data);

      const code = data.ShortCode || data.shortCode || "UNKNOWN";

      setNotifications((prev) => [
        {
          id: Date.now(),
          type: "critical",
          title: "New Rescue Request",
          message: `New rescue request #${code}`,
          requestId: code,
          timestamp: new Date().toLocaleString(),
          read: false,
        },
        ...prev,
      ]);
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

      const res = await incidentReportService.resolveIncident({
        incidentReportID,
        coordinatorNote: resolveNote.trim(),
      });

      alert(res?.message || "Xử lý sự cố thành công.");

      setResolveNote("");
      setSelectedIncident(null);

      await loadPendingIncidents();
      await loadIncidentHistory();
    } catch (e) {
      console.error(e);
      setIncidentError("Không thể xử lý sự cố.");
      alert(e?.message || "Không thể xử lý sự cố.");
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
  const getFilteredRequests = () => {
    let filtered = allRequests.filter((request) => {
      if (!showCompleted && request.status === "completed") return false;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active"
          ? request.status !== "completed"
          : request.status === statusFilter);
      const matchesType =
        typeFilter === "all" || request.emergencyType === typeFilter;
      const matchesPriority =
        priorityFilter === "all" || request.priorityLevel === priorityFilter;

      // Lọc theo mức nước
      let matchesFloodLevel = true;
      if (floodLevelFilter !== "all") {
        const waterLevel = parseFloat(request.waterLevel);
        switch (floodLevelFilter) {
          case "low":
            matchesFloodLevel = waterLevel < 0.5;
            break;
          case "medium":
            matchesFloodLevel = waterLevel >= 0.5 && waterLevel < 1.5;
            break;
          case "high":
            matchesFloodLevel = waterLevel >= 1.5;
            break;
        }
      }

      return (
        matchesStatus && matchesType && matchesPriority && matchesFloodLevel
      );
    });

    // Sắp xếp: critical -> new -> theo priority
    filtered.sort((a, b) => {
      // Ưu tiên Critical
      if (a.priorityLevel === "Critical" && b.priorityLevel !== "Critical")
        return -1;
      if (b.priorityLevel === "Critical" && a.priorityLevel !== "Critical")
        return 1;

      // Ưu tiên yêu cầu mới
      if (a.isNew && !b.isNew) return -1;
      if (!a.isNew && b.isNew) return 1;

      // Ưu tiên theo mức độ nghiêm trọng
      const priorityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 };
      return priorityOrder[a.priorityLevel] - priorityOrder[b.priorityLevel];
    });

    return filtered;
  };

  const filteredRequests = getFilteredRequests();
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);

  const paginatedRequests = filteredRequests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const availableTeams = teams;

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
          setTeams(data);
          setSelectedTeamId("");
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

  // Cập nhật unread count
  useEffect(() => {
    setUnreadCount(notifications.filter((n) => !n.read).length);
  }, [notifications]);
  //load data thực tế
  const loadRealRequests = async () => {
    try {
      const res = await getAllRescueRequests();
      console.log("GET /RescueRequests:", res);

      const data = extractApiData(res);

      if (!Array.isArray(data)) {
        setAllRequests([]);
        return;
      }

      const mapped = data
        .map(mapRequestToUI)
        .filter(
          (item) =>
            item?.id &&
            Number.isFinite(item?.location?.lat) &&
            Number.isFinite(item?.location?.lng),
        );

      console.log("Requests mapped:", mapped);

      setAllRequests(mapped);
    } catch (error) {
      console.warn("Load rescue requests failed:", error);
      setAllRequests([]);
    }
  };

  useEffect(() => {
    loadRealRequests();
  }, []);

  // Các hàm xử lý
  const handleRequestClick = (request) => {
    setSelectedRequest(request);
    setMapCenter([request.location.lat, request.location.lng]);
    setMapZoom(16);
    // reset dispatch messages mỗi lần chọn request
    setDispatchError("");
    setDispatchSuccess("");
    // nếu đã assign team thì set dropdown theo
    if (request?.assignedTeamId)
      setSelectedTeamId(String(request.assignedTeamId));
    else setSelectedTeamId("");

    if (request.isNew) {
      setAllRequests((prev) =>
        prev.map((req) =>
          req.id === request.id ? { ...req, isNew: false } : req,
        ),
      );
    }
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

    try {
      setDispatching(true);

      const res = await rescueMissionService.dispatch({
        rescueRequestID: selectedRequest.id,
        rescueTeamID: selectedTeamId,
      });

      console.log("Dispatch API response:", res);

      // ✅ check success đúng
      if (res?.success === false) {
        setDispatchError(res?.message || "Không thể phân công nhiệm vụ.");
        return;
      }

      const data = res?.content || {};

      const missionId = data.rescueMissionID ?? data.RescueMissionID ?? null;

      const assignedTeamName = findTeamLabelById(selectedTeamId);

      updateRequestAfterDispatch(selectedRequest.id, {
        assignedTeamId: selectedTeamId,
        assignedTeamName,
        rescueMissionId: missionId,
      });

      setDispatchSuccess(
        `Dispatched ${assignedTeamName} to request #${selectedRequest.requestId}`,
      );

      await loadRealRequests();
    } catch (e) {
      console.error(e);
      setDispatchError(e?.message || "Dispatch mission failed.");
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
          status: "in_progress",
          assignedTeamId: payload.assignedTeamId,
          assignedTeamName: payload.assignedTeamName,
          rescueMissionId: payload.rescueMissionId,
        };
      }),
    );

    if (selectedRequest?.id === requestId) {
      setSelectedRequest((prev) => ({
        ...prev,
        status: "in_progress",
        assignedTeamId: payload.assignedTeamId,
        assignedTeamName: payload.assignedTeamName,
        rescueMissionId: payload.rescueMissionId,
      }));
    }
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((noti) => ({ ...noti, read: true })));
  };

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((noti) => noti.id !== id));
  };

  const goToRequestFromNotification = (requestId) => {
    const request = allRequests.find((req) => req.requestId === requestId);
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
  return (
    <div className="dashboard-container">
      <Header />

      <div className="dashboard-content">
        {/* Dashboard Header */}
        <div className="dashboard-header">
          <div className="noti">
            <h1>🌊 Bảng điều phối cứu trợ lũ lụt</h1>

            <div className="button">
              <button
                className={`notification-bell ${unreadCount > 0 ? "active" : ""}`}
                onClick={() => setShowNotifications(!showNotifications)}
              >
                🔔
                {unreadCount > 0 && (
                  <span className="notification-badge">{unreadCount}</span>
                )}
              </button>

              <button className="logout-btn" onClick={handleLogout}>
                <span className="logout-icon">↩</span>
                <span>Đăng xuất</span>
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
        ) && (
          <div className="critical-alert-banner">
            <div className="alert-content">
              <span className="alert-icon">🚨</span>
              <div>
                <h3>CẢNH BÁO: Tình huống nguy hiểm đến tính mạng!</h3>
                <p>
                  Có{" "}
                  {
                    allRequests.filter(
                      (req) => req.isNew && req.priorityLevel === "Critical",
                    ).length
                  }{" "}
                  yêu cầu cứu hộ mức độ nghiêm trọng cần được xử lý ngay
                </p>
              </div>
            </div>

            <button
              className="alert-action"
              onClick={() => {
                const criticalRequest = allRequests.find(
                  (req) => req.isNew && req.priorityLevel === "Critical",
                );
                if (criticalRequest) handleRequestClick(criticalRequest);
              }}
            >
              Xử lý ngay →
            </button>
          </div>
        )}

        {/* Filter Controls */}
        <div className="filter-section">
          <h3>🔎 Lọc yêu cầu cứu hộ</h3>

          <div className="filter-controls">
            <div className="filter-group">
              <span className="filter-label">Trạng thái yêu cầu</span>

              <div className="status-tabs">
                <button
                  className={`status-tab ${statusFilter === "active" ? "active" : ""}`}
                  onClick={() => setStatusFilter("active")}
                >
                  ĐANG HOẠT ĐỘNG
                </button>

                <button
                  className={`status-tab ${statusFilter === "pending" ? "active" : ""}`}
                  onClick={() => setStatusFilter("pending")}
                >
                  CHỜ XỬ LÝ
                </button>

                <button
                  className={`status-tab ${statusFilter === "in_progress" ? "active" : ""}`}
                  onClick={() => setStatusFilter("in_progress")}
                >
                  ĐANG XỬ LÝ
                </button>

                <button
                  className={`status-tab ${statusFilter === "completed" ? "active" : ""}`}
                  onClick={() => setStatusFilter("completed")}
                >
                  HOÀN THÀNH
                </button>
              </div>
            </div>

            <div className="filter-group">
              <span className="filter-label">Loại yêu cầu</span>

              <div className="type-tabs">
                <button
                  className={`type-tab ${typeFilter === "all" ? "active" : ""}`}
                  onClick={() => setTypeFilter("all")}
                >
                  Tất cả
                </button>

                <button
                  className={`type-tab emergency ${
                    typeFilter === "emergency" ? "active" : ""
                  }`}
                  onClick={() => setTypeFilter("emergency")}
                >
                  🚨 Khẩn cấp
                </button>

                <button
                  className={`type-tab supply ${
                    typeFilter === "supply" ? "active" : ""
                  }`}
                  onClick={() => setTypeFilter("supply")}
                >
                  📦 Nhu yếu phẩm
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="main-content">
          {/* Left: Requests List */}
          <div className="requests-panel">
            <div className="panel-header">
              <div className="list">
                <h2>📋 Danh sách yêu cầu ({filteredRequests.length})</h2>
                <span className="last-update">
                  {stats.newRequests > 0 && (
                    <span className="new-indicator">
                      • {stats.newRequests} New
                    </span>
                  )}
                </span>
              </div>
            </div>

            <div className="requests-list">
              {filteredRequests.length === 0 ? (
                <div className="no-requests">
                  <p>Không tìm thấy yêu cầu cứu hộ</p>
                  <button
                    className="btn-show-completed"
                    onClick={() => setShowCompleted(true)}
                  >
                    Hiển thị yêu cầu đã hoàn thành
                  </button>
                </div>
              ) : (
                paginatedRequests.map((request) => (
                  <div
                    key={request.id}
                    className={`request-card ${selectedRequest?.id === request.id ? "selected" : ""} ${request.isNew ? "new" : ""}`}
                    onClick={() => handleRequestClick(request)}
                  >
                    <div className="request-card-header">
                      <div className="request-id">#{request.requestId}</div>

                      <div className={`status-badge ${request.status}`}>
                        {request.status === "pending"
                          ? "⏳ Chờ xử lý"
                          : request.status === "in_progress"
                            ? "🚤 Đang thực hiện cứu hộ"
                            : "✅ Hoàn thành"}
                      </div>
                    </div>

                    <div className="request-card-body">
                      <h4 className="request-title">
                        {request.emergencyType === "People trapped in the water"
                          ? "🌊"
                          : request.emergencyType === "The house was flooded."
                            ? "🏠"
                            : request.emergencyType === "Food/water is needed."
                              ? "📦"
                              : request.emergencyType === "Medicine is needed."
                                ? "💊"
                                : request.emergencyType ===
                                    "Life jackets/boat needed."
                                  ? "🛟"
                                  : request.emergencyType === "Landslide"
                                    ? "⛰️"
                                    : "🚨"}

                        {/* 👉 hiển thị tiếng Việt */}
                        {request.emergencyType === "People trapped in the water"
                          ? "Người mắc kẹt trong nước"
                          : request.emergencyType === "The house was flooded."
                            ? "Nhà bị ngập"
                            : request.emergencyType === "Food/water is needed."
                              ? "Cần thực phẩm / nước uống"
                              : request.emergencyType === "Medicine is needed."
                                ? "Cần thuốc men"
                                : request.emergencyType ===
                                    "Life jackets/boat needed."
                                  ? "Cần áo phao / thuyền"
                                  : request.emergencyType === "Landslide"
                                    ? "Sạt lở đất"
                                    : request.emergencyType}

                        {request.emergencyCategory === "life_threatening" && (
                          <span className="category-tag critical">
                            KHẨN CẤP
                          </span>
                        )}

                        {request.emergencyCategory === "medical" && (
                          <span className="category-tag medical">Y TẾ</span>
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

            {filteredRequests.length > 0 && (
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
                              <strong>{request.emergencyType}</strong>
                              <br />
                              <small>Mã: {request.requestId}</small>
                              <br />
                              <small>Số người: {request.peopleCount}</small>
                              <br />
                              {request.isNew && <small>🆕 MỚI</small>}
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                  </MapContainer>
                </div>

                {/* PANEL NỔI */}
                <div
                  className={`details-overlay ${selectedRequest ? "open" : ""}`}
                >
                  {selectedRequest && (
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
                                Loại khẩn cấp:
                                <span className="detail-value badge">
                                  {selectedRequest.emergencyType}
                                </span>
                              </span>
                            </div>
                          </div>

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
                              <h4>🚑 Điều phối đội cứu hộ</h4>
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
                                    : availableTeams.length === 0
                                      ? "Không có đội khả dụng"
                                      : "Chọn đội cứu hộ"}
                                </option>

                                {teams.map((team) => (
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
                              className={`status-badge ${selectedRequest.status}`}
                            >
                              {selectedRequest.status === "pending"
                                ? "⏳ Đang chờ"
                                : selectedRequest.status === "in_progress"
                                  ? "🚤 Đang xử lý"
                                  : "✅ Hoàn thành"}
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
                              onClick={() =>
                                window.open(
                                  `tel:${selectedRequest.phoneNumber}`,
                                )
                              }
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
                onClick={() => setSelectedIncident(incident)}
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
