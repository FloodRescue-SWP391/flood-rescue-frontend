import "./Warehouse.css";
import "leaflet/dist/leaflet.css";
import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import {
  getWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
} from "../../services/warehouseService";
import { toast } from "react-hot-toast";

// Fix icon leaflet bị lỗi khi dùng với Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Icon đặc biệt cho kho được chọn (màu đỏ)
const selectedIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Icon thường (xanh)
const defaultIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Component di chuyển mini-map trong modal đến toạ độ mới
function MiniMapFlyTo({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, 15, { animate: true, duration: 0.8 });
    }
  }, [center, map]);
  return null;
}
// Component di chuyển bản đồ chính đến toạ độ mới
function MapFlyTo({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, 14, { animate: true, duration: 1.2 });
    }
  }, [center, map]);
  return null;
}

// Component click vào bản đồ để chọn toạ độ
function MapClickHandler({ onMapClick }) {
  const map = useMap();
  useEffect(() => {
    if (!onMapClick) return;
    const handler = (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    };
    map.on("click", handler);
    return () => map.off("click", handler);
  }, [map, onMapClick]);
  return null;
}

const MANAGER_MUTATION_ROLES = new Set(["Manager", "Inventory Manager"]);
const READONLY_MESSAGE =
  "Tài khoản hiện tại chỉ có quyền xem danh sách kho. Bạn không thể thêm, sửa hoặc xóa kho.";

const getWarehouseId = (warehouse) =>
  warehouse?.warehouseId ??
  warehouse?.warehouseID ??
  warehouse?.WarehouseId ??
  warehouse?.WarehouseID ??
  warehouse?.id ??
  warehouse?.ID ??
  null;

export default function Warehouse() {
  const currentRole = (localStorage.getItem("role") || "").trim();
  const canMutateWarehouses = MANAGER_MUTATION_ROLES.has(currentRole);
  const readonlyMessage = READONLY_MESSAGE.startsWith("Tai ")
    ? READONLY_MESSAGE
    : "Tai khoan hien tai chi co quyen xem danh sach kho. Ban khong the them, sua hoac xoa kho.";

  const [warehouses, setWarehouses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [saving, setSaving] = useState(false);
  const [mapCenter, setMapCenter] = useState([10.762622, 106.660172]); // TP.HCM mặc định

  const [form, setForm] = useState({
    name: "",
    address: "",
    locationLong: "",
    locationLat: "",
  });

  // State cho autocomplete địa chỉ
  const [addressQuery, setAddressQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isSuggestLoading, setIsSuggestLoading] = useState(false);
  const [miniMapCenter, setMiniMapCenter] = useState(null); // null = chưa chọn
  const searchTimerRef = useRef(null);

  const buildWarehousePayload = () => ({
    name: form.name.trim(),
    address: form.address.trim(),
    locationLong: Number(form.locationLong),
    locationLat: Number(form.locationLat),
  });

  /* =========================
      LOAD DATA
  ========================= */

  const loadWarehouses = async (silent = false) => {
    try {
      const res = await getWarehouses();
      // Service parseResponse đã bóc tách JSON, nhưng we handle variants if any
      const data = res;
      console.log("WAREHOUSE API:", data);

      let list = [];
      if (Array.isArray(data)) list = data;
      else if (Array.isArray(data?.data)) list = data.data;
      else if (Array.isArray(data?.content)) list = data.content;
      else if (Array.isArray(data?.items)) list = data.items;
      else if (Array.isArray(data?.data?.content)) list = data.data.content;
      else if (typeof data === "object" && data !== null) {
        const potentialArray = Object.values(data).find(Array.isArray);
        if (potentialArray) list = potentialArray;
      }

      setWarehouses(list);

      // Tự động focus vào kho đầu tiên có toạ độ hợp lệ
      const firstValid = list.find(
        (w) => w.locationLat && w.locationLong &&
          !isNaN(Number(w.locationLat)) && !isNaN(Number(w.locationLong))
      );
      if (firstValid) {
        setMapCenter([Number(firstValid.locationLat), Number(firstValid.locationLong)]);
        setSelectedWarehouse(firstValid);
      }
      if (!silent) toast.success("Đã tải danh sách kho.");
    } catch (err) {
      console.error(err);
      if (!silent) toast.error("Không thể tải danh sách kho.");
    }
  };
  useEffect(() => {
    loadWarehouses();
  }, []);

  /* =========================
      CREATE
  ========================= */

  const handleCreate = async () => {
    if (!canMutateWarehouses) {
      toast.error(readonlyMessage);
      return;
    }

    if (!form.name || !form.address || !form.locationLat || !form.locationLong) {
      return toast.error("Vui lòng nhập đầy đủ thông tin kho.");
    }

    setSaving(true);
    const t = toast.loading("Đang tạo kho...");
    try {
      const payload = buildWarehousePayload();
      console.log("SENDING CREATE PAYLOAD:", payload);
      await createWarehouse(payload);
      toast.success("Tạo kho thành công!", { id: t });
      setShowModal(false);
      loadWarehouses(true);
    } catch (err) {
      toast.error(err.message || "Tạo kho thất bại.", { id: t });
    } finally {
      setSaving(false);
    }
  };

  /* =========================
      UPDATE
  ========================= */

  const handleEdit = async () => {
    if (!canMutateWarehouses) {
      toast.error(readonlyMessage);
      return;
    }

    if (!form.name || !form.address || !form.locationLat || !form.locationLong) {
      return toast.error("Vui lòng nhập đầy đủ thông tin kho.");
    }

    setSaving(true);
    const t = toast.loading("Đang cập nhật...");
    try {
      const payload = buildWarehousePayload();
      const warehouseId = getWarehouseId(editing);
      if (!warehouseId) {
        throw new Error("Khong xac dinh duoc ma kho de cap nhat.");
      }
      if (!warehouseId) {
        throw new Error("KhÃ´ng xÃ¡c Ä‘á»‹nh Ä‘Æ°á»£c mÃ£ kho Ä‘á»ƒ cáº­p nháº­t.");
      }
      console.log("SENDING UPDATE PAYLOAD:", payload);
      await updateWarehouse(warehouseId, payload);
      toast.success("Cập nhật kho thành công!", { id: t });
      setShowModal(false);
      loadWarehouses(true);
    } catch (err) {
      toast.error(err.message || "Cập nhật thất bại.", { id: t });
    } finally {
      setSaving(false);
    }
  };

  /* =========================
      DELETE
  ========================= */

  const handleDelete = async (id) => {
    if (!id) {
      toast.error("Khong xac dinh duoc ma kho de xoa.");
      return;
    }
    if (!canMutateWarehouses) {
      toast.error(readonlyMessage);
      return;
    }
    if (!window.confirm("Bạn có chắc muốn xóa kho này?")) return;
    const t = toast.loading("Đang xóa...");
    try {
      await deleteWarehouse(id);
      toast.success("Đã xóa kho.", { id: t });
      loadWarehouses(true);
    } catch (err) {
      toast.error(err.message || "Xóa kho thất bại.", { id: t });
    }
  };

  /* =========================
      OPEN CREATE
  ========================= */

  const openCreate = () => {
    if (!canMutateWarehouses) {
      toast.error(readonlyMessage);
      return;
    }

    setEditing(null);
    setForm({ name: "", address: "", locationLong: "", locationLat: "" });
    setAddressQuery("");
    setSuggestions([]);
    setMiniMapCenter(null);
    setShowModal(true);
  };

  /* =========================
      OPEN EDIT
  ========================= */

  const openEdit = (warehouse) => {
    if (!canMutateWarehouses) {
      toast.error(readonlyMessage);
      return;
    }

    setEditing(warehouse);
    setForm({
      name: warehouse.name || "",
      address: warehouse.address || "",
      locationLong: warehouse.locationLong || "",
      locationLat: warehouse.locationLat || "",
    });
    setAddressQuery(warehouse.address || "");
    setSuggestions([]);
    // Nếu kho có toạ độ, focus mini-map vào đó
    const lat = Number(warehouse.locationLat);
    const lng = Number(warehouse.locationLong);
    setMiniMapCenter(!isNaN(lat) && !isNaN(lng) ? [lat, lng] : null);
    setShowModal(true);
  };

  /* =========================
      CLICK ON MAP (khi modal mở)
  ========================= */

  const handleMapClick = (lat, lng) => {
    setForm((prev) => ({
      ...prev,
      locationLat: lat.toFixed(6),
      locationLong: lng.toFixed(6),
    }));
    setMiniMapCenter([lat, lng]);
  };

  /* =========================
      AUTOCOMPLETE ĐỊA CHỈ (Nominatim)
  ========================= */

  const handleAddressInput = (value) => {
    setAddressQuery(value);
    setForm((prev) => ({ ...prev, address: value }));

    // Debounce 500ms trước khi gọi API
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (value.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    searchTimerRef.current = setTimeout(async () => {
      try {
        setIsSuggestLoading(true);
        // Thay Nominatim bằng Photon (cung cấp fuzzy search tốt hơn cho Tiếng Việt)
        const bboxVN = "102.14,8.17,109.46,23.39"; // Giới hạn tìm kiếm trong VN
        const res = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(value)}&limit=10&bbox=${bboxVN}`
        );
        const data = await res.json();
        
        // Chuyển đổi format của Photon sang format cũ đang dùng
        const formatted = (data.features || []).map(f => {
          const props = f.properties;
          const nameParts = [props.name, props.street, props.district, props.city, props.state].filter(Boolean);
          // Loại bỏ trùng lặp trong mảng tên
          const displayName = Array.from(new Set(nameParts)).join(", ");
          
          return {
            place_id: props.osm_id || Math.random(),
            display_name: displayName || "Địa điểm không tên",
            lat: f.geometry.coordinates[1],
            lon: f.geometry.coordinates[0]
          };
        });
        
        setSuggestions(formatted);
      } catch (err) {
        console.error("Photon search error:", err);
      } finally {
        setIsSuggestLoading(false);
      }
    }, 600);
  };

  const selectSuggestion = (item) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    
    // Format toạ độ thành string với 6 chữ số thập phân
    const latStr = lat.toFixed(6);
    const lngStr = lng.toFixed(6);

    setForm((prev) => ({
      ...prev,
      address: item.display_name,
      locationLat: latStr,
      locationLong: lngStr,
    }));
    setAddressQuery(item.display_name);
    setSuggestions([]);
    setMiniMapCenter([lat, lng]);
  };

  /* =========================
      FOCUS KHO TRÊN MAP
  ========================= */

  const focusWarehouse = (w) => {
    const lat = Number(w.locationLat);
    const lng = Number(w.locationLong);
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
      setMapCenter([lat, lng]);
      setSelectedWarehouse(w);
    }
  };

  return (
    <div className="warehouse-page">
      <div className="warehouse-header">
        <h2>Quản lý kho</h2>
        <button className="btn-add" onClick={openCreate} disabled={!canMutateWarehouses} title={!canMutateWarehouses ? readonlyMessage : ""}>
          + Thêm kho
        </button>
      </div>

      {/* BẢN ĐỒ VỊ TRÍ KHO */}
      {!canMutateWarehouses && (
        <div className="warehouse-permission-note">{readonlyMessage}</div>
      )}

      <div className="warehouse-map-card">
        <div className="warehouse-map-title">
          <span>📍</span>
          <span>Bản đồ vị trí kho</span>
          {selectedWarehouse && (
            <span className="map-selected-label">
              — {selectedWarehouse.name || "Kho đã chọn"}
            </span>
          )}
        </div>

        <MapContainer
          center={mapCenter}
          zoom={13}
          className="warehouse-map"
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapFlyTo center={mapCenter} />

          {/* Click để chọn toạ độ khi đang mở form */}
          {showModal && <MapClickHandler onMapClick={handleMapClick} />}

          {/* Hiển thị marker từng kho */}
          {warehouses.map((w, idx) => {
            const lat = Number(w.locationLat);
            const lng = Number(w.locationLong);
            if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return null;

            const isSelected =
              selectedWarehouse &&
              (selectedWarehouse.warehouseId === w.warehouseId ||
                selectedWarehouse.id === w.id);

            return (
              <Marker
                key={w.warehouseId || w.id || idx}
                position={[lat, lng]}
                icon={isSelected ? selectedIcon : defaultIcon}
                eventHandlers={{ click: () => setSelectedWarehouse(w) }}
              >
                <Popup>
                  <div style={{ minWidth: 160 }}>
                    <strong style={{ fontSize: 14 }}>
                      🏭 {w.name || "Không tên"}
                    </strong>
                    <br />
                    <span style={{ color: "#64748b", fontSize: 12 }}>
                      {w.address || "Chưa có địa chỉ"}
                    </span>
                    <br />
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>
                      {lat.toFixed(5)}, {lng.toFixed(5)}
                    </span>
                    <br />
                    <button
                      style={{
                        marginTop: 6,
                        padding: "3px 10px",
                        background: "#2563eb",
                        color: "#fff",
                        border: "none",
                        borderRadius: 4,
                        cursor: canMutateWarehouses ? "pointer" : "not-allowed",
                        fontSize: 12,
                        opacity: canMutateWarehouses ? 1 : 0.55,
                      }}
                      disabled={!canMutateWarehouses}
                      title={!canMutateWarehouses ? readonlyMessage : ""}
                      onClick={() => openEdit(w)}
                    >
                      Chỉnh sửa
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        <p className="map-hint">
          {showModal
            ? "💡 Click vào bản đồ để chọn toạ độ tự động"
            : "Click vào marker để xem thông tin kho. Click vào hàng trong bảng để zoom đến kho đó."}
        </p>
      </div>

      {/* BẢNG DANH SÁCH KHO */}
      <div className="warehouse-table-container">
        <table className="warehouse-table">
          <thead>
            <tr>
              <th>Tên kho</th>
              <th>Địa chỉ</th>
              <th>Kinh độ</th>
              <th>Vĩ độ</th>
              <th>Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {warehouses.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: 20, color: "#94a3b8" }}>
                  Chưa có kho nào.
                </td>
              </tr>
            )}

            {warehouses.map((w, index) => {
              const isSelected =
                selectedWarehouse &&
                (selectedWarehouse.warehouseId === w.warehouseId ||
                  selectedWarehouse.id === w.id);
              return (
                <tr
                  key={w.warehouseId || w.id || w.warehouseID || index}
                  className={isSelected ? "row-selected" : ""}
                  style={{ cursor: "pointer" }}
                  onClick={() => focusWarehouse(w)}
                >
                  <td>
                    <span style={{ marginRight: 6 }}>🏭</span>
                    {w.name}
                  </td>
                  <td>{w.address}</td>
                  <td>{w.locationLong}</td>
                  <td>{w.locationLat}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button className="btn-icon" onClick={() => openEdit(w)} disabled={!canMutateWarehouses} title={!canMutateWarehouses ? readonlyMessage : ""}>
                      Chỉnh sửa
                    </button>
                    <button
                      className="btn-icon btn-delete"
                      disabled={!canMutateWarehouses}
                      title={!canMutateWarehouses ? readonlyMessage : ""}
                      onClick={() => handleDelete(getWarehouseId(w))}
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box modal-box-wide">
            <h3>{editing ? "Chỉnh sửa kho" : "Tạo kho"}</h3>

            <input
              placeholder="Tên kho"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />

            {/* ĐỊA CHỈ + AUTOCOMPLETE */}
            <div style={{ position: "relative" }}>
              <input
                placeholder="Gõ địa chỉ để tìm kiếm..."
                value={addressQuery}
                onChange={(e) => handleAddressInput(e.target.value)}
                autoComplete="off"
              />

              {/* Spinner */}
              {isSuggestLoading && (
                <div className="suggest-loading">⏳ Đang tìm...</div>
              )}

              {/* Dropdown gợi ý */}
              {suggestions.length > 0 && (
                <ul className="suggest-list">
                  {suggestions.map((item) => (
                    <li
                      key={item.place_id}
                      className="suggest-item"
                      onMouseDown={() => selectSuggestion(item)}
                    >
                      <span className="suggest-icon">📍</span>
                      <span>{item.display_name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Toạ độ hiển thị (readonly) */}
            <div style={{ display: "flex", gap: 8 }}>
              <input
                placeholder="Kinh độ (Longitude)"
                value={form.locationLong}
                readOnly
                style={{ flex: 1, background: "#f8fafc", color: "#475569" }}
              />
              <input
                placeholder="Vĩ độ (Latitude)"
                value={form.locationLat}
                readOnly
                style={{ flex: 1, background: "#f8fafc", color: "#475569" }}
              />
            </div>

            {/* MINI-MAP BÊN TRONG MODAL */}
            <div className="modal-minimap-wrapper">
              <p className="modal-minimap-hint">
                📍 Chọn địa chỉ phía trên hoặc click trực tiếp vào bản đồ
              </p>
              <MapContainer
                center={miniMapCenter || mapCenter}
                zoom={13}
                className="modal-minimap"
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Bay đến vị trí mới khi chọn từ autocomplete */}
                {miniMapCenter && <MiniMapFlyTo center={miniMapCenter} />}

                {/* Click handler để chọn toạ độ bằng tay */}
                <MapClickHandler onMapClick={handleMapClick} />

                {/* Marker preview */}
                {form.locationLat && form.locationLong &&
                  !isNaN(Number(form.locationLat)) &&
                  !isNaN(Number(form.locationLong)) && (
                    <Marker
                      position={[Number(form.locationLat), Number(form.locationLong)]}
                      icon={selectedIcon}
                    >
                      <Popup>
                        <span style={{ fontSize: 13 }}>
                          📍 {Number(form.locationLat).toFixed(5)},{" "}
                          {Number(form.locationLong).toFixed(5)}
                        </span>
                      </Popup>
                    </Marker>
                  )}
              </MapContainer>
            </div>

            <div className="modal-actions">
              <button 
                onClick={editing ? handleEdit : handleCreate} 
                disabled={saving}
              >
                {saving ? "Đang lưu..." : "Lưu"}
              </button>
              <button onClick={() => setShowModal(false)} disabled={saving}>Hủy</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
