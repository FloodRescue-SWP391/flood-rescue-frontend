import "./Dashboard.css";
import Header from "../../components/common/Header";
import { fetchWithAuth } from "../../services/apiClient";
import { useEffect, useMemo, useState } from "react";

import {
  rescueMissionService,
  completeMission,
} from "../../services/rescueMissionService";
import { toast } from "react-hot-toast";
import {
  FaClipboardList,
  FaCheckCircle,
  FaMapMarkerAlt,
} from "react-icons/fa";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import signalRService from "../../services/signalrService";
import { CLIENT_EVENTS } from "../../data/signalrConstants";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import RequestDetailModal from "./RequestDetailModal";
import IncidentReportForm from "./IncidentReportForm";
import { incidentReportService } from "../../services/incidentReportService";
import { useNavigate } from "react-router-dom";

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
  } catch (e) {
    return dateString;
  }
};

const addressCache = new Map();
const AddressDisplay = ({ lat, lng }) => {
  const [address, setAddress] = useState("Đang tải vị trí...");

  useEffect(() => {
    if (lat == null || lng == null) {
      setAddress("Vị trí không hợp lệ");
      return;
    }

    const key = `${lat},${lng}`;
    if (addressCache.has(key)) {
      setAddress(addressCache.get(key));
      return;
    }

    const fetchAddress = async () => {
      try {
        await new Promise((r) => setTimeout(r, Math.random() * 1000 + 500));
        if (addressCache.has(key)) {
          setAddress(addressCache.get(key));
          return;
        }

        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        );
        const data = await res.json();
        const displayAddress = data.display_name || "Không tìm thấy địa chỉ";
        addressCache.set(key, displayAddress);
        setAddress(displayAddress);
      } catch (err) {
        setAddress(`Tọa độ: ${lat}, ${lng}`);
      }
    };
    fetchAddress();
  }, [lat, lng]);

  return <span>{address}</span>;
};

