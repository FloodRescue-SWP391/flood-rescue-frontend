import React, { useState, useEffect } from "react";
import { Plus, Search, RefreshCw, Pencil, Trash2, Package } from "lucide-react";

import { reliefItemsService } from "../../services/reliefItemService";
import "./ReliefItems.css";

const ReliefItems = () => {
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({
    reliefItemName: "",
    categoryID: "",
    unitID: "",
  });

  const loadItems = async () => {
    setLoading(true);

    try {
      const res = await reliefItemsService.getAll();

      let list = [];
      if (Array.isArray(res)) list = res;
      else if (Array.isArray(res?.data)) list = res.data;
      else if (Array.isArray(res?.content)) list = res.content;
      else if (Array.isArray(res?.items)) list = res.items;
      else if (Array.isArray(res?.data?.content)) list = res.data.content;
      else if (typeof res === "object" && res !== null) {
        const potentialArray = Object.values(res).find(Array.isArray);
        if (potentialArray) list = potentialArray;
      }
      setItems(list);
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadItems();
  }, []);
  /* =========================
      CREATE
  ========================= */

  const handleCreate = async () => {
    try {
      const payload = {
        reliefItemName: form.reliefItemName,
        categoryID: Number(form.categoryID),
        unitID: Number(form.unitID),
      };

      await reliefItemsService.create(payload);

      setShowModal(false);
      loadItems();
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
        reliefItemName: form.reliefItemName,
        categoryID: Number(form.categoryID),
        unitID: Number(form.unitID),
      };

      await reliefItemsService.update(editing.reliefItemID, payload);

      setShowModal(false);
      loadItems();
    } catch (err) {
      alert(err.message);
    }
  };

  /* =========================
      DELETE
  ========================= */

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Delete item?");

    if (!confirmDelete) return;

    try {
      await reliefItemsService.remove(id);

      loadItems();
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
      reliefItemName: "",
      categoryID: "",
      unitID: "",
    });

    setShowModal(true);
  };

  /* =========================
      OPEN EDIT
  ========================= */

  const openEdit = (item) => {
    setEditing(item);

    setForm({
      reliefItemName: item.reliefItemName || "",
      categoryID: item.categoryID || "",
      unitID: item.unitID || "",
    });

    setShowModal(true);
  };

  const filtered = items.filter((item) =>
    item.reliefItemName.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="warehouse-page">
      {/* HEADER */}

      <div className="warehouse-header">
        <h2>Quản lý vật phẩm cứu trợ</h2>

        <button className="btn-add" onClick={openCreate}>
          + Thêm vật phẩm
        </button>
      </div>

      {/* TOOLBAR */}

      <div className="warehouse-toolbar">
        <div className="search-box">
          <Search size={16} />

          <input
            placeholder="Tìm kiếm vật phẩm cứu trợ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button className="btn-refresh" onClick={loadItems}>
          <RefreshCw size={16} />
        </button>
      </div>

      {/* TABLE */}

      <div className="warehouse-table-container">
        <table className="warehouse-table">
          <thead>
            <tr>
              <th>Tên vật phẩm</th>
              <th>Danh mục</th>
              <th>Đơn vị</th>
              <th>Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((item) => (
              <tr key={item.reliefItemID}>
                <td>
                  <Package size={14} /> {item.reliefItemName}
                </td>

                <td>
                  <span className="badge">{item.categoryName}</span>
                </td>

                <td>{item.unitName}</td>

                <td>
                  <button className="btn-icon" onClick={() => openEdit(item)}>
                    <Pencil size={14} />
                  </button>

                  <button
                    className="btn-icon btn-delete"
                    onClick={() => handleDelete(item.reliefItemID)}
                  >
                    <Trash2 size={14} />
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
            <h3>{editing ? "Chỉnh sửa vật phẩm" : "Tạo vật phẩm"}</h3>

            <input
              placeholder="Tên vật phẩm"
              value={form.reliefItemName}
              onChange={(e) =>
                setForm({ ...form, reliefItemName: e.target.value })
              }
            />

            <input
              placeholder="Mã danh mục"
              value={form.categoryID}
              onChange={(e) => setForm({ ...form, categoryID: e.target.value })}
            />

            <input
              placeholder="Mã đơn vị"
              value={form.unitID}
              onChange={(e) => setForm({ ...form, unitID: e.target.value })}
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
};

export default ReliefItems;
