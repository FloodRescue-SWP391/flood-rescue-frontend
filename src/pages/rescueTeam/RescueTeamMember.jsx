import "./Dashboard.css";
import Header from "../../components/common/Header";
import { useEffect, useState } from "react";

import { rescueMissionService } from "../../services/rescueMissionService";

import {
  FaShieldAlt,
  FaClipboardList,
  FaCheckCircle,
  FaExclamationCircle,
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

/* FIX LEAFLET ICON */
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
});

export default function RescueTeamMember() {

  const [missions, setMissions] = useState([]);

  const teamId = localStorage.getItem("teamId");

  /* ================= LOAD MISSIONS ================= */

  const loadMissions = async () => {

    try {

      const res = await rescueMissionService.filter({
        rescueTeamID: teamId,
        pageNumber: 1,
        pageSize: 50
      });

      const json = await res.json();

      const data = json?.content?.data || [];

      setMissions(data);

    } catch (err) {

      console.error("Load mission error:", err);

    }

  };

  /* ================= AUTO REFRESH ================= */

  useEffect(() => {

    loadMissions();

    const interval = setInterval(() => {
      loadMissions();
    }, 5000);

    return () => clearInterval(interval);

  }, []);

  /* ================= STATUS STATS ================= */

  const pending = missions.filter(
    m => m.currentStatus === "Assigned"
  );

  const active = missions.filter(
    m => m.currentStatus === "InProgress"
  );

  const completed = missions.filter(
    m => m.currentStatus === "Completed"
  );

  /* ================= MAP MISSIONS ================= */

  const mapMissions = missions.filter(
    m => m.locationLatitude && m.locationLongitude
  );

  return (
    <>
      <Header />

      <div className="dashboard-container">

        <div className="dashboard-content">

          {/* HEADER */}

          <div className="dashboard-header">

            <FaShieldAlt size={32} color="#3b82f6" />

            <div>

              <h1 className="dashboard-title">
                Team Member Dashboard
              </h1>

              <p className="dashboard-sub">
                Monitor rescue missions and track team activities
              </p>

            </div>

          </div>

          {/* STATS */}

          <div className="stats">

            <div className="stat-card blue">

              <div className="stat-info">
                <span>Pending</span>
                <h3>{pending.length}</h3>
              </div>

              <FaExclamationCircle className="stat-icon"/>

            </div>

            <div className="stat-card green">

              <div className="stat-info">
                <span>Active</span>
                <h3>{active.length}</h3>
              </div>

              <FaClipboardList className="stat-icon"/>

            </div>

            <div className="stat-card gray">

              <div className="stat-info">
                <span>Completed</span>
                <h3>{completed.length}</h3>
              </div>

              <FaCheckCircle className="stat-icon"/>

            </div>

          </div>

          {/* VIEW ONLY NOTICE */}

          <div
            style={{
              background:"#fff8e1",
              border:"1px solid #facc15",
              padding:"15px",
              borderRadius:"8px",
              marginBottom:"25px"
            }}
          >

            <b>View-Only Access</b>

            <p style={{marginTop:5}}>

              You are viewing missions as a team member.
              Only team leaders can accept, reject,
              or modify missions.

            </p>

          </div>

          {/* MISSIONS */}

          <div className="panel">

            <div className="panel-title">
              All Missions
            </div>

            {missions.map(m => (

              <div
                className="request-card"
                key={m.rescueMissionID}
              >

                <p><b>{m.citizenName}</b></p>

                <p>
                  <FaMapMarkerAlt />
                  {m.locationLatitude},
                  {m.locationLongitude}
                </p>

                <p>Status: {m.currentStatus}</p>

                <div
                  style={{
                    background:"#f3f4f6",
                    padding:"10px",
                    borderRadius:"6px",
                    marginTop:"10px"
                  }}
                >

                  {m.description}

                </div>

              </div>

            ))}

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