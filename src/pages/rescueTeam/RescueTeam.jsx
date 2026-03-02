import "./Dashboard.css";
import Header from "../../components/common/Header";
import { useEffect, useMemo, useRef, useState } from "react";
import { rescueMissionService } from "../../services/rescueMissionService";
import {
  getAllRescueTeams,
  createRescueTeam,
  updateRescueTeam,
  deleteRescueTeam,
} from "../../services/rescueTeamService";


export default function RescueTeam() {
  // Dùng teams làm nguồn dữ liệu, giữ tên requests để không phải đụng UI nhiều
  const [requests, setRequests] = useState([]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  // form create/update
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    teamName: "",
    city: "",
    currentStatus: "Available",
    currentLatitude: 0,
    currentLongitude: 0,
  });
  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setForm({
      teamName: "",
      city: "",
      currentStatus: "Available",
      currentLatitude: 0,
      currentLongitude: 0,
    });
  };

  const onEditTeam = (req) => {
    const t = req.__raw;
    const id = t?.rescueTeamID ?? t?.id ?? t?.rescueTeamId;
    setIsEditing(true);
    setEditingId(id);
    setForm({
      teamName: t?.teamName ?? "",
      city: t?.city ?? "",
      currentStatus: t?.currentStatus ?? "Available",
      currentLatitude: t?.currentLatitude ?? 0,
      currentLongitude: t?.currentLongitude ?? 0,
    });
  };

  const onSubmitTeam = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setErr("");

      const payload = {
        teamName: form.teamName.trim(),
        city: form.city.trim(),
        currentStatus: form.currentStatus,
        currentLatitude: Number(form.currentLatitude),
        currentLongitude: Number(form.currentLongitude),
      };

      if (isEditing && editingId) {
        await updateRescueTeam(editingId, payload);
      } else {
        await createRescueTeam(payload);
      }

      resetForm();
      await loadTeams();
    } catch (e) {
      console.error(e);
      setErr(isEditing ? "Update team failed." : "Create team failed.");
    } finally {
      setLoading(false);
    }
  };

  const onDeleteTeam = async (req) => {
    const t = req.__raw;
    const id = t?.rescueTeamID ?? t?.id ?? t?.rescueTeamId;
    if (!id) return;

    const ok = window.confirm(`Delete team "${t?.teamName ?? id}"?`);
    if (!ok) return;

    try {
      setLoading(true);
      setErr("");
      await deleteRescueTeam(id);
      await loadTeams();
    } catch (e) {
      console.error(e);
      setErr("Delete team failed.");
    } finally {
      setLoading(false);
    }
  };
  const [editingId, setEditingId] = useState(null);
  /* ===== HISTORY ===== */
  const [history, setHistory] = useState([
    {
      id: "H1",
      action: "COMPLETED",
      requestId: "R4",
      type: "Fire Emergency",
      time: new Date(Date.now() - 60 * 60 * 1000),
    },
  ]);

  const addHistory = (action, req) => {
    setHistory((prev) => [
      {
        id: Date.now().toString(),
        action,
        requestId: req.id,
        type: req.type,
        time: new Date(),
      },
      ...prev,
    ]);
  };


  /* ===== TOPBAR (SEARCH/FILTER) ===== */
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | new | in-progress | completed | rejected
  const [severityFilter, setSeverityFilter] = useState("all"); // all | low | medium | high
  const historyRef = useRef(null);

  /* ===== REPORT PROBLEM MODAL ===== */
  const [showProblemModal, setShowProblemModal] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [problemForm, setProblemForm] = useState({
    description: "",
    severity: "medium",
  });

  const openProblemModal = (id) => {
    setSelectedRequestId(id);
    setProblemForm({ description: "", severity: "medium" });
    setShowProblemModal(true);
  };

  const closeProblemModal = () => {
    setSelectedRequestId(null);
    setShowProblemModal(false);
  };

  const submitProblem = () => {
    if (!selectedRequestId || !problemForm.description.trim()) return;

    const newProblem = {
      id: Date.now().toString(),
      description: problemForm.description.trim(),
      severity: problemForm.severity, // low | medium | high
      time: new Date(),
    };

    const req = requests.find((x) => x.id === selectedRequestId);

    setRequests((prev) =>
      prev.map((r) =>
        r.id === selectedRequestId
          ? { ...r, problemReports: [...(r.problemReports || []), newProblem] }
          : r
      )
    );

    if (req) addHistory("PROBLEM_REPORTED", req);

    setShowProblemModal(false);
    setSelectedRequestId(null);
  };
  const extractData = (res) => {
    if (!res) return null;
    if (res.data && typeof res.data === "object") return res.data?.data ?? res.data;
    return res.data ?? res;
  };

  const loadTeams = async () => {
    try {
      setLoading(true);
      setErr("");
      const res = await getAllRescueTeams();
      const data = extractData(res) ?? [];
      // map team -> request-card model (để UI không đổi)
      setRequests(
        (Array.isArray(data) ? data : []).map((t) => ({
          id: t.rescueTeamID ?? t.id ?? t.rescueTeamId,           // dùng làm key
          type: t.teamName ?? "Rescue Team",
          description: `${t.city ?? ""} • ${t.currentStatus ?? ""} • (${t.currentLatitude ?? 0}, ${t.currentLongitude ?? 0})`,
          status:
            String(t.currentStatus || "").toLowerCase() === "busy"
              ? "in-progress"
              : "new",
          problemReports: [],
          __raw: t, // giữ raw để CRUD edit/delete
        }))
      );
    } catch (e) {
      console.error(e);
      setErr("Failed to load rescue teams.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadTeams();
  }, []);

  /* ===== ACTIONS ===== */
  const acceptRequest = async (id) => {
    const req = requests.find((r) => r.id === id);
    if (!req) return;

    //  gọi API respond (Accept)
    try {
      await rescueMissionService.respond({
        rescueMissionID: id,      // hiện mock id là "R1", "R2"... OK để demo; chạy thật thì id phải là GUID mission
        isAccepted: true,
        rejectReason: null,
      });
    } catch (e) {
      console.error("API accept failed:", e);
      // vẫn cho UI chạy mock, hoặc bạn muốn chặn thì return ở đây
      // return;
    }

    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "in-progress" } : r))
    );

    addHistory("ACCEPTED", req);
  };

  const rejectRequest = async (id) => {
    const req = requests.find((r) => r.id === id);
    if (!req) return;
    const reason = prompt("Reject reason?"); // optional để hợp BE rule
    if (reason !== null && reason.trim() === "") return;

    // ✅ gọi API respond (Reject)
    try {
      await rescueMissionService.respond({
        rescueMissionID: id,
        isAccepted: false,
        rejectReason: (reason && reason.trim()) ? reason.trim() : "Not available",
      });
    } catch (e) {
      console.error("API reject failed:", e);
      // return; // nếu muốn chặn mock update khi API fail
    }
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "rejected" } : r))
    );

    addHistory("REJECTED", req);
  };

  const completeRequest = (id) => {
    const req = requests.find((r) => r.id === id);
    if (!req) return;

    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "completed" } : r))
    );

    addHistory("COMPLETED", req);
  };

  const confirmPickup = async (id) => {
    const req = requests.find((r) => r.id === id);
    if (!req) return;

    // lấy missionId + reliefOrderId từ raw (khi nối API thật)
    const raw = req.__raw || {};
    const rescueMissionId =
      raw.rescueMissionID ?? raw.rescueMissionId ?? raw.missionId ?? raw.id;
    const reliefOrderId =
      raw.reliefOrderID ?? raw.reliefOrderId ?? raw.orderId;

    if (!rescueMissionId || !reliefOrderId) {
      alert("Thiếu RescueMissionId hoặc ReliefOrderId để confirm pickup.");
      return;
    }

    try {
      setLoading(true);
      setErr("");

      await rescueMissionService.confirmPickup({
        rescueMissionId,
        reliefOrderId,
      });

      // update UI local
      setRequests((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
              ...r,
              __raw: {
                ...r.__raw,
                reliefOrderStatus: "PickedUp",
              },
              description: `${raw.city ?? ""} • ${raw.currentStatus ?? ""} • PICKED_UP`,
            }
            : r
        )
      );

      addHistory("CONFIRM_PICKUP", req);
    } catch (e) {
      console.error(e);
      setErr("Confirm pickup failed.");
    } finally {
      setLoading(false);
    }
  };

  /* ===== FILTERED REQUESTS ===== */
  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase();

    return requests.filter((r) => {
      const okStatus = statusFilter === "all" ? true : r.status === statusFilter;

      const okSearch =
        !q ||
        r.id.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q);

      const okSeverity =
        severityFilter === "all"
          ? true
          : (r.problemReports || []).some((p) => p.severity === severityFilter);

      return okStatus && okSearch && okSeverity;
    });
  }, [requests, search, statusFilter, severityFilter]);

  const newRequests = useMemo(
    () => filteredRequests.filter((r) => r.status === "new"),
    [filteredRequests]
  );
  const inProgressRequests = useMemo(
    () => filteredRequests.filter((r) => r.status === "in-progress"),
    [filteredRequests]
  );
  const completedRequests = useMemo(
    () => filteredRequests.filter((r) => r.status === "completed"),
    [filteredRequests]
  );

  return (
    <div className="rescue-team-page">
      {/* HEADER */}
      <Header />

      {/* PAGE CONTENT */}
      <div className="rescue-team-container">
        {/* TITLE + STATS */}
        <div className="rescue-team-page-header">
          <h1>Rescue Team Dashboard</h1>
          <p>Handle rescue requests and report issues</p>

          <div className="rescue-team-stats">
            <div className="stat-card">
              <span>New Requests</span>
              <h2>{newRequests.length}</h2>
            </div>
            <div className="stat-card">
              <span>In Progress</span>
              <h2>{inProgressRequests.length}</h2>
            </div>
            <div className="stat-card">
              <span>Completed</span>
              <h2>{completedRequests.length}</h2>
            </div>
          </div>
        </div>

        {/* 2-COLUMN CONTENT */}
        <div className="rescue-team-content">
          {/* NEW REQUESTS */}
          <div className="rescue-team-panel">
            <h3>New Requests</h3>

            {newRequests.map((r) => (
              <div className="request-card" key={r.id}>
                <div className="request-title">{r.type}</div>
                <div className="request-desc">{r.description}</div>

                <div className="request-actions">
                  <button
                    className="btn btn-accept"
                    onClick={() => acceptRequest(r.id)}
                  >
                    Accept
                  </button>
                  <button
                    className="btn btn-reject"
                    onClick={() => rejectRequest(r.id)}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}

            {newRequests.length === 0 && <p>No new requests</p>}
          </div>

          {/* IN PROGRESS */}
          <div className="rescue-team-panel">
            <h3>In Progress</h3>

            {inProgressRequests.map((r) => (
              <div className="request-card" key={r.id}>
                <div className="request-title">{r.type}</div>
                <div className="request-desc">{r.description}</div>

                {/* PROBLEM REPORTS LIST */}
                {r.problemReports && r.problemReports.length > 0 && (
                  <div className="problem-wrap">
                    <div className="problem-title">Problem Reports:</div>

                    {r.problemReports.map((p) => (
                      <div className="problem-card" key={p.id}>
                        <div className="problem-head">
                          <span className={`problem-badge ${p.severity}`}>
                            {String(p.severity).toUpperCase()}
                          </span>
                          <span className="problem-time">
                            {new Date(p.time).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="problem-desc">{p.description}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="request-actions">
                  <button
                    className="btn btn-problem"
                    onClick={() => openProblemModal(r.id)}
                  >
                    Report Problem
                  </button>
                  {(() => {
                    const raw = r.__raw || {};
                    const orderStatus = String(raw.reliefOrderStatus || raw.orderStatus || "").toLowerCase();
                    const hasOrderId = !!(raw.reliefOrderID ?? raw.reliefOrderId ?? raw.orderId);

                    const canConfirm = hasOrderId && (orderStatus === "prepared" || orderStatus === "pending_pickup");

                    if (!hasOrderId) return null;

                    return (
                      <button
                        className="btn btn-accept"
                        onClick={() => confirmPickup(r.id)}
                        disabled={loading || !canConfirm}
                        style={{ gridColumn: "1 / -1" }}
                        title={!canConfirm ? "Order chưa ở trạng thái Prepared" : ""}
                      >
                        Confirm Pickup
                      </button>
                    );
                  })()}
                  <button
                    className="btn btn-accept"
                    onClick={() => completeRequest(r.id)}
                    style={{ gridColumn: "1 / -1" }}
                  >
                    Mark Completed
                  </button>
                </div>
              </div>
            ))}

            {inProgressRequests.length === 0 && <p>No active requests</p>}
          </div>
        </div>

        {/* HISTORY (FULL WIDTH) */}
        <div className="rescue-team-history">
          <div className="history-head">
            <h3>Action History</h3>
            <span className="history-sub">Latest actions by Rescue Team</span>
          </div>

          <div className="history-tablewrap">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Request ID</th>
                  <th>Emergency Type</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td>{h.time.toLocaleString()}</td>
                    <td>
                      <span className={`history-badge ${h.action.toLowerCase()}`}>
                        {h.action}
                      </span>
                    </td>
                    <td>{h.requestId}</td>
                    <td>{h.type}</td>
                  </tr>
                ))}

                {history.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", opacity: 0.7 }}>
                      No history yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* PROBLEM MODAL */}
      {showProblemModal && (
        <div className="problem-modal-overlay">
          <div className="problem-modal">
            <h3>Report Problem</h3>

            <label className="pm-label">Problem Description *</label>
            <textarea
              value={problemForm.description}
              onChange={(e) =>
                setProblemForm((s) => ({ ...s, description: e.target.value }))
              }
              rows={4}
              placeholder="Describe the problem encountered..."
            />

            <label className="pm-label">Severity</label>
            <select
              value={problemForm.severity}
              onChange={(e) =>
                setProblemForm((s) => ({ ...s, severity: e.target.value }))
              }
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>

            <div className="pm-actions">
              <button
                className="pm-cancel"
                onClick={() => {
                  setShowProblemModal(false);
                  setSelectedRequestId(null);
                }}
              >
                Cancel
              </button>

              <button
                className="pm-submit"
                disabled={!problemForm.description.trim()}
                onClick={submitProblem}
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
