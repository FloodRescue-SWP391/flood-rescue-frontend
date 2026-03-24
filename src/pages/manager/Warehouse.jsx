import "./Warehouse.css";
import { useEffect, useState } from "react";
import {
  getWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
} from "../../services/warehouseService";

export default function Warehouse() {
  const [warehouses, setWarehouses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({
    name: "",
    address: "",
    locationLong: "",
    locationLat: "",
  });

  /* =========================
      LOAD DATA
  ========================= */

  const loadWarehouses = async () => {
    try {
      const res = await getWarehouses();

      // Nếu res là Response thì convert sang JSON
      const data = res?.json ? await res.json() : res;

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
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadWarehouses();
  }, []);

  /* =========================
      CREATE
  ========================= */

  const handleCreate = async () => {
    try {
      const payload = {
        name: form.name,
        address: form.address,
        locationLong: Number(form.locationLong),
        locationLat: Number(form.locationLat),
      };

      await createWarehouse(payload);

      setShowModal(false);

      loadWarehouses();
    } catch (err) {
      alert(err.message);
    }
  };

  /* =========================
      UPDATE
  ========================= */

  const handleEdit = async () => {
    try {
      const payload = {
        name: form.name,
        address: form.address,
        locationLong: Number(form.locationLong),
        locationLat: Number(form.locationLat),
        isDeleted: false,
      };

      await updateWarehouse(editing.warehouseId, payload);

      setShowModal(false);

      loadWarehouses();
    } catch (err) {
      alert(err.message);
    }
  };

  /* =========================
      DELETE
  ========================= */

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Delete warehouse?");

    if (!confirmDelete) return;

    try {
      await deleteWarehouse(id);

      loadWarehouses();
    } catch (err) {
      alert(err.message);
    }
  };

  /* =========================
      OPEN CREATE
  ========================= */

  const openCreate = () => {
    setEditing(null);

    setForm({
      name: "",
      address: "",
      locationLong: "",
      locationLat: "",
    });

    setShowModal(true);
  };

  /* =========================
      OPEN EDIT
  ========================= */

  const openEdit = (warehouse) => {
    setEditing(warehouse);

    setForm({
      name: warehouse.name || "",
      address: warehouse.address || "",
      locationLong: warehouse.locationLong || "",
      locationLat: warehouse.locationLat || "",
    });

    setShowModal(true);
  };

  return (
    <div className="warehouse-page">
      <div className="warehouse-header">
        <h2>Quản lý kho</h2>

        <button className="btn-add" onClick={openCreate}>
          + Thêm kho
        </button>
      </div>

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
            {warehouses.map((w, index) => (
              <tr key={w.warehouseId || w.id || w.warehouseID || index}>
                <td>{w.name}</td>
                <td>{w.address}</td>
                <td>{w.locationLong}</td>
                <td>{w.locationLat}</td>

                <td>
                  <button className="btn-icon" onClick={() => openEdit(w)}>
                    Chỉnh sửa
                  </button>

                  <button
                    className="btn-icon btn-delete"
                    onClick={() => handleDelete(w.warehouseId)}
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>{editing ? "Chỉnh sửa kho" : "Tạo kho"}</h3>

            <input
              placeholder="Tên kho"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />

            <input
              placeholder="Địa chỉ"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />

            <input
              placeholder="Kinh độ"
              value={form.locationLong}
              onChange={(e) =>
                setForm({ ...form, locationLong: e.target.value })
              }
            />

            <input
              placeholder="Vĩ độ"
              value={form.locationLat}
              onChange={(e) =>
                setForm({ ...form, locationLat: e.target.value })
              }
            />

            <div className="modal-actions">
              <button onClick={editing ? handleEdit : handleCreate}>Lưu</button>

              <button onClick={() => setShowModal(false)}>Hủy</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
