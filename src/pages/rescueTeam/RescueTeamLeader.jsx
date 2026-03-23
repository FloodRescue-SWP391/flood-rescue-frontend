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

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Đọc status mềm để tránh lệch tên field giữa backend và frontend.
const getStatus = (mission) =>
  String(
    mission?.status ?? mission?.Status ?? mission?.missionStatus ?? "",
  ).toLowerCase();

const normalizeMission = (mission) => ({
  ...mission,
  rescueMissionID: mission?.rescueMissionID ?? mission?.RescueMissionID,
  rescueRequestID: mission?.rescueRequestID ?? mission?.RescueRequestID,
  status: mission?.status ?? mission?.Status ?? mission?.missionStatus,
  citizenName:
    mission?.citizenName ??
    mission?.CitizenName ??
    mission?.requestShortCode ??
    mission?.RescueRequestID,
  citizenAddress:
    mission?.citizenAddress ?? mission?.CitizenAddress ?? "No address",
  description: mission?.description ?? mission?.Description ?? "",
  locationLatitude: mission?.locationLatitude ?? mission?.LocationLatitude,
  locationLongitude: mission?.locationLongitude ?? mission?.LocationLongitude,
  reliefOrderID: mission?.reliefOrderID ?? mission?.ReliefOrderID ?? null,
});

export default function RescueTeamLeader({ teamId }) {
  // const [assigned, setAssigned] = useState([]);
  // const [inProgress, setInProgress] = useState([]);
  // const [completed, setCompleted] = useState([]);
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(false);

  /* ================= HELPERS ================= */

  const getMissionId = (mission) =>
    mission?.rescueMissionID || mission?.rescueMissionId || mission?.id;

  const getCitizenName = (mission) =>
    mission?.citizenName ||
    mission?.fullName ||
    mission?.rescueRequest?.citizenName ||
    mission?.rescueRequest?.fullName ||
    mission?.incidentReport?.citizenName ||
    "Citizen";

  const getDescription = (mission) =>
    mission?.description ||
    mission?.rescueRequest?.description ||
    mission?.incidentReport?.description ||
    "No description";

  const getLatitude = (mission) =>
    mission?.locationLatitude ??
    mission?.latitude ??
    mission?.lat ??
    mission?.rescueRequest?.locationLatitude ??
    mission?.rescueRequest?.latitude ??
    mission?.rescueRequest?.lat ??
    mission?.incidentReport?.locationLatitude ??
    mission?.incidentReport?.latitude ??
    mission?.incidentReport?.lat;

  const getLongitude = (mission) =>
    mission?.locationLongitude ??
    mission?.longitude ??
    mission?.lng ??
    mission?.lon ??
    mission?.rescueRequest?.locationLongitude ??
    mission?.rescueRequest?.longitude ??
    mission?.rescueRequest?.lng ??
    mission?.rescueRequest?.lon ??
    mission?.incidentReport?.locationLongitude ??
    mission?.incidentReport?.longitude ??
    mission?.incidentReport?.lng ??
    mission?.incidentReport?.lon;

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

      console.log("MISSION DATA:", json);
      console.log("MISSION ARRAY:", json?.content?.data);

      const missions =
        json?.content?.data || json?.content?.items || json?.content || [];

      const assignedList = missions.filter((m) => m.status === "Assigned");
      const inProgressList = missions.filter((m) => m.status === "InProgress");
      const completedList = missions.filter((m) => m.status === "Completed");

      setAssigned(assignedList);
      setInProgress(inProgressList);
      setCompleted(completedList);

      if (missions.length > 0) {
        console.log("FIRST MISSION:", missions[0]);
        console.log("LAT:", getLatitude(missions[0]));
        console.log("LNG:", getLongitude(missions[0]));
      }
    } catch (err) {
      console.error("Load mission error:", err);
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

  const handleAccept = async (mission) => {
    try {
      const missionId = getMissionId(mission);

      console.log("MISSION CLICKED:", mission);
      console.log("MISSION ID SENT:", missionId);
      console.log("MISSION STATUS:", mission?.status);

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
      console.log("MISSION STATUS:", mission?.status);

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
      console.log("COMPLETE MISSION STATUS:", mission?.status);

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
              <h1 className="dashboard-title">Rescue Team Leader</h1>
              <p className="dashboard-sub">Team ID: {teamId}</p>
            </div>
          </div>

          <div className="stats">
            <div className="stat-card blue">
              <div className="stat-info">
                <span>Assigned</span>
                <h3>{assigned.length}</h3>
              </div>
              <FaClipboardList className="stat-icon" />
            </div>

            <div className="stat-card green">
              <div className="stat-info">
                <span>In Progress</span>
                <h3>{inProgress.length}</h3>
              </div>
              <FaCheckCircle className="stat-icon" />
            </div>

            <div className="stat-card gray">
              <div className="stat-info">
                <span>Completed</span>
                <h3>{completed.length}</h3>
              </div>
              <FaCheckCircle className="stat-icon" />
            </div>
          </div>

          <div className="panels">
            <div className="panel">
              <div className="panel-title">Assigned Missions</div>
              {assigned.length === 0 && <p>No assigned missions</p>}
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
                      Accept
                    </button>

                    <button
                      className="btn-reject"
                      onClick={() => handleReject(mission)}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="panel">
              <div className="panel-title">In Progress</div>
              {inProgress.length === 0 && <p>No missions in progress</p>}
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
                      Confirm Pickup
                    </button>
                  )}

                  <button
                    className="btn-complete"
                    onClick={() => handleComplete(mission)}
                  >
                    Complete Mission
                  </button>
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
                    Status: {m.status}
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>
      </div>
    </>
  );
}
