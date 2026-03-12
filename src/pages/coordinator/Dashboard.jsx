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

  const handleLogout = () => {
    // Xử lý logout
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
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.content)) return res.content;
    if (Array.isArray(res?.content?.data)) return res.content.data;
    if (Array.isArray(res?.data?.data)) return res.data.data;
    if (Array.isArray(res?.data?.content)) return res.data.content;
    return null;
  };

  useEffect(() => {
    const handleTeamAccepted = (data) => {
      console.log("TeamAcceptedNotification:", data);

      setAllRequests((prev) =>
        prev.map((r) =>
          r.requestId === data.requestShortCode
            ? {
              ...r,
              status: "in_progress",
              assignedTeamName: data.teamName,
              rescueMissionId: data.rescueMissionID,
            }
            : r,
        ),
      );

      // ADD NOTIFICATION
      setNotifications((prev) => [
        {
          id: Date.now(),
          type: "equipment",
          title: "Team Accepted Mission",
          message: `${data.teamName} accepted rescue request #${data.requestShortCode}`,
          requestId: data.requestShortCode,
          timestamp: new Date().toLocaleString(),
          read: false,
        },
        ...prev,
      ]);
    };
    setUnreadCount((c) => c + 1);

    const handleTeamRejected = (data) => {
      console.log("TeamRejectedNotification:", data);

      setAllRequests((prev) =>
        prev.map((r) =>
          r.requestId === data.requestShortCode
            ? {
              ...r,
              status: "pending",
              assignedTeamId: null,
              assignedTeamName: null,
              rescueMissionId: null,
            }
            : r,
        ),
      );
      setNotifications((prev) => [
        {
          id: Date.now(),
          type: "critical",
          title: "Mission Rejected",
          message: `${data.teamName} rejected request #${data.requestShortCode}`,
          requestId: data.requestShortCode,
          timestamp: new Date().toLocaleString(),
          read: false,
        },
        ...prev,
      ]);
      setUnreadCount((c) => c + 1);

      alert(
        data.actionMessage ||
        "Team rejected mission. Please assign another team.",
      );
    };

    const handleMissionCompleted = (data) => {
      console.log("MissionCompletedNotification:", data);

      setAllRequests((prev) =>
        prev.map((r) =>
          r.requestId === data.requestShortCode
            ? {
              ...r,
              status: "completed",
            }
            : r,
        ),
      );
      setNotifications((prev) => [
        {
          id: Date.now(),
          type: "supply",
          title: "Mission Completed",
          message: `${data.teamName} completed rescue request #${data.requestShortCode}`,
          requestId: data.requestShortCode,
          timestamp: new Date().toLocaleString(),
          read: false,
        },
        ...prev,
      ]);
      setUnreadCount((c) => c + 1);
    };
    const handleIncidentReported = (data) => {
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
      setNotifications((prev) => [
        {
          id: Date.now(),
          type: "critical",
          title: "Incident Reported",
          message: `${data.teamName} reported: ${data.title}`,
          requestId: data.rescueMissionID,
          timestamp: new Date().toLocaleString(),
          read: false,
        },
        ...prev,
      ]);
      setUnreadCount((c) => c + 1);

      alert(`Incident reported by ${data.teamName}: ${data.title}`);
    };
    // FIX: handle event NewRescueRequest từ backend
    const handleNewRescueRequest = (data) => {
      console.log("NewRescueRequest:", data);

      const newRequest = mapRequestToUI(data);

      setAllRequests((prev) => [newRequest, ...prev]);

      setNotifications((prev) => [
        {
          id: Date.now(),
          type: "critical",
          title: "New Rescue Request",
          message: `New rescue request #${newRequest.requestId}`,
          requestId: newRequest.requestId,
          timestamp: new Date().toLocaleString(),
          read: false,
        },
        ...prev,
      ]);
    };
    const init = async () => {
      await signalRService.startConnection();
      console.log("SignalR connected");

      signalRService.on("ReceiveTeamAccepted", handleTeamAccepted);
      signalRService.on("ReceiveTeamRejected", handleTeamRejected);
      signalRService.on("ReceiveMissionCompleted", handleMissionCompleted);
      signalRService.on("ReceiveIncidentReported", handleIncidentReported);

      signalRService.on("NewRescueRequest", handleNewRescueRequest); // FIX: listen event backend gửi

    };

    init();

    return () => {
      signalRService.off("ReceiveTeamAccepted", handleTeamAccepted);
      signalRService.off("ReceiveTeamRejected", handleTeamRejected);
      signalRService.off("ReceiveMissionCompleted", handleMissionCompleted);
      signalRService.off("ReceiveIncidentReported", handleIncidentReported);

      signalRService.off("NewRescueRequest", handleNewRescueRequest); // FIX: cleanup listener

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
      alert("Please enter coordinator note.");
      return;
    }

    try {
      setResolvingIncident(true);
      setIncidentError("");

      const res = await incidentReportService.resolveIncident({
        incidentReportID,
        coordinatorNote: resolveNote.trim(),
      });

      alert(res?.message || "Incident resolved successfully.");

      setResolveNote("");
      setSelectedIncident(null);

      await loadPendingIncidents();
      await loadIncidentHistory();
    } catch (e) {
      console.error(e);
      setIncidentError("Resolve incident failed.");
      alert(e?.message || "Resolve incident failed.");
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

  const availableTeams = teams.filter((t) => {
    const status =
      t.currentStatus ?? t.CurrentStatus ?? t.status ?? t.Status ?? "";

    return String(status).toLowerCase() === "available";
  });

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
          const availableOnly = data.filter((t) => {
            const status =
              t.currentStatus ?? t.CurrentStatus ?? t.status ?? t.Status ?? "";
            return String(status).toLowerCase() === "available";
          });

          setTeams(availableOnly);
          setSelectedTeamId("");
          setDispatchError("");
          setDispatchSuccess("");
        } else {
          setTeams([]);
          setTeamsError(res?.message || "Failed to load rescue teams");
        }
      } catch (err) {
        console.error("Load teams error:", err);
        setTeams([]);
        setTeamsError("Failed to load rescue teams");
      } finally {
        setTeamsLoading(false);
      }
    };

    loadTeams();
  }, []);

  // Cập nhật unread count
  useEffect(() => {
    const unread = notifications.filter((n) => !n.read).length;
    setUnreadCount(unread);
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
      setDispatchError("Please select a rescue request first.");
      return;
    }

    if (selectedRequest.status !== "pending") {
      setDispatchError("Only PENDING requests can be dispatched.");
      return;
    }

    if (!selectedTeamId) {
      setDispatchError("Please select a rescue team.");
      return;
    }

    try {
      setDispatching(true);

      const teamIdValue = Number(selectedTeamId);

      const res = await rescueMissionService.dispatch({
        rescueRequestID: selectedRequest.id,
        rescueTeamID: teamIdValue,
      });

      if (!res?.success) {
        setDispatchError(res?.message || "Dispatch mission failed.");
        return;
      }

      const data = res?.content || res?.data || {};
      const missionId =
        data?.rescueMissionID ??
        data?.RescueMissionID ??
        data?.missionId ??
        data?.MissionId ??
        null;

      const assignedTeamName = findTeamLabelById(teamIdValue);

      updateRequestAfterDispatch(selectedRequest.id, {
        assignedTeamId: teamIdValue,
        assignedTeamName,
        rescueMissionId: missionId,
      });

      setDispatchSuccess(
        `Dispatched ${assignedTeamName} to request #${selectedRequest.requestId}` +
        (missionId ? ` (Mission #${missionId})` : ""),
      );

      await loadRealRequests();
    } catch (e) {
      setDispatchError(e?.message || "Dispatch mission failed.");
    } finally {
      setDispatching(false);
    }
  };

  const updateRequestStatus = (requestId, newStatus) => {
    setAllRequests((prev) =>
      prev.map((req) =>
        req.id === requestId
          ? { ...req, status: newStatus, isNew: false }
          : req,
      ),
    );

    if (selectedRequest && selectedRequest.id === requestId) {
      setSelectedRequest((prev) => ({
        ...prev,
        status: newStatus,
        isNew: false,
      }));
    }
  };
  const updateRequestAfterDispatch = (requestId, payload) => {
    setAllRequests((prev) =>
      prev.map((req) => {
        if (req.id !== requestId) return req;

        return {
          ...req,
          status: "in_progress",
          isNew: false,

          // lưu thông tin assign để UI dùng lại
          assignedTeamId: payload.assignedTeamId ?? req.assignedTeamId,
          assignedTeamName: payload.assignedTeamName ?? req.assignedTeamName,
          rescueMissionId: payload.rescueMissionId ?? req.rescueMissionId,
        };
      }),
    );

    if (selectedRequest?.id === requestId) {
      setSelectedRequest((prev) => ({
        ...prev,
        status: "in_progress",
        isNew: false,
        assignedTeamId: payload.assignedTeamId ?? prev.assignedTeamId,
        assignedTeamName: payload.assignedTeamName ?? prev.assignedTeamName,
        rescueMissionId: payload.rescueMissionId ?? prev.rescueMissionId,
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
            <h1>🌊 Flood Relief Coordination Board</h1>
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
                <span>Logout</span>
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
                          className={`notification-item ${notification.read ? "read" : "unread"}`}
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
              <h3>The request is active.</h3>
              <div className="stat-number">{stats.totalActive}</div>
              <div className="stat-sub">({stats.newRequests} NEW )</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon people">👥</div>
            <div className="stat-info">
              <h3>People in need of rescue</h3>
              <div className="stat-number">{stats.peopleAffected}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon critical">🚨</div>
            <div className="stat-info">
              <h3>Critical situation</h3>
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
                  <h3>WARNING: Critical life-threatening situation!</h3>
                  <p>
                    There are{" "}
                    {
                      allRequests.filter(
                        (req) => req.isNew && req.priorityLevel === "Critical",
                      ).length
                    }{" "}
                    critical rescue requests that need immediate handling
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
                Handle immediately →
              </button>
            </div>
          )}

        {/* Filter Controls */}
        <div className="filter-section">
          <h3>🔎 Filter rescue requests</h3>

          <div className="filter-controls">
            <div className="filter-group">
              <span className="filter-label">Rescue request status</span>
              <div className="status-tabs">
                <button
                  className={`status-tab ${statusFilter === "active" ? "active" : ""}`}
                  onClick={() => setStatusFilter("active")}
                >
                  ACTIVE
                </button>

                <button
                  className={`status-tab ${statusFilter === "pending" ? "active" : ""}`}
                  onClick={() => setStatusFilter("pending")}
                >
                  PENDING
                </button>

                <button
                  className={`status-tab ${statusFilter === "in_progress" ? "active" : ""}`}
                  onClick={() => setStatusFilter("in_progress")}
                >
                  IN_PROGRESS
                </button>

                <button
                  className={`status-tab ${statusFilter === "completed" ? "active" : ""}`}
                  onClick={() => setStatusFilter("completed")}
                >
                  COMPLETED
                </button>
              </div>
            </div>

            <div className="filter-group">
              <span className="filter-label">Type of request</span>
              <div className="type-tabs">
                <button
                  className={`type-tab ${typeFilter === "all" ? "active" : ""}`}
                  onClick={() => setTypeFilter("all")}
                >
                  All
                </button>

                <button
                  className={`type-tab emergency ${typeFilter === "emergency" ? "active" : ""}`}
                  onClick={() => setTypeFilter("emergency")}
                >
                  🚨 Emergency
                </button>

                <button
                  className={`type-tab supply ${typeFilter === "supply" ? "active" : ""}`}
                  onClick={() => setTypeFilter("supply")}
                >
                  📦 Supply
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
                <h2>📋 List of requirements ({filteredRequests.length})</h2>
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
                  <p>No rescue requests found</p>
                  <button
                    className="btn-show-completed"
                    onClick={() => setShowCompleted(true)}
                  >
                    Show completed requests
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
                          ? "⏳ Waiting for processing"
                          : request.status === "in_progress"
                            ? "🚤 Rescue operation underway."
                            : "✅ Completed"}
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
                        {request.emergencyType}

                        {request.emergencyCategory === "life_threatening" && (
                          <span className="category-tag critical">
                            EMERGENCY
                          </span>
                        )}
                        {request.emergencyCategory === "medical" && (
                          <span className="category-tag medical">MEDICAL</span>
                        )}
                        {request.emergencyCategory === "supply" && (
                          <span className="category-tag supply">SUPPLY</span>
                        )}
                      </h4>

                      <div className="request-details">
                        <div className="detail-row">
                          <span className="detail-label">👤 Requester:</span>
                          <span className="detail-value">
                            {request.fullName}
                          </span>
                        </div>

                        <div className="detail-row">
                          <span className="detail-label">📍 Address:</span>
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
                          ? "🚨 SERIOUS"
                          : request.priorityLevel === "High"
                            ? "⚠️ HIGH"
                            : request.priorityLevel === "Medium"
                              ? "📋 MEDIUM"
                              : "📄 LOW"}
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
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  ← Previous
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
                  Next →
                </button>
              </div>
            )}
          </div>

          {/* Right: Map and Details */}

          <div className="map-details-panel">
            <div className="map-section">
              <div className="map-wrapper">
                <div className="panel-header">
                  <h2>🗺️ Flood Map</h2>

                  <div className="map-legend">
                    <div className="legend-item">
                      <span className="legend-dot critical"></span>
                      <span>Emergency</span>
                    </div>

                    <div className="legend-item">
                      <span className="legend-dot supply"></span>
                      <span>Supply</span>
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
                              <small>ID: {request.requestId}</small>
                              <br />
                              <small>Water level: {request.waterLevel}</small>
                              <br />
                              <small>People: {request.peopleCount}</small>
                              <br />
                              {request.isNew && <small>🆕 NEW</small>}
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
                            📋 Request details #{selectedRequest.requestId}
                          </h3>

                          <div style={{ display: "flex", gap: "10px" }}>
                            {selectedRequest.isNew && (
                              <span className="new-tag">🆕 NEW</span>
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
                            <h4>👤 Information of requester</h4>

                            <div className="detail-item1">
                              <span className="detail-label1">
                                Full name:
                                <span className="detail-value1">
                                  {selectedRequest.fullName}
                                </span>
                              </span>
                            </div>

                            <div className="detail-item1">
                              <span className="detail-label1">
                                Phone:
                                {selectedRequest.phoneNumber ? (
                                  <a
                                    href={`tel:${selectedRequest.phoneNumber}`}
                                    className="detail-value link"
                                  >
                                    {selectedRequest.phoneNumber}
                                  </a>
                                ) : (
                                  <span className="detail-value">N/A</span>
                                )}
                              </span>
                            </div>
                          </div>

                          <div className="detail-group1">
                            <h4>🌊 Flood Status</h4>

                            <div className="detail-item1">
                              <span className="detail-label1">
                                Emergency type:
                                <span className="detail-value badge">
                                  {selectedRequest.emergencyType}
                                </span>
                              </span>
                            </div>
                          </div>

                          <div className="detail-group1 full-width1">
                            <h4>📍 Location</h4>

                            <div className="detail-item1">
                              <span className="detail-label1">
                                Address:
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
                              <h4>🚑 Dispatch rescue team</h4>
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
                                    ? "Loading teams..."
                                    : availableTeams.length === 0
                                      ? "No available rescue teams"
                                      : "Select rescue team"}
                                </option>

                                {availableTeams.map((team) => (
                                  <option
                                    key={getTeamId(team)}
                                    value={getTeamId(team)}
                                  >
                                    {getTeamLabel(team)}
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
                                  ? "Dispatching..."
                                  : "🚀 Dispatch Mission"}
                              </button>
                            </div>

                            {selectedRequest.assignedTeamName && (
                              <div className="dispatch-info">
                                <strong>Assigned team:</strong>{" "}
                                {selectedRequest.assignedTeamName}
                                {selectedRequest.rescueMissionId && (
                                  <span>
                                    {" "}
                                    | Mission ID: #
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
                              Current status:
                            </span>

                            <span
                              className={`status-badge ${selectedRequest.status}`}
                            >
                              {selectedRequest.status === "pending"
                                ? "⏳ Pending"
                                : selectedRequest.status === "in_progress"
                                  ? "🚤 In progress"
                                  : "✅ Completed"}
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
                              🗺️ View map
                            </button>

                            <button
                              className="btn btn-emergency"
                              onClick={() =>
                                window.open(
                                  `tel:${selectedRequest.phoneNumber}`,
                                )
                              }
                            >
                              📞 Call
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
            <h2>⚠️ Pending Incident Reports</h2>
          </div>

          {incidentLoading && (
            <p className="incident-state">Loading incidents...</p>
          )}
          {incidentError && <p className="incident-error">{incidentError}</p>}

          {!incidentLoading && pendingIncidents.length === 0 && (
            <p className="incident-state">No pending incidents.</p>
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
                  <div className="incident-status pending">Pending</div>
                </div>

                <div className="incident-card-body">
                  <h4 className="incident-title">⚠️ {incident.title}</h4>

                  <div className="incident-details">
                    <div className="incident-row">
                      <span className="incident-label">Team:</span>
                      <span className="incident-value">
                        {incident.teamName}
                      </span>
                    </div>

                    <div className="incident-row">
                      <span className="incident-label">Reporter:</span>
                      <span className="incident-value">
                        {incident.reporterName}
                      </span>
                    </div>

                    <div className="incident-row">
                      <span className="incident-label">Description:</span>
                      <span className="incident-value">
                        {incident.description}
                      </span>
                    </div>

                    <div className="incident-row">
                      <span className="incident-label">Created:</span>
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
              <h2>🛠 Resolve Incident</h2>
            </div>

            <div className="request-details-card">
              <div className="details-grid">
                <div className="detail-group full-width">
                  <h4>Title</h4>
                  <div className="description-box">
                    {selectedIncident.title}
                  </div>
                </div>

                <div className="detail-group full-width">
                  <h4>Description</h4>
                  <div className="description-box">
                    {selectedIncident.description}
                  </div>
                </div>

                <div className="detail-group">
                  <h4>Team</h4>
                  <div className="special-needs">
                    {selectedIncident.teamName}
                  </div>
                </div>

                <div className="detail-group">
                  <h4>Reporter</h4>
                  <div className="special-needs">
                    {selectedIncident.reporterName}
                  </div>
                </div>

                <div className="detail-group full-width">
                  <h4>Coordinator Note</h4>
                  <textarea
                    value={resolveNote}
                    onChange={(e) => setResolveNote(e.target.value)}
                    rows={4}
                    placeholder="Enter coordinator note..."
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
                  {resolvingIncident ? "Resolving..." : "✅ Resolve Incident"}
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="incident-section">
          <div className="panel-header">
            <h2>📜 Incident History</h2>
          </div>

          {incidentHistory.length === 0 ? (
            <p>No resolved incidents yet.</p>
          ) : (
            <div className="history-tablewrap">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Team</th>
                    <th>Reporter</th>
                    <th>Resolver</th>
                    <th>Created</th>
                    <th>Resolved</th>
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
