import "./Dashboard.css";
import Header from "../../components/common/Header";  

import  "react-router-dom";
import { useMemo, useState } from "react";

/* ===== MOCK DATA (with problemReports) ===== */
const initialRequests = [
  {
    id: "R1",
    type: "Medical Emergency",
    description: "Person injured, needs help immediately",
    status: "new",
    problemReports: [],
  },
  {
    id: "R2",
    type: "Flood Rescue",
    description: "House flooded, people trapped inside",
    status: "new",
    problemReports: [],
  },
  {
    id: "R3",
    type: "Accident",
    description: "Car accident, two vehicles involved",
    status: "in-progress",
    problemReports: [
      {
        id: "P1",
        description: "Road blocked, need alternative route",
        severity: "medium",
        time: new Date(Date.now() - 20 * 60 * 1000),
      },
    ],
  },
  {
    id: "R4",
    type: "Fire Emergency",
    description: "Small fire reported in residential area",
    status: "completed",
    problemReports: [],
  },
];

export default function RescueTeam() {
  const [requests, setRequests] = useState(initialRequests);

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

  /* ===== DERIVED DATA ===== */
  const newRequests = useMemo(
    () => requests.filter((r) => r.status === "new"),
    [requests]
  );

  const inProgressRequests = useMemo(
    () => requests.filter((r) => r.status === "in-progress"),
    [requests]
  );

  const completedRequests = useMemo(
    () => requests.filter((r) => r.status === "completed"),
    [requests]
  );

  /* ===== ACTIONS ===== */
  const acceptRequest = (id) => {
    const req = requests.find((r) => r.id === id);
    if (!req) return;

    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "in-progress" } : r))
    );

    addHistory("ACCEPTED", req);
  };

  const rejectRequest = (id) => {
    const req = requests.find((r) => r.id === id);
    if (!req) return;

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
