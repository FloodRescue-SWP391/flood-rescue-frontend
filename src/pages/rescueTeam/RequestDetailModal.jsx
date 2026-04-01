import { useEffect, useState } from "react";
import {
  FaTimes,
  FaPhone,
  FaMapMarkerAlt,
  FaClock,
  FaTag,
} from "react-icons/fa";
import "./RequestDetailModal.css";

export default function RequestDetailModal({
  mission,
  onClose,
}) {
  const [activeTab, setActiveTab] = useState("details");

  if (!mission) return null;

  const pick = (...values) =>
    values.find((v) => v !== undefined && v !== null && v !== "");

  const requestData = mission?.rescueRequest || mission?.request || {};
  const missionData = mission;

  const requestId = pick(
    requestData?.rescueRequestID,
    requestData?.requestID,
    requestData?.id,
    missionData?.rescueRequestID,
    missionData?.requestID,
    missionData?.reliefOrderID,
    missionData?.reliefOrderId,
    "N/A",
  );

  const citizenName = pick(
    requestData?.citizenName,
    requestData?.fullName,
    requestData?.citizen?.fullName,
    requestData?.citizen?.name,
    missionData?.citizenName,
    missionData?.fullName,
    missionData?.citizen?.fullName,
    "Chưa có thông tin",
  );

  const citizenPhone = pick(
    requestData?.citizenPhone,
    requestData?.phoneNumber,
    requestData?.phone,
    requestData?.citizen?.phoneNumber,
    requestData?.citizen?.phone,
    missionData?.citizenPhone,
    missionData?.phoneNumber,
    missionData?.phone,
    "N/A",
  );

  const citizenEmail = pick(
    requestData?.citizenEmail,
    requestData?.email,
    requestData?.citizen?.email,
    missionData?.citizenEmail,
    missionData?.email,
    "N/A",
  );

  const description = pick(
    requestData?.description,
    requestData?.note,
    requestData?.emergencyDetails,
    missionData?.description,
    missionData?.note,
    "Chưa có mô tả",
  );

  const address = pick(
    requestData?.address,
    requestData?.locationAddress,
    requestData?.formattedAddress,
    requestData?.fullAddress,
    requestData?.incidentAddress,
    requestData?.pickupAddress,
    requestData?.rescueAddress,
    requestData?.location?.address,
    requestData?.location?.formattedAddress,
    requestData?.citizenAddress,
    missionData?.address,
    missionData?.locationAddress,
    missionData?.formattedAddress,
    missionData?.fullAddress,
    missionData?.incidentAddress,
    missionData?.pickupAddress,
    missionData?.rescueAddress,
    missionData?.location?.address,
    missionData?.location?.formattedAddress,
    missionData?.citizenAddress,
    "Chưa có địa chỉ",
  );

  const requestType = pick(
    requestData?.requestType,
    requestData?.type,
    missionData?.requestType,
    missionData?.type,
    "Rescue",
  );

  const peopleCount = pick(
    requestData?.peopleCount,
    requestData?.numberOfPeople,
    missionData?.peopleCount,
    missionData?.numberOfPeople,
    "N/A",
  );

  const latitude = pick(
    requestData?.locationLatitude,
    requestData?.latitude,
    requestData?.lat,
    missionData?.locationLatitude,
    missionData?.latitude,
    missionData?.lat,
    "N/A",
  );

  const longitude = pick(
    requestData?.locationLongitude,
    requestData?.longitude,
    requestData?.lng,
    requestData?.lon,
    missionData?.locationLongitude,
    missionData?.longitude,
    missionData?.lng,
    missionData?.lon,
    "N/A",
  );

  const pickupWarehouseName = pick(
    requestData?.warehouseName,
    requestData?.pickupWarehouseName,
    requestData?.warehouse?.warehouseName,
    requestData?.warehouse?.name,
    missionData?.warehouseName,
    missionData?.pickupWarehouseName,
    missionData?.warehouse?.warehouseName,
    missionData?.warehouse?.name,
    "",
  );

  const pickupAddress = pick(
    requestData?.pickupAddress,
    requestData?.warehouseAddress,
    requestData?.pickupLocationAddress,
    requestData?.warehouse?.address,
    missionData?.pickupAddress,
    missionData?.warehouseAddress,
    missionData?.pickupLocationAddress,
    missionData?.warehouse?.address,
    "",
  );

  const pickupLatitude = pick(
    requestData?.pickupLatitude,
    requestData?.pickupLat,
    requestData?.warehouseLatitude,
    requestData?.warehouseLat,
    requestData?.warehouse?.locationLat,
    requestData?.warehouse?.latitude,
    missionData?.pickupLatitude,
    missionData?.pickupLat,
    missionData?.warehouseLatitude,
    missionData?.warehouseLat,
    missionData?.warehouse?.locationLat,
    missionData?.warehouse?.latitude,
    "N/A",
  );

  const pickupLongitude = pick(
    requestData?.pickupLongitude,
    requestData?.pickupLong,
    requestData?.pickupLng,
    requestData?.warehouseLongitude,
    requestData?.warehouseLong,
    requestData?.warehouseLng,
    requestData?.warehouse?.locationLong,
    requestData?.warehouse?.longitude,
    missionData?.pickupLongitude,
    missionData?.pickupLong,
    missionData?.pickupLng,
    missionData?.warehouseLongitude,
    missionData?.warehouseLong,
    missionData?.warehouseLng,
    missionData?.warehouse?.locationLong,
    missionData?.warehouse?.longitude,
    "N/A",
  );

  const hasPickupPoint =
    pickupAddress ||
    pickupWarehouseName ||
    (pickupLatitude !== "N/A" && pickupLongitude !== "N/A");

  const missionStatus = pick(
    missionData?.missionStatus,
    missionData?.orderStatus,
    missionData?.reliefOrderStatus,
    missionData?.status,
    "Unknown",
  );

  const createdAt = pick(
    missionData?.requestCreatedTime,
    requestData?.requestCreatedTime,
    requestData?.createdTime,
    requestData?.createdAt,
    missionData?.createdAt,
    null,
  );

  const assignedAt = pick(
    missionData?.assignedAt,
    missionData?.dispatchedAt,
    missionData?.assignedTime,
    null,
  );

  const startedAt = pick(
    missionData?.startedAt,
    missionData?.startTime,
    missionData?.acceptedAt,
    null,
  );

  const completedAt = pick(
    missionData?.completedAt,
    missionData?.endTime,
    null,
  );

  const rescueTeamId = pick(
    missionData?.rescueTeamID,
    missionData?.rescueTeamId,
    missionData?.assignedTeamID,
    missionData?.assignedTeamId,
    missionData?.teamID,
    missionData?.teamId,
    "N/A",
  );

  const rescueMissionId = pick(
    missionData?.rescueMissionID,
    missionData?.rescueMissionId,
    "N/A",
  );

  const getLatitude = (missionItem) => {
    return (
      missionItem?.locationLatitude ??
      missionItem?.latitude ??
      missionItem?.rescueRequest?.locationLatitude ??
      missionItem?.rescueRequest?.latitude ??
      null
    );
  };

  const getLongitude = (missionItem) => {
    return (
      missionItem?.locationLongitude ??
      missionItem?.longitude ??
      missionItem?.rescueRequest?.locationLongitude ??
      missionItem?.rescueRequest?.longitude ??
      null
    );
  };

  const addressCache = new Map();
  const AddressDisplay = ({ lat, lng }) => {
    const [resolvedAddress, setResolvedAddress] = useState("Đang tải vị trí...");

    useEffect(() => {
      if (lat == null || lng == null) {
        setResolvedAddress("Vị trí không hợp lệ");
        return;
      }

      const key = `${lat},${lng}`;
      if (addressCache.has(key)) {
        setResolvedAddress(addressCache.get(key));
        return;
      }

      const fetchAddress = async () => {
        try {
          await new Promise((r) => setTimeout(r, Math.random() * 1000 + 500));
          if (addressCache.has(key)) {
            setResolvedAddress(addressCache.get(key));
            return;
          }

          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
          );
          const data = await res.json();
          const displayAddress = data.display_name || "Không tìm thấy địa chỉ";
          addressCache.set(key, displayAddress);
          setResolvedAddress(displayAddress);
        } catch {
          setResolvedAddress(`Tọa độ: ${lat}, ${lng}`);
        }
      };

      fetchAddress();
    }, [lat, lng]);

    return <span>{resolvedAddress}</span>;
  };

  const formatVNTime = (dateString) => {
    if (!dateString) return "N/A";

    try {
      return new Date(dateString).toLocaleString("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Ho_Chi_Minh",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content request-detail-modal modern-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header modern-header">
          <div className="header-left">
            <div className="modal-icon">🚨</div>
            <div>
              <h2>Chi tiết yêu cầu cứu hộ</h2>
              <p className="modal-subtitle">
                Theo dõi thông tin yêu cầu, người liên quan và tiến trình xử lý
              </p>
            </div>
          </div>

          <button className="close-btn" onClick={onClose}>
            <FaTimes size={18} />
          </button>
        </div>

        <div className="modal-tabs modern-tabs">
          <button
            className={`tab-btn ${activeTab === "details" ? "active" : ""}`}
            onClick={() => setActiveTab("details")}
          >
            Chi tiết
          </button>
          <button
            className={`tab-btn ${activeTab === "people" ? "active" : ""}`}
            onClick={() => setActiveTab("people")}
          >
            Người liên quan
          </button>
          <button
            className={`tab-btn ${activeTab === "timeline" ? "active" : ""}`}
            onClick={() => setActiveTab("timeline")}
          >
            Lịch sử
          </button>
        </div>

        <div className="modal-body modern-body">
          {activeTab === "details" && (
            <div className="tab-content">
              <div className="detail-section modern-section">
                <div className="section-title-row">
                  <h3>Thông tin yêu cầu</h3>
                </div>

                <div className="detail-grid">
                  <div className="detail-item card-style">
                    <label>ID Yêu cầu</label>
                    <p className="value highlight">{requestId}</p>
                  </div>

                  <div className="detail-item card-style">
                    <label>Loại yêu cầu</label>
                    <p className="value with-icon">
                      <FaTag /> {requestType}
                    </p>
                  </div>

                  <div className="detail-item card-style">
                    <label>Số người cần hỗ trợ</label>
                    <p className="value">{peopleCount}</p>
                  </div>

                  <div className="detail-item card-style">
                    <label>Mô tả</label>
                    <p className="value description-text">
                      {description || "Chưa có mô tả"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="detail-section modern-section">
                <div className="section-title-row">
                  <h3>Vị trí</h3>
                </div>

                <div className="detail-grid">
                  <div className="detail-item full-width card-style">
                    <label>Địa chỉ</label>
                    <p className="value">
                      <FaMapMarkerAlt />{" "}
                      {getLatitude(mission) != null &&
                      getLongitude(mission) != null ? (
                        <AddressDisplay
                          lat={getLatitude(mission)}
                          lng={getLongitude(mission)}
                        />
                      ) : (
                        <span>{address}</span>
                      )}
                    </p>
                  </div>

                  <div className="detail-item card-style">
                    <label>
                      <FaMapMarkerAlt /> Vĩ độ
                    </label>
                    <p className="value">{latitude || "N/A"}</p>
                  </div>

                  <div className="detail-item card-style">
                    <label>
                      <FaMapMarkerAlt /> Kinh độ
                    </label>
                    <p className="value">{longitude || "N/A"}</p>
                  </div>
                </div>
              </div>

              {hasPickupPoint && (
                <div className="detail-section modern-section">
                  <div className="section-title-row">
                    <h3>Điểm lấy hàng</h3>
                  </div>

                  <div className="detail-grid">
                    <div className="detail-item card-style">
                      <label>Kho</label>
                      <p className="value">{pickupWarehouseName || "Kho cứu trợ"}</p>
                    </div>

                    <div className="detail-item full-width card-style">
                      <label>Địa chỉ lấy hàng</label>
                      <p className="value">
                        <FaMapMarkerAlt />{" "}
                        {pickupAddress ? (
                          <span>{pickupAddress}</span>
                        ) : pickupLatitude !== "N/A" && pickupLongitude !== "N/A" ? (
                          <AddressDisplay lat={pickupLatitude} lng={pickupLongitude} />
                        ) : (
                          <span>Chưa có địa chỉ kho</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="detail-section modern-section">
                <div className="section-title-row">
                  <h3>Thông tin nhiệm vụ</h3>
                </div>

                <div className="detail-grid">
                  <div className="detail-item card-style">
                    <label>
                      <FaClock /> Thời gian tạo yêu cầu
                    </label>
                    <p className="value">{formatVNTime(createdAt)}</p>
                  </div>

                  <div className="detail-item card-style">
                    <label>
                      <FaClock /> Thời gian gán đội
                    </label>
                    <p className="value">{formatVNTime(assignedAt)}</p>
                  </div>

                  <div className="detail-item card-style">
                    <label>Trạng thái nhiệm vụ</label>
                    <p
                      className={`value status-badge status-${String(missionStatus).toLowerCase()}`}
                    >
                      {missionStatus}
                    </p>
                  </div>

                  <div className="detail-item card-style">
                    <label>ID Nhiệm vụ</label>
                    <p className="value">{rescueMissionId}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "people" && (
            <div className="tab-content">
              <div className="detail-section modern-section">
                <div className="section-title-row">
                  <h3>Thông tin người dân</h3>
                </div>

                <div className="detail-grid">
                  <div className="detail-item card-style">
                    <label>Tên người dân</label>
                    <p className="value">
                      {citizenName || "Chưa có thông tin"}
                    </p>
                  </div>

                  <div className="detail-item card-style">
                    <label>
                      <FaPhone /> Liên hệ
                    </label>
                    <p className="value">
                      {citizenPhone ? (
                        <a href={`tel:${citizenPhone}`} className="phone-link">
                          {citizenPhone}
                        </a>
                      ) : (
                        "Chưa có số điện thoại"
                      )}
                    </p>
                  </div>

                  <div className="detail-item card-style">
                    <label>Email</label>
                    <p className="value">{citizenEmail || "N/A"}</p>
                  </div>
                </div>
              </div>

              <div className="detail-section modern-section">
                <div className="section-title-row">
                  <h3>Gán cho đội</h3>
                </div>

                <div className="detail-grid">
                  <div className="detail-item card-style">
                    <label>ID Đội cứu hộ</label>
                    <p className="value">{rescueTeamId}</p>
                  </div>

                  <div className="detail-item card-style">
                    <label>ID Nhiệm vụ</label>
                    <p className="value">{rescueMissionId}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "timeline" && (
            <div className="tab-content">
              <div className="timeline modern-timeline1">
                <div className="timeline-item">
                  <div className="timeline-marker1">
                    <div className={`timeline-dot ${createdAt ? "active" : ""}`}></div>
                    <div className="timeline-line"></div>
                  </div>
                  <div className="timeline-content card-style">
                    <h4>Yêu cầu được tạo</h4>
                    <p>{formatVNTime(createdAt)}</p>
                    <span className="timeline-label">
                      Citizen gửi yêu cầu cứu hộ
                    </span>
                  </div>
                </div>

                <div className="timeline-item">
                  <div className="timeline-marker1">
                    <div className={`timeline-dot ${assignedAt ? "active" : ""}`}></div>
                    <div className="timeline-line"></div>
                  </div>
                  <div className="timeline-content card-style">
                    <h4>Gán cho đội</h4>
                    <p>{formatVNTime(assignedAt)}</p>
                    <span className="timeline-label">
                      Coordinator điều phối cho đội cứu hộ
                    </span>
                  </div>
                </div>

                <div className="timeline-item">
                  <div className="timeline-marker1">
                    <div className={`timeline-dot ${startedAt ? "active" : ""}`}></div>
                    {completedAt && <div className="timeline-line"></div>}
                  </div>
                  <div className="timeline-content card-style">
                    <h4>Đang thực hiện</h4>
                    <p>{formatVNTime(startedAt)}</p>
                    <span className="timeline-label">
                      Đội bắt đầu thực hiện nhiệm vụ
                    </span>
                  </div>
                </div>

                {completedAt && (
                  <div className="timeline-item">
                    <div className="timeline-marker1">
                      <div className="timeline-dot completed"></div>
                    </div>
                    <div className="timeline-content card-style">
                      <h4>Hoàn thành</h4>
                      <p>{formatVNTime(completedAt)}</p>
                      <span className="timeline-label">
                        Hoàn tất nhiệm vụ cứu hộ
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer modern-footer">
          <button className="btn-secondary modern-btn" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
