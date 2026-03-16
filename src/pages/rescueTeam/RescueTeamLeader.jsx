// Màn hình dành cho Rescue Team Leader: nhận mission mới, OrderPrepared và IncidentResolved.
import "./Dashboard.css";
import Header from "../../components/common/Header";
import { useEffect, useMemo, useState } from "react";
import { rescueMissionService, completeMission } from "../../services/rescueMissionService";
import { FaShieldAlt, FaClipboardList, FaCheckCircle, FaMapMarkerAlt } from "react-icons/fa";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import signalRService from "../../services/signalrService";
import { CLIENT_EVENTS } from "../../data/signalrConstants";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Đọc status mềm để tránh lệch tên field giữa backend và frontend.
const getStatus = (mission) =>
  String(mission?.status ?? mission?.Status ?? mission?.missionStatus ?? "").toLowerCase();

const normalizeMission = (mission) => ({
  ...mission,
  rescueMissionID: mission?.rescueMissionID ?? mission?.RescueMissionID,
  rescueRequestID: mission?.rescueRequestID ?? mission?.RescueRequestID,
  status: mission?.status ?? mission?.Status ?? mission?.missionStatus,
  citizenName: mission?.citizenName ?? mission?.CitizenName ?? mission?.requestShortCode ?? mission?.RescueRequestID,
  citizenAddress: mission?.citizenAddress ?? mission?.CitizenAddress ?? "No address",
  description: mission?.description ?? mission?.Description ?? "",
  locationLatitude: mission?.locationLatitude ?? mission?.LocationLatitude,
  locationLongitude: mission?.locationLongitude ?? mission?.LocationLongitude,
  reliefOrderID: mission?.reliefOrderID ?? mission?.ReliefOrderID ?? null,
});

export default function RescueTeamLeader({ teamId }) {
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load lại mission từ backend mỗi khi vào màn hoặc khi có event realtime.
  const loadMissions = async () => {
    if (!teamId || loading) return;
    setLoading(true);

    try {
      const json = await rescueMissionService.filter({
        rescueTeamID: teamId,
        pageNumber: 1,
        pageSize: 50,
      });

      const rawMissions =
        json?.content?.data ?? json?.content?.items ?? json?.content ?? [];

      setMissions(Array.isArray(rawMissions) ? rawMissions.map(normalizeMission) : []);
    } catch (err) {
      console.error("Load mission error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMissions();
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
        await signalRService.on(CLIENT_EVENTS.RECEIVE_MISSION_NOTIFICATION, handleMissionNotification);
        await signalRService.on(CLIENT_EVENTS.ORDER_PREPARED, handleOrderPrepared);
        await signalRService.on(CLIENT_EVENTS.INCIDENT_RESOLVED, handleIncidentResolved);
      } catch (err) {
        console.error("SignalR init error in RescueTeamLeader:", err);
      }
    };

    init();

    return () => {
      signalRService.off(CLIENT_EVENTS.RECEIVE_MISSION_NOTIFICATION, handleMissionNotification);
      signalRService.off(CLIENT_EVENTS.ORDER_PREPARED, handleOrderPrepared);
      signalRService.off(CLIENT_EVENTS.INCIDENT_RESOLVED, handleIncidentResolved);
    };
  }, [teamId]);

  const assigned = useMemo(() => missions.filter((m) => getStatus(m) === "assigned"), [missions]);
  const inProgress = useMemo(() => missions.filter((m) => getStatus(m) === "inprogress"), [missions]);
  const completed = useMemo(() => missions.filter((m) => getStatus(m) === "completed"), [missions]);
  const mapMissions = useMemo(
    () => missions.filter((m) => Number.isFinite(Number(m.locationLatitude)) && Number.isFinite(Number(m.locationLongitude))),
    [missions],
  );

  const handleAccept = async (id) => {
    try {
      await rescueMissionService.respond({ rescueMissionID: id, isAccepted: true });
      await loadMissions();
    } catch (err) {
      console.error("Accept mission error:", err);
    }
  };

  const handleReject = async (id) => {
    try {
      await rescueMissionService.respond({
        rescueMissionID: id,
        isAccepted: false,
        rejectReason: "Team unavailable",
      });
      await loadMissions();
    } catch (err) {
      console.error("Reject mission error:", err);
    }
  };

  const handlePickup = async (mission) => {
    try {
      if (!mission.reliefOrderID) {
        window.alert("Mission này chưa có relief order để confirm pickup.");
        return;
      }

      await rescueMissionService.confirmPickup({
        rescueMissionID: mission.rescueMissionID,
        reliefOrderID: mission.reliefOrderID,
      });
      await loadMissions();
    } catch (err) {
      console.error("Confirm pickup error:", err);
    }
  };

  const handleComplete = async (id) => {
    try {
      await completeMission(id);
      await loadMissions();
    } catch (err) {
      console.error("Complete mission error:", err);
    }
  };

  return (
    <>
      <Header />
      <div className="dashboard-container">
        <div className="dashboard-content">
          <div className="dashboard-header">
            <FaShieldAlt size={32} color="red" />
            <div>
              <h1 className="dashboard-title">Rescue Team Leader</h1>
              <p className="dashboard-sub">Team ID: {teamId}</p>
            </div>
          </div>

          <div className="stats">
            <div className="stat-card blue"><div className="stat-info"><span>Assigned</span><h3>{assigned.length}</h3></div><FaClipboardList className="stat-icon" /></div>
            <div className="stat-card green"><div className="stat-info"><span>In Progress</span><h3>{inProgress.length}</h3></div><FaCheckCircle className="stat-icon" /></div>
            <div className="stat-card gray"><div className="stat-info"><span>Completed</span><h3>{completed.length}</h3></div><FaCheckCircle className="stat-icon" /></div>
          </div>

          <div className="panels">
            <div className="panel">
              <div className="panel-title">Assigned Missions</div>
              {assigned.length === 0 && <p>No assigned missions</p>}
              {assigned.map((mission) => (
                <div className="request-card" key={mission.rescueMissionID}>
                  <p><b>{mission.citizenName}</b></p>
                  <p><FaMapMarkerAlt /> {mission.citizenAddress}</p>
                  <div className="btn-group">
                    <button className="btn-accept" onClick={() => handleAccept(mission.rescueMissionID)}>Accept</button>
                    <button className="btn-reject" onClick={() => handleReject(mission.rescueMissionID)}>Reject</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="panel">
              <div className="panel-title">In Progress</div>
              {inProgress.length === 0 && <p>No missions in progress</p>}
              {inProgress.map((mission) => (
                <div className="request-card" key={mission.rescueMissionID}>
                  <p><b>{mission.citizenName}</b></p>
                  <p><FaMapMarkerAlt /> {mission.citizenAddress}</p>
                  <button className="btn-accept" onClick={() => handlePickup(mission)}>Confirm Pickup</button>
                  <button className="btn-complete" onClick={() => handleComplete(mission.rescueMissionID)}>Complete Mission</button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 30 }}>
            <MapContainer center={[10.8231, 106.6297]} zoom={13} style={{ height: "400px" }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {mapMissions.map((m) => (
                <Marker key={m.rescueMissionID} position={[Number(m.locationLatitude), Number(m.locationLongitude)]}>
                  <Popup><b>{m.citizenName}</b><br />{m.description || m.citizenAddress}</Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>
      </div>
    </>
  );
}
