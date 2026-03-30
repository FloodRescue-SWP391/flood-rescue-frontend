import React, { useState, useEffect, useMemo } from "react";
import Header from "../../../components/common/Header";
import { trackRescueRequest } from "../../../services/rescueRequestService";
import "./RequestStatus.css";
import { useLocation, useNavigate } from "react-router-dom";
import "../../../pages/home/Introduce.css";
import signalRService from "../../../services/signalrService";
import Footer from "../../../components/common/Footer";

const RequestStatus = () => {
  const [request, setRequest] = useState(null);
  const [rescueTeam, setRescueTeam] = useState(null);

  const [inputCode, setInputCode] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const [forcedStatus, setForcedStatus] = useState("");

  const location = useLocation();

  const shortCode = useMemo(() => {
    const qs = new URLSearchParams(location.search);
    return (qs.get("code") || qs.get("shortCode") || "").trim();
  }, [location.search]);

  const createdAt = localStorage.getItem("requestCreatedAt");

  const navigate = useNavigate();

  useEffect(() => {
    if (shortCode) {
      setInputCode(shortCode);
      loadRequestByShortCode(shortCode);
    }
  }, [shortCode]);

  useEffect(() => {
    if (!shortCode) return;

    const handleMissionUpdate = (eventName) => (data) => {
      console.log("Citizen realtime update:", eventName, data);

      const code =
        data?.requestShortCode ??
        data?.RequestShortCode ??
        data?.shortCode ??
        "";

      if (code.trim().toUpperCase() !== shortCode.trim().toUpperCase()) {
        return;
      }

      // Vá UI ngay lập tức cho demo
      if (
        eventName === "ReceiveTeamAcceptedNotification" ||
        eventName === "ReceiveTeamResponse"
      ) {
        setForcedStatus("processing");

        setRequest((prev) =>
          prev
            ? {
                ...prev,
                missionStatus: prev?.missionStatus || "InProgress",
                status:
                  prev?.status?.toLowerCase() === "pending"
                    ? "Processing"
                    : prev?.status,
              }
            : prev,
        );
      }

      if (
        eventName === "MissionCompleted" ||
        eventName === "ReceiveMissionCompletedNotification"
      ) {
        setRequest((prev) => {
          if (!prev) return prev;

          const requestType = (
            prev?.emergencyType ||
            prev?.requestType ||
            ""
          ).toLowerCase();
          const isSupply = requestType === "supply";

          setForcedStatus(isSupply ? "delivered" : "completed");

          return {
            ...prev,
            missionStatus: isSupply ? "Delivered" : "Completed",
            status: isSupply ? "Delivered" : "Completed",
          };
        });
      }

      loadRequestByShortCode(shortCode);
      setTimeout(() => loadRequestByShortCode(shortCode), 1200);
      setTimeout(() => loadRequestByShortCode(shortCode), 2500);
    };

    const onMissionCompleted = handleMissionUpdate("MissionCompleted");
    const onReceiveTeamResponse = handleMissionUpdate("ReceiveTeamResponse");
    const onMissionCompletedOld = handleMissionUpdate(
      "ReceiveMissionCompletedNotification",
    );
    const onTeamAccepted = handleMissionUpdate(
      "ReceiveTeamAcceptedNotification",
    );
    const onTeamRejected = handleMissionUpdate(
      "ReceiveTeamRejectedNotification",
    );

    const initSignalR = async () => {
      try {
        await signalRService.startConnection();

        signalRService.on("MissionCompleted", onMissionCompleted);
        signalRService.on("ReceiveTeamResponse", onReceiveTeamResponse);
        signalRService.on(
          "ReceiveMissionCompletedNotification",
          onMissionCompletedOld,
        );
        signalRService.on("ReceiveTeamAcceptedNotification", onTeamAccepted);
        signalRService.on("ReceiveTeamRejectedNotification", onTeamRejected);
      } catch (err) {
        console.error("Citizen SignalR init error:", err);
      }
    };

    initSignalR();

    return () => {
      signalRService.off("MissionCompleted", onMissionCompleted);
      signalRService.off("ReceiveTeamResponse", onReceiveTeamResponse);
      signalRService.off(
        "ReceiveMissionCompletedNotification",
        onMissionCompletedOld,
      );
      signalRService.off("ReceiveTeamAcceptedNotification", onTeamAccepted);
      signalRService.off("ReceiveTeamRejectedNotification", onTeamRejected);
    };
  }, [shortCode]);

  useEffect(() => {
    if (!request?.shortCode) return;

    const interval = setInterval(() => {
      console.log("Auto refreshing request status...");
      loadRequestByShortCode(request.shortCode);
    }, 5000); // refresh mỗi 10 giây

    return () => {
      clearInterval(interval);
    };
  }, [request?.shortCode]);

  const getStatusFlow = (requestType) => {
    const type = (requestType || "").toLowerCase();

    if (type === "rescue") {
      return [
        { status: "Pending", label: "Chờ xử lý", icon: "🕒" },
        { status: "Processing", label: "Đang xử lý", icon: "⚙️" },
        { status: "Completed", label: "Đã hoàn thành", icon: "✅" },
      ];
    }

    return [
      { status: "Pending", label: "Chờ xử lý", icon: "🕒" },
      { status: "Processing", label: "Đang xử lý", icon: "⚙️" },
      { status: "Delivered", label: "Đã giao", icon: "📦" },
    ];
  };

  const loadRequestByShortCode = async (code) => {
    if (!code?.trim()) {
      setLookupError("Vui lòng nhập mã tra cứu.");
      return;
    }

    try {
      setIsSearching(true);
      setLookupError("");

      const res = await trackRescueRequest(code.trim());
      const dto = res?.content;
      const realMission = (dto?.missionStatus || "").toLowerCase();
      const realStatus = (dto?.status || "").toLowerCase();

      if (
        realMission === "completed" ||
        realStatus === "completed" ||
        realStatus === "delivered" ||
        realMission === "inprogress" ||
        realMission === "processing" ||
        realStatus === "processing"
      ) {
        setForcedStatus("");
      }

      if (!dto) {
        throw new Error("No request data found.");
      }

      console.log("TRACK API RESPONSE:", res);
      console.log("TRACK CONTENT:", dto);

      const requestData = {
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
        teamName: dto?.teamName || null,
      };

      const safeRequestData = { ...requestData };

      if (forcedStatus === "processing") {
        safeRequestData.status =
          safeRequestData.status?.toLowerCase() === "pending"
            ? "Processing"
            : safeRequestData.status;

        safeRequestData.missionStatus =
          safeRequestData.missionStatus || "InProgress";
      }

      if (forcedStatus === "completed") {
        safeRequestData.status = "Completed";
        safeRequestData.missionStatus = "Completed";
      }

      if (forcedStatus === "delivered") {
        safeRequestData.status = "Delivered";
        safeRequestData.missionStatus = "Delivered";
      }
      console.log("TRACK CONTENT FULL:", dto);
      console.log("STATUS:", dto?.status);
      console.log("MISSION STATUS:", dto?.missionStatus);
      console.log("TEAM NAME:", dto?.teamName);

      const rescueTeamData = dto?.teamName
        ? {
            name: dto?.teamName,
            leader: dto?.teamLeader,
            members: dto?.members || [],
          }
        : null;

      setRequest(safeRequestData);
      setRescueTeam(rescueTeamData);

      localStorage.setItem("lastRequestData", JSON.stringify(requestData));
      localStorage.setItem(
        "lastRescueTeamData",
        JSON.stringify(rescueTeamData),
      );

      const finalStatuses = ["completed", "delivered", "rejected", "cancelled"];
      const currentStatus = (dto?.status || "").toLowerCase();

      if (finalStatuses.includes(currentStatus)) {
        localStorage.removeItem("lastShortCode");
      } else {
        localStorage.setItem("lastShortCode", code.trim());
      }

      // startCountdown();
    } catch (error) {
      console.error("Error loading request:", error);
      setLookupError(
        error?.message ||
          "Không thể tải yêu cầu. Vui lòng kiểm tra mã tra cứu và thử lại.",
      );
      setRequest(null);
      setRescueTeam(null);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (shortCode) return; // nếu URL đã có code thì không hỏi nữa

    const savedCode = localStorage.getItem("lastShortCode") || "";
    if (!savedCode) return;

    const timer = setTimeout(() => {
      const confirmFill = window.confirm(
        "Một mã tra cứu đã được tạo cho yêu cầu cứu hộ của bạn.\n\nBạn có muốn tự động điền mã này vào ô tìm kiếm không?",
      );

      if (confirmFill) {
        setInputCode(savedCode);
        navigate(
          `/citizen/request-status?code=${encodeURIComponent(savedCode)}`,
          {
            replace: true,
          },
        );
      }
    }, 2000); // đợi trang render xong rồi mới hỏi

    return () => clearTimeout(timer);
  }, [shortCode]);

  const handleSearchShortCode = () => {
    const code = inputCode.trim();
    if (!code) {
      setLookupError("Vui lòng nhập mã tra cứu.");
      return;
    }

    navigate(`/citizen/request-status?code=${encodeURIComponent(code)}`);
  };

  const handleCodeKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearchShortCode();
    }
  };

  const handleContactTeam = () => {
    // In a real app, this would initiate a call or chat
    alert(
      `Calling rescue team: ${rescueTeam ? rescueTeam.name : "Emergency Services"}`,
    );
  };

  const normalizeTimelineStatus = (request, forcedStatus) => {
    const forced = (forcedStatus || "").toLowerCase();
    const mission = (request?.missionStatus || "").toLowerCase();
    const status = (request?.status || "").toLowerCase();
    const requestType = (
      request?.emergencyType ||
      request?.requestType ||
      ""
    ).toLowerCase();
    const isSupply = requestType === "supply";
    const hasTeam = !!request?.teamName;

    if (forced === "processing") return "processing";
    if (forced === "delivered") return "delivered";
    if (forced === "completed") return isSupply ? "delivered" : "completed";

    if (mission === "delivered") return "delivered";
    if (mission === "completed") return isSupply ? "delivered" : "completed";

    if (
      mission === "inprogress" ||
      mission === "in_progress" ||
      mission === "accepted" ||
      mission === "processing"
    ) {
      return "processing";
    }

    if (hasTeam && !mission) {
      return "processing";
    }

    if (status === "delivered") return "delivered";
    if (status === "completed") return isSupply ? "delivered" : "completed";

    if (
      status === "processing" ||
      status === "inprogress" ||
      status === "in_progress" ||
      status === "accepted"
    ) {
      return "processing";
    }

    return "pending";
  };

  const formatMissionStatus = (status, requestType) => {
    const s = (status || "").toString().trim().toLowerCase();
    const type = (requestType || "").toString().trim().toLowerCase();

    if (s === "completed") {
      return type === "supply" ? "Đã giao hàng cứu trợ" : "Hoàn thành";
    }

    if (s === "inprogress" || s === "in_progress" || s === "processing") {
      return "Đang xử lý";
    }

    if (s === "accepted") {
      return "Đội cứu hộ đã chấp nhận";
    }

    if (s === "pending") {
      return "Đang chờ xử lý";
    }

    if (s === "rejected") {
      return "Đã từ chối";
    }

    if (s === "cancelled") {
      return "Đã hủy";
    }

    return status || "Đang chọn đội cứu hộ...";
  };

  const getDisplayStatusColor = (status) => {
    switch ((status || "").toLowerCase()) {
      case "pending":
        return "#f59e0b";

      case "accepted":
      case "processing":
      case "inprogress":
      case "in_progress":
        return "#3b82f6";

      case "completed":
        return "#22c55e";

      case "delivered":
        return "#10b981";

      case "rejected":
      case "cancelled":
        return "#ef4444";

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
            <h2>Tra cứu yêu cầu cứu hộ</h2>
            <p>Vui lòng nhập mã tra cứu để xem trạng thái yêu cầu.</p>

            <div className="lookup-form">
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                onKeyDown={handleCodeKeyDown}
                placeholder="Nhập mã tra cứu (VD: ABC123)"
                className="lookup-input"
              />
              <button
                type="button"
                className="lookup-btn"
                onClick={handleSearchShortCode}
                disabled={isSearching}
              >
                {isSearching ? "Đang tìm..." : "Tra cứu"}
              </button>
            </div>

            {lookupError && <p className="lookup-error">{lookupError}</p>}
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const statusFlow = getStatusFlow(
    request?.emergencyType || request?.requestType,
  );

  //const normalizedTimelineStatus = normalizeTimelineStatus(request);

  const normalizedTimelineStatus = normalizeTimelineStatus(
    request,
    forcedStatus,
  );

  const currentStatusIndex = Math.max(
    statusFlow.findIndex(
      (step) => step.status.toLowerCase() === normalizedTimelineStatus,
    ),
    0,
  );

  const isFinished =
    normalizedTimelineStatus === "completed" ||
    normalizedTimelineStatus === "delivered";
  return (
    <>
      <Header />

      <button className="back-button1" onClick={() => navigate("/")}>
        Quay lại
      </button>

      <div className="request-status-container">
        {/* Page Header */}
        <div className="status-header">
          <div className="header-content">
            <h1>Trạng thái yêu cầu cứu hộ</h1>
            <p className="request-id">
              Mã tra cứu: <span>{request.shortCode}</span>
            </p>
            <p className="timestamp">
              Thời gian gửi:{" "}
              {createdAt
                ? new Date(createdAt).toLocaleString("vi-VN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Asia/Ho_Chi_Minh",
                  })
                : "Không có"}
            </p>
          </div>
        </div>

        {isFinished && (
          <div className="completion-banner">
            <div className="completion-content">
              <h3>🎉 Yêu cầu của bạn đã hoàn thành</h3>
              <p>
                Cảm ơn bạn đã kiên nhẫn chờ đợi. Đội cứu hộ đã hoàn tất nhiệm
                vụ.
              </p>
              <p>
                💙 Chúc bạn luôn giữ vững tinh thần, an toàn và tràn đầy sức
                khỏe.
              </p>
            </div>
          </div>
        )}

        {/* Request Status */}
        <div className="status-timeline">
          <h2 className="section-title status-title-center">
            Trạng thái yêu cầu
          </h2>

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
                      <p className="modern-current-text">Trạng thái hiện tại</p>
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
              <h2 className="section-title">Đội cứu hộ được phân công</h2>
              <button className="contact-btn" onClick={handleContactTeam}>
                📞 Liên hệ đội
              </button>
            </div>

            <div className="team-info">
              <div className="team-overview">
                <div className="team-name-card">
                  <p className="team-label">Tên đội</p>
                  <h3>{rescueTeam.name || "Chưa được phân công"}</h3>

                  {rescueTeam.leader ? (
                    <div className="team-leader-box">
                      <p>
                        <strong>Trưởng nhóm:</strong>{" "}
                        {rescueTeam.leader.fullName || "Không có"}
                      </p>
                      <p>
                        <strong>Số điện thoại:</strong>{" "}
                        {rescueTeam.leader.phone || "Không có"}
                      </p>
                    </div>
                  ) : (
                    <p className="empty-text">Chưa có thông tin trưởng nhóm.</p>
                  )}
                </div>
              </div>

              <div className="team-members">
                <h4>Thành viên đội</h4>

                {rescueTeam.members?.length > 0 ? (
                  <div className="members-grid">
                    {rescueTeam.members.map((member, index) => (
                      <div key={member.userID || index} className="member-card">
                        <div className="member-badge">
                          {member.isLeader ? "👨‍🚒" : "👤"}
                        </div>

                        <div className="member-info">
                          <h5>{member.fullName || "Chưa có tên"}</h5>
                          <p>
                            {member.isLeader ? "Trưởng nhóm" : "Thành viên"}
                          </p>
                          <p>{member.phone || "Chưa có số điện thoại"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-members">
                    <p>Chưa có thành viên nào được phân công.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Request Details */}

        <div className="request-details-card">
          <h2 className="details-title">Chi tiết yêu cầu</h2>

          <div className="details-grid">
            <div className="detail-item">
              <span className="detail-label">Họ và tên</span>
              <span className="detail-value">
                {request.fullName || "Không có"}
              </span>
            </div>

            <div className="detail-item">
              <span className="detail-label">Số điện thoại</span>
              <span className="detail-value">
                {request.phoneNumber || "Không có"}
              </span>
            </div>

            <div className="detail-item">
              <span className="detail-label">Số người</span>
              <span className="detail-value">
                {request.peopleCount ?? "Không có"}
              </span>
            </div>

            <div className="detail-item">
              <span className="detail-label">Mã tra cứu</span>
              <span className="detail-value">
                {request.shortCode || "Không có"}
              </span>
            </div>

            <div className="detail-item">
              <span className="detail-label">Loại khẩn cấp</span>
              <span className="detail-value">
                <span className="type-tag">
                  {request.emergencyType || "Không có"}
                </span>
              </span>
            </div>

            <div className="detail-item">
              <span className="detail-label">Trạng thái nhiệm vụ</span>
              <span
                className="detail-value"
                style={{
                  color: getDisplayStatusColor(normalizedTimelineStatus),
                }}
              >
                {formatMissionStatus(
                  normalizedTimelineStatus,
                  request.emergencyType,
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Safety Tips */}
        <div className="safety-tips">
          <h3 className="tips-title">⚠️ Lưu ý an toàn khi chờ cứu hộ</h3>

          <div className="tips-grid">
            <div className="tip-card">
              <div className="tip-icon">🏠</div>
              <h4>Ở nơi an toàn</h4>
              <p>
                Hãy ở trong khu vực an toàn, tránh xa nguy hiểm cho đến khi được
                hỗ trợ.
              </p>
            </div>

            <div className="tip-card">
              <div className="tip-icon">📱</div>
              <h4>Giữ điện thoại bên mình</h4>
              <p>
                Đảm bảo điện thoại luôn đủ pin và ở gần để nhận thông tin cập
                nhật.
              </p>
            </div>

            <div className="tip-card">
              <div className="tip-icon">🔦</div>
              <h4>Phát tín hiệu vị trí</h4>
              <p>
                Sử dụng đèn, âm thanh hoặc dấu hiệu dễ thấy để đội cứu hộ xác
                định vị trí của bạn.
              </p>
            </div>

            <div className="tip-card">
              <div className="tip-icon">👥</div>
              <h4>Ở cùng mọi người</h4>
              <p>
                Nếu có thể, hãy ở cùng những người khác để đảm bảo an toàn và hỗ
                trợ lẫn nhau.
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default RequestStatus;
