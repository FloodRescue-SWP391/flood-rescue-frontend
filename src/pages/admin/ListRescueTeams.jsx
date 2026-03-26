import React, { useEffect, useState } from "react";
import "./ListRescueTeams.css";
import {
  getAllRescueTeams,
  updateRescueTeam,
  deleteRescueTeam,
} from "../../services/rescueTeamService";

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
    setEditingId(getId(team));
    setFormData({
      teamName: team?.teamName ?? "",
      city: team?.city ?? "",
      currentStatus: team?.currentStatus ?? "Available",
      currentLatitude: team?.currentLatitude ?? 0,
      currentLongitude: team?.currentLongitude ?? 0,
    });
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
        <div className={`toast_container ${toast.includes("❌") ? "error" : "success"}`}>
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

              <div className="grid-2">
                <div className="form-group">
                  <label>Vĩ độ</label>
                  <input
                    name="currentLatitude"
                    value={formData.currentLatitude}
                    onChange={handleChange}
                    placeholder="0"
                  />
                </div>

                <div className="form-group">
                  <label>Kinh độ</label>
                  <input
                    name="currentLongitude"
                    value={formData.currentLongitude}
                    onChange={handleChange}
                    placeholder="0"
                  />
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
