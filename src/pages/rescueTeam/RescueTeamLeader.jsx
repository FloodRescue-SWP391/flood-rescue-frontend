// Màn hình dành cho Rescue Team Leader: nhận mission mới, OrderPrepared và IncidentResolved.
import "./Dashboard.css";
import Header from "../../components/common/Header";
import { useEffect, useMemo, useState } from "react";

import {
  rescueMissionService,
  completeMission,
} from "../../services/rescueMissionService";
import {
  FaShieldAlt,
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

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export default function RescueTeamLeader({ teamId }) {
  const [assigned, setAssigned] = useState([]);
  const [inProgress, setInProgress] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMission, setSelectedMission] = useState(null);
  const [showIncidentModal, setShowIncidentModal] = useState(false);

  /* ================= HELPERS ================= */

  const getMissionId = (mission) =>
    mission?.rescueMissionID || mission?.rescueMissionId || mission?.id;

  const getCitizenName = (mission) => {
    const name =
      mission?.citizenName ||
      mission?.fullName ||
      mission?.userName ||
      mission?.rescueRequest?.citizenName ||
      mission?.rescueRequest?.fullName ||
      mission?.rescueRequest?.userName ||
      mission?.rescueRequest?.requesterName ||
      mission?.incidentReport?.citizenName ||
      mission?.incidentReport?.fullName ||
      "Citizen";

    return name || "Citizen";
  };

  const getDescription = (mission) => {
    const desc =
      mission?.description ||
      mission?.title ||
      mission?.rescueRequest?.description ||
      mission?.rescueRequest?.title ||
      mission?.rescueRequest?.content ||
      mission?.incidentReport?.description ||
      "No description";

    return desc || "No description";
  };

  const getLatitude = (mission) => {
    const lat =
      mission?.latitude ??
      mission?.locationLatitude ??
      mission?.lat ??
      mission?.rescueRequest?.latitude ??
      mission?.rescueRequest?.locationLatitude ??
      mission?.rescueRequest?.lat ??
      mission?.incidentReport?.latitude ??
      mission?.incidentReport?.locationLatitude;

    return lat ? Number(lat) : 10.7769; // Default Saigon coordinates
  };

  const getLongitude = (mission) => {
    const lng =
      mission?.longitude ??
      mission?.locationLongitude ??
      mission?.lng ??
      mission?.lon ??
      mission?.rescueRequest?.longitude ??
      mission?.rescueRequest?.locationLongitude ??
      mission?.rescueRequest?.lng ??
      mission?.incidentReport?.longitude ??
      mission?.incidentReport?.locationLongitude;

    return lng ? Number(lng) : 106.6541; // Default Saigon coordinates
  };

  const getMissionStatus = (mission) =>
    mission?.currentStatus ||
    mission?.status ||
    mission?.newMissionStatus ||
    "Unknown";

  const isValidCoord = (lat, lng) => {
    const latNum = Number(lat);
    const lngNum = Number(lng);
    return !Number.isNaN(latNum) && !Number.isNaN(lngNum);
  };

  /* ================= LOAD MISSIONS ================= */

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

      let missions =
        json?.content?.data || json?.content?.items || json?.content || [];

      if (!Array.isArray(missions)) {
        missions = Object.values(missions).filter(m => m?.rescueMissionID || m?.rescueMissionId);
      }

      // Add fallback data for display
      const enrichedMissions = missions.map((mission) => ({
        ...mission,
        description: mission.description || "Nhiệm vụ cứu hộ đang diễn ra",
        longitude: mission.longitude || 106.6541,
        latitude: mission.latitude || 10.7769,
      }));

      const assignedList = enrichedMissions.filter(
        (m) => getMissionStatus(m) === "Assigned"
      );
      const inProgressList = enrichedMissions.filter(
        (m) => getMissionStatus(m) === "InProgress"
      );
      const completedList = enrichedMissions.filter(
        (m) => getMissionStatus(m) === "Completed"
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

  /* ================= AUTO REFRESH ================= */

  // useEffect(() => {
  //   loadMissions();

  //   const interval = setInterval(() => {
  //     loadMissions();
  //   }, 5000);

  //   return () => clearInterval(interval);
  // }, [teamId]);
  useEffect(() => {
    if (teamId) {
      loadMissions();
    }
  }, [teamId]);
  useEffect(() => {
    const handleMissionNotification = () => loadMissions();
    const handleOrderPrepared = (data) => {
      console.log("OrderPrepared:", data);
      loadMissions();
      window.alert("Manager đã chuẩn bị xong hàng cho team leader.");
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
  /* ================= ACTIONS ================= */

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
    // Mock API call - replace with real endpoint when available
    console.log("Incident Report Submitted:", formData);
    // After submission, refresh missions
    await loadMissions();
  };

  const handleAccept = async (mission) => {
    try {
      const missionId = getMissionId(mission);

      console.log("MISSION CLICKED:", mission);
      console.log("MISSION ID SENT:", missionId);
      console.log("MISSION STATUS:", mission?.currentStatus);

      if (!missionId) {
        console.error("Mission ID is missing", mission);
        return;
      }

      const res = await rescueMissionService.respond({
        rescueMissionID: missionId,
        isAccepted: true,
        rejectReason: "",
      });

      console.log("ACCEPT RESPONSE:", res);

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

      console.log("MISSION CLICKED:", mission);
      console.log("MISSION ID SENT:", missionId);
      console.log("MISSION STATUS:", mission?.currentStatus);

      if (!missionId) {
        console.error("Mission ID is missing", mission);
        return;
      }

      const res = await rescueMissionService.respond({
        rescueMissionID: missionId,
        isAccepted: false,
        rejectReason: "Team unavailable",
      });

      console.log("REJECT RESPONSE:", res);

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

      // loadMissions();
      await loadMissions();
    } catch (err) {
      console.error("Confirm pickup error:", err);
    }
  };

  const handleComplete = async (mission) => {
    try {
      const missionId = getMissionId(mission);

      console.log("COMPLETE MISSION OBJECT:", mission);
      console.log("COMPLETE MISSION ID:", missionId);
      console.log("COMPLETE MISSION STATUS:", mission?.currentStatus);

      if (!missionId) {
        console.error("Mission ID is missing");
        return;
      }

      await completeMission(missionId);
      await loadMissions();
    } catch (err) {
      console.error("Complete mission error:", err);
    }
  };

  /* ================= MAP MISSIONS ================= */

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

  /* ================= UI ================= */

  return (
    <>
      <Header />
      <div className="dashboard-container">
        <div className="dashboard-content">
          <div className="dashboard-header">
            <FaShieldAlt size={32} color="red" />
            <div>
              <h1 className="dashboard-title">Trưởng đội cứu hộ</h1>
              <p className="dashboard-sub">Đội: {teamId?.substring(0, 8) || "Không xác định"}</p>
            </div>
          </div>

          <div className="stats">
            <div className="stat-card blue">
              <div className="stat-info">
                <span>Gán cho tôi</span>
                <h3>{assigned.length}</h3>
              </div>
              <FaClipboardList className="stat-icon" />
            </div>

            <div className="stat-card green">
              <div className="stat-info">
                <span>Đang thực hiện</span>
                <h3>{inProgress.length}</h3>
              </div>
              <FaCheckCircle className="stat-icon" />
            </div>

            <div className="stat-card gray">
              <div className="stat-info">
                <span>Hoàn thành</span>
                <h3>{completed.length}</h3>
              </div>
              <FaCheckCircle className="stat-icon" />
            </div>
          </div>

          <div className="panels">
            <div className="panel">
              <div className="panel-title">Nhiệm vụ được gán</div>
              {assigned.length === 0 && <p>Không có nhiệm vụ được gán</p>}
              {assigned.map((mission) => (
                <div className="request-card" key={getMissionId(mission)}>
                  <p>
                    <b>{getCitizenName(mission)}</b>
                  </p>

                  <p>{getDescription(mission)}</p>

                  <p>
                    <FaMapMarkerAlt /> {String(getLatitude(mission) ?? "N/A")},{" "}
                    {String(getLongitude(mission) ?? "N/A")}
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
              <div className="panel-title">Đang thực hiện</div>
              {inProgress.length === 0 && <p>Không có nhiệm vụ nào đang thực hiện</p>}
              {inProgress.map((mission) => (
                <div className="request-card" key={getMissionId(mission)}>
                  <p>
                    <b>{getCitizenName(mission)}</b>
                  </p>

                  <p>{getDescription(mission)}</p>

                  <p>
                    <FaMapMarkerAlt /> {String(getLatitude(mission) ?? "N/A")},{" "}
                    {String(getLongitude(mission) ?? "N/A")}
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
                    Status: {getMissionStatus(m)}
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {/* Modals */}
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
