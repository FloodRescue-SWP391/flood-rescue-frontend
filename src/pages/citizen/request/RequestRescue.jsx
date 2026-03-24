import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./RequestRescue.css";
import Header from "../../../components/common/Header";
import Footer from "../../../components/common/Footer.jsx";

import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  Popup,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

//api
import { createRescueRequest } from "../../../services/rescueRequestService.js";

import { uploadToCloudinary } from "../../../utils/cloudinary.js";
/* FIX ICON */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom emergency icon
const emergencyIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

// Custom location icon
const locationIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const toApiRequestType = (uiValue) => {
  // nếu UI đang lưu key dạng enum/string khác, map về chuẩn BE
  if (uiValue === "Rescue" || uiValue === "Supply") return uiValue;

  // ví dụ UI đang dùng: "Supplies" hoặc "SUPPLY_TYPE"
  if (uiValue === "Supplies" || uiValue === "SUPPLY_TYPE") return "Supply";

  // ví dụ UI đang dùng: "RESCUE" hoặc "RESCUE_TYPE"
  if (uiValue === "RESCUE" || uiValue === "RESCUE_TYPE") return "Rescue";

  // fallback
  return "Rescue";
};

const ChangeView = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (!center || center.length !== 2) return;

    map.invalidateSize();
    map.flyTo(center, zoom, {
      animate: true,
      duration: 1.2,
    });
  }, [map, center, zoom]);

  return null;
};

const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      onMapClick(e);
    },
  });

  return null;
};

