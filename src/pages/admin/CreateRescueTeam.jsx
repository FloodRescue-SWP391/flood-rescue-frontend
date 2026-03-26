import React, { useEffect, useRef, useState } from "react";
import "./CreateRescueTeam.css";
import { createRescueTeam } from "../../services/rescueTeamService";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const defaultPosition = [10.8231, 106.6297]; // HCM

const LocationPicker = ({ onPickLocation }) => {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      onPickLocation(lat, lng);
    },
  });

  return null;
};

const ChangeMapView = ({ center }) => {
  const map = useMap();

  useEffect(() => {
    if (
      Array.isArray(center) &&
      center.length === 2 &&
      !Number.isNaN(center[0]) &&
      !Number.isNaN(center[1])
    ) {
      map.setView(center, map.getZoom(), { animate: true });
    }
  }, [center, map]);

  return null;
};

const CreateRescueTeam = () => {
  const [formData, setFormData] = useState({
    teamName: "",
    city: "",
    currentStatus: "Available",
    currentLatitude: "",
    currentLongitude: "",
    addressQuery: "",
  });

  const [selectedPosition, setSelectedPosition] = useState(defaultPosition);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [toast, setToast] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const clearFieldError = (fieldName) => {
    if (errors[fieldName]) {
      setErrors((prev) => ({
        ...prev,
        [fieldName]: "",
      }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    clearFieldError(name);
  };

  const updateLocation = ({ lat, lng, addressText = "" }) => {
    const nextLat = Number(lat);
    const nextLng = Number(lng);

    if (Number.isNaN(nextLat) || Number.isNaN(nextLng)) return;

    setSelectedPosition([nextLat, nextLng]);
    setFormData((prev) => ({
      ...prev,
      currentLatitude: nextLat.toFixed(6),
      currentLongitude: nextLng.toFixed(6),
      addressQuery: addressText || prev.addressQuery,
    }));

    setErrors((prev) => ({
      ...prev,
      currentLatitude: "",
      currentLongitude: "",
    }));
  };

  const handlePickLocation = (lat, lng) => {
    updateLocation({ lat, lng });
    setSearchResults([]);
  };

  const handleCoordinateChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    clearFieldError(name);
  };

  const syncMarkerFromInputs = () => {
    const lat = Number(formData.currentLatitude);
    const lng = Number(formData.currentLongitude);

    const isLatValid = !Number.isNaN(lat) && lat >= -90 && lat <= 90;
    const isLngValid = !Number.isNaN(lng) && lng >= -180 && lng <= 180;

    if (isLatValid && isLngValid) {
      setSelectedPosition([lat, lng]);
    }
  };

  const handleAddressSearch = (e) => {
    const value = e.target.value;

    setFormData((prev) => ({
      ...prev,
      addressQuery: value,
    }));

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!value.trim()) {
      setSearchResults([]);
      setIsSearchingAddress(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        setIsSearchingAddress(true);

        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
            value
          )}&countrycodes=vn&limit=5`,
          {
            headers: {
              "Accept-Language": "vi",
            },
          }
        );

        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Search address error:", error);
        setSearchResults([]);
      } finally {
        setIsSearchingAddress(false);
      }
    }, 400);
  };

  const handleSelectAddress = (item) => {
    updateLocation({
      lat: item.lat,
      lng: item.lon,
      addressText: item.display_name || "",
    });
    setSearchResults([]);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.teamName.trim()) {
      newErrors.teamName = "Tên đội là bắt buộc";
    }

    if (!formData.city.trim()) {
      newErrors.city = "Thành phố là bắt buộc";
    }

    if (!formData.currentStatus.trim()) {
      newErrors.currentStatus = "Trạng thái là bắt buộc";
    }

    const lat = formData.currentLatitude;
    const lng = formData.currentLongitude;

    if (lat === "") {
      newErrors.currentLatitude = "Vui lòng chọn vị trí hoặc nhập vĩ độ";
    } else if (Number.isNaN(Number(lat))) {
      newErrors.currentLatitude = "Vĩ độ phải là một số";
    } else if (Number(lat) < -90 || Number(lat) > 90) {
      newErrors.currentLatitude = "Vĩ độ phải nằm trong khoảng từ -90 đến 90";
    }

    if (lng === "") {
      newErrors.currentLongitude = "Vui lòng chọn vị trí hoặc nhập kinh độ";
    } else if (Number.isNaN(Number(lng))) {
      newErrors.currentLongitude = "Kinh độ phải là một số";
    } else if (Number(lng) < -180 || Number(lng) > 180) {
      newErrors.currentLongitude =
        "Kinh độ phải nằm trong khoảng từ -180 đến 180";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      teamName: "",
      city: "",
      currentStatus: "Available",
      currentLatitude: "",
      currentLongitude: "",
      addressQuery: "",
    });
    setSelectedPosition(defaultPosition);
    setSearchResults([]);
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast("❌ Vui lòng nhập đầy đủ và đúng thông tin.");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        teamName: formData.teamName.trim(),
        city: formData.city.trim(),
        currentStatus: formData.currentStatus.trim(),
        currentLatitude: Number(formData.currentLatitude),
        currentLongitude: Number(formData.currentLongitude),
      };

      const res = await createRescueTeam(payload);

      if (res?.success === false) {
        showToast(`❌ ${res?.message || "Tạo đội cứu hộ không thành công"}`);
        return;
      }

      showToast("✅ Tạo đội cứu hộ thành công!");
      resetForm();
    } catch (err) {
      showToast(`❌ ${err?.message || "Tạo đội cứu hộ không thành công"}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <>
      {toast && (
        <div
          className={`toast_container ${
            toast.includes("❌") ? "error" : "success"
          }`}
        >
          {toast}
        </div>
      )}

      <div className="create-rescue-team-container">
        <h2>Tạo Đội cứu hộ</h2>

        <form onSubmit={handleSubmit} className="create-form">
          <div className="form-group">
            <label htmlFor="teamName">Tên đội</label>
            <input
              id="teamName"
              name="teamName"
              value={formData.teamName}
              onChange={handleChange}
              placeholder="Nhập tên đội"
              className={errors.teamName ? "error" : ""}
              required
            />
            {errors.teamName && (
              <span className="error-message">{errors.teamName}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="city">Thành phố</label>
            <input
              id="city"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="Nhập thành phố"
              className={errors.city ? "error" : ""}
              required
            />
            {errors.city && (
              <span className="error-message">{errors.city}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="currentStatus">Trạng thái</label>
            <select
              id="currentStatus"
              name="currentStatus"
              value={formData.currentStatus}
              onChange={handleChange}
              className={errors.currentStatus ? "error" : ""}
              required
            >
              <option value="Available">Sẵn sàng</option>
              <option value="Busy">Đang bận</option>
              <option value="Inactive">Không hoạt động</option>
            </select>
            {errors.currentStatus && (
              <span className="error-message">{errors.currentStatus}</span>
            )}
          </div>

          <div className="form-group address-search-wrapper">
            <label htmlFor="addressQuery">Tìm địa chỉ</label>
            <input
              id="addressQuery"
              name="addressQuery"
              value={formData.addressQuery}
              onChange={handleAddressSearch}
              placeholder="Gõ địa chỉ để tìm kiếm..."
              autoComplete="off"
            />

            {isSearchingAddress && (
              <div className="address-search-loading">Đang tìm địa chỉ...</div>
            )}

            {searchResults.length > 0 && (
              <div className="address-suggestions">
                {searchResults.map((item) => (
                  <button
                    type="button"
                    key={item.place_id}
                    className="address-item"
                    onClick={() => handleSelectAddress(item)}
                  >
                    <span className="address-pin">📍</span>
                    <span className="address-text">{item.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label htmlFor="currentLongitude">Kinh độ</label>
              <input
                id="currentLongitude"
                name="currentLongitude"
                type="number"
                step="any"
                value={formData.currentLongitude}
                onChange={handleCoordinateChange}
                onBlur={syncMarkerFromInputs}
                placeholder="Tự động điền hoặc nhập tay"
                className={errors.currentLongitude ? "error" : ""}
              />
              {errors.currentLongitude && (
                <span className="error-message">{errors.currentLongitude}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="currentLatitude">Vĩ độ</label>
              <input
                id="currentLatitude"
                name="currentLatitude"
                type="number"
                step="any"
                value={formData.currentLatitude}
                onChange={handleCoordinateChange}
                onBlur={syncMarkerFromInputs}
                placeholder="Tự động điền hoặc nhập tay"
                className={errors.currentLatitude ? "error" : ""}
              />
              {errors.currentLatitude && (
                <span className="error-message">{errors.currentLatitude}</span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Chọn vị trí trên bản đồ</label>
            <div className="map-picker-note">
              📍 Chọn địa chỉ phía trên hoặc click trực tiếp vào bản đồ
            </div>

            <div className="map-picker">
              <MapContainer
                center={selectedPosition}
                zoom={13}
                scrollWheelZoom={true}
                style={{ height: "320px", width: "100%" }}
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <ChangeMapView center={selectedPosition} />
                <LocationPicker onPickLocation={handlePickLocation} />
                <Marker position={selectedPosition} />
              </MapContainer>
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Đang tạo..." : "Tạo đội cứu hộ"}
          </button>
        </form>
      </div>
    </>
  );
};

export default CreateRescueTeam;