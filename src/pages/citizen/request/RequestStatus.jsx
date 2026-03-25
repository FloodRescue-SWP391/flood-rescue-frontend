import React, { useState, useEffect, useMemo, useRef } from "react";
import Header from "../../../components/common/Header";
import { trackRescueRequest } from "../../../services/rescueRequestService";
import "./RequestStatus.css";
import {  useLocation, useNavigate } from "react-router-dom";
import "../../../pages/home/Introduce.css";
import signalRService from "../../../services/signalrService";
import Footer from "../../../components/common/Footer";

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

  // Lấy thời gian thực
  //const createdAt = request?.timestamp || "";
  const createdAt = localStorage.getItem("requestCreatedAt");

  const navigate = useNavigate();

  useEffect(() => {
    if (shortCode) {
      setInputCode(shortCode);
      loadRequestByShortCode(shortCode);
    }
  }, [shortCode]);
  // SIGNALR REALTIME FOR CITIZEN
  // Citizen sẽ nhận update realtime khi mission thay đổi
  useEffect(() => {
    if (!shortCode) return;

    // Khi backend báo request có thay đổi trạng thái, citizen sẽ gọi lại API track theo shortCode.
    const handleMissionUpdate = (data) => {
      console.log("Citizen realtime update:", data);
      const code =
        data?.requestShortCode ?? data?.RequestShortCode ?? data?.shortCode;
      if (!code || code === shortCode) {
        loadRequestByShortCode(shortCode);
      }
    };

    const initSignalR = async () => {
      // await signalRService.startConnection();

      try {
        await signalRService.startConnection();
        // Event mới: mission hoàn thành.
        await signalRService.on("MissionCompleted", handleMissionUpdate);
        // Event mới dạng tổng quát cho accept/reject nếu backend đã chuẩn hóa.
        await signalRService.on("ReceiveTeamResponse", handleMissionUpdate);
        // Giữ lại event cũ để tương thích nếu backend citizen vẫn đang bắn tên cũ.
        // Mission completed
        signalRService.on(
          "ReceiveMissionCompletedNotification",
          handleMissionUpdate,
        );

        // Team accepted
        signalRService.on(
          "ReceiveTeamAcceptedNotification",
          handleMissionUpdate,
        );

        // Team rejected
        signalRService.on(
          "ReceiveTeamRejectedNotification",
          handleMissionUpdate,
        );
      } catch (err) {
        console.error("Citizen SignalR init error:", err);
      }
    };

    initSignalR();

    return () => {
      signalRService.off("MissionCompleted", handleMissionUpdate);
      signalRService.off("ReceiveTeamResponse", handleMissionUpdate);
      // -------- Giữ lại event cũ để tương thích nếu backend citizen vẫn đang bắn tên cũ.
      signalRService.off(
        "ReceiveMissionCompletedNotification",
        handleMissionUpdate,
      );
      signalRService.off(
        "ReceiveTeamAcceptedNotification",
        handleMissionUpdate,
      );
      signalRService.off(
        "ReceiveTeamRejectedNotification",
        handleMissionUpdate,
      );
    };
  }, [shortCode]);

  // AUTO REFRESH REQUEST STATUS
  // Citizen sẽ tự động cập nhật trạng thái mỗi 10 giây
  useEffect(() => {
    if (!request?.shortCode) return;

    const interval = setInterval(() => {
      console.log("Auto refreshing request status...");
      loadRequestByShortCode(request.shortCode);
    }, 3000); // refresh mỗi 10 giây

    return () => {
      clearInterval(interval);
    };
  }, [request?.shortCode]);
  //

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
      setLookupError("Vui lòng nhập mã tra cứu.");
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
        teamName: dto?.teamName || "",
      };

      const rescueTeamData = {
        name: dto?.teamName,
        leader: dto?.teamLeader,
        members: dto?.members || [],
      };

      setRequest(requestData);
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

  // const startCountdown = () => {
  //   if (countdownRef.current) {
  //     clearInterval(countdownRef.current);
  //   }

  //   countdownRef.current = setInterval(() => {
  //     setEta((prev) => {
  //       if (prev === "Arriving") return prev;

  //       const [min, max] = prev.split("-").map(Number);
  //       if (min > 1) {
  //         return `${min - 1}-${max - 1}`;
  //       } else {
  //         clearInterval(countdownRef.current);
  //         countdownRef.current = null;
  //         return "Arriving";
  //       }
  //     });
  //   }, 30000);
  // };

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
        setTimeout(() => {
          loadRequestByShortCode(savedCode); // tự load luôn sau khi đồng ý ko cần bấm enter nữa. Không thì bỏ rồi nhấn Enter
        }, 1000); // 1 giây rồi mới load
      }
    }, 1000); // đợi trang render xong rồi mới hỏi

    return () => clearTimeout(timer);
  }, [shortCode]);

  // useEffect(() => {
  //   return () => {
  //     if (countdownRef.current) {
  //       clearInterval(countdownRef.current);
  //     }
  //   };
  // }, []);

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

            {/* <div className="detail-item">
              <span className="detail-label">Trạng thái</span>
              <span
                className="detail-value status-text"
                style={{ color: getStatusColor(request.status) }}
              >
                {request.status || "Không có"}
              </span>
            </div> */}

            {/* MISSION STATUS */}
            <div className="detail-item">
              <span className="detail-label">Trạng thái nhiệm vụ</span>
              <span
                className="detail-value"
                style={{ color: getStatusColor(request.missionStatus) }}
              >
                {request.missionStatus || "Đang chọn đội cứu hộ....."}
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