export default function RescueTeamLeader({ teamId }) {
  const [assigned, setAssigned] = useState([]);
  const [inProgress, setInProgress] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMission, setSelectedMission] = useState(null);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [userFullName, setUserFullName] = useState("");

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

  const getMissionId = (mission) =>
    mission?.rescueMissionID || mission?.rescueMissionId || mission?.id;

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

  const normalizeStatus = (status) => {
    const s = String(status || "")
      .trim()
      .toLowerCase();

    if (!s) return "unknown";
    if (s === "assigned") return "Assigned";
    if (s === "inprogress" || s === "in_progress" || s === "in progress") {
      return "InProgress";
    }
    if (s === "completed" || s === "complete") return "Completed";
    return status;
  };

  const getMissionStatus = (mission) => {
    const rawStatus =
      mission?.missionStatus ||
      mission?.currentStatus ||
      mission?.status ||
      mission?.newMissionStatus ||
      "Unknown";

    return normalizeStatus(rawStatus);
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

      return {
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
          detail?.citizenAddress ||
          detail?.address ||
          requestInfo?.address ||
          requestInfo?.locationAddress ||
          requestInfo?.formattedAddress ||
          null,

        description:
          mission?.description ||
          detail?.description ||
          requestInfo?.description ||
          requestInfo?.note ||
          null,

        requestType:
          mission?.requestType ||
          detail?.requestType ||
          requestInfo?.requestType ||
          requestInfo?.type ||
          null,

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

        missionStatus:
          mission?.missionStatus ||
          detail?.missionStatus ||
          detail?.status ||
          mission?.status ||
          null,

        teamName: mission?.teamName || detail?.teamName || null,
      };
    } catch (err) {
      console.error("Enrich mission detail error:", missionId, err);
      return mission;
    }
  };

  const loadMissions = async () => {
    if (!teamId || loading) return;
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

      const assignedList = enrichedMissions.filter(
        (m) => getMissionStatus(m) === "Assigned",
      );
      const inProgressList = enrichedMissions.filter(
        (m) => getMissionStatus(m) === "InProgress",
      );
      const completedList = enrichedMissions.filter(
        (m) => getMissionStatus(m) === "Completed",
      );

      setMissions(enrichedMissions);
      setAssigned(assignedList);
      setInProgress(inProgressList);
      setCompleted(completedList);
    } catch (err) {
      console.error("Load mission error:", err?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (teamId) {
      loadMissions();
    }
  }, [teamId]);

  useEffect(() => {
    const handleMissionNotification = () => loadMissions();

    const handleOrderPrepared = (data) => {
      const reliefOrderId =
        data?.reliefOrderID ||
        data?.ReliefOrderID ||
        data?.reliefOrderId ||
        data?.ReliefOrderId ||
        data?.id ||
        data?.ID ||
        "";
      const managerName =
        data?.managerName ||
        data?.ManagerName ||
        data?.preparedBy ||
        data?.PreparedBy ||
        "Manager";

      console.log("OrderPrepared:", data);
      loadMissions();
      toast.success(
        reliefOrderId
          ? `${managerName} đã chuẩn bị xong đơn supply #${reliefOrderId}.`
          : `${managerName} đã chuẩn bị xong đơn supply cho đội của bạn.`,
      );
    };

    const handleIncidentResolved = (data) => {
      console.log("IncidentResolved:", data);
      loadMissions();
      window.alert("Coordinator đã xử lý incident của đội bạn.");
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
          CLIENT_EVENTS.INCIDENT_RESOLVED,
          handleIncidentResolved,
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
        CLIENT_EVENTS.INCIDENT_RESOLVED,
        handleIncidentResolved,
      );
    };
  }, [teamId]);

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
      await loadMissions();
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
        await loadMissions();
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
        await loadMissions();
      } else {
        console.error(res?.message || "Reject failed");
      }
    } catch (err) {
      console.error("Reject mission error:", err);
    }
  };

  const handlePickup = async (mission) => {
    try {
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

      await loadMissions();
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

      const status = getMissionStatus(mission);
      if (status !== "InProgress") {
        window.alert(
          "Không thể hoàn thành: nhiệm vụ không ở trạng thái Đang thực hiện.",
        );
        return;
      }

      await completeMission(missionId);
      await loadMissions();
    } catch (err) {
      console.error("Complete mission error:", err);
    }
  };

  const mapMissions = useMemo(() => {
    const all = [...assigned, ...inProgress, ...completed];
    return all.filter((m) => isValidCoord(getLatitude(m), getLongitude(m)));
  }, [assigned, inProgress, completed]);

  const defaultCenter =
    mapMissions.length > 0
      ? [
          Number(getLatitude(mapMissions[0])),
          Number(getLongitude(mapMissions[0])),
        ]
      : [10.8231, 106.6297];

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
                <button className="logout-btn2" onClick={handleLogout}>
                  🚪 Đăng xuất
                </button>
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
                      📝 Tạo lúc:{" "}
                      {mission?.requestCreatedTime
                        ? formatVNTime(mission.requestCreatedTime)
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
                    {getLatitude(mission) != null &&
                    getLongitude(mission) != null ? (
                      <AddressDisplay
                        lat={getLatitude(mission)}
                        lng={getLongitude(mission)}
                      />
                    ) : (
                      <span>Chưa có vị trí</span>
                    )}
                  </p>

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
                    {getLatitude(mission) != null &&
                    getLongitude(mission) != null ? (
                      <AddressDisplay
                        lat={getLatitude(mission)}
                        lng={getLongitude(mission)}
                      />
                    ) : (
                      <span>Chưa có vị trí</span>
                    )}
                  </p>

                  {(mission.reliefOrderID || mission.reliefOrderId) && (
                    <button
                      className="btn-accept"
                      onClick={() => handlePickup(mission)}
                    >
                      Xác nhận lấy hàng
                    </button>
                  )}

                  <div className="btn-group">
                    <button
                      className="btn-complete"
                      onClick={() => handleComplete(mission)}
                    >
                      Hoàn thành nhiệm vụ
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

          <div style={{ marginTop: 30 }}>
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
              <div className="panel" style={{ width: "100%" }}>
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
                        📝 Tạo lúc:{" "}
                        {mission?.requestCreatedTime
                          ? formatVNTime(mission.requestCreatedTime)
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
                      {getLatitude(mission) != null &&
                      getLongitude(mission) != null ? (
                        <AddressDisplay
                          lat={getLatitude(mission)}
                          lng={getLongitude(mission)}
                        />
                      ) : (
                        <span>Chưa có vị trí</span>
                      )}
                    </p>

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
