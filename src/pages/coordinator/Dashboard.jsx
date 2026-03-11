import React, { useState, useEffect, useRef } from "react";
import "./Dashboard.css";
import Header from "../../components/common/Header.jsx";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getAllRescueRequests } from "../../services/rescueRequestService.js";
import { getAllRescueTeams } from "../../services/rescueTeamService.js";
import { rescueMissionService, completeMission } from "../../services/rescueMissionService.js";
import { incidentReportService } from "../../services/incidentReportService.js";
import signalRService from "../../services/signalrService.js";

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
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 0 6px rgba(0,0,0,0.5);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
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
        }
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
    const requestType = r.requestType ?? r.RequestType ?? "";
    const status = r.status ?? r.Status ?? "";
    const lat = Number(r.locationLatitude ?? r.LocationLatitude ?? 0);
    const lng = Number(r.locationLongitude ?? r.LocationLongitude ?? 0);
    const imageUrls = r.imageUrls ?? r.ImageUrls ?? [];

    const isSupply = String(requestType).toLowerCase() === "supply";
    const uiStatus = mapStatusToUI(status);

    return {
      id: r.rescueRequestID ?? r.RescueRequestID ?? r.id ?? r.Id,
      requestId: r.shortCode ?? r.ShortCode ?? "",
      fullName: r.citizenName ?? r.CitizenName ?? "Citizen",
      phoneNumber: r.citizenPhone ?? r.CitizenPhone ?? "",
      address: r.address ?? r.Address ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      location: {
        lat,
        lng,
      },
      emergencyType: requestType || "Unknown",
      emergencyCategory: isSupply ? "supply" : "life_threatening",
      peopleCount: 0,
      description: r.description ?? r.Description ?? "",
      status: uiStatus,
      timestamp:
        r.createdTime || r.CreatedTime
          ? new Date(r.createdTime ?? r.CreatedTime).toLocaleString("vi-VN")
          : "",
      contactVia: "Phone Call",
      imageUrl: Array.isArray(imageUrls) && imageUrls.length > 0 ? imageUrls[0] : "",
      isNew: uiStatus === "pending",
      waterLevel: "0m",
      specialNeeds: "",
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
        [selectedRequest.id]:
          address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      }));
    };

    loadSelectedAddress();
  }, [selectedRequest, addressMap]);

  const extractApiData = (res) => {
    if (!res) return null;
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.content)) return res.content;
    if (Array.isArray(res?.data?.data)) return res.data.data;
    if (Array.isArray(res?.data?.content)) return res.data.content;
    return res?.data ?? res?.content ?? res;
  };

  useEffect(() => {
    const handleTeamAccepted = (data) => {
      console.log("TeamAcceptedNotification:", data);

      setAllRequests((prev) =>
        prev.map((r) =>
          r.rescueMissionId === data.requestShortCode
            ? {
              ...r,
              status: "in_progress",
              assignedTeamName: data.teamName,
              rescueMissionId: data.rescueMissionID,
            }
            : r
        )
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
          r.requestId === data.requestShortCode ? {
            ...r,
            status: "pending",
            assignedTeamId: null,
            assignedTeamName: null,
            rescueMissionId: null,
          }
            : r
        )
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

      alert(data.actionMessage || "Team rejected mission. Please assign another team.");
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
            : r
        )
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

    const init = async () => {
      await signalRService.startConnection();

      signalRService.on("ReceiveTeamAccepted", handleTeamAccepted);
      signalRService.on("ReceiveTeamRejected", handleTeamRejected);
      signalRService.on("ReceiveMissionCompleted", handleMissionCompleted);
      signalRService.on("ReceiveIncidentReported", handleIncidentReported);
    };

    init();

    return () => {
      signalRService.off("ReceiveTeamAccepted", handleTeamAccepted);
      signalRService.off("ReceiveTeamRejected", handleTeamRejected);
      signalRService.off("ReceiveMissionCompleted", handleMissionCompleted);
      signalRService.off("ReceiveIncidentReported", handleIncidentReported);
    };
  }, []);
  const loadPendingIncidents = async () => {
    try {
      setIncidentLoading(true);
      setIncidentError("");

      const res = await incidentReportService.getPendingReports();
      const data = extractApiData(res);

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
  const availableTeams = teams.filter((t) => {
    const status =
      t.currentStatus ??
      t.CurrentStatus ??
      t.status ??
      t.Status ??
      "";

    return String(status).toLowerCase() === "available";
  });


  //load team
  useEffect(() => {
    const loadTeams = async () => {
      setTeamsLoading(true);
      setTeamsError("");

      try {
        const res = await getAllRescueTeams(); // ApiResponse<List<...>>
        console.log("GET /RescueTeams:", res);

        const data = extractApiData(res);

        if (Array.isArray(data)) {
          const availableOnly = data.filter((t) => {
            const status =
              t.currentStatus ??
              t.CurrentStatus ??
              t.status ??
              t.Status ??
              "";
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
      } catch (e) {
        console.error("Load rescue teams failed:", e);
        setTeams([]);
        setTeamsError(e?.message || "Failed to load rescue teams");
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
  useEffect(() => {
    const loadRealRequests = async () => {
      try {
        const res = await getAllRescueRequests();
        console.log("GET /RescueRequests:", res);
        if (res?.success && Array.isArray(res.content)) {
          const normalized = res.content
            .map(mapRequestToUI)
            .filter(
              (item) =>
                item?.id &&
                Number.isFinite(item?.location?.lat) &&
                Number.isFinite(item?.location?.lng)
            );

          setAllRequests(normalized);
        } else {
          setAllRequests([]);
        }
      } catch (error) {
        console.warn("Load rescue requests failed:", error);
        setAllRequests([]);
      }
    };

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
    if (request?.assignedTeamId) setSelectedTeamId(String(request.assignedTeamId));
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

    // chỉ dispatch khi pending
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

      // backend có thể trả DispatchMissionResponseDTO, mình đọc kiểu “defensive”
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
        (missionId ? ` (Mission #${missionId})` : "")
      );
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
      })
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
          <div>
            <h1>🌊 Flood Relief Coordination Board</h1>

            <div className="noti">
              <p className="dashboard-subtitle">
                Emergency relief management and coordination system in flood
                situations.
              </p>

              <button
                className={`notification-bell ${unreadCount > 0 ? "active" : ""}`}
                onClick={() => setShowNotifications(!showNotifications)}
              >
                🔔
                {unreadCount > 0 && (
                  <span className="notification-badge">{unreadCount}</span>
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

          <div className="stat-card">
            <div className="stat-icon flood">💦</div>
            <div className="stat-info">
              <h3>High water level areas</h3>
              <div className="stat-number">{stats.highWaterLevel}</div>
              <div className="stat-sub">(&gt;1.5m)</div>
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
          <h3>🔍 Filter rescue requests</h3>
          <div className="filter-controls">
            <div className="filter-group">
              <label>Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="filter-select"
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="all">All</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Type of request</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="filter-select"
              >
                {emergencyTypes.map((type) => (
                  <option key={type} value={type}>
                    {type === "all" ? "All types" : type}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Priority Level</label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">All priorities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Flood Level</label>
              <select
                value={floodLevelFilter}
                onChange={(e) => setFloodLevelFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">All flood levels</option>
                <option value="low">Low (&lt;0.5m)</option>
                <option value="medium">Medium (0.5-1.5m)</option>
                <option value="high">High (&gt;1.5m)</option>
              </select>
            </div>

            <button
              className="reset-filters-btn"
              onClick={() => {
                setStatusFilter("active");
                setTypeFilter("all");
                setPriorityFilter("all");
                setFloodLevelFilter("all");
                setShowCompleted(false);
              }}
            >
              🔄 Reset filters
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="main-content">
          {/* Left: Requests List */}
          <div className="requests-panel">
            <div className="panel-header">
              <div>
                <h2>📋 List of requirements ({filteredRequests.length})</h2>
                <span className="last-update">
                  {stats.newRequests > 0 && (
                    <span className="new-indicator">
                      • {stats.newRequests} New
                    </span>
                  )}
                </span>
              </div>
              <div className="request-counts">
                <span className="count-badge pending">{stats.pending}</span>
                <span className="count-badge in-progress">
                  {stats.inProgress}
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
                filteredRequests.map((request) => (
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
          </div>

          {/* Right: Map and Details */}
          <div className="map-details-panel">
            {/* Map Section */}
            <div className="map-section">
              <div className="panel-header">
                <h2>🗺️ Flood Map</h2>
                <div className="map-legend">
                  <div className="legend-item">
                    <span className="legend-dot critical"></span>
                    <span>Emergency</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot medical"></span>
                    <span>Medical</span>
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
                    height: "400px",
                    width: "100%",
                    borderRadius: "10px",
                  }}
                >
                  <ChangeView center={mapCenter} zoom={mapZoom} />
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />

                  {allRequests
                    .filter((req) => (!showCompleted ? req.status !== "completed" : true))
                    .filter(
                      (req) =>
                        req.location &&
                        Number.isFinite(req.location.lat) &&
                        Number.isFinite(req.location.lng)
                    )
                    .map((request) => {
                      return (
                        <Marker
                          key={request.id}
                          position={[
                            request.location.lat,
                            request.location.lng,
                          ]}
                          icon={
                            request.status === "pending"
                              ? dotIcon("red")
                              : request.status === "in_progress"
                                ? dotIcon("orange")
                                : dotIcon("green")
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
                              <small>
                                Number of people: {request.peopleCount}
                              </small>
                              <br />
                              {request.isNew && <small>🆕 NEW</small>}
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}
                </MapContainer>
              </div>
            </div>

            {/* Details Section */}
            <div className="details-section">
              {selectedRequest ? (
                <div className="request-details-card">
                  <div className="details-header">
                    <h3>📋 Request details #{selectedRequest.requestId}</h3>
                    {selectedRequest.isNew && (
                      <span className="new-tag">🆕 NEW</span>
                    )}
                  </div>

                  <div className="details-grid">
                    <div className="detail-group">
                      <h4>👤 Information of requester</h4>
                      <div className="detail-item">
                        <span className="detail-label">
                          Full name:{" "}
                          <span className="detail-value">
                            {selectedRequest.fullName}
                          </span>
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">
                          Phone number:{" "}
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
                      <div className="detail-item">
                        <span className="detail-label">
                          Contact via:{" "}
                          <span className="detail-value">
                            {selectedRequest.contactVia}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="detail-group">
                      <h4>🌊 Flood Status</h4>
                      <div className="detail-item">
                        <span className="detail-label">
                          Emergency type:{" "}
                          <span className="detail-value badge">
                            {selectedRequest.emergencyType ===
                              "People trapped in the water"
                              ? "🌊"
                              : selectedRequest.emergencyType ===
                                "The house was flooded."
                                ? "🏠"
                                : selectedRequest.emergencyType ===
                                  "Food/water is needed."
                                  ? "📦"
                                  : selectedRequest.emergencyType ===
                                    "Medicine is needed."
                                    ? "💊"
                                    : selectedRequest.emergencyType ===
                                      "Life jackets/boat needed."
                                      ? "🛟"
                                      : selectedRequest.emergencyType ===
                                        "Landslide"
                                        ? "⛰️"
                                        : "🚨"}
                            {selectedRequest.emergencyType}
                          </span>
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">
                          Water level:{" "}
                          <span className="detail-value flood-level">
                            {selectedRequest.waterLevel}
                          </span>
                        </span>
                      </div>
                      <div className="detail-item">
                      </div>
                    </div>

                    <div className="detail-group full-width">
                      <h4>📍 Location Information</h4>
                      <div className="detail-item">
                        <span className="detail-label1">
                          Address:{" "}
                          <span className="detail-value">
                            {addressMap[selectedRequest.id] ||
                              selectedRequest.address ||
                              `${selectedRequest.location.lat.toFixed(6)}, ${selectedRequest.location.lng.toFixed(6)}`}
                          </span>
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label1">
                          Coordinates:{" "}
                          <span className="detail-value">
                            {selectedRequest.location.lat.toFixed(6)},{" "}
                            {selectedRequest.location.lng.toFixed(6)}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="detail-group full-width">
                      <h4>📝 Description of situation</h4>
                      <div className="description-box">
                        {selectedRequest.description}
                      </div>
                    </div>

                    <div className="detail-group">
                      <h4>🎯 Special needs</h4>
                      <div className="special-needs">
                        {selectedRequest.specialNeeds}
                      </div>
                    </div>

                    <div className="detail-group">
                      <h4>🖼️ Images</h4>
                      {selectedRequest.imageUrl ? (
                        <div className="image-preview">
                          <img src={selectedRequest.imageUrl} alt="Request" />
                        </div>
                      ) : (
                        <div className="image-preview empty">No image</div>
                      )}
                    </div>
                  </div>

                  <div className="action-buttons">
                    <div className="status-info">
                      <span className="status-label">Current status:</span>
                      <span
                        className={`status-badge ${selectedRequest.status}`}
                      >
                        {selectedRequest.status === "pending"
                          ? "⏳ Pending"
                          : selectedRequest.status === "in_progress"
                            ? "🚤 In progress"
                            : "✅ Completed"}
                      </span>

                      {selectedRequest.status === "in_progress" && (
                        <button
                          className="btn btn-success"
                          onClick={async () => {
                            try {

                              if (!selectedRequest.rescueMissionId) {
                                alert("Rescue mission ID is missing.");
                                return;
                              }
                              await completeMission(selectedRequest.rescueMissionId);

                              updateRequestStatus(selectedRequest.id, "completed");
                            } catch (err) {
                              alert(err.message);
                            }
                          }}
                        >
                          ✅ Mark as completed
                        </button>
                      )}
                    </div>

                    <div className="action-buttons-group">

                      {/* DISPATCH SECTION */}
                      <div className="dispatch-section">
                        {selectedRequest?.assignedTeamId && (
                          <div className="dispatch-assigned">
                            Assigned: <b>{selectedRequest.assignedTeamName || `Team #${selectedRequest.assignedTeamId}`}</b>
                            {selectedRequest.rescueMissionId && (
                              <span className="dispatch-mission"> • Mission #{selectedRequest.rescueMissionId}</span>
                            )}
                          </div>
                        )}
                        <div className="dispatch-row">
                          <select
                            className="dispatch-select"
                            value={selectedTeamId}
                            onChange={(e) => setSelectedTeamId(e.target.value)}
                            disabled={teamsLoading || !selectedRequest || selectedRequest.status !== "pending"}
                          >
                            <option value="">
                              {teamsLoading ? "Loading teams..." : "Select rescue team"}
                            </option>

                            {availableTeams.map((t) => {
                              const id = t.rescueTeamID ?? t.RescueTeamID ?? t.id ?? t.Id;
                              const label =
                                t.teamName ??
                                t.name ??
                                t.rescueTeamName ??
                                t.RescueTeamName ??
                                `Team #${id}`;
                              return (
                                <option key={id} value={id}>
                                  {label}
                                </option>
                              );
                            })}
                          </select>

                          <button
                            className="btn btn-dispatch"
                            onClick={handleDispatchMission}
                            disabled={
                              dispatching ||
                              !selectedTeamId ||
                              !selectedRequest ||
                              selectedRequest.status !== "pending"}
                          >
                            {dispatching ? "Dispatching..." : "🚑 Dispatch Team"}
                          </button>
                        </div>

                        {teamsError && <div className="dispatch-msg error">{teamsError}</div>}
                        {dispatchError && <div className="dispatch-msg error">{dispatchError}</div>}
                        {dispatchSuccess && (
                          <div className="dispatch-msg success"> {dispatchSuccess}</div>
                        )}
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
                          onClick={() => {
                            if (!selectedRequest.phoneNumber) {
                              alert("Phone number is not available.");
                              return;
                            }
                            window.open(`tel:${selectedRequest.phoneNumber}`);
                          }}
                        >
                          📞 Call now
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="no-selection">
                  <div className="no-selection-icon">👈</div>
                  <h3>Select a rescue request</h3>
                  <p>
                    Click on any request from the list to view details and
                    coordinate rescue efforts
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="incident-section">
          <div className="panel-header">
            <h2>⚠️ Pending Incident Reports</h2>
          </div>

          {incidentLoading && <p>Loading incidents...</p>}
          {incidentError && <p style={{ color: "red" }}>{incidentError}</p>}

          {!incidentLoading && pendingIncidents.length === 0 && (
            <p>No pending incidents.</p>
          )}

          <div className="requests-list">
            {pendingIncidents.map((incident) => (
              <div
                key={incident.incidentReportID}
                className={`request-card ${selectedIncident?.incidentReportID === incident.incidentReportID ? "selected" : ""}`}
                onClick={() => setSelectedIncident(incident)}
              >
                <div className="request-card-header">
                  <div className="request-id">#{incident.incidentReportID}</div>
                  <div className="status-badge pending">Pending</div>
                </div>

                <div className="request-card-body">
                  <h4 className="request-title">⚠️ {incident.title}</h4>

                  <div className="request-details">
                    <div className="detail-row">
                      <span className="detail-label">Team:</span>
                      <span className="detail-value">{incident.teamName}</span>
                    </div>

                    <div className="detail-row">
                      <span className="detail-label">Reporter:</span>
                      <span className="detail-value">{incident.reporterName}</span>
                    </div>

                    <div className="detail-row">
                      <span className="detail-label">Description:</span>
                      <span className="detail-value">{incident.description}</span>
                    </div>

                    <div className="detail-row">
                      <span className="detail-label">Created:</span>
                      <span className="detail-value">
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
                  <div className="description-box">{selectedIncident.title}</div>
                </div>

                <div className="detail-group full-width">
                  <h4>Description</h4>
                  <div className="description-box">{selectedIncident.description}</div>
                </div>

                <div className="detail-group">
                  <h4>Team</h4>
                  <div className="special-needs">{selectedIncident.teamName}</div>
                </div>

                <div className="detail-group">
                  <h4>Reporter</h4>
                  <div className="special-needs">{selectedIncident.reporterName}</div>
                </div>

                <div className="detail-group full-width">
                  <h4>Coordinator Note</h4>
                  <textarea
                    value={resolveNote}
                    onChange={(e) => setResolveNote(e.target.value)}
                    rows={4}
                    placeholder="Enter coordinator note..."
                    style={{ width: "100%", padding: "12px", borderRadius: "8px" }}
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
    </div >
  );
};

export default Dashboard;
