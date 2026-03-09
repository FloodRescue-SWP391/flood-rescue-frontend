import React, { useState, useEffect, useMemo, useRef } from "react";
import Header from "../../../components/common/Header";
import { trackRescueRequest } from "../../../services/rescueRequestService";
import "./RequestStatus.css";
import { Link, useLocation } from "react-router-dom";
import "../../../pages/home/Introduce.css";

const RequestStatus = () => {
  const [request, setRequest] = useState(null);
  const [rescueTeam, setRescueTeam] = useState(null);
  const [eta, setEta] = useState("8-10");
  const [distance, setDistance] = useState("3.2");

  const [inputCode, setInputCode] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const countdownRef = useRef(null);

  const location = useLocation();

  const shortCode = useMemo(() => {
    const qs = new URLSearchParams(location.search);
    return (qs.get("code") || qs.get("shortCode") || "").trim();
  }, [location.search]);

  useEffect(() => {
    if (shortCode) {
      setInputCode(shortCode);
      loadRequestByShortCode(shortCode);
    }
  }, [shortCode]);

  const getStatusFlow = (requestType) => {
    const type = (requestType || "").toLowerCase();

    if (type === "rescue") {
      return [
        { status: "Pending", label: "Pending", icon: "🕒" },
        { status: "Processing", label: "Processing", icon: "⚙️" },
        { status: "Completed", label: "Completed", icon: "✅" },
      ];
    }

    return [
      { status: "Pending", label: "Pending", icon: "🕒" },
      { status: "Processing", label: "Processing", icon: "⚙️" },
      { status: "Delivered", label: "Delivered", icon: "📦" },
    ];
  };

  const loadRequestByShortCode = async (code) => {
    if (!code?.trim()) {
      setLookupError("Please enter a ShortCode.");
      return;
    }

    try {
      setIsSearching(true);
      setLookupError("");

      setEta("8-10");
      setDistance("3.2");

      const res = await trackRescueRequest(code.trim());
      const dto = res?.content;

      if (!dto) {
        throw new Error("No request data found.");
      }

      console.log("TRACK API RESPONSE:", res);
      console.log("TRACK CONTENT:", dto);

      setRequest({
        requestId: dto?.rescueRequestID || "",
        shortCode: dto?.shortCode || "",
        timestamp: dto?.createdTime || "",
        emergencyType: dto?.requestType || "",
        status: dto?.status || "",
        missionStatus: dto?.missionStatus || "",
        rejectedNote: dto?.rejectedNote || "",
        peopleCount: dto?.peopleCount ?? 0,
        fullName: dto?.citizenName || "",
        phoneNumber: dto?.citizenPhone || "",
        teamName: dto?.teamName || "",
      });

      setRescueTeam({
        name: dto?.teamName,
        leader: dto?.teamLeader,
        members: dto?.members || [],
      });

      localStorage.setItem("lastShortCode", code.trim());
      startCountdown();
    } catch (error) {
      console.error("Error loading request:", error);
      setLookupError(
        error?.message ||
          "Failed to load request. Please check the ShortCode and try again.",
      );
      setRequest(null);
      setRescueTeam(null);
    } finally {
      setIsSearching(false);
    }
  };

  const startCountdown = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }

    countdownRef.current = setInterval(() => {
      setEta((prev) => {
        if (prev === "Arriving") return prev;

        const [min, max] = prev.split("-").map(Number);
        if (min > 1) {
          return `${min - 1}-${max - 1}`;
        } else {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
          return "Arriving";
        }
      });
    }, 30000);
  };

  useEffect(() => {
    if (shortCode) return; // nếu URL đã có code thì không hỏi nữa

    const savedCode = localStorage.getItem("lastShortCode") || "";
    if (!savedCode) return;

    const timer = setTimeout(() => {
      const confirmFill = window.confirm(
        "A ShortCode was generated for your rescue request.\n\nDo you want to auto-fill it in the search box?",
      );

      if (confirmFill) {
        setInputCode(savedCode);
        loadRequestByShortCode(savedCode); // tự load luôn sau khi đồng ý ko cần bấm enter nữa. Không thì bỏ rồi nhấn Enter
      }

      localStorage.removeItem("lastShortCode");
    }, 300); // đợi trang render xong rồi mới hỏi

    return () => clearTimeout(timer);
  }, [shortCode]);

  useEffect(() => {
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, []);

  const handleSearchShortCode = () => {
    loadRequestByShortCode(inputCode);
  };

  const handleCodeKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      loadRequestByShortCode(inputCode);
    }
  };

  const handleContactTeam = () => {
    // In a real app, this would initiate a call or chat
    alert(
      `Calling rescue team: ${rescueTeam ? rescueTeam.name : "Emergency Services"}`,
    );
  };

  const handleUpdateLocation = () => {
    alert("Location update feature would open here");
  };

  const getStatusColor = (status) => {
    switch ((status || "").toLowerCase()) {
      case "pending":
        return "#f59e0b";
      case "processing":
        return "#3b82f6";
      case "completed":
        return "#22c55e";
      case "delivered":
        return "#10b981";
      default:
        return "#94a3b8";
    }
  };

  if (!request) {
    return (
      <>
        <Header />
        <div className="request-status-container">
          <div className="lookup-card">
            <h2>Track Your Rescue Request</h2>
            <p>Please enter your ShortCode to view the request status.</p>

            <div className="lookup-form">
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                onKeyDown={handleCodeKeyDown}
                placeholder="Enter ShortCode (e.g. ABC123)"
                className="lookup-input"
              />
              <button
                type="button"
                className="lookup-btn"
                onClick={handleSearchShortCode}
                disabled={isSearching}
              >
                {isSearching ? "Searching..." : "Track Request"}
              </button>
            </div>

            {lookupError && <p className="lookup-error">{lookupError}</p>}
          </div>
        </div>
      </>
    );
  }

  const statusFlow = getStatusFlow(
    request?.emergencyType || request?.requestType,
  );

  const currentStatusIndex = Math.max(
    statusFlow.findIndex(
      (step) =>
        step.status.toLowerCase() === (request?.status || "").toLowerCase(),
    ),
    0,
  );

  return (
    <>
      <Header />

      <div className="request-status-container">
        {/* Page Header */}
        <div className="status-header">
          <div className="header-content">
            <h1>Emergency Request Status</h1>
            <p className="request-id">
              ShortCode: <span>{request.shortCode}</span>
            </p>
            <p className="timestamp">
              Submitted:{" "}
              {new Date(request.timestamp).toLocaleString("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          </div>
        </div>

        {/* Request Status */}
        <div className="status-timeline">
          <h2 className="section-title status-title-center">Request Status</h2>

          <div className="modern-timeline">
            {statusFlow.map((step, index) => {
              const isCompleted = index < currentStatusIndex;
              const isCurrent = index === currentStatusIndex;

              return (
                <div key={step.status} className="modern-step">
                  {index < statusFlow.length - 1 && (
                    <div className="modern-line">
                      <div
                        className={`modern-line-fill ${isCompleted ? "filled" : ""}`}
                      />
                    </div>
                  )}

                  <div
                    className={`modern-icon ${
                      isCompleted ? "completed" : isCurrent ? "current" : ""
                    }`}
                  >
                    <span>{step.icon}</span>
                  </div>

                  <div className="modern-content">
                    <h4
                      className={`${
                        isCompleted || isCurrent ? "active-text" : ""
                      }`}
                    >
                      {step.label}
                    </h4>

                    {isCurrent && (
                      <p className="modern-current-text">Current status</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rescue Team Info */}
        {rescueTeam && (
          <div className="rescue-team-card">
            <div className="team-header">
              <h2 className="section-title">Assigned Rescue Team</h2>
              <button className="contact-btn" onClick={handleContactTeam}>
                📞 Contact Team
              </button>
            </div>

            <div className="team-info">
              <div className="team-overview">
                <div className="team-name-card">
                  <p className="team-label">Team Name</p>
                  <h3>{rescueTeam.name || "Not assigned yet"}</h3>

                  {rescueTeam.leader ? (
                    <div className="team-leader-box">
                      <p>
                        <strong>Leader:</strong>{" "}
                        {rescueTeam.leader.fullName || "N/A"}
                      </p>
                      <p>
                        <strong>Phone:</strong>{" "}
                        {rescueTeam.leader.phone || "N/A"}
                      </p>
                    </div>
                  ) : (
                    <p className="empty-text">No leader information yet.</p>
                  )}
                </div>
              </div>

              <div className="team-members">
                <h4>Team Members</h4>

                {rescueTeam.members?.length > 0 ? (
                  <div className="members-grid">
                    {rescueTeam.members.map((member, index) => (
                      <div key={member.userID || index} className="member-card">
                        <div className="member-badge">
                          {member.isLeader ? "👨‍🚒" : "👤"}
                        </div>
                        <div className="member-info">
                          <h5>{member.fullName || "Unnamed member"}</h5>
                          <p>
                            {member.isLeader ? "Team Leader" : "Team Member"}
                          </p>
                          <p>{member.phone || "No phone"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-members">
                    <p>No team members assigned yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Request Details */}

        <div className="request-details-card">
          <h2 className="details-title">Request Details</h2>

          <div className="details-grid">
            <div className="detail-item">
              <span className="detail-label">Full Name</span>
              <span className="detail-value">{request.fullName || "N/A"}</span>
            </div>

            <div className="detail-item">
              <span className="detail-label">Phone Number</span>
              <span className="detail-value">
                {request.phoneNumber || "N/A"}
              </span>
            </div>

            <div className="detail-item">
              <span className="detail-label">People Count</span>
              <span className="detail-value">
                {request.peopleCount ?? "N/A"}
              </span>
            </div>

            <div className="detail-item">
              <span className="detail-label">Short Code</span>
              <span className="detail-value">{request.shortCode || "N/A"}</span>
            </div>

            <div className="detail-item">
              <span className="detail-label">Emergency Type</span>
              <span className="detail-value">
                <span className="type-tag">
                  {request.emergencyType || "N/A"}
                </span>
              </span>
            </div>

            <div className="detail-item">
              <span className="detail-label">Status</span>
              <span className="detail-value status-text">
                {request.status || "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Safety Tips */}
        <div className="safety-tips">
          <h3 className="tips-title">⚠️ Safety Tips While Waiting</h3>
          <div className="tips-grid">
            <div className="tip-card">
              <div className="tip-icon">🏠</div>
              <h4>Stay in a Safe Location</h4>
              <p>
                Remain in a secure area away from danger until help arrives.
              </p>
            </div>
            <div className="tip-card">
              <div className="tip-icon">📱</div>
              <h4>Keep Phone Accessible</h4>
              <p>Ensure your phone is charged and within reach for updates.</p>
            </div>
            <div className="tip-card">
              <div className="tip-icon">🔦</div>
              <h4>Signal Your Location</h4>
              <p>
                Use lights, sounds, or visible markers to help rescuers find
                you.
              </p>
            </div>
            <div className="tip-card">
              <div className="tip-icon">👥</div>
              <h4>Stay With Others</h4>
              <p>
                If possible, remain with other people for safety and support.
              </p>
            </div>
          </div>
        </div>

        <footer className="homepage-footer">
          <div className="footer-content">
            <div className="footer-section">
              <h3>Emergency Rescue System</h3>
              <p>
                Smart rescue connection,
                <br />
                fast and effective
              </p>
            </div>
            <div className="footer-section">
              <h3>Contact</h3>
              <p>Email: rescue@gmail.com</p>
              <p>Hotline: 0965 782 358</p>
            </div>
            <div className="footer-section">
              <h3>Support</h3>
              <Link to="/guide">Instructions for use</Link>
              <Link to="/faq">Frequently asked questions</Link>
              <Link to="/contact">Contact support</Link>
            </div>
          </div>
          <div className="footer-bottom">
            © 2026 Rescue System. All rights reserved.
          </div>
        </footer>
      </div>
    </>
  );
};

export default RequestStatus;
