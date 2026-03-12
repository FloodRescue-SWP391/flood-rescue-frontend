import "./Dashboard.css";
import Header from "../../components/common/Header";
import { useEffect, useState } from "react";

import {
  rescueMissionService,
  completeMission
} from "../../services/rescueMissionService";

import {
  FaShieldAlt,
  FaClipboardList,
  FaCheckCircle,
  FaUsers,
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

/* FIX ICON */
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
});

export default function RescueTeam() {

  const [assigned, setAssigned] = useState([]);
  const [inProgress, setInProgress] = useState([]);
  const [completed, setCompleted] = useState([]);

  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedMission, setSelectedMission] = useState(null);

  const teamId = localStorage.getItem("teamId");

  // FIX: fallback teamId nếu chưa có
  const safeTeamId =
    teamId || "8c6813a2-7d06-4eb1-ba5c-0e3d92765cc3";

  /* ================= LOAD MISSIONS ================= */

  const loadMissions = async () => {

    try {

      const res = await rescueMissionService.filter({
        rescueTeamID: safeTeamId,
        pageNumber: 1,
        pageSize: 50
      });

      // FIX: parse json
      const json = await res.json();

      // FIX: backend structure
      const missions =
        json?.content?.data ||
        json?.data ||
        [];

      // DEBUG
      console.log("MISSIONS:", missions);

      // FIX: backend trả currentStatus
      setAssigned(
        missions.filter(
          m => m.currentStatus === "Assigned"
        )
      );

      setInProgress(
        missions.filter(
          m => m.currentStatus === "InProgress"
        )
      );

      setCompleted(
        missions.filter(
          m => m.currentStatus === "Completed"
        )
      );

    } catch (err) {

      console.error("Load mission error:", err);

    }

  };

  /* ================= LOAD TEAM MEMBERS ================= */

  const loadTeam = async () => {

    try {

      // FIX: backend chưa có API này nên tắt
      // const res = await rescueMissionService.getTeamMembers(safeTeamId);
      // setTeamMembers(res.content || []);

      setTeamMembers([]);

    } catch (err) {

      console.error(err);

    }

  };

  /* ================= AUTO REFRESH ================= */

  useEffect(() => {

    loadMissions();
    loadTeam();

    const interval = setInterval(() => {

      loadMissions();

    }, 5000);

    return () => clearInterval(interval);

  }, []);

  /* ================= ACCEPT ================= */

  const handleAccept = async (id) => {

    await rescueMissionService.respond({
      rescueMissionID: id,
      isAccepted: true
    });

    loadMissions();

  };

  /* ================= REJECT ================= */

  const handleReject = async (id) => {

    await rescueMissionService.respond({
      rescueMissionID: id,
      isAccepted: false,
      rejectReason: "Team unavailable"
    });

    loadMissions();

  };

  /* ================= COMPLETE ================= */

  const handleComplete = async (id) => {

    await completeMission(id);

    loadMissions();

  };

  /* ================= PICKUP ================= */

  const handlePickup = async (mission) => {

    await rescueMissionService.confirmPickup({
      rescueMissionID: mission.rescueMissionID,
      reliefOrderID: mission.reliefOrderID
    });

    loadMissions();

  };

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
                Rescue Team Dashboard
              </h1>

              <p className="dashboard-sub">
                Team ID: {safeTeamId}
              </p>
            </div>

          </div>

          {/* TEAM INFO */}

          <div className="panel">

            <div className="panel-title">
              <FaUsers /> Team Members
            </div>

            {teamMembers.map(m => (
              <p key={m.userID}>
                {m.fullName} {m.isLeader && "(Leader)"}
              </p>
            ))}

          </div>

          {/* STATS */}

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

          {/* PANELS */}

          <div className="panels">

            {/* ASSIGNED */}

            <div className="panel">

              <div className="panel-title">
                Assigned Missions
              </div>

              {assigned.map(mission => (

                <div className="request-card" key={mission.rescueMissionID}>

                  <p><b>{mission.citizenName}</b></p>

                  <p>
                    <FaMapMarkerAlt />
                    {mission.locationLatitude},
                    {mission.locationLongitude}
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

                  <button
                    className="btn-complete"
                    onClick={() => setSelectedMission(mission)}
                  >
                    View Detail
                  </button>

                </div>

              ))}

            </div>

            {/* IN PROGRESS */}

            <div className="panel">

              <div className="panel-title">
                In Progress
              </div>

              {inProgress.map(mission => (

                <div className="request-card" key={mission.rescueMissionID}>

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

              {[...assigned, ...inProgress].map(m => (

                <Marker
                  key={m.rescueMissionID}
                  position={[
                    m.locationLatitude,
                    m.locationLongitude
                  ]}
                >

                  <Popup>

                    <b>{m.citizenName}</b>

                    <br />

                    {m.description}

                  </Popup>

                </Marker>

              ))}

            </MapContainer>

          </div>

          {/* MODAL */}

          {selectedMission && (

            <div className="modal-overlay">

              <div className="modal">

                <h2>Mission Detail</h2>

                <p>
                  Citizen: {selectedMission.citizenName}
                </p>

                <p>
                  {selectedMission.description}
                </p>

                <p>
                  Location:
                  {selectedMission.locationLatitude},
                  {selectedMission.locationLongitude}
                </p>

                <button
                  className="btn-complete"
                  onClick={() => handleComplete(selectedMission.rescueMissionID)}
                >
                  Complete Mission
                </button>

                <button
                  onClick={() => setSelectedMission(null)}
                >
                  Close
                </button>

              </div>

            </div>

          )}

        </div>

      </div>

    </>
  );
}