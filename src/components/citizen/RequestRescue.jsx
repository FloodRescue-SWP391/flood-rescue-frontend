import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../layout/citizen/RequestRescue.css";
import logo from "../../assets/logo.png";
import "../../layout/citizen/Header.css";

import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

/* FIX ICON LEAFLET */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

/* MAP MOVE COMPONENT */
const ChangeView = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom]);
  return null;
};

const RequestRescue = () => {
  const navigate = useNavigate();
  const [showSuccess, setShowSuccess] = useState(false);



  /* FORM DATA */
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    allowPublicPhone: false,
    houseNumber: "",
    address: "",
    mapLink: "",
    emergencyType: "Cứu người khẩn cấp",
    description: "",
    peopleCount: 0,
    contactVia: "phone",
  });

  /* MAP */
  const [mapCenter, setMapCenter] = useState([16.047079, 108.20623]); // VN
  const [mapZoom, setMapZoom] = useState(6);

  /* AUTOCOMPLETE */
  const [suggestions, setSuggestions] = useState([]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  /* SEARCH ADDRESS (OSM) */
  const fetchSuggestions = async (value) => {
    if (value.length < 3) {
      setSuggestions([]);
      return;
    }

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(value)}` +
        `&format=json&addressdetails=1&limit=6&countrycodes=vn`,
    );

    const data = await res.json();
    setSuggestions(data);
  };

  const selectAddress = (item) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);

    setFormData((prev) => ({
      ...prev,
      address: item.display_name,
      mapLink: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}`,
    }));

    setMapCenter([lat, lon]);
    setMapZoom(16);
    setSuggestions([]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate("/citizen/request-status");

    const {
      name,
      phone,
      address,
      mapLink,
      peopleCount,
      emergencyType,
      contactVia,
    } = formData;

    // ❌ Validate (bỏ qua description)
    if (
      !name.trim() ||
      !phone.trim() ||
      !address.trim() ||
      !mapLink ||
      peopleCount === "" ||
      Number(peopleCount) <= 0 ||
      !emergencyType ||
      !contactVia
    ) {
      alert("⚠️ Vui lòng nhập đầy đủ thông tin bắt buộc!");
      return;
    }

    // ✅ OK → submit
    setShowSuccess(true);
    setTimeout(() => navigate("/citizen/status"), 2000);
  };

  return (
    <div className="FE">
      {/* HEADER */}
      <header>
        <div className="logo">
          <img src={logo} alt="Rescue Now Logo" />
          <span>
            RESCUE.<div className="a">Now</div>
          </span>
        </div>

        <nav>
          <Link className="nav-btn" to="/introduce">
            Introduct
          </Link>
          <Link className="nav-btn" to="/contact">
            Contact
          </Link>
        </nav>
      </header>

      {showSuccess && (
        <div className="success-toast">✅ Gửi yêu cầu thành công!</div>
      )}

      <div className="request-container">
        <h2>Create a rescue request</h2>

        <form onSubmit={handleSubmit} className="request-form">
          {/* LEFT */}
          <div className="form-left">
            <label>
              Full Name<span style={{ color: "red" }}> *</span>
            </label>
            <input name="name" value={formData.name} onChange={handleChange} />

            <label>
              Phone Number<span style={{ color: "red" }}> *</span>
            </label>
            <input
              name="phone"
              value={formData.phone}
              onChange={handleChange}
            />

            <div className="checkbox">
              <input
                type="checkbox"
                name="allowPublicPhone"
                checked={formData.allowPublicPhone}
                onChange={handleChange}
              />
              <span className="agree">
                Publicly share the phone number for the rescue team.
              </span>
            </div>

            <label>
              House number / Alley<span style={{ color: "red" }}> *</span>
            </label>
            <input
              name="houseNumber"
              value={formData.houseNumber}
              onChange={handleChange}
              placeholder="Ví dụ: 12/5"
            />

            <label>
              Address<span style={{ color: "red" }}> *</span>
            </label>
            <div style={{ position: "relative" }} className="add">
              <input
                value={formData.address}
                placeholder="Ví dụ: Nha Trang, Khánh Hòa"
                onChange={(e) => {
                  setFormData({ ...formData, address: e.target.value });
                  fetchSuggestions(e.target.value);
                }}
              />

              {suggestions.length > 0 && (
                <ul className="suggestions">
                  {suggestions.map((item) => (
                    <li key={item.place_id} onClick={() => selectAddress(item)}>
                      {item.display_name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <label>Google Map</label>
            <input value={formData.mapLink} readOnly />

            <div className="map-wrapper">
              <MapContainer
                center={mapCenter}
                zoom={mapZoom}
                style={{ height: "250px", width: "100%" }}
                scrollWheelZoom={false}
              >
                <ChangeView center={mapCenter} zoom={mapZoom} />
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={mapCenter} />
              </MapContainer>
            </div>
          </div>

          {/* RIGHT — GIỮ NGUYÊN */}
          <div className="form-right">
            <label>
              Need assistance<span style={{ color: "red" }}> *</span>
            </label>
            <select
              name="emergencyType"
              value={formData.emergencyType}
              onChange={handleChange}
            >
              <option>Emergency rescue</option>
              <option>Evacuation</option>
              <option>Medical</option>
              <option>Food</option>
            </select>

            <label>Describe the situation (If any)</label>
            <div className="mota">
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
              />
            </div>
            <label>
              Number of people trapped<span style={{ color: "red" }}> *</span>
            </label>
            <input
              type="number"
              name="peopleCount"
              min="0"
              value={formData.peopleCount}
              onChange={handleChange}
            />

            <label>Quick contact</label>
            <label>
              <input
                type="radio"
                name="contactVia"
                value="phone"
                checked={formData.contactVia === "phone"}
                onChange={handleChange}
              />{" "}
              📞 Phone
            </label>

            <label>
              <input
                type="radio"
                name="contactVia"
                value="zalo"
                checked={formData.contactVia === "zalo"}
                onChange={handleChange}
              />{" "}
              💬 Zalo
            </label>
          </div>

          {/* ACTION */}
          <div className="form-actions">
            <button type="submit" className="submit-btn">
              Send Request
            </button>
            <button
              type="button"
              className="cancel-btn"
              onClick={() => window.location.reload()}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RequestRescue;
