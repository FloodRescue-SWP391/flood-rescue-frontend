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
      showToast(`${err?.message || "Failed to load rescue teams"}`);
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
          formData.currentLatitude === "" ? 0 : Number(formData.currentLatitude),
        currentLongitude:
          formData.currentLongitude === "" ? 0 : Number(formData.currentLongitude),
      };

      const res = await updateRescueTeam(editingId, payload);

      if (res?.success === false) {
        showToast(`❌ ${res?.message || "Update failed"}`);
        return;
      }

      showToast("✅ Updated successfully!");
      closeEdit();
      loadTeams();
    } catch (err) {
      showToast(`❌ ${err?.message || "Update failed"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = window.confirm("Delete this rescue team?");
    if (!ok) return;

    try {
      setSaving(true);
      const res = await deleteRescueTeam(id);

      if (res?.success === false) {
        showToast(`❌ ${res?.message || "Delete failed"}`);
        return;
      }

      showToast("✅ Deleted successfully!");
      setTeams((prev) => prev.filter((t) => getId(t) !== id));
    } catch (err) {
      showToast(`❌ ${err?.message || "Delete failed"}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {toast && (
        <div className={`toast ${toast.includes("❌") ? "error" : "success"}`}>
          {toast}
        </div>
      )}

      <div className="list-rescue-team-container">
        <h2>Rescue Teams</h2>

        <div className="panel">
          {loading ? (
            <div className="empty">Loading...</div>
          ) : teams.length === 0 ? (
            <div className="empty">No rescue teams found.</div>
          ) : (
            <div className="table-wrap">
              <table className="team-table">
                <thead>
                  <tr>
                    <th>Team Name</th>
                    <th>City</th>
                    <th>Status</th>
                    <th>Latitude</th>
                    <th>Longitude</th>
                    <th style={{ width: 170 }}>Action</th>
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
                              Edit
                            </button>
                            <button
                              className="btn small danger"
                              onClick={() => handleDelete(id)}
                              disabled={saving}
                            >
                              Delete
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

        {/* EDIT PANEL (giống style form cũ) */}
        {editingId && (
          <div className="edit-panel">
            <h3>Edit Rescue Team</h3>

            <form onSubmit={handleUpdate} className="edit-form">
              <div className="form-group">
                <label>Team Name</label>
                <input
                  name="teamName"
                  value={formData.teamName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>City</label>
                <input
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Status</label>
                <select
                  name="currentStatus"
                  value={formData.currentStatus}
                  onChange={handleChange}
                >
                  <option value="Available">Available</option>
                  <option value="Busy">Busy</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label>Latitude</label>
                  <input
                    name="currentLatitude"
                    value={formData.currentLatitude}
                    onChange={handleChange}
                    placeholder="0"
                  />
                </div>

                <div className="form-group">
                  <label>Longitude</label>
                  <input
                    name="currentLongitude"
                    value={formData.currentLongitude}
                    onChange={handleChange}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="edit-actions">
                <button type="button" className="btn" onClick={closeEdit} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn primary" disabled={saving}>
                  {saving ? "Saving..." : "Update"}
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