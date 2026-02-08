import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./RequestRescue.css";
import Header from "../../../components/common/Header";

import { MapContainer, TileLayer, Marker, useMap, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

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

const ChangeView = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom]);
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
    address: "",
    emergencyType: "Medical Emergency",
    peopleCount: 1,
    priorityLevel: "Medium",
    description: "",
    contactVia: "Phone Call",
  });

  // IMAGE upload (Cloudinary)
  const [rescueImages, setRescueImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [mapCenter, setMapCenter] = useState([10.8231, 106.6297]); // Ho Chi Minh City
  const [mapZoom, setMapZoom] = useState(13);
  const [userLocation, setUserLocation] = useState(null);

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

        // Lấy địa chỉ từ tọa độ
        const address = await getAddressFromCoordinates(latitude, longitude);

        setFormData((prev) => ({
          ...prev,
          address: address,
        }));
        setGettingLocation(false);

        // Show success message
        setTimeout(() => {
          alert(`📍 Location detected successfully!\nAddress: ${address}`);
        }, 500);
      },
      (error) => {
        setGettingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError(
              "Location access was denied. Please enable location services in your browser settings.",
            );
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError(
              "Location information is unavailable. Please try again or enter your address manually.",
            );
            break;
          case error.TIMEOUT:
            setLocationError("Location request timed out. Please try again.");
            break;
          default:
            setLocationError(
              "An unknown error occurred while getting your location.",
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
    value: "Người mắc kẹt trong nước",
    icon: "🌊",
    description: "Người bị mắc kẹt do nước lũ dâng cao",
  },
  {
    value: "Nhà bị ngập",
    icon: "🏠",
    description: "Nhà cửa bị ngập nước, cần di dời",
  },
  {
    value: "Cần thực phẩm/ nước uống",
    icon: "📦",
    description: "Cần tiếp tế lương thực, nước sạch",
  },
  {
    value: "Cần thuốc men",
    icon: "💊",
    description: "Cần thuốc men, vật tư y tế",
  },
  {
    value: "Cần áo phao/thuyền",
    icon: "🛟",
    description: "Cần phương tiện cứu hộ, thiết bị an toàn",
  },
  {
    value: "Cần di dời khẩn cấp",
    icon: "🚨",
    description: "Cần sơ tán đến nơi an toàn",
  },
  {
    value: "Sạt lở đất",
    icon: "⛰️",
    description: "Sạt lở đất đá, đe dọa nhà cửa",
  },
  {
    value: "Cây đổ/ đường sá hư hỏng",
    icon: "🛣️",
    description: "Cây đổ, đường sá hư hỏng do lũ",
  },
  {
    value: "Mất điện/ mất liên lạc",
    icon: "📡",
    description: "Mất điện, mất liên lạc với bên ngoài",
  },
];

  const priorityLevels = [
    {
      value: "Critical",
      color: "#ef4444",
      label: "Life-threatening situation",
    },
    { value: "High", color: "#f97316", label: "Urgent assistance needed" },
    { value: "Medium", color: "#eab308", label: "Serious situation" },
    { value: "Low", color: "#22c55e", label: "Non-critical emergency" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Validation
    const requiredFields = [
      "fullName",
      "phoneNumber",
      "address",
      "emergencyType",
    ];
    const missingFields = requiredFields.filter(
      (field) => !formData[field].trim(),
    );

    if (missingFields.length > 0) {
      alert(`Please fill in all required fields: ${missingFields.join(", ")}`);
      setIsLoading(false);
      return;
    }

    if (formData.peopleCount < 1) {
      alert("Please enter a valid number of people");
      setIsLoading(false);
      return;
    }

    const agreeChecked = document.querySelector(
  'input[name="agreeTerms"]'
)?.checked;

if (!agreeChecked) {
  alert("Please confirm the emergency agreement before submitting.");
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

      const payload = {
        ...formData,
        image: imageUrls,
        timestamp: new Date().toISOString(),
        requestId: `RESCUE-${Date.now()}`,
      };

      console.log("RESCUE PAYLOAD: ", payload);

      //Luu tam (Sau nay thay bang API BE)
      localStorage.setItem("lastRescueRequest", JSON.stringify(payload));

      setShowSuccess(true);
      setIsLoading(false);

      setTimeout(() => navigate("/citizen/request-status"), 2000);
    } catch (error) {
      console.error(error);
      alert("Failed to submit rescue request. Please try again!");
      setIsLoading(false);
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

  return (
    <>
      <Header />

      {/* Success Toast */}
      {showSuccess && (
        <div className="success-toast show">
          <div className="toast-content">
            <span className="toast-icon">✅</span>
            <div className="toast-text">
              <h4>Emergency Request Submitted Successfully!</h4>
              <p>Rescue team has been notified. Help is on the way.</p>
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
              <div className="step-label">Basic Info</div>
            </div>
            <div className={`step ${currentStep >= 2 ? "active" : ""}`}>
              <div className="step-number">2</div>
              <div className="step-label">Emergency Details</div>
            </div>
            <div className={`step ${currentStep >= 3 ? "active" : ""}`}>
              <div className="step-number">3</div>
              <div className="step-label">Review & Submit</div>
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
          <h1>Request Emergency Rescue</h1>
          <p className="page-subtitle">
            Fill out the form below to request emergency assistance. Our team
            will respond immediately.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="request-form">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="form-step">
              <h2 className="step-title">
                <span className="step-icon">👤</span>
                Personal Information
              </h2>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">
                    Full Name <span className="label-required">Required</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Phone Number{" "}
                    <span className="label-required">Required</span>
                  </label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    placeholder="Enter your phone number"
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <label className="form-label">
                    Address / Location{" "}
                    <span className="label-required">Required</span>
                    <button
                      type="button"
                      className="location-btn"
                      onClick={getCurrentLocation}
                      disabled={gettingLocation}
                    >
                      {gettingLocation
                        ? "📡 Locating..."
                        : "📍 Use current location"}
                    </button>
                  </label>

                  {/* Address input + button */}
                  <div className="address-row">
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      onBlur={handleAddressBlur}
                      placeholder="Enter exact address or landmark"
                      className="form-input"
                      required
                    />
                  </div>

                  {/* Error */}
                  {locationError && (
                    <div className="location-error">
                      <span className="error-icon">⚠️</span>
                      {locationError}
                    </div>
                  )}

                  {/* Location settings (checkbox + info) */}
                </div>
              </div>

              <div className="map-container">
                <div className="map-header">
                  <div className="map-actions"></div>
                </div>
                <div className="map-wrapper">
                  <MapContainer
                    center={mapCenter}
                    zoom={mapZoom}
                    style={{
                      height: "400px",
                      width: "100%",
                      borderRadius: "12px",
                    }}
                    onClick={handleMapClick}
                  >
                    <ChangeView center={mapCenter} zoom={mapZoom} />
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    <Marker position={mapCenter} icon={emergencyIcon}>
                      <Popup>
                        <strong>Emergency Location</strong>
                        <br />
                        Click anywhere on the map to update this position
                      </Popup>
                    </Marker>
                    {userLocation && (
                      <Marker position={userLocation}>
                        <Popup>
                          <strong>Your Current Location</strong>
                          <br />
                          GPS Coordinates: {userLocation[0].toFixed(6)},{" "}
                          {userLocation[1].toFixed(6)}
                        </Popup>
                      </Marker>
                    )}
                  </MapContainer>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Emergency Details */}
          {currentStep === 2 && (
            <div className="form-step">
              <h2 className="step-title">
                <span className="step-icon">🚨</span>
                Emergency Details
              </h2>

              <div className="form-grid">
                <div className="form-group full-width">
                  <label className="form-label">
                    Emergency Type{" "}
                    <span className="label-required">Required</span>
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

                <div className="form-group">
                  <label className="form-label">
                    Number of People{" "}
                    <span className="label-required">Required</span>
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
                          peopleCount: Math.min(100, formData.peopleCount + 1),
                        })
                      }
                    >
                      +
                    </button>
                  </div>
                  <p className="helper-text">Including yourself</p>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Priority Level{" "}
                    <span className="label-required">Required</span>
                  </label>
                  <select
                    name="priorityLevel"
                    value={formData.priorityLevel}
                    onChange={handleChange}
                    className="form-select"
                    style={{
                      borderLeft: `4px solid ${
                        priorityLevels.find(
                          (p) => p.value === formData.priorityLevel,
                        )?.color || "#eab308"
                      }`,
                    }}
                  >
                    {priorityLevels.map((level) => (
                      <option key={level.value} value={level.value}>
                        {level.value} - {level.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group full-width">
                  <label className="form-label">
                    Detailed Description{" "}
                    <span className="label-optional">Optional</span>
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Describe the emergency situation in detail. Include information about injuries, hazards, access routes, and any other relevant details that can help the rescue team."
                    className="form-textarea"
                    rows="5"
                  />
                  <p className="helper-text">
                    Max 500 characters. Provide as much detail as possible.
                    <span className="char-count">
                      {formData.description.length}/500
                    </span>
                  </p>

                  <div className="form-group1 full-width">
                    <label className="form-label">
                      Emergency Images{" "}
                      <span className="label-optional">(max 5)</span>
                    </label>

                    {/* hidden input */}
                    <input
                      type="file"
                      accept="image/*"
                      id="imageUploadInput"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (!file) return;

                        if (rescueImages.length >= 5) {
                          alert("Maximum 5 images allowed");
                          return;
                        }

                        if (file.size > 2 * 1024 * 1024) {
                          alert("Image size must be less than 2MB");
                          return;
                        }

                        setRescueImages((prev) => [...prev, file]);
                        setImagePreviews((prev) => [
                          ...prev,
                          URL.createObjectURL(file),
                        ]);

                        e.target.value = ""; // 👈 reset để chọn lại cùng file nếu cần
                      }}
                    />

                    {/* Add button */}
                    <button
                      type="button"
                      className="add-image-btn"
                      onClick={() =>
                        document.getElementById("imageUploadInput").click()
                      }
                    >
                      ➕ Add image
                    </button>

                    {/* Preview list */}
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
                Review & Submit
              </h2>

              <div className="review-summary">
                <div className="summary-section">
                  <h3 className="summary-title">Personal Information</h3>
                  <div className="summary-grid">
                    <div className="summary-item">
                      <span className="summary-label">Full Name:</span>
                      <span className="summary-value">{formData.fullName}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Phone Number:</span>
                      <span className="summary-value">
                        {formData.phoneNumber}
                      </span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Address:</span>
                      <span className="summary-value">{formData.address}</span>
                    </div>
                  </div>
                </div>

                <div className="summary-section">
                  <h3 className="summary-title">Emergency Details</h3>
                  <div className="summary-grid">
                    <div className="summary-item">
                      <span className="summary-label">Emergency Type:</span>
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
                      <span className="summary-label">People Affected:</span>
                      <span className="summary-value">
                        <span className="people-badge">
                          👥 {formData.peopleCount} person
                          {formData.peopleCount !== 1 ? "s" : ""}
                        </span>
                      </span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Priority Level:</span>
                      <span
                        className="summary-value priority-badge"
                        style={{
                          backgroundColor:
                            priorityLevels.find(
                              (p) => p.value === formData.priorityLevel,
                            )?.color + "20",
                          color: priorityLevels.find(
                            (p) => p.value === formData.priorityLevel,
                          )?.color,
                          borderColor: priorityLevels.find(
                            (p) => p.value === formData.priorityLevel,
                          )?.color,
                        }}
                      >
                        {formData.priorityLevel}
                      </span>
                    </div>
                  </div>
                </div>

                {formData.description && (
                  <div className="summary-section">
                    <h3 className="summary-title">Emergency Description</h3>
                    <div className="description-box">
                      <p>{formData.description}</p>
                    </div>
                  </div>
                )}

                {imagePreviews.length > 0 && (
  <div className="summary-section">
    <h3 className="summary-title">Emergency Images</h3>

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
          alt={`Emergency ${index + 1}`}
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


                <div className="summary-section">
                  <h3 className="summary-title">Contact Preferences</h3>
                  <div className="summary-grid">
                    <div className="summary-item">
                      <span className="summary-label">Preferred Contact:</span>
                      <span className="summary-value">
                        <span className="contact-badge">
                          {formData.contactVia === "Phone Call" ? "📞" : "✉️"}
                          {formData.contactVia}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="terms-agreement">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="agreeTerms"
                   
                    className="checkbox-input"
                  />
                  <span className="checkbox-custom"></span>
                  <span className="checkbox-text">
                    I confirm that this is a genuine emergency and the
                    information provided is accurate to the best of my
                    knowledge.
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
                  ← Previous Step
                </button>
              )}

              <div className="nav-spacer"></div>

              {currentStep < 3 ? (
                <button
                  type="button"
                  className="nav-btn primary"
                  onClick={nextStep}
                >
                  Next Step →
                </button>
              ) : (
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={isLoading || uploadingImage}
                >
                  {(isLoading || uploadingImage) ? (
                    <>
                      <span className="spinner"></span>
                      {uploadingImage
                        ? "Uploading image..."
                        : "Submitting request..."}
                    </>
                  ) : (
                    <>🚨 Submit Emergency Request</>
                  )}
                </button>
              )}
            </div>

            <p className="emergency-note">
              ⚠️ <strong>For immediate life-threatening emergencies:</strong>{" "}
              Call local emergency services first:
              <span className="emergency-number"> 911 </span>
              (or your country's emergency number)
            </p>
          </div>
        </form>
      </div>
    </>
  );
};

export default RequestRescue;
