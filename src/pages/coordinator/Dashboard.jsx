import React, { useState, useEffect, useRef } from "react";
import "./Dashboard.css";
import Header from "../../components/common/Header.jsx";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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
  // State cho danh sách yêu cầu cứu trợ lũ lụt
  const [allRequests, setAllRequests] = useState([
    {
      id: 1,
      requestId: "FLOOD-001",
      fullName: "Nguyễn Văn A",
      phoneNumber: "0901234567",
      address: "123 Đường Nguyễn Văn Cừ, Quận 1, TP.HCM",
      location: { lat: 10.775, lng: 106.7 },
      emergencyType: "Người mắc kẹt trong nước",
      emergencyCategory: "life_threatening", // life_threatening, evacuation, supply, medical, equipment
      peopleCount: 3,
      priorityLevel: "Critical",
      description:
        "Nhà ngập sâu 2m, có 3 người già mắc kẹt trên tầng 2, nước đang dâng cao",
      status: "pending",
      timestamp: "15/01/2024 08:30",
      contactVia: "Phone Call",
      imageUrl: "https://via.placeholder.com/150",
      isNew: true,
      waterLevel: "2m", // Mức nước ngập
      specialNeeds: "Người già, không biết bơi",
    },
    {
      id: 2,
      requestId: "FLOOD-002",
      fullName: "Trần Thị B",
      phoneNumber: "0912345678",
      address: "456 Đường Lý Thường Kiệt, Quận 5, TP.HCM",
      location: { lat: 10.763, lng: 106.682 },
      emergencyType: "Cần thực phẩm/ nước uống",
      emergencyCategory: "supply",
      peopleCount: 5,
      priorityLevel: "High",
      description: "Hết thực phẩm 2 ngày, có 2 trẻ nhỏ, cần tiếp tế gấp",
      status: "in_progress",
      timestamp: "15/01/2024 09:15",
      contactVia: "Phone Call",
      imageUrl: "https://via.placeholder.com/150",
      isNew: false,
      waterLevel: "1.5m",
      specialNeeds: "Trẻ nhỏ cần sữa",
    },
    {
      id: 3,
      requestId: "FLOOD-003",
      fullName: "Lê Văn C",
      phoneNumber: "0923456789",
      address: "789 Đường 3/2, Quận 10, TP.HCM",
      location: { lat: 10.767, lng: 106.654 },
      emergencyType: "Cần thuốc men",
      emergencyCategory: "medical",
      peopleCount: 1,
      priorityLevel: "Critical",
      description: "Bệnh nhân tiểu đường hết insulin, cần thuốc gấp",
      status: "pending",
      timestamp: "14/01/2024 14:20",
      contactVia: "SMS",
      imageUrl: "https://via.placeholder.com/150",
      isNew: true,
      waterLevel: "1m",
      specialNeeds: "Insulin, bơm kim tiêm",
    },
    {
      id: 4,
      requestId: "FLOOD-004",
      fullName: "Phạm Thị D",
      phoneNumber: "0934567890",
      address: "321 Đường Xô Viết Nghệ Tĩnh, Bình Thạnh, TP.HCM",
      location: { lat: 10.783, lng: 106.671 },
      emergencyType: "Nhà bị ngập",
      emergencyCategory: "evacuation",
      peopleCount: 4,
      priorityLevel: "High",
      description: "Nhà ngập hoàn toàn, cần di dời đến nơi tránh lũ",
      status: "completed",
      timestamp: "13/01/2024 16:45",
      contactVia: "Phone Call",
      imageUrl: "https://via.placeholder.com/150",
      isNew: false,
      waterLevel: "2.5m",
      specialNeeds: "Di dời toàn bộ gia đình",
    },
    {
      id: 5,
      requestId: "FLOOD-005",
      fullName: "Hoàng Văn E",
      phoneNumber: "0945678901",
      address: "654 Đường Lê Văn Việt, Quận 9, TP.HCM",
      location: { lat: 10.801, lng: 106.714 },
      emergencyType: "Cần áo phao/thuyền",
      emergencyCategory: "equipment",
      peopleCount: 2,
      priorityLevel: "Medium",
      description: "Cần thuyền và áo phao để di chuyển ra ngoài mua thực phẩm",
      status: "pending",
      timestamp: "15/01/2024 10:00",
      contactVia: "Phone Call",
      imageUrl: "https://via.placeholder.com/150",
      isNew: true,
      waterLevel: "1.8m",
      specialNeeds: "Thuyền nhỏ, 2 áo phao người lớn",
    },
    {
      id: 6,
      requestId: "FLOOD-006",
      fullName: "Vũ Thị F",
      phoneNumber: "0956789012",
      address: "987 Đường Nguyễn Thị Minh Khai, Quận 3, TP.HCM",
      location: { lat: 10.769, lng: 106.685 },
      emergencyType: "Sạt lở đất",
      emergencyCategory: "life_threatening",
      peopleCount: 2,
      priorityLevel: "Critical",
      description: "Đất sạt lở sau nhà, đe dọa sập nhà",
      status: "in_progress",
      timestamp: "15/01/2024 11:30",
      contactVia: "Phone Call",
      imageUrl: "https://via.placeholder.com/150",
      isNew: false,
      waterLevel: "0.5m",
      specialNeeds: "Cần đội cứu hộ đặc biệt",
    },
  ]);

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [mapCenter, setMapCenter] = useState([10.775, 106.686]);
  const [mapZoom, setMapZoom] = useState(13);
  const [statusFilter, setStatusFilter] = useState("active");
  const [typeFilter, setTypeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [showCompleted, setShowCompleted] = useState(false);
  const [floodLevelFilter, setFloodLevelFilter] = useState("all"); // Lọc theo mức nước

  // State cho thông báo
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: "critical",
      title: "🚨 CẤP CỨU: Người mắc kẹt trong nước!",
      message: "3 người già mắc kẹt trên tầng 2, nước dâng cao 2m",
      timestamp: "08:30 AM",
      requestId: "FLOOD-001",
      read: false,
    },
    {
      id: 2,
      type: "medical",
      title: "💊 Yêu cầu thuốc khẩn cấp",
      message: "Bệnh nhân tiểu đường cần insulin gấp",
      timestamp: "10:00 AM",
      requestId: "FLOOD-003",
      read: false,
    },
    {
      id: 3,
      type: "evacuation",
      title: "🚨 Cần di dời khẩn cấp",
      message: "Nhà ngập hoàn toàn, cần sơ tán 4 người",
      timestamp: "11:15 AM",
      requestId: "FLOOD-004",
      read: true,
    },
  ]);

  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isPlayingAlert, setIsPlayingAlert] = useState(false);

  const audioRef = useRef(null);

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

  // Cập nhật unread count
  useEffect(() => {
    const unread = notifications.filter((n) => !n.read).length;
    setUnreadCount(unread);
  }, [notifications]);

  // Giả lập nhận yêu cầu mới cho lũ lụt
  useEffect(() => {
    const simulateNewFloodRequest = () => {
      const floodTypes = [
        "Người mắc kẹt trong nước",
        "Nhà bị ngập",
        "Cần thực phẩm/ nước uống",
        "Cần thuốc men",
        "Cần áo phao/thuyền",
        "Cần di dời khẩn cấp",
        "Sạt lở đất",
        "Cây đổ/ đường sá hư hỏng",
        "Mất điện/ mất liên lạc",
      ];

      const categories = [
        "life_threatening",
        "evacuation",
        "supply",
        "medical",
        "equipment",
      ];
      const priorities = ["Critical", "High", "Medium"];

      const newId = Date.now();
      const newRequest = {
        id: newId,
        requestId: `FLOOD-${newId.toString().slice(-4)}`,
        fullName: `Công dân ${Math.floor(Math.random() * 1000)}`,
        phoneNumber: `09${Math.floor(Math.random() * 90000000 + 10000000)}`,
        address: `${Math.floor(Math.random() * 1000)} Đường, Quận ${Math.floor(Math.random() * 12) + 1}`,
        location: {
          lat: 10.775 + (Math.random() - 0.5) * 0.1,
          lng: 106.686 + (Math.random() - 0.5) * 0.1,
        },
        emergencyType:
          floodTypes[Math.floor(Math.random() * floodTypes.length)],
        emergencyCategory:
          categories[Math.floor(Math.random() * categories.length)],
        peopleCount: Math.floor(Math.random() * 6) + 1,
        priorityLevel:
          priorities[Math.floor(Math.random() * priorities.length)],
        description: "Yêu cầu cứu trợ lũ lụt khẩn cấp",
        status: "pending",
        timestamp: new Date().toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        contactVia: "Phone Call",
        imageUrl: "https://via.placeholder.com/150",
        isNew: true,
        waterLevel: `${(Math.random() * 3).toFixed(1)}m`,
        specialNeeds: Math.random() > 0.5 ? "Có người già/trẻ nhỏ" : "Không",
      };

      setAllRequests((prev) => [newRequest, ...prev]);

      // Tạo thông báo phù hợp
      let notificationType = "info";
      let notificationTitle = "🌧️ Yêu cầu cứu trợ mới";

      if (newRequest.emergencyCategory === "life_threatening") {
        notificationType = "critical";
        notificationTitle = "🚨 CẤP CỨU: Nguy hiểm tính mạng!";

        if (audioRef.current) {
          audioRef.current
            .play()
            .catch((e) => console.log("Audio play failed:", e));
          setIsPlayingAlert(true);
          setTimeout(() => setIsPlayingAlert(false), 5000);
        }
      } else if (newRequest.emergencyCategory === "medical") {
        notificationType = "medical";
        notificationTitle = "💊 Yêu cầu thuốc khẩn";
      } else if (newRequest.emergencyCategory === "supply") {
        notificationType = "supply";
        notificationTitle = "📦 Cần tiếp tế thực phẩm";
      } else if (newRequest.emergencyCategory === "evacuation") {
        notificationType = "evacuation";
        notificationTitle = "🚨 Cần di dời khẩn cấp";
      } else if (newRequest.emergencyCategory === "equipment") {
        notificationType = "equipment";
        notificationTitle = "🛟 Cần thiết bị cứu hộ";
      }

      const newNotification = {
        id: newId,
        type: notificationType,
        title: notificationTitle,
        message: `${newRequest.emergencyType} - ${newRequest.peopleCount} người, nước ngập ${newRequest.waterLevel}`,
        timestamp: new Date().toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        requestId: newRequest.requestId,
        read: false,
      };

      setNotifications((prev) => [newNotification, ...prev]);
    };

    // Simulate nhận yêu cầu mới mỗi 3 phút
    const interval = setInterval(simulateNewFloodRequest, 180000);

    // Simulate ngay 1 request để demo
    setTimeout(simulateNewFloodRequest, 3000);

    return () => clearInterval(interval);
  }, []);

  // Các hàm xử lý
  const handleRequestClick = (request) => {
    setSelectedRequest(request);
    setMapCenter([request.location.lat, request.location.lng]);
    setMapZoom(16);

    if (request.isNew) {
      setAllRequests((prev) =>
        prev.map((req) =>
          req.id === request.id ? { ...req, isNew: false } : req,
        ),
      );
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
                className="notification-bell"
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
                  <p>No requests found with current filters</p>
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
                            {request.address}
                          </span>
                        </div>

                        <div className="detail-row">
                          <span className="detail-label">💦 Water level:</span>
                          <span className="detail-value">
                            {request.waterLevel}
                          </span>
                        </div>

                        <div className="detail-row">
                          <span className="detail-label">👥 Numbers:</span>
                          <span className="detail-value">
                            {request.peopleCount} people
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
                    .filter((req) =>
                      !showCompleted ? req.status !== "completed" : true,
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
                            request.priorityLevel === "Critical"
                              ? dotIcon("red")
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
                          <a
                            href={`tel:${selectedRequest.phoneNumber}`}
                            className="detail-value link"
                          >
                            {selectedRequest.phoneNumber}
                          </a>
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
                        <span className="detail-label">
                          Number of people:{" "}
                          <span className="detail-value">
                            {selectedRequest.peopleCount} people
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="detail-group full-width">
                      <h4>📍 Location Information</h4>
                      <div className="detail-item">
                        <span className="detail-label1">
                          Address:{" "}
                          <span className="detail-value">
                            {selectedRequest.address}
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
                      <div className="image-preview">
                        <img
                          src={selectedRequest.imageUrl}
                          alt="Hình ảnh tình trạng"
                        />
                      </div>
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

                      {selectedRequest.status === "pending" && (
                        <button
                          className="btn btn-primary"
                          onClick={() =>
                            updateRequestStatus(
                              selectedRequest.id,
                              "in_progress",
                            )
                          }
                        >
                          🚤 Receiving rescue
                        </button>
                      )}

                      {selectedRequest.status === "in_progress" && (
                        <button
                          className="btn btn-success"
                          onClick={() =>
                            updateRequestStatus(selectedRequest.id, "completed")
                          }
                        >
                          ✅ Mark as completed
                        </button>
                      )}
                    </div>

                    <div className="action-buttons-group">
                      

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
                            window.open(`tel:${selectedRequest.phoneNumber}`)
                          }
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
      </div>
    </div>
  );
};

export default Dashboard;
