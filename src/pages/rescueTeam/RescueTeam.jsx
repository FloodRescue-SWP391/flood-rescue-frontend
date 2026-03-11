import "./Dashboard.css";
import Header from "../../components/common/Header";
import { useEffect, useState } from "react";
import { rescueMissionService, completeMission } from "../../services/rescueMissionService";

import {
  FaShieldAlt,
  FaClipboardList,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaPhone
} from "react-icons/fa";

export default function RescueTeam() {

  const [newRequests, setNewRequests] = useState([]);
  const [inProgress, setInProgress] = useState([]);
  const [completed, setCompleted] = useState([]);

  const loadMissions = async () => {
    try {

      const res = await rescueMissionService.getAll();
      const missions = res.data || [];

      setNewRequests(missions.filter(m => m.status === "Assigned"));
      setInProgress(missions.filter(m => m.status === "InProgress"));
      setCompleted(missions.filter(m => m.status === "Completed"));

    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadMissions();
  }, []);

  const handleAccept = async (id) => {

    await rescueMissionService.respondMission({
      rescueMissionID: id,
      isAccepted: true
    });

    loadMissions();
  };

  const handleReject = async (id) => {

    await rescueMissionService.respondMission({
      rescueMissionID: id,
      isAccepted: false,
      rejectReason: "Team unavailable"
    });

    loadMissions();
  };

  const handleComplete = async (id) => {

    await completeMission({
      rescueMissionID: id
    });

    loadMissions();
  };

  return (
    <>
      <Header />

      {/* CONTAINER giống Coordinator */}
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
                Accept or reject rescue requests and report problems
              </p>
            </div>

          </div>

          {/* STATS */}
          <div className="stats">

            <div className="stat-card blue">

              <div className="stat-info">
                <span>New Requests</span>
                <h3>{newRequests.length}</h3>
              </div>

              <FaClipboardList className="stat-icon" color="#3b82f6" />

            </div>


            <div className="stat-card green">

              <div className="stat-info">
                <span>In Progress</span>
                <h3>{inProgress.length}</h3>
              </div>

              <FaCheckCircle className="stat-icon" color="#22c55e" />

            </div>


            <div className="stat-card gray">

              <div className="stat-info">
                <span>Completed</span>
                <h3>{completed.length}</h3>
              </div>

              <FaCheckCircle className="stat-icon" color="#6b7280" />

            </div>

          </div>

          {/* PANELS */}
          <div className="panels">

            {/* NEW REQUESTS */}
            <div className="panel">

              <div className="panel-title">
                <FaClipboardList color="#3b82f6" />
                New Requests
              </div>

              {newRequests.length === 0 && (
                <p style={{ color: "#777" }}>No new requests</p>
              )}

              {newRequests.map(req => (

                <div className="request-card" key={req.rescueMissionID}>

                  <div className="request-type">
                    {req.type}
                  </div>

                  <p>
                    <b>Name:</b> {req.name}
                  </p>

                  <p>
                    <FaPhone /> {req.phone}
                  </p>

                  <p>
                    <FaMapMarkerAlt /> {req.address}
                  </p>

                  <div className="request-desc">
                    {req.description}
                  </div>

                  <div className="btn-group">

                    <button
                      className="btn-accept"
                      onClick={() => handleAccept(req.rescueMissionID)}
                    >
                      Accept
                    </button>

                    <button
                      className="btn-reject"
                      onClick={() => handleReject(req.rescueMissionID)}
                    >
                      Reject
                    </button>

                  </div>

                </div>

              ))}

            </div>


            {/* IN PROGRESS */}
            <div className="panel">

              <div className="panel-title">
                <FaCheckCircle color="#22c55e" />
                In Progress
              </div>

              {inProgress.length === 0 && (
                <p style={{ color: "#777" }}>No active missions</p>
              )}

              {inProgress.map(req => (

                <div className="request-card" key={req.rescueMissionID}>

                  <div className="request-type">
                    {req.type}
                  </div>

                  <p>
                    <b>Name:</b> {req.name}
                  </p>

                  <p>
                    <FaPhone /> {req.phone}
                  </p>

                  <p>
                    <FaMapMarkerAlt /> {req.address}
                  </p>

                  <div className="request-desc">
                    {req.description}
                  </div>

                  <button
                    className="btn-complete"
                    onClick={() => handleComplete(req.rescueMissionID)}
                  >
                    Complete Mission
                  </button>

                </div>

              ))}

            </div>

          </div>

        </div>

      </div>
    </>
  );
}