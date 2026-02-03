import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../../components/common/Header";
import "./RequestStatus.css";

const RequestStatus = () => {
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [rescueTeam, setRescueTeam] = useState(null);
  const [eta, setEta] = useState("8-10");
  const [distance, setDistance] = useState("3.2");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Status flow simulation
  const statusFlow = [
    { status: "received", label: "Request Received", time: "2 min ago", icon: "📥" },
    { status: "processing", label: "Processing", time: "1 min ago", icon: "⚙️" },
    { status: "assigned", label: "Team Assigned", time: "Now", icon: "👨‍🚒" },
    { status: "dispatched", label: "Dispatched", time: "Soon", icon: "🚑" },
    { status: "enroute", label: "En Route", time: "Upcoming", icon: "📍" },
    { status: "arrived", label: "Arrived", time: "Upcoming", icon: "✅" }
  ];

  // Rescue team members
  const rescueTeams = [
    {
      id: 1,
      name: "Alpha Rescue Team",
      members: [
        { name: "John Smith", role: "Team Leader", badge: "👨‍🚒" },
        { name: "Sarah Johnson", role: "Medical Officer", badge: "👩‍⚕️" },
        { name: "Mike Chen", role: "Rescue Specialist", badge: "🛠️" },
        { name: "Lisa Wang", role: "Communications", badge: "📞" }
      ],
      vehicle: "Rescue Vehicle #RV-7",
      equipment: ["Medical Kit", "Rescue Tools", "Oxygen Tanks", "Communication Gear"]
    },
    {
      id: 2,
      name: "Bravo Rescue Team",
      members: [
        { name: "David Lee", role: "Team Leader", badge: "👨‍🚒" },
        { name: "Emma Wilson", role: "Medical Officer", badge: "👩‍⚕️" },
        { name: "Alex Brown", role: "Rescue Specialist", badge: "🛠️" },
        { name: "Maria Garcia", role: "Communications", badge: "📞" }
      ],
      vehicle: "Ambulance #AMB-12",
      equipment: ["Defibrillator", "First Aid", "Extrication Tools", "GPS Tracker"]
    }
  ];

  useEffect(() => {
    // Load request data from localStorage
    const savedRequest = localStorage.getItem('lastRescueRequest');
    if (savedRequest) {
      const parsedRequest = JSON.parse(savedRequest);
      setRequest(parsedRequest);
      
      // Set a random rescue team
      const randomTeam = rescueTeams[Math.floor(Math.random() * rescueTeams.length)];
      setRescueTeam(randomTeam);
      
      // Simulate ETA countdown
      startCountdown();
    } else {
      // No request found, redirect to request page
      setTimeout(() => navigate("/citizen/request"), 1000);
    }
  }, [navigate]);

  const startCountdown = () => {
    const timer = setInterval(() => {
      setEta(prev => {
        const [min, max] = prev.split("-").map(Number);
        if (min > 1) {
          return `${min - 1}-${max - 1}`;
        } else {
          clearInterval(timer);
          return "Arriving";
        }
      });
    }, 30000); // Update every 30 seconds
  };

  const handleCancelRequest = () => {
    setIsCancelling(true);
    
    // Simulate API call
    setTimeout(() => {
      localStorage.removeItem('lastRescueRequest');
      setIsCancelling(false);
      setShowCancelModal(false);
      navigate("/citizen/hero");
    }, 1500);
  };

  const handleContactTeam = () => {
    // In a real app, this would initiate a call or chat
    alert(`Calling rescue team: ${rescueTeam ? rescueTeam.name : 'Emergency Services'}`);
  };

  const handleUpdateLocation = () => {
    alert("Location update feature would open here");
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "received": return "📥";
      case "processing": return "⚙️";
      case "assigned": return "👨‍🚒";
      case "dispatched": return "🚑";
      case "enroute": return "📍";
      case "arrived": return "✅";
      default: return "⏳";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "received": return "#3b82f6";
      case "processing": return "#8b5cf6";
      case "assigned": return "#f59e0b";
      case "dispatched": return "#10b981";
      case "enroute": return "#06b6d4";
      case "arrived": return "#22c55e";
      default: return "#64748b";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "Critical": return "#ef4444";
      case "High": return "#f97316";
      case "Medium": return "#eab308";
      case "Low": return "#22c55e";
      default: return "#64748b";
    }
  };

  if (!request) {
    return (
      <>
        <Header />
        <div className="request-status-container">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <h3>Loading request details...</h3>
            <p>Please wait while we retrieve your emergency request information.</p>
          </div>
        </div>
      </>
    );
  }

  const currentStatusIndex = 2; // Simulating "assigned" status

  return (
    <>
      <Header />

      <div className="request-status-container">
        {/* Page Header */}
        <div className="status-header">
          <div className="header-content">
            <h1>Emergency Request Status</h1>
            <p className="request-id">Request ID: <span>{request.requestId}</span></p>
            <p className="timestamp">
              Submitted: {new Date(request.timestamp).toLocaleString('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short'
              })}
            </p>
          </div>
          <button 
            className="cancel-btn"
            onClick={() => setShowCancelModal(true)}
            disabled={currentStatusIndex > 2}
          >
            🚫 Cancel Request
          </button>
        </div>

        {/* Status Summary Card */}
        <div className="status-summary-card">
          <div className="summary-header">
            <div className="emergency-type">
              <span className="type-icon">🚨</span>
              <div>
                <h3>{request.emergencyType}</h3>
                <p className="type-description">
                  {request.description || "No additional description provided"}
                </p>
              </div>
            </div>
            <div className="priority-badge" style={{ 
              backgroundColor: getPriorityColor(request.priorityLevel) + '20',
              color: getPriorityColor(request.priorityLevel),
              borderColor: getPriorityColor(request.priorityLevel)
            }}>
              {request.priorityLevel} Priority
            </div>
          </div>

          <div className="summary-stats">
            <div className="stat-item">
              <div className="stat-label">Estimated Arrival</div>
              <div className="stat-value eta">{eta} minutes</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Distance</div>
              <div className="stat-value">{distance} km</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">People</div>
              <div className="stat-value">
                <span className="people-count">{request.peopleCount}</span>
                <span className="people-label">person{request.peopleCount !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Status Timeline */}
        <div className="status-timeline">
          <h2 className="section-title">Request Status</h2>
          <div className="timeline">
            {statusFlow.map((step, index) => (
              <div 
                key={step.status} 
                className={`timeline-step ${index <= currentStatusIndex ? 'completed' : ''} ${index === currentStatusIndex ? 'current' : ''}`}
              >
                <div className="timeline-marker">
                  <div 
                    className="marker-circle" 
                    style={{ 
                      backgroundColor: index <= currentStatusIndex ? getStatusColor(step.status) : '#e2e8f0',
                      borderColor: getStatusColor(step.status)
                    }}
                  >
                    {getStatusIcon(step.status)}
                  </div>
                  {index < statusFlow.length - 1 && (
                    <div 
                      className="timeline-line" 
                      style={{ 
                        backgroundColor: index < currentStatusIndex ? getStatusColor(step.status) : '#e2e8f0'
                      }}
                    ></div>
                  )}
                </div>
                <div className="timeline-content">
                  <h4>{step.label}</h4>
                  <p className="timeline-time">{step.time}</p>
                  {index === currentStatusIndex && (
                    <div className="current-status">
                      <span className="status-pulse"></span>
                      <span className="status-text">Active</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
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
                <div className="team-name">
                  <span className="team-icon">👨‍🚒</span>
                  <h3>{rescueTeam.name}</h3>
                </div>
                <div className="team-details">
                  <p><strong>Vehicle:</strong> {rescueTeam.vehicle}</p>
                  <p><strong>Equipment:</strong> {rescueTeam.equipment.join(", ")}</p>
                </div>
              </div>

              <div className="team-members">
                <h4>Team Members</h4>
                <div className="members-grid">
                  {rescueTeam.members.map((member, index) => (
                    <div key={index} className="member-card">
                      <div className="member-badge">{member.badge}</div>
                      <div className="member-info">
                        <h5>{member.name}</h5>
                        <p>{member.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Request Details */}
        <div className="details-card">
          <h2 className="section-title">Request Details</h2>
          <div className="details-grid">
            <div className="detail-item">
              <span className="detail-label">Full Name</span>
              <span className="detail-value">{request.fullName}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Phone Number</span>
              <span className="detail-value">{request.phoneNumber}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Location</span>
              <span className="detail-value">{request.address}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Emergency Type</span>
              <span className="detail-value">
                <span className="type-tag">{request.emergencyType}</span>
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Location Sharing</span>
              <span className="detail-value">
                <span className={`status-tag ${request.shareLocation ? 'active' : 'inactive'}`}>
                  {request.shareLocation ? '📍 Enabled' : '❌ Disabled'}
                </span>
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Preferred Contact</span>
              <span className="detail-value">{request.contactVia}</span>
            </div>
          </div>
          
          <div className="action-buttons">
            <button className="action-btn secondary" onClick={handleUpdateLocation}>
              📍 Update Location
            </button>
            <button className="action-btn primary" onClick={handleContactTeam}>
              🚑 Request Urgent Update
            </button>
          </div>
        </div>

        {/* Safety Tips */}
        <div className="safety-tips">
          <h3 className="tips-title">⚠️ Safety Tips While Waiting</h3>
          <div className="tips-grid">
            <div className="tip-card">
              <div className="tip-icon">🏠</div>
              <h4>Stay in a Safe Location</h4>
              <p>Remain in a secure area away from danger until help arrives.</p>
            </div>
            <div className="tip-card">
              <div className="tip-icon">📱</div>
              <h4>Keep Phone Accessible</h4>
              <p>Ensure your phone is charged and within reach for updates.</p>
            </div>
            <div className="tip-card">
              <div className="tip-icon">🔦</div>
              <h4>Signal Your Location</h4>
              <p>Use lights, sounds, or visible markers to help rescuers find you.</p>
            </div>
            <div className="tip-card">
              <div className="tip-icon">👥</div>
              <h4>Stay With Others</h4>
              <p>If possible, remain with other people for safety and support.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Request Modal */}
      {showCancelModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Cancel Emergency Request?</h3>
              <button className="modal-close" onClick={() => setShowCancelModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="warning-icon">⚠️</div>
              <p>
                Are you sure you want to cancel this emergency request? 
                This action cannot be undone.
              </p>
              <p className="warning-text">
                <strong>Important:</strong> Only cancel if the emergency situation has been resolved 
                or if this was requested in error.
              </p>
            </div>
            <div className="modal-actions">
              <button 
                className="modal-btn secondary"
                onClick={() => setShowCancelModal(false)}
                disabled={isCancelling}
              >
                Keep Request
              </button>
              <button 
                className="modal-btn danger"
                onClick={handleCancelRequest}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <>
                    <span className="spinner small"></span>
                    Cancelling...
                  </>
                ) : (
                  "Yes, Cancel Request"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RequestStatus;