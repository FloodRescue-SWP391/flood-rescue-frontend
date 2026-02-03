import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./RequestRescue.css";
import Header from "../../../components/common/Header";

import { MapContainer, TileLayer, Marker, useMap, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

/* FIX ICON */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom emergency icon
const emergencyIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40]
});

// Custom location icon
const locationIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
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
    shareLocation: true
  });

  const [mapCenter, setMapCenter] = useState([10.8231, 106.6297]); // Ho Chi Minh City
  const [mapZoom, setMapZoom] = useState(13);
  const [userLocation, setUserLocation] = useState(null);

  // Hàm lấy địa chỉ từ tọa độ (sử dụng Nominatim API của OpenStreetMap)
  const getAddressFromCoordinates = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      
      if (data && data.address) {
        const address = data.address;
        let formattedAddress = "";
        
        if (address.road) formattedAddress += address.road;
        if (address.house_number) formattedAddress += ` ${address.house_number}`;
        if (address.suburb) formattedAddress += `, ${address.suburb}`;
        if (address.city || address.town || address.village) {
          formattedAddress += `, ${address.city || address.town || address.village}`;
        }
        if (address.state) formattedAddress += `, ${address.state}`;
        if (address.country) formattedAddress += `, ${address.country}`;
        
        return formattedAddress || `Latitude: ${lat.toFixed(6)}, Longitude: ${lng.toFixed(6)}`;
      }
    } catch (error) {
      console.error("Error getting address:", error);
    }
    
    return `Latitude: ${lat.toFixed(6)}, Longitude: ${lng.toFixed(6)}`;
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
        
        setFormData(prev => ({
          ...prev,
          address: address,
          shareLocation: true
        }));
        setGettingLocation(false);
        
        // Show success message
        setTimeout(() => {
          alert(`📍 Location detected successfully!\nAddress: ${address}`);
        }, 500);
      },
      (error) => {
        setGettingLocation(false);
        switch(error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Location access was denied. Please enable location services in your browser settings.");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("Location information is unavailable. Please try again or enter your address manually.");
            break;
          case error.TIMEOUT:
            setLocationError("Location request timed out. Please try again.");
            break;
          default:
            setLocationError("An unknown error occurred while getting your location.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  // Auto-get location on mount if shareLocation is true
  useEffect(() => {
    if (formData.shareLocation) {
      getCurrentLocation();
    }
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newFormData = {
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    };
    
    setFormData(newFormData);

    // If shareLocation checkbox is checked, get location
    if (name === 'shareLocation' && checked) {
      getCurrentLocation();
    }
  };

  const handleMapClick = async (e) => {
    const { lat, lng } = e.latlng;
    setMapCenter([lat, lng]);
    
    // Lấy địa chỉ khi click trên map
    const address = await getAddressFromCoordinates(lat, lng);
    
    setFormData(prev => ({
      ...prev,
      address: address
    }));
  };

  const emergencyTypes = [
    { value: "Medical Emergency", icon: "🚑", description: "Medical assistance needed" },
    { value: "Fire Rescue", icon: "🔥", description: "Fire or smoke emergency" },
    { value: "Flood Rescue", icon: "🌊", description: "Flood or water emergency" },
    { value: "Accident Rescue", icon: "🚗", description: "Vehicle or traffic accident" },
    { value: "Building Collapse", icon: "🏚️", description: "Structural collapse or damage" },
    { value: "Other Emergency", icon: "🚨", description: "Other type of emergency" }
  ];

  const priorityLevels = [
    { value: "Critical", color: "#ef4444", label: "Life-threatening situation" },
    { value: "High", color: "#f97316", label: "Urgent assistance needed" },
    { value: "Medium", color: "#eab308", label: "Serious situation" },
    { value: "Low", color: "#22c55e", label: "Non-critical emergency" }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Validation
    const requiredFields = ['fullName', 'phoneNumber', 'address', 'emergencyType'];
    const missingFields = requiredFields.filter(field => !formData[field].trim());
    
    if (missingFields.length > 0) {
      alert(`Please fill in all required fields: ${missingFields.join(', ')}`);
      setIsLoading(false);
      return;
    }

    if (formData.peopleCount < 1) {
      alert("Please enter a valid number of people");
      setIsLoading(false);
      return;
    }

    // Simulate API call
    setTimeout(() => {
      setShowSuccess(true);
      setIsLoading(false);
      
      // Store in localStorage for status page
      localStorage.setItem('lastRescueRequest', JSON.stringify({
        ...formData,
        timestamp: new Date().toISOString(),
        requestId: `RESCUE-${Date.now()}`
      }));
      
      setTimeout(() => navigate("/citizen/request-status"), 2000);
    }, 1500);
  };

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
            <div className={`step ${currentStep >= 1 ? 'active' : ''}`}>
              <div className="step-number">1</div>
              <div className="step-label">Basic Info</div>
            </div>
            <div className={`step ${currentStep >= 2 ? 'active' : ''}`}>
              <div className="step-number">2</div>
              <div className="step-label">Emergency Details</div>
            </div>
            <div className={`step ${currentStep >= 3 ? 'active' : ''}`}>
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
            Fill out the form below to request emergency assistance. Our team will respond immediately.
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
                    Full Name *
                    <span className="label-required">Required</span>
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
                    Phone Number *
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
                    Address / Location *
                    <span className="label-required">Required</span>
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Enter exact address or landmark"
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <div className="location-options">
                    <div className="location-header">
                      <span className="location-icon">📍</span>
                      <h4>Location Settings</h4>
                    </div>
                    
                    <label className="checkbox-label location-checkbox">
                      <input
                        type="checkbox"
                        name="shareLocation"
                        checked={formData.shareLocation}
                        onChange={handleChange}
                        className="checkbox-input"
                        disabled={gettingLocation}
                      />
                      <span className="checkbox-custom">
                        {gettingLocation ? (
                          <span className="location-loading"></span>
                        ) : formData.shareLocation ? (
                          <span className="location-checked">✓</span>
                        ) : null}
                      </span>
                      <span className="checkbox-text">
                        <span className="checkbox-title">
                          Use my current location for more accurate tracking
                        </span>
                        <span className="checkbox-description">
                          Automatically detect your location using GPS to provide precise coordinates to the rescue team.
                        </span>
                      </span>
                    </label>

                    {locationError && (
                      <div className="location-error">
                        <span className="error-icon">⚠️</span>
                        {locationError}
                      </div>
                    )}

                    <div className="location-actions">
                      <button
                        type="button"
                        className="location-refresh-btn"
                        onClick={getCurrentLocation}
                        disabled={gettingLocation}
                      >
                        {gettingLocation ? (
                          <>
                            <span className="refresh-spinner"></span>
                            Detecting Location...
                          </>
                        ) : (
                          <>
                            <span className="refresh-icon">🔄</span>
                            Refresh Location
                          </>
                        )}
                      </button>
                      
                      <button
                        type="button"
                        className="location-manual-btn"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, shareLocation: false }));
                          navigator.clipboard.writeText(formData.address);
                          alert("Address copied to clipboard!");
                        }}
                      >
                        <span className="manual-icon">📋</span>
                        Copy Address
                      </button>
                    </div>

                    {userLocation && formData.shareLocation && (
                      <div className="location-details">
                        <div className="coordinates">
                          <span className="coord-label">Coordinates:</span>
                          <span className="coord-value">
                            {userLocation[0].toFixed(6)}, {userLocation[1].toFixed(6)}
                          </span>
                        </div>
                        <div className="accuracy">
                          <span className="accuracy-icon">🎯</span>
                          <span className="accuracy-text">High accuracy GPS location enabled</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="map-container">
                <div className="map-header">
                  <div>
                    <h3 className="map-title">📍 Select Emergency Location on Map</h3>
                    <p className="map-subtitle">Click on the map to mark your exact location</p>
                  </div>
                  <div className="map-actions">
                    <button
                      type="button"
                      className="map-center-btn"
                      onClick={() => {
                        if (userLocation) {
                          setMapCenter(userLocation);
                        }
                      }}
                      disabled={!userLocation}
                    >
                      <span className="center-icon">📍</span>
                      Center on My Location
                    </button>
                  </div>
                </div>
                <div className="map-wrapper">
                  <MapContainer 
                    center={mapCenter} 
                    zoom={mapZoom} 
                    style={{ height: '400px', width: '100%', borderRadius: '12px' }}
                    onClick={handleMapClick}
                  >
                    <ChangeView center={mapCenter} zoom={mapZoom} />
                    <TileLayer 
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    <Marker position={mapCenter} icon={emergencyIcon}>
                      <Popup>
                        <strong>Emergency Location</strong><br/>
                        Click anywhere on the map to update this position
                      </Popup>
                    </Marker>
                    {userLocation && formData.shareLocation && (
                      <Marker position={userLocation}>
                        <Popup>
                          <strong>Your Current Location</strong><br/>
                          GPS Coordinates: {userLocation[0].toFixed(6)}, {userLocation[1].toFixed(6)}
                        </Popup>
                      </Marker>
                    )}
                  </MapContainer>
                  <div className="map-instructions">
                    <span className="instruction-icon">💡</span>
                    <span className="instruction-text">
                      <strong>Tip:</strong> Click anywhere on the map to set a precise location. 
                      The system will automatically convert coordinates to address.
                    </span>
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
                Emergency Details
              </h2>

              <div className="form-grid">
                <div className="form-group full-width">
                  <label className="form-label">
                    Emergency Type *
                    <span className="label-required">Required</span>
                  </label>
                  <div className="emergency-type-grid">
                    {emergencyTypes.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        className={`emergency-type-btn ${
                          formData.emergencyType === type.value ? 'selected' : ''
                        }`}
                        onClick={() => setFormData({...formData, emergencyType: type.value})}
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
                    Number of People *
                    <span className="label-required">Required</span>
                  </label>
                  <div className="people-counter">
                    <button
                      type="button"
                      className="counter-btn"
                      onClick={() => setFormData({
                        ...formData,
                        peopleCount: Math.max(1, formData.peopleCount - 1)
                      })}
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
                      onClick={() => setFormData({
                        ...formData,
                        peopleCount: Math.min(100, formData.peopleCount + 1)
                      })}
                    >
                      +
                    </button>
                  </div>
                  <p className="helper-text">Including yourself</p>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Priority Level
                  </label>
                  <select
                    name="priorityLevel"
                    value={formData.priorityLevel}
                    onChange={handleChange}
                    className="form-select"
                    style={{
                      borderLeft: `4px solid ${
                        priorityLevels.find(p => p.value === formData.priorityLevel)?.color || '#eab308'
                      }`
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
                    Detailed Description
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
                    <span className="char-count">{formData.description.length}/500</span>
                  </p>
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
                      <span className="summary-value">{formData.phoneNumber}</span>
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
                          {emergencyTypes.find(t => t.value === formData.emergencyType)?.icon}
                          {formData.emergencyType}
                        </span>
                      </span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">People Affected:</span>
                      <span className="summary-value">
                        <span className="people-badge">
                          👥 {formData.peopleCount} person{formData.peopleCount !== 1 ? 's' : ''}
                        </span>
                      </span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Priority Level:</span>
                      <span 
                        className="summary-value priority-badge"
                        style={{
                          backgroundColor: priorityLevels.find(p => p.value === formData.priorityLevel)?.color + '20',
                          color: priorityLevels.find(p => p.value === formData.priorityLevel)?.color,
                          borderColor: priorityLevels.find(p => p.value === formData.priorityLevel)?.color
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

                <div className="summary-section">
                  <h3 className="summary-title">Contact Preferences</h3>
                  <div className="summary-grid">
                    <div className="summary-item">
                      <span className="summary-label">Preferred Contact:</span>
                      <span className="summary-value">
                        <span className="contact-badge">
                          {formData.contactVia === 'Phone Call' ? '📞' : '✉️'}
                          {formData.contactVia}
                        </span>
                      </span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Location Sharing:</span>
                      <span className="summary-value">
                        <span className={`status-badge ${formData.shareLocation ? 'enabled' : 'disabled'}`}>
                          {formData.shareLocation ? '📍 Enabled' : '❌ Disabled'}
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
                    required
                    className="checkbox-input"
                  />
                  <span className="checkbox-custom"></span>
                  <span className="checkbox-text">
                    I confirm that this is a genuine emergency and the information provided is accurate to the best of my knowledge.
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
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner"></span>
                      Submitting Request...
                    </>
                  ) : (
                    <>
                      🚨 Submit Emergency Request
                    </>
                  )}
                </button>
              )}
            </div>
            
            <p className="emergency-note">
              ⚠️ <strong>For immediate life-threatening emergencies:</strong> Call local emergency services first: 
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