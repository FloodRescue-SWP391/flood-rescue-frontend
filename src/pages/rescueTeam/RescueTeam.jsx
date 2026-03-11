import "./Dashboard.css";
import Header from "../../components/common/Header";
import { useEffect, useMemo, useRef, useState } from "react";
import { rescueMissionService } from "../../services/rescueMissionService";
import signalRService from "../../services/signalrService";
import { completeMission } from "../../services/rescueMissionService";
import { incidentReportService } from "../../services/incidentReportService";


export default function RescueTeam() {
  // Dùng teams làm nguồn dữ liệu, giữ tên requests để không phải đụng UI nhiều
  const [requests, setRequests] = useState([]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");


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
    title: "",
    description: "",
    severity: "medium",
  });

  const openProblemModal = (id) => {
    setSelectedRequestId(id);
    setProblemForm({
      title: "",
      description: "",
      severity: "medium"
    });
    setShowProblemModal(true);
  };



  const submitProblem = async () => {
    if (!selectedRequestId ||
      !problemForm.title.trim() ||
      !problemForm.description.trim()) { return; };

    const req = requests.find((x) => x.id === selectedRequestId);
    if (!req) return;

    const raw = req.__raw || {};

    const rescueMissionID =
      raw.rescueMissionID ??
      raw.rescueMissionId ??
      raw.missionId;

    if (!rescueMissionID) {
      alert("Thiếu rescueMissionID để gửi incident report.");
      return;
    }

    const payload = {
      rescueMissionID,
      title: problemForm.title.trim(),
      description: problemForm.description.trim(),
      latitude: Number(raw.currentLatitude ?? raw.latitude ?? 0),
      longitude: Number(raw.currentLongitude ?? raw.longitude ?? 0),
    };

    try {
      setLoading(true);
      setErr("");

      const res = await incidentReportService.reportIncident(payload);
      const content = res?.content ?? res?.data?.content ?? res?.data ?? res;

      const newProblem = {
        id:
          content?.incidentReportID ??
          content?.incidentReportId ??
          Date.now().toString(),
        title: content?.title ?? payload.title,
        description: content?.description ?? payload.description,
        severity: problemForm.severity,
        time: content?.createdTime ? new Date(content.createdTime) : new Date(),
        incidentStatus:
          content?.incidentStatus ??
          content?.status ??
          "Pending",
      };

      setRequests((prev) =>
        prev.map((r) =>
          r.id === selectedRequestId
            ? {
              ...r,
              problemReports: [...(r.problemReports || []), newProblem],
            }
            : r
        )
      );

      addHistory("PROBLEM_REPORTED", req);

      setShowProblemModal(false);
      setSelectedRequestId(null);
      setProblemForm({
        title: "",
        description: "",
        severity: "medium",
      });

      alert(res?.message || "Incident reported successfully.");
    } catch (e) {
      console.error(e);
      setErr("Report incident failed.");
      alert(e?.message || "Report incident failed.");
    } finally {
      setLoading(false);
    }
  };
  const extractData = (res) => {
    if (!res) return [];
    return res?.content ?? res?.data?.content ?? res?.data ?? res ?? [];
  };

  const getTeamIdFromStorage = () => {
    const auth = JSON.parse(localStorage.getItem("auth") || "{}");
    return (
      auth?.teamID ||
      auth?.teamId ||
      auth?.user?.teamID ||
      auth?.user?.teamId ||
      null
    );
  };

  const normalizeMissionStatus = (status) => {
    const s = String(status || "").toLowerCase();

    if (["assigned", "pending", "new"].includes(s)) return "new";
    if (["inprogress", "in-progress", "processing", "busy"].includes(s)) {
      return "in-progress";
    }
    if (["completed", "delivered"].includes(s)) return "completed";
    if (["rejected", "declined"].includes(s)) return "rejected";

    return "new";
  };

  const mapMissionToCard = (m) => ({
    id: m.rescueMissionID ?? m.missionID ?? m.id,
    type: m.requestType ?? m.type ?? "Rescue Mission",
    description: [
      m.address,
      m.citizenName,
      m.citizenPhone,
      m.requestShortCode ? `#${m.requestShortCode}` : null,
    ]
      .filter(Boolean)
      .join(" • "),
    status: normalizeMissionStatus(m.missionStatus ?? m.status),
    problemReports: Array.isArray(m.problemReports) ? m.problemReports : [],
    __raw: m,
  });

  const loadMissions = async () => {
    try {
      setLoading(true);
      setErr("");

      const teamId = getTeamIdFromStorage();
      if (!teamId) {
        setErr("Không tìm thấy TeamID.");
        return;
      }

      const res = await rescueMissionService.getAssigned({ teamId });
      const data = extractData(res);

      setRequests((Array.isArray(data) ? data : []).map(mapMissionToCard));
    } catch (e) {
      console.error(e);
      setErr("Failed to load missions.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadMissions();
  }, []);

  useEffect(() => {
    const handleMissionNotification = (data) => {
      console.log("ReceiveMissionNotification:", data);

      const missionCard = mapMissionToCard({
        rescueMissionID: data.missionID,
        missionID: data.missionID,
        missionStatus: data.missionStatus,
        requestShortCode: data.requestShortCode,
        citizenName: data.citizenName,
        citizenPhone: data.citizenPhone,
        requestType: data.requestType,
        address: data.address,
        currentLatitude: data.locationLatitude,
        currentLongitude: data.locationLongitude,
        peopleCount: data.peopleCount,
        description: data.description,
      });

      setRequests((prev) => {
        const existed = prev.some((item) => item.id === missionCard.id);
        if (existed) return prev;
        return [missionCard, ...prev];
      });

      addHistory("MISSION_ASSIGNED", {
        id: data.requestShortCode || data.missionID,
        type: data.requestType || "Rescue Mission",
      });

      alert(data.actionMessage || "New mission assigned");
    };

    const init = async () => {
      await signalRService.startConnection();
      signalRService.on("ReceiveMissionNotification", handleMissionNotification);
    };

    init();

    return () => {
      signalRService.off("ReceiveMissionNotification", handleMissionNotification);
    };
  }, []);
  const acceptRequest = async (id) => {
    const req = requests.find((r) => r.id === id);
    if (!req) return;

    const raw = req.__raw || {};
    const rescueMissionID = raw.rescueMissionID ?? raw.missionID ?? raw.id ?? id;

    try {
      setLoading(true);
      setErr("");

      await rescueMissionService.respond({
        rescueMissionID,
        isAccepted: true,
        rejectReason: null,
      });

      setRequests((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
              ...r,
              status: "in-progress",
              __raw: { ...r.__raw, missionStatus: "InProgress" },
            }
            : r
        )
      );

      addHistory("ACCEPTED", req);
    } catch (e) {
      console.error(e);
      setErr("Accept mission failed.");
    } finally {
      setLoading(false);
    }
  };

  const rejectRequest = async (id) => {
    const req = requests.find((r) => r.id === id);
    if (!req) return;

    const raw = req.__raw || {};
    const rescueMissionID = raw.rescueMissionID ?? raw.missionID ?? raw.id ?? id;

    const reason = prompt("Reject reason?");
    if (reason !== null && reason.trim() === "") return;

    try {
      setLoading(true);
      setErr("");

      await rescueMissionService.respond({
        rescueMissionID,
        isAccepted: false,
        rejectReason: reason?.trim() || "Not available",
      });

      setRequests((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
              ...r,
              status: "rejected",
              __raw: { ...r.__raw, missionStatus: "Rejected" },
            }
            : r
        )
      );

      addHistory("REJECTED", req);
    } catch (e) {
      console.error(e);
      setErr("Reject mission failed.");
    } finally {
      setLoading(false);
    }
  };

  const completeRequest = async (id) => {
    const req = requests.find((r) => r.id === id);
    if (!req) return;

    const raw = req.__raw || {};
    const rescueMissionID = raw.rescueMissionID ?? raw.missionID ?? raw.id ?? id;

    try {
      setLoading(true);
      setErr("");

      await completeMission(rescueMissionID);

      setRequests((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
              ...r,
              status: "completed",
              __raw: { ...r.__raw, missionStatus: "Completed" },
            }
            : r
        )
      );

      addHistory("COMPLETED", req);
    } catch (e) {
      console.error(e);
      setErr(e.message || "Complete mission failed.");
      alert(e.message || "Complete mission failed.");
    } finally {
      setLoading(false);
    }
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
        rescueMissionID: rescueMissionId,
        reliefOrderID: reliefOrderId,
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
              description: [
                r.__raw?.address,
                r.__raw?.citizenName,
                r.__raw?.citizenPhone,
                "PICKED_UP",
              ]
                .filter(Boolean)
                .join(" • "),
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
        String(r.id).toLowerCase().includes(q) ||
        String(r.type).toLowerCase().includes(q) ||
        String(r.description).toLowerCase().includes(q);

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
  const closeProblemModal = () => {
    setShowProblemModal(false);
    setSelectedRequestId(null);
    setProblemForm({
      title: "",
      description: "",
      severity: "medium",
    });
  };

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

            <label className="pm-label">Problem Title *</label>
            <input
              type="text"
              value={problemForm.title}
              onChange={(e) =>
                setProblemForm((s) => ({ ...s, title: e.target.value }))
              }
              placeholder="Enter problem title..."
            />

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
                onClick={closeProblemModal}
              >
                Cancel
              </button>

              <button
                className="pm-submit"
                disabled={!problemForm.title.trim() || !problemForm.description.trim() || loading}
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
