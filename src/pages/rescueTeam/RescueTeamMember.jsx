// File này đã được chú thích lại để bạn biết các block realtime/API dùng để làm gì.
import "./Dashboard.css";
import Header from "../../components/common/Header";
import { useEffect, useMemo, useState } from "react";

import { rescueMissionService } from "../../services/rescueMissionService";

import {
  FaShieldAlt,
  FaClipboardList,
  FaCheckCircle,
  FaExclamationCircle,
  FaMapMarkerAlt,
} from "react-icons/fa";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});
const getStatus = (mission) =>
  String(
    mission?.status ?? mission?.Status ?? mission?.currentStatus ?? "",
  ).toLowerCase();

export default function RescueTeamMember({ teamId }) {
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadMissions = async () => {
    if (!teamId) return;
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

      const data = json?.content?.data || [];

      // setMissions(data);
      setMissions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Load mission error:", err);
    } finally {
      setLoading(false);
    }

    // setLoading(false);
  };

  useEffect(() => {
    loadMissions();
    const interval = setInterval(loadMissions, 5000);
    return () => clearInterval(interval);
  }, [teamId]);

  const getMissionStatus = (mission) =>
    mission?.currentStatus ||
    mission?.status ||
    mission?.newMissionStatus ||
    "Unknown";

  /* ================= STATUS STATS ================= */

  const pending = missions.filter((m) => getMissionStatus(m) === "Assigned");

  const active = missions.filter((m) => getMissionStatus(m) === "InProgress");

  const completed = missions.filter((m) => getMissionStatus(m) === "Completed");

  /* ================= MAP MISSIONS ================= */

  // const mapMissions = missions.filter(
  //   (m) => m.locationLatitude && m.locationLongitude,
  // );
  const mapMissions = useMemo(
    () => missions.filter((m) => m.locationLatitude && m.locationLongitude),
    [missions],
  );
  /* ================= UI ================= */

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
                Bảng điều khiển thành viên đội
              </h1>

              <p className="dashboard-sub">
                Theo dõi nhiệm vụ cứu hộ và hoạt động của đội
              </p>
            </div>
          </div>

          <div className="stats">
            <div className="stat-card blue">
              <div className="stat-info">
                <span>Đang chờ</span>
                <h3>{pending.length}</h3>
              </div>

              <FaExclamationCircle className="stat-icon" />
            </div>

            <div className="stat-card green">
              <div className="stat-info">
                <span>Đang hoạt động</span>
                <h3>{active.length}</h3>
              </div>

              <FaClipboardList className="stat-icon" />
            </div>

            <div className="stat-card gray">
              <div className="stat-info">
                <span>Hoàn thành</span>
                <h3>{completed.length}</h3>
              </div>

              <FaCheckCircle className="stat-icon" />
            </div>
          </div>

          {/* VIEW ONLY NOTICE */}

          <div
            style={{
              background: "#fff8e1",
              border: "1px solid #facc15",
              padding: "15px",
              borderRadius: "8px",
              marginBottom: "25px",
            }}
          >
            <b>Chế độ chỉ xem</b>

            <p style={{ marginTop: 5 }}>
              Bạn đang xem các nhiệm vụ với vai trò thành viên đội. Chỉ trưởng
              nhóm mới có thể chấp nhận, từ chối hoặc chỉnh sửa nhiệm vụ.
            </p>
          </div>

          <div className="panel">
            <div className="panel-title">Tất cả nhiệm vụ</div>

            {missions.length === 0 && <p>Không có nhiệm vụ nào</p>}

            {missions.map((m) => (
              <div className="request-card" key={m.rescueMissionID}>
                <p>
                  <b>{m.citizenName}</b>
                </p>

                <p>
                  <FaMapMarkerAlt />
                  {m.locationLatitude}, {m.locationLongitude}
                </p>

                <p>Trạng thái: {getMissionStatus(m)}</p>

                <div
                  style={{
                    background: "#f3f4f6",
                    padding: "10px",
                    borderRadius: "6px",
                    marginTop: "10px",
                  }}
                >
                  {m.description}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 30 }}>
            <MapContainer
              center={[10.8231, 106.6297]}
              zoom={13}
              style={{ height: "400px" }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

              {mapMissions.map((m) => (
                <Marker
                  key={m.rescueMissionID}
                  position={[m.locationLatitude, m.locationLongitude]}
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
        </div>
      </div>
    </>
  );
}
