import React, { useEffect, useState } from "react";
import "./ListRescueTeams.css";
import {
  getAllRescueTeams,
  updateRescueTeam,
  deleteRescueTeam,
} from "../../services/rescueTeamService";

import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function ChangeMapView({ center }) {
  const map = useMapEvents({});
  useEffect(() => {
    if (center?.length === 2) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

function LocationPicker({ onPickLocation }) {
  useMapEvents({
    click(e) {
      onPickLocation(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}
const ListRescueTeams = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);

  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);

  // edit modal/card state
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    teamName: "",
    city: "",
    currentStatus: "Available",
    currentLatitude: "",
    currentLongitude: "",
  });

  const DEFAULT_POSITION = [10.7769, 106.7009];

  const [selectedPosition, setSelectedPosition] = useState(DEFAULT_POSITION);
  const [addressQuery, setAddressQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);

  const updateLocation = (lat, lng) => {
    const latitude = Number(lat);
    const longitude = Number(lng);

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) return;

    setFormData((prev) => ({
      ...prev,
      currentLatitude: latitude,
      currentLongitude: longitude,
    }));

    setSelectedPosition([latitude, longitude]);
  };

  const handlePickLocation = (lat, lng) => {
    updateLocation(lat, lng);
  };

  const handleCoordinateChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const syncMarkerFromInputs = () => {
    const lat = Number(formData.currentLatitude);
    const lng = Number(formData.currentLongitude);

    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      setSelectedPosition([lat, lng]);
    }
  };

  const handleAddressSearch = async (e) => {
    const value = e.target.value;
    setAddressQuery(value);

    if (!value.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearchingAddress(true);

      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
          value,
        )}&limit=5`,
      );

      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Search address error:", error);
      setSearchResults([]);
    } finally {
      setIsSearchingAddress(false);
    }
  };

  const handleSelectAddress = (item) => {
    const lat = Number(item.lat);
    const lng = Number(item.lon);

    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      updateLocation(lat, lng);
      setAddressQuery(item.display_name || "");
      setSearchResults([]);
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  // backend trả rescueTeamID
  const getId = (t) => t?.rescueTeamID || t?.rescueTeamId || t?.id;

  const loadTeams = async () => {
    try {
      setLoading(true);

      const json = await getAllRescueTeams();
      console.log("GET /RescueTeams json:", json);

      const list = json?.content?.data || [];
      setTeams(list);
    } catch (err) {
      showToast(`${err?.message || "Không thể tải danh sách đội cứu hộ"}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openEdit = (team) => {
    const lat = Number(team?.currentLatitude ?? 0);
    const lng = Number(team?.currentLongitude ?? 0);

    setEditingId(getId(team));
    setFormData({
      teamName: team?.teamName ?? "",
      city: team?.city ?? "",
      currentStatus: team?.currentStatus ?? "Available",
      currentLatitude: team?.currentLatitude ?? "",
      currentLongitude: team?.currentLongitude ?? "",
    });

    if (!Number.isNaN(lat) && !Number.isNaN(lng) && (lat !== 0 || lng !== 0)) {
      setSelectedPosition([lat, lng]);
    } else {
      setSelectedPosition(DEFAULT_POSITION);
    }

    setAddressQuery("");
    setSearchResults([]);
  };

  const closeEdit = () => {
    setEditingId(null);
    setFormData({
      teamName: "",
      city: "",
      currentStatus: "Available",
      currentLatitude: "",
      currentLongitude: "",
    });
    setSelectedPosition(DEFAULT_POSITION);
    setAddressQuery("");
    setSearchResults([]);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingId) return;

    try {
      setSaving(true);

      const payload = {
        teamName: String(formData.teamName).trim(),
        city: String(formData.city).trim(),
        currentStatus: String(formData.currentStatus).trim(),
        currentLatitude:
          formData.currentLatitude === ""
            ? 0
            : Number(formData.currentLatitude),
        currentLongitude:
          formData.currentLongitude === ""
            ? 0
            : Number(formData.currentLongitude),
      };

      const res = await updateRescueTeam(editingId, payload);

      if (res?.success === false) {
        showToast(`❌ ${res?.message || "Cập nhật thất bại"}`);
        return;
      }

      showToast("✅ Cập nhật thành công!");
      closeEdit();
      loadTeams();
    } catch (err) {
      showToast(`❌ ${err?.message || "Cập nhật thất bại"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = window.confirm("Bạn có chắc muốn xóa đội cứu hộ này?");
    if (!ok) return;

    try {
      setSaving(true);
      const res = await deleteRescueTeam(id);

      if (res?.success === false) {
        showToast(`❌ ${res?.message || "Không thể xóa"}`);
        return;
      }

      showToast("✅ Đã xóa thành công!");
      setTeams((prev) => prev.filter((t) => getId(t) !== id));
    } catch (err) {
      showToast(`❌ ${err?.message || "Không thể xóa"}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {toast && (
        <div
          className={`toast_container ${toast.includes("❌") ? "error" : "success"}`}
        >
          {toast}
        </div>
      )}

      <div className="list-rescue-team-container">
        <h2>Đội cứu hộ</h2>

        <div className="panel">
          {loading ? (
            <div className="empty">Đang tải...</div>
          ) : teams.length === 0 ? (
            <div className="empty">Không tìm thấy đội cứu hộ nào.</div>
          ) : (
            <div className="table-wrap">
              <table className="team-table">
                <thead>
                  <tr>
                    <th>Tên đội</th>
                    <th>Thành phố</th>
                    <th>Trạng thái</th>
                    <th>Vĩ độ</th>
                    <th>Kinh độ</th>
                    <th style={{ width: 170 }}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((t) => {
                    const id = getId(t);
                    return (
                      <tr key={id}>
                        <td>{t?.teamName}</td>
                        <td>{t?.city}</td>
                        <td>{t?.currentStatus}</td>
                        <td>{t?.currentLatitude}</td>
                        <td>{t?.currentLongitude}</td>
                        <td>
                          <div className="row-actions">
                            <button
                              className="btn small"
                              onClick={() => openEdit(t)}
                              disabled={saving}
                            >
                              Sửa
                            </button>
                            <button
                              className="btn small danger"
                              onClick={() => handleDelete(id)}
                              disabled={saving}
                            >
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* EDIT PANEL */}
        {editingId && (
          <div className="edit-panel">
            <h3>Chỉnh sửa đội cứu hộ</h3>

            <form onSubmit={handleUpdate} className="edit-form">
              <div className="form-group">
                <label>Tên đội</label>
                <input
                  name="teamName"
                  value={formData.teamName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Thành phố</label>
                <input
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Trạng thái</label>
                <select
                  name="currentStatus"
                  value={formData.currentStatus}
                  onChange={handleChange}
                >
                  <option value="Available">Sẵn sàng</option>
                  <option value="Busy">Đang bận</option>
                  <option value="Inactive">Không hoạt động</option>
                </select>
              </div>

              <div className="form-group">
                <label>Tìm địa chỉ</label>
                <input
                  type="text"
                  value={addressQuery}
                  onChange={handleAddressSearch}
                  placeholder="Nhập địa chỉ để tìm trên bản đồ"
                />

                {isSearchingAddress && (
                  <div className="searching-text">Đang tìm địa chỉ...</div>
                )}

                {searchResults.length > 0 && (
                  <div className="address-results">
                    {searchResults.map((item, index) => (
                      <button
                        key={`${item.place_id}-${index}`}
                        type="button"
                        className="address-result-item"
                        onClick={() => handleSelectAddress(item)}
                      >
                        {item.display_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label>Vĩ độ</label>
                  <input
                    name="currentLatitude"
                    type="number"
                    step="any"
                    value={formData.currentLatitude}
                    onChange={handleCoordinateChange}
                    onBlur={syncMarkerFromInputs}
                    placeholder="Tự động điền hoặc nhập tay"
                  />
                </div>

                <div className="form-group">
                  <label>Kinh độ</label>
                  <input
                    name="currentLongitude"
                    type="number"
                    step="any"
                    value={formData.currentLongitude}
                    onChange={handleCoordinateChange}
                    onBlur={syncMarkerFromInputs}
                    placeholder="Tự động điền hoặc nhập tay"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Chọn vị trí trên bản đồ</label>
                <div className="map-picker-note">
                  📍 Click lên bản đồ để tự động điền kinh độ và vĩ độ
                </div>

                <div
                  style={{
                    height: "320px",
                    width: "100%",
                    borderRadius: "12px",
                    overflow: "hidden",
                  }}
                >
                  <MapContainer
                    center={selectedPosition}
                    zoom={13}
                    scrollWheelZoom={true}
                    style={{ height: "100%", width: "100%" }}
                  >
                    <TileLayer
                      attribution="&copy; OpenStreetMap contributors"
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <ChangeMapView center={selectedPosition} />
                    <LocationPicker onPickLocation={handlePickLocation} />
                    <Marker position={selectedPosition} />
                  </MapContainer>
                </div>
              </div>

              <div className="edit-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={closeEdit}
                  disabled={saving}
                >
                  Hủy
                </button>
                <button type="submit" className="btn primary" disabled={saving}>
                  {saving ? "Đang lưu..." : "Cập nhật"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </>
  );
};

export default ListRescueTeams;
