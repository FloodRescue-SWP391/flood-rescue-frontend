// File này đã được chú thích lại để bạn biết các block realtime/API dùng để làm gì.
import "./Dashboard.css";
import Header from "../../components/common/Header";
import { useEffect, useMemo, useState } from "react";
import { rescueMissionService } from "../../services/rescueMissionService";
import { FaShieldAlt, FaClipboardList, FaCheckCircle, FaExclamationCircle, FaMapMarkerAlt } from "react-icons/fa";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const getStatus = (mission) => String(mission?.status ?? mission?.Status ?? mission?.currentStatus ?? "").toLowerCase();

export default function RescueTeamMember({ teamId }) {
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadMissions = async () => {
    if (!teamId) return;
    setLoading(true);
    try {
      const json = await rescueMissionService.filter({ rescueTeamID: teamId, pageNumber: 1, pageSize: 50 });
      const data = json?.content?.data ?? json?.content?.items ?? json?.content ?? [];
      setMissions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Load mission error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMissions();
    const interval = setInterval(loadMissions, 5000);
    return () => clearInterval(interval);
  }, [teamId]);

  const pending = useMemo(() => missions.filter((m) => getStatus(m) === "assigned"), [missions]);
  const active = useMemo(() => missions.filter((m) => getStatus(m) === "inprogress"), [missions]);
  const completed = useMemo(() => missions.filter((m) => getStatus(m) === "completed"), [missions]);
  const mapMissions = useMemo(() => missions.filter((m) => m.locationLatitude && m.locationLongitude), [missions]);

  return (
    <>
      <Header />
      <div className="dashboard-container">
        <div className="dashboard-content">
          <div className="dashboard-header">
            <FaShieldAlt size={32} color="#3b82f6" />
            <div>
              <h1 className="dashboard-title">Team Member Dashboard</h1>
              <p className="dashboard-sub">Monitor rescue missions and track team activities</p>
            </div>
          </div>

          <div className="stats">
            <div className="stat-card blue"><div className="stat-info"><span>Pending</span><h3>{pending.length}</h3></div><FaExclamationCircle className="stat-icon"/></div>
            <div className="stat-card green"><div className="stat-info"><span>Active</span><h3>{active.length}</h3></div><FaClipboardList className="stat-icon"/></div>
            <div className="stat-card gray"><div className="stat-info"><span>Completed</span><h3>{completed.length}</h3></div><FaCheckCircle className="stat-icon"/></div>
          </div>

          <div style={{ background:"#fff8e1", border:"1px solid #facc15", padding:"15px", borderRadius:"8px", marginBottom:"25px" }}>
            <b>View-Only Access</b>
            <p style={{marginTop:5}}>You are viewing missions as a team member. Only team leaders can accept, reject, or modify missions.</p>
          </div>

          <div className="panel">
            <div className="panel-title">All Missions</div>
            {loading && <p>Loading...</p>}
            {!loading && missions.length === 0 && <p>No missions available</p>}
            {missions.map((m) => (
              <div className="request-card" key={m.rescueMissionID ?? m.RescueMissionID}>
                <p><b>{m.citizenName ?? m.requestShortCode ?? m.RescueRequestID}</b></p>
                <p><FaMapMarkerAlt /> {m.citizenAddress ?? m.CitizenAddress ?? "No address"}</p>
                <p>Status: {m.status ?? m.Status ?? m.currentStatus}</p>
                <div style={{ background:"#f3f4f6", padding:"10px", borderRadius:"6px", marginTop:"10px" }}>{m.description ?? m.Description}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 30 }}>
            <MapContainer center={[10.8231, 106.6297]} zoom={13} style={{ height: "400px" }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {mapMissions.map((m) => (
                <Marker key={m.rescueMissionID ?? m.RescueMissionID} position={[m.locationLatitude, m.locationLongitude]}>
                  <Popup><b>{m.citizenName ?? m.requestShortCode}</b><br/>{m.description ?? m.Description}</Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>
      </div>
    </>
  );
}