const RequestRescue = () => {
  const navigate = useNavigate();
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState("");

  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    email: "",
    address: "",
    emergencyType: "Medical Emergency",
    peopleCount: 1,
    priorityLevel: "Medium",
    description: "",
    contactVia: "Phone Call",
    agreeTerms: false,
  });

  // IMAGE upload (Cloudinary)
  const [rescueImages, setRescueImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [mapCenter, setMapCenter] = useState([10.8231, 106.6297]); // Ho Chi Minh City
  const [mapZoom, setMapZoom] = useState(13);
  const [userLocation, setUserLocation] = useState(null);

  const categories = [
    { categoryID: 1, categoryName: "Nước uống" },
    { categoryID: 2, categoryName: "Đồ ăn" },
    { categoryID: 3, categoryName: "Thuốc" },
  ];

  const reliefItems = [
    { reliefItemID: 1, reliefItemName: "Aquafina", categoryID: 1 },
    { reliefItemID: 2, reliefItemName: "Lavie", categoryID: 1 },
    { reliefItemID: 3, reliefItemName: "Ion Life", categoryID: 1 },
    { reliefItemID: 4, reliefItemName: "Lương Khô", categoryID: 2 },
    { reliefItemID: 5, reliefItemName: "Bánh Mì", categoryID: 2 },
    { reliefItemID: 6, reliefItemName: "Mì Tôm", categoryID: 2 },
  ];

  // Hàm lấy địa chỉ từ tọa độ (sử dụng Nominatim API của OpenStreetMap)
  const getCoordinatesFromAddress = async (address) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
          `format=json` +
          `&q=${encodeURIComponent(address)}` +
          `&countrycodes=vn` +
          `&addressdetails=1` +
          `&limit=1`,
        {
          headers: {
            "Accept-Language": "vi",
          },
        },
      );

      const data = await res.json();

      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          displayName: data[0].display_name, // 👈 RẤT QUAN TRỌNG
          address: data[0].address,
        };
      }
    } catch (error) {
      console.error("Error geocoding address:", error);
    }
    return null;
  };

  // Hàm lấy địa chỉ từ tọa độ (reverse geocoding)
  const getAddressFromCoordinates = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?` +
          `format=json` +
          `&lat=${lat}` +
          `&lon=${lng}`,
        {
          headers: {
            "Accept-Language": "vi",
          },
        },
      );

      const data = await res.json();

      if (data && data.display_name) {
        return data.display_name;
      }
    } catch (error) {
      console.error("Error reverse geocoding:", error);
    }

    return "";
  };

  // Get user's current location với địa chỉ
  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }

    setGettingLocation(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setMapCenter([latitude, longitude]);
        setUserLocation([latitude, longitude]);
        setMapZoom(16);

        // Lấy địa chỉ từ tọa độ
        const address = await getAddressFromCoordinates(latitude, longitude);

        setFormData((prev) => ({
          ...prev,
          address: address,
        }));
        setGettingLocation(false);

        // Show success message
        setTimeout(() => {
          alert(`📍 "Đã xác định vị trí thành công!\nĐịa chỉ": ${address}`);
        }, 500);
      },
      (error) => {
        setGettingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError(
              "Truy cập vị trí đã bị từ chối. Vui lòng bật dịch vụ vị trí trong cài đặt trình duyệt.",
            );
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError(
              "Không thể lấy thông tin vị trí. Vui lòng thử lại hoặc nhập địa chỉ thủ công.",
            );
            break;
          case error.TIMEOUT:
            setLocationError(
              "Yêu cầu vị trí đã hết thời gian chờ. Vui lòng thử lại.",
            );
            break;
          default:
            setLocationError(
              "Đã xảy ra lỗi không xác định khi lấy vị trí của bạn.",
            );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
  };

  const handleAddressBlur = async () => {
    if (!formData.address.trim()) return;

    const result = await getCoordinatesFromAddress(formData.address);

    if (result) {
      setMapCenter([result.lat, result.lng]);
      setUserLocation([result.lat, result.lng]);

      // 🔥 dùng display_name
      setFormData((prev) => ({
        ...prev,
        address: result.displayName,
      }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleMapClick = async (e) => {
    const { lat, lng } = e.latlng;
    setMapCenter([lat, lng]);

    // Lấy địa chỉ khi click trên map
    const address = await getAddressFromCoordinates(lat, lng);

    setFormData((prev) => ({
      ...prev,
      address: address,
    }));
  };

  const emergencyTypes = [
    {
      value: "Người bị mắc kẹt trong nước lũ",
      icon: "🌊",
      description: "Người bị mắc kẹt do nước lũ dâng cao",
    },
    {
      value: "Nhà bị ngập",
      icon: "🏠",
      description: "Nhà bị ngập và cần sơ tán",
    },
    {
      value: "Cần thực phẩm / nước uống",
      icon: "📦",
      description: "Cần thực phẩm và nước sạch",
    },
    {
      value: "Cần thuốc men",
      icon: "💊",
      description: "Cần thuốc và thiết bị y tế",
    },
    {
      value: "Cần áo phao / thuyền",
      icon: "🛟",
      description: "Cần thiết bị cứu hộ hoặc thiết bị an toàn",
    },
    {
      value: "Cần sơ tán khẩn cấp",
      icon: "🚨",
      description: "Cần được sơ tán đến nơi an toàn ngay lập tức",
    },
    {
      value: "Sạt lở đất",
      icon: "⛰️",
      description: "Sạt lở đất đe dọa nhà cửa hoặc con người",
    },
    {
      value: "Cây đổ / đường hư hỏng",
      icon: "🛣️",
      description: "Cây đổ hoặc đường bị hư hỏng do lũ lụt",
    },
    {
      value: "Mất điện / mất liên lạc",
      icon: "📡",
      description: "Mất điện hoặc mất liên lạc",
    },
  ];

  const handleSubmit = async () => {
    setIsLoading(true);

    // Validation
    const requiredFields = [
      "fullName",
      "phoneNumber",
      "email",
      "address",
      "emergencyType",
    ];
    const missingFields = requiredFields.filter(
      (field) => !formData[field].trim(),
    );

    if (missingFields.length > 0) {
      alert(
        `Vui lòng nhập đầy đủ các trường bắt buộc: ${missingFields.join(", ")}`,
      );
      setIsLoading(false);
      return;
    }

    if (formData.peopleCount < 1) {
      alert("Vui lòng nhập số lượng người hợp lệ");
      setIsLoading(false);
      return;
    }

    if (!formData.agreeTerms) {
      alert("Vui lòng xác nhận điều khoản khẩn cấp trước khi gửi.");
      setIsLoading(false);
      return;
    }

    try {
      let imageUrls = [];
      if (rescueImages.length > 0) {
        setUploadingImage(true);
        for (const image of rescueImages) {
          const uploadRes = await uploadToCloudinary(image);
          imageUrls.push(uploadRes.secure_url);
        }

        setUploadingImage(false);
      }

      // lat/long lấy từ mapCenter (giữ map không đổi)
      const locationLatitude = mapCenter?.[0];
      const locationLongitude = mapCenter?.[1];

      // Map emergencyType -> requestType backend
      const isSupply =
        formData.emergencyType === "Need food / drinking water" ||
        formData.emergencyType === "Need medical supplies" ||
        formData.emergencyType === "Need life jackets / boats";

      const payload = {
        citizenName: formData.fullName.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        citizenEmail: formData.email.trim(),
        address: formData.address.trim(),
        requestType: isSupply ? "Supply" : "Rescue",
        description: formData.description?.trim() || "",
        locationLatitude: Number(locationLatitude),
        locationLongitude: Number(locationLongitude),
        peopleCount: Number(formData.peopleCount) || 1,
        imageUrls: imageUrls,
      };

      console.log(
        "CREATE RESCUE REQUEST PAYLOAD:",
        JSON.stringify(payload, null, 2),
      );

      // Gọi API
      const api = await createRescueRequest(payload);
      console.log("API RESPONSE:", api);
      // ApiResponse -> shortCode nằm trong api.data
      const created = api?.content;
      const shortCode = created?.shortCode;

      if (!shortCode) throw new Error("Server did not return shortCode");

      // Lưu shortCode để trang status dùng
      localStorage.setItem("lastShortCode", shortCode);

      setShowSuccess(true);
      localStorage.setItem("lastShortCode", shortCode);
      navigate(`/citizen/request-status`);
      setTimeout(() => {
        navigate(`/citizen/request-status`);
      }, 2000);
      return;
      // chuyển trang (nếu bạn muốn truyền code thì dùng query)
    } catch (error) {
      console.error(error);
      alert(
        error?.message || "Không thể gửi yêu cầu cứu hộ. Vui lòng thử lại!",
      );
    } finally {
      setIsLoading(false);
      setUploadingImage(false);
    }
  };

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Chỉ khi click vào ô Cần lương thục phẩm/ nước uống || Cần thuốc men
  const shouldShowSupplySuggestion =
    formData.emergencyType === "Cần thực phẩm / nước uống" ||
    formData.emergencyType === "Cần thuốc men";

  return (
    <>
      <Header />

      {/* Success Toast */}
      {showSuccess && (
        <div className="success-toast show">
          <div className="toast-content">
            <span className="toast-icon">✅</span>
            <div className="toast-text">
              <h4>Gửi yêu cầu cứu hộ thành công!</h4>
              <p>Đội cứu hộ đã được thông báo. Sự hỗ trợ đang đến.</p>
            </div>
          </div>
        </div>
      )}

      <div className="request-rescue-container">
        {/* Progress Bar */}
        <div className="progress-bar">
          <div className="progress-steps">
            <div className={`step ${currentStep >= 1 ? "active" : ""}`}>
              <div className="step-number">1</div>
              <div className="step-label">Thông tin cơ bản</div>
            </div>
            <div className={`step ${currentStep >= 2 ? "active" : ""}`}>
              <div className="step-number">2</div>
              <div className="step-label">Chi tiết khẩn cấp</div>
            </div>
            <div className={`step ${currentStep >= 3 ? "active" : ""}`}>
              <div className="step-number">3</div>
              <div className="step-label">Xem lại & gửi</div>
            </div>
          </div>
          <div className="progress-line">
            <div
              className="progress-fill"
              style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="page-header">
          <h1>Yêu cầu cứu hộ khẩn cấp</h1>
          <p className="page-subtitle">
            Điền thông tin bên dưới để gửi yêu cầu cứu hộ. Đội ngũ của chúng tôi
            sẽ phản hồi ngay lập tức.
          </p>
        </div>

        <form className="request-form">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="form-step">
              <h2 className="step-title">
                <span className="step-icon">👤</span>
                Thông tin cá nhân
              </h2>

              {/* Wrapper 2 cột */}
              <div className="step-two-columns">
                {/* Cột trái: form nhập liệu */}
                <div className="step-left">
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">
                        Họ và tên{" "}
                        <span className="label-required">Bắt buộc</span>
                      </label>
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        placeholder="Nhập họ và tên"
                        className="form-input"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Số điện thoại{" "}
                        <span className="label-required">Bắt buộc</span>
                      </label>
                      <input
                        type="tel"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleChange}
                        placeholder="Nhập số điện thoại"
                        className="form-input"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Email <span className="label-required">Bắt buộc</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="Nhập email"
                        className="form-input"
                        required
                      />
                    </div>

                    <div className="form-group full-width">
                      <label className="form-label">
                        Địa chỉ / Vị trí{" "}
                        <span className="label-required">Bắt buộc</span>
                        <button
                          type="button"
                          className="location-btn"
                          onClick={getCurrentLocation}
                          disabled={gettingLocation}
                        >
                          {gettingLocation
                            ? "📡 Đang xác định vị trí ...."
                            : "📍 Dùng vị trí hiện tại"}
                        </button>
                      </label>

                      <div className="address-row">
                        <textarea
                          name="address"
                          value={formData.address}
                          onChange={handleChange}
                          onBlur={handleAddressBlur}
                          placeholder="Nhập địa chỉ hoặc mốc gần nhất"
                          className="form-input1"
                          required
                        />
                      </div>

                      {locationError && (
                        <div className="location-error">
                          <span className="error-icon">⚠️</span>
                          {locationError}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Cột phải: bản đồ */}
                <div className="step-right">
                  <div className="request-map-container2">
                    <div className="request-map-header"></div>

                    <div className="request-map-wrapper1">
                      <MapContainer
                        center={mapCenter}
                        zoom={mapZoom}
                        style={{
                          height: "100%",
                          width: "100%",
                          borderRadius: "12px",
                        }}
                      >
                        <ChangeView center={mapCenter} zoom={mapZoom} />
                        <MapClickHandler onMapClick={handleMapClick} />

                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution="&copy; OpenStreetMap contributors"
                        />

                        <Marker position={mapCenter} icon={emergencyIcon}>
                          <Popup>
                            <strong>Vị trí khẩn cấp</strong>
                            <br />
                            Nhấn vào bản đồ để cập nhật vị trí
                          </Popup>
                        </Marker>
                      </MapContainer>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Emergency Details */}
          {currentStep === 2 && (
            <div className="form-step">
              <h2 className="step-title">
                <span className="step-icon">🚨</span>
                Chi tiết tình huống khẩn cấp
              </h2>

              <div className="form-grid">
                <div className="form-group full-width">
                  <label className="form-label">
                    Loại khẩn cấp{" "}
                    <span className="label-required">Bắt buộc</span>
                  </label>

                  <div className="emergency-type-grid">
                    {emergencyTypes.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        className={`emergency-type-btn ${
                          formData.emergencyType === type.value
                            ? "selected"
                            : ""
                        }`}
                        onClick={() =>
                          setFormData({
                            ...formData,
                            emergencyType: type.value,
                          })
                        }
                      >
                        <span className="type-icon">{type.icon}</span>
                        <span className="type-name">{type.value}</span>
                        <span className="type-desc">{type.description}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  className={`people-suggestion-wrapper ${
                    shouldShowSupplySuggestion ? "has-suggestion" : ""
                  }`}
                >
                  {shouldShowSupplySuggestion && (
                    <div className="suggestion-box">
                      <div className="suggestion-box-header">
                        <div className="suggestion-guideline-title">
                          🎒 Gợi ý nhu yếu phẩm
                        </div>
                        <p className="suggestion-guideline-sub">
                          Danh sách đề xuất theo từng nhóm để bạn chọn nhanh hơn
                        </p>
                      </div>

                      <div className="suggestion-category-list">
                        {categories.map((category) => {
                          const itemsByCategory = reliefItems.filter(
                            (item) => item.categoryID === category.categoryID,
                          );

                          if (itemsByCategory.length === 0) return null;

                          return (
                            <div
                              key={category.categoryID}
                              className="suggestion-category-card"
                            >
                              <h4 className="suggestion-category-name">
                                {category.categoryName}
                              </h4>

                              <div className="suggestion-items">
                                {itemsByCategory.map((item) => (
                                  <span
                                    key={item.reliefItemID}
                                    className="suggestion-tag"
                                  >
                                    {item.reliefItemName}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="form-group people-count-box">
                    <label className="form-label people-label">
                      <span>Số người</span>
                      <span className="label-required">Bắt buộc</span>
                    </label>

                    <div className="people-counter">
                      <button
                        type="button"
                        className="counter-btn"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            peopleCount: Math.max(1, formData.peopleCount - 1),
                          })
                        }
                      >
                        −
                      </button>

                      <input
                        type="number"
                        name="peopleCount"
                        value={formData.peopleCount}
                        onChange={handleChange}
                        min="1"
                        max="100"
                        className="counter-input"
                      />

                      <button
                        type="button"
                        className="counter-btn"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            peopleCount: Math.min(
                              100,
                              formData.peopleCount + 1,
                            ),
                          })
                        }
                      >
                        +
                      </button>
                    </div>

                    <p className="helper-text">Bao gồm cả bạn</p>
                  </div>
                </div>

                <div className="form-group full-width">
                  <label className="form-label">
                    Mô tả chi tiết{" "}
                    <span className="label-required">Bắt buộc</span>
                  </label>

                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Mô tả chi tiết tình huống hoặc nhu cầu cần hỗ trợ..."
                    className="form-textarea1"
                    rows="5"
                  />

                  <p className="helper-text">
                    Tối đa 500 ký tự. Hãy cung cấp thông tin càng chi tiết càng
                    tốt.
                    <span className="char-count">
                      {formData.description.length}/500
                    </span>
                  </p>

                  <div className="form-group1 full-width">
                    <label className="form-label">
                      Hình ảnh hiện trường{" "}
                      <span className="label-optional">(tối đa 5)</span>
                    </label>

                    <input
                      type="file"
                      accept="image/*"
                      id="imageUploadInput"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (!file) return;

                        if (rescueImages.length >= 5) {
                          alert("Chỉ được tải lên tối đa 5 ảnh");
                          return;
                        }

                        if (file.size > 2 * 1024 * 1024) {
                          alert("Dung lượng ảnh phải nhỏ hơn 2MB");
                          return;
                        }

                        setRescueImages((prev) => [...prev, file]);
                        setImagePreviews((prev) => [
                          ...prev,
                          URL.createObjectURL(file),
                        ]);

                        e.target.value = "";
                      }}
                    />

                    <button
                      type="button"
                      className="add-image-btn"
                      onClick={() =>
                        document.getElementById("imageUploadInput").click()
                      }
                    >
                      ➕ Thêm ảnh
                    </button>

                    {imagePreviews.length > 0 && (
                      <div className="image-preview-grid">
                        {imagePreviews.map((src, index) => (
                          <div key={index} className="image-preview-item">
                            <img src={src} alt={`preview-${index}`} />

                            <button
                              type="button"
                              className="remove-image-btn"
                              onClick={() => {
                                setRescueImages((prev) =>
                                  prev.filter((_, i) => i !== index),
                                );
                                setImagePreviews((prev) =>
                                  prev.filter((_, i) => i !== index),
                                );
                              }}
                            >
                              ✖
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review & Submit */}
          {currentStep === 3 && (
            <div className="form-step">
              <h2 className="step-title">
                <span className="step-icon">📋</span>
                Xem lại & gửi
              </h2>

              <div className="review-summary">
                <div className="summary-section">
                  <h3 className="summary-title">Thông tin cá nhân</h3>

                  <div className="summary-grid">
                    <div className="summary-item">
                      <span className="summary-label">Họ và tên:</span>
                      <span className="summary-value">{formData.fullName}</span>
                    </div>

                    <div className="summary-item">
                      <span className="summary-label">Số điện thoại:</span>
                      <span className="summary-value">
                        {formData.phoneNumber}
                      </span>
                    </div>

                    <div className="summary-item">
                      <span className="summary-label">Email:</span>
                      <span className="summary-value">{formData.email}</span>
                    </div>

                    <div className="summary-item">
                      <span className="summary-label">Địa chỉ:</span>
                      <span className="summary-value">{formData.address}</span>
                    </div>
                  </div>
                </div>

                <div className="summary-section">
                  <h3 className="summary-title">Thông tin khẩn cấp</h3>

                  <div className="summary-grid">
                    <div className="summary-item">
                      <span className="summary-label">Loại khẩn cấp:</span>
                      <span className="summary-value">
                        <span className="type-badge">
                          {
                            emergencyTypes.find(
                              (t) => t.value === formData.emergencyType,
                            )?.icon
                          }
                          {formData.emergencyType}
                        </span>
                      </span>
                    </div>

                    <div className="summary-item">
                      <span className="summary-label">
                        Số người bị ảnh hưởng:
                      </span>
                      <span className="summary-value">
                        <span className="people-badge">
                          👥 {formData.peopleCount} người
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {formData.description && (
                  <div className="summary-section">
                    <h3 className="summary-title">Mô tả tình huống</h3>

                    <div className="description-box">
                      <p>{formData.description}</p>
                    </div>
                  </div>
                )}

                {imagePreviews.length > 0 && (
                  <div className="summary-section">
                    <h3 className="summary-title">Hình ảnh hiện trường</h3>

                    <div
                      style={{
                        display: "flex",
                        gap: "12px",
                        flexWrap: "wrap",
                      }}
                    >
                      {imagePreviews.map((src, index) => (
                        <img
                          key={index}
                          src={src}
                          alt={`Hình ${index + 1}`}
                          style={{
                            width: "120px",
                            height: "120px",
                            objectFit: "cover",
                            borderRadius: "8px",
                            border: "1px solid #ddd",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="terms-agreement">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="agreeTerms"
                    className="checkbox-input"
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        agreeTerms: e.target.checked,
                      }))
                    }
                  />
                  <span className="checkbox-custom"></span>

                  <span className="checkbox-text">
                    Tôi xác nhận đây là tình huống khẩn cấp thực sự và thông tin
                    cung cấp là chính xác theo hiểu biết của tôi.
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Form Navigation */}
          <div className="form-navigation">
            <div className="nav-buttons">
              {currentStep > 1 && (
                <button
                  type="button"
                  className="nav-btn secondary"
                  onClick={prevStep}
                >
                  ← Quay lại
                </button>
              )}

              <div className="nav-spacer"></div>

              {currentStep < 3 ? (
                <button
                  type="button"
                  className="nav-btn primary"
                  onClick={nextStep}
                >
                  Bước tiếp theo →
                </button>
              ) : (
                <button
                  type="button"
                  className="submit-btn1"
                  disabled={isLoading || uploadingImage}
                  onClick={handleSubmit}
                >
                  {isLoading || uploadingImage ? (
                    <>
                      <span className="spinner"></span>
                      {uploadingImage
                        ? "Đang tải ảnh lên..."
                        : "Đang gửi yêu cầu..."}
                    </>
                  ) : (
                    <>🚨 Gửi yêu cầu cứu hộ</>
                  )}
                </button>
              )}
            </div>

            <p className="emergency-note">
              ⚠️{" "}
              <strong>Đối với các tình huống nguy hiểm đến tính mạng:</strong>{" "}
              Hãy gọi dịch vụ khẩn cấp tại địa phương trước:{" "}
              <span className="emergency-number">115</span>
              <span className="emergency-sub">
                ( hoặc số khẩn cấp tại quốc gia của bạn )
              </span>
            </p>
          </div>
        </form>
        <Footer />
      </div>
    </>
  );
};

export default RequestRescue;
