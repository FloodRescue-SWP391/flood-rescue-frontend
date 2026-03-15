import "./Dashboard.css";
import Header from "../../components/common/Header";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import {
  rescueMissionService,
  completeMission
} from "../../services/rescueMissionService";

import {
  FaShieldAlt,
  FaClipboardList,
  FaCheckCircle,
  FaMapMarkerAlt
} from "react-icons/fa";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup
} from "react-leaflet";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

/* ================= LEAFLET FIX ================= */

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
});

export default function RescueTeamLeader() {

  const { teamId } = useParams();

  const [assigned, setAssigned] = useState([]);
  const [inProgress, setInProgress] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [loading, setLoading] = useState(false);

  /* ================= LOAD MISSIONS ================= */

  const loadMissions = async () => {

    if (!teamId) return;

    setLoading(true);

    try {

      const res = await rescueMissionService.filter({
        rescueTeamID: teamId,
        pageNumber: 1,
        pageSize: 50
      });

      const json = await res.json();

      const missions = json?.content?.data || [];

      setAssigned(
        missions.filter(m => m.currentStatus === "Assigned")
      );

      setInProgress(
        missions.filter(m => m.currentStatus === "InProgress")
      );

      setCompleted(
        missions.filter(m => m.currentStatus === "Completed")
      );

    } catch (err) {

      console.error("Load mission error:", err);

    }

    setLoading(false);

  };

  /* ================= AUTO REFRESH ================= */

  useEffect(() => {

    loadMissions();

    const interval = setInterval(loadMissions, 5000);

    return () => clearInterval(interval);

  }, [teamId]);

  /* ================= ACTIONS ================= */

  const handleAccept = async (id) => {

    try {

      await rescueMissionService.respond({
        rescueMissionID: id,
        isAccepted: true
      });

      loadMissions();

    } catch (err) {

      console.error("Accept mission error:", err);

    }

  };

  const handleReject = async (id) => {

    try {

      await rescueMissionService.respond({
        rescueMissionID: id,
        isAccepted: false,
        rejectReason: "Team unavailable"
      });

      loadMissions();

    } catch (err) {

      console.error("Reject mission error:", err);

    }

  };

  const handlePickup = async (mission) => {

    try {

      await rescueMissionService.confirmPickup({
        rescueMissionID: mission.rescueMissionID,
        reliefOrderID: mission.reliefOrderID
      });

      loadMissions();

    } catch (err) {

      console.error("Confirm pickup error:", err);

    }

  };

  const handleComplete = async (id) => {

    try {

      await completeMission(id);

      loadMissions();

    } catch (err) {

      console.error("Complete mission error:", err);

    }

  };

  /* ================= MAP MISSIONS ================= */

  const mapMissions = [...assigned, ...inProgress].filter(
    m => m.locationLatitude && m.locationLongitude
  );

  /* ================= UI ================= */

  return (
    <>
      <Header />

      <div className="dashboard-container">

        <div className="dashboard-content">

          {/* HEADER */}

          <div className="dashboard-header">

            <FaShieldAlt size={32} color="red" />

            <div>

              <h1 className="dashboard-title">
                Rescue Team Leader
              </h1>

              <p className="dashboard-sub">
                Team ID: {teamId}
              </p>

            </div>

          </div>

          {/* STATS */}

          <div className="stats">

            <div className="stat-card blue">

              <div className="stat-info">
                <span>Assigned</span>
                <h3>{assigned.length}</h3>
              </div>

              <FaClipboardList className="stat-icon"/>

            </div>

            <div className="stat-card green">

              <div className="stat-info">
                <span>In Progress</span>
                <h3>{inProgress.length}</h3>
              </div>

              <FaCheckCircle className="stat-icon"/>

            </div>

            <div className="stat-card gray">

              <div className="stat-info">
                <span>Completed</span>
                <h3>{completed.length}</h3>
              </div>

              <FaCheckCircle className="stat-icon"/>

            </div>

          </div>

          {/* PANELS */}

          <div className="panels">

            {/* ASSIGNED MISSIONS */}

            <div className="panel">

              <div className="panel-title">
                Assigned Missions
              </div>

              {assigned.length === 0 && (
                <p>No assigned missions</p>
              )}

              {assigned.map(mission => (

                <div
                  className="request-card"
                  key={mission.rescueMissionID}
                >

                  <p><b>{mission.citizenName}</b></p>

                  <p>
                    <FaMapMarkerAlt/>
                    {mission.locationLatitude}, {mission.locationLongitude}
                  </p>

                  <div className="btn-group">

                    <button
                      className="btn-accept"
                      onClick={() => handleAccept(mission.rescueMissionID)}
                    >
                      Accept
                    </button>

                    <button
                      className="btn-reject"
                      onClick={() => handleReject(mission.rescueMissionID)}
                    >
                      Reject
                    </button>

                  </div>

                </div>

              ))}

            </div>

            {/* IN PROGRESS MISSIONS */}

            <div className="panel">

              <div className="panel-title">
                In Progress
              </div>

              {inProgress.length === 0 && (
                <p>No missions in progress</p>
              )}

              {inProgress.map(mission => (

                <div
                  className="request-card"
                  key={mission.rescueMissionID}
                >

                  <p><b>{mission.citizenName}</b></p>

                  <button
                    className="btn-accept"
                    onClick={() => handlePickup(mission)}
                  >
                    Confirm Pickup
                  </button>

                  <button
                    className="btn-complete"
                    onClick={() => handleComplete(mission.rescueMissionID)}
                  >
                    Complete Mission
                  </button>

                </div>

              ))}

            </div>

          </div>

          {/* MAP */}

          <div style={{ marginTop: 30 }}>

            <MapContainer
              center={[10.8231, 106.6297]}
              zoom={13}
              style={{ height: "400px" }}
            >

              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {mapMissions.map(m => (

                <Marker
                  key={m.rescueMissionID}
                  position={[
                    m.locationLatitude,
                    m.locationLongitude
                  ]}
                >

                  <Popup>

                    <b>{m.citizenName}</b>

                    <br/>

                    {m.description}

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