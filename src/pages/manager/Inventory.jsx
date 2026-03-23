import "./Inventory.css";
import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import {
  Search,
  Sliders,
  RefreshCw,
  Settings,
  Plus,
  Package
} from "lucide-react";

import {
  getInventoryByWarehouse,
  receiveInventory,
  adjustInventory
} from "../../services/inventoryService";
import { getWarehouses } from "../../services/warehouseService";

export default function Inventory() {

  const [warehouseId, setWarehouseId] = useState("");
  const [warehouses, setWarehouses] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");

  const [showReceive, setShowReceive] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);

  const [selectedItem, setSelectedItem] = useState(null);

  const exportInventoryToExcel = () => {
    const wb = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(inventory);
    XLSX.utils.book_append_sheet(wb, sheet, "Inventory");
    XLSX.writeFile(wb, "inventory_export.xlsx");
  };

  const [receiveItemId, setReceiveItemId] = useState("");
  const [receiveQty, setReceiveQty] = useState("");

  const [adjustQty, setAdjustQty] = useState("");

  /* ===============================
     LOAD INVENTORY
  =============================== */

  const loadInventory = async () => {
    if (!warehouseId) return;
    try {

      setLoading(true);

      const res = await getInventoryByWarehouse(warehouseId);

      const data = res?.json ? await res.json() : res;

      console.log("Inventory API:", data);

      let invList = [];
      if (Array.isArray(data)) invList = data;
      else if (Array.isArray(data?.data)) invList = data.data;
      else if (Array.isArray(data?.content)) invList = data.content;
      else if (Array.isArray(data?.items)) invList = data.items;
      else if (Array.isArray(data?.data?.content)) invList = data.data.content;
      else if (Array.isArray(data?.data?.items)) invList = data.data.items;
      else if (typeof data === 'object' && data !== null) {
        const potentialArray = Object.values(data).find(Array.isArray);
        if (potentialArray) invList = potentialArray;
        else invList = Object.values(data).filter(item => typeof item === 'object' && item !== null && (item.reliefItemID || item.id));
      }

      setInventory(invList);

    } catch (err) {

      console.error("Load inventory error:", err);

    } finally {

      setLoading(false);

    }
  };


  useEffect(() => {

    loadInventory();

  }, [warehouseId]);

  /* ===============================
     LOAD WAREHOUSES
  =============================== */

  const loadWarehouses = async () => {
    try {
      const res = await getWarehouses();
      const data = res?.json ? await res.json() : res;
      let list = [];
      if (Array.isArray(data)) list = data;
      else if (Array.isArray(data?.data)) list = data.data;
      else if (Array.isArray(data?.content)) list = data.content;
      else if (Array.isArray(data?.items)) list = data.items;
      else if (Array.isArray(data?.data?.content)) list = data.data.content;
      else if (typeof data === 'object' && data !== null) {
        const potentialArray = Object.values(data).find(Array.isArray);
        if (potentialArray) list = potentialArray;
      }
      setWarehouses(list);
      
      if (list.length > 0 && !warehouseId) {
        setWarehouseId(list[0].warehouseId || list[0].id || list[0].warehouseID);
      }
    } catch (err) {
      console.error("Load warehouses error:", err);
    }
  };

  useEffect(() => {
    loadWarehouses();
  }, []);

  /* ===============================
     SEARCH
  =============================== */

  const filtered = inventory.filter((item) =>
    item?.reliefItemName?.toLowerCase().includes(search.toLowerCase())
  );

  /* ===============================
     BADGE COLOR
  =============================== */

  const getColor = (qty) => {

    if (qty >= 1000) return "badge-green";

    if (qty >= 300) return "badge-yellow";

    return "badge-red";

  };

  /* ===============================
     RECEIVE INVENTORY
  =============================== */

  const handleReceive = async () => {

    try {

      await receiveInventory({
        warehouseID: warehouseId,
        items: [
          {
            reliefItemID: Number(receiveItemId),
            quantity: Number(receiveQty)
          }
        ]
      });

      setShowReceive(false);
      setReceiveItemId("");
      setReceiveQty("");

      await loadInventory();

    } catch (err) {

      alert(err.message);

    }

  };

  /* ===============================
     ADJUST INVENTORY
  =============================== */

  const handleAdjust = async () => {

    try {

      await adjustInventory({
        warehouseID: warehouseId,
        items: [
          {
            reliefItemID: selectedItem.reliefItemID,
            adjustmentQuantity: Number(adjustQty)
          }
        ]
      });

      setShowAdjust(false);
      setAdjustQty("");

      await loadInventory();

    } catch (err) {

      alert(err.message);

    }

  };

  /* ===============================
     WAREHOUSE NAME
  =============================== */

  const getWarehouseName = () => {

    const wh = warehouses.find(w => String(w.warehouseId || w.id || w.warehouseID) === String(warehouseId));
    if (wh) return wh.name || wh.warehouseName || `Warehouse ${warehouseId}`;

    return `Warehouse ${warehouseId}`;

  };

  /* ===============================
     UI
  =============================== */

  return (
    <div className="inventory-page">

      {/* HEADER */}

      <div className="inventory-header">

        <div>
          <h2>Inventory Management</h2>
          <p>Disaster Relief Supply System</p>
        </div>

      </div>

      {/* WAREHOUSE SELECTOR */}

      <div className="card">

        <label>Select Warehouse</label>

        <select
          value={warehouseId}
          onChange={(e) => setWarehouseId(e.target.value)}
        >
          {warehouses.map((w) => (
            <option key={w.warehouseId || w.id || w.warehouseID} value={w.warehouseId || w.id || w.warehouseID}>
              {w.name || w.warehouseName || `Warehouse ${w.warehouseId || w.id || w.warehouseID}`}
            </option>
          ))}
        </select>

        <div className="viewing">
          Currently viewing: <b>{getWarehouseName()}</b>
        </div>

      </div>

      {/* TOOLBAR */}

      <div className="toolbar">

        <div className="search-box">

          <Search size={18} />

          <input
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

        </div>

        <div className="toolbar-buttons">

          <button className="btn">
            <Sliders size={16} /> Sort
          </button>

          <button
            className="btn"
            onClick={loadInventory}
          >
            <RefreshCw size={16} /> Refresh
          </button>
          <button className="btn"
            onClick={exportInventoryToExcel}
          >
            <Settings size={16} /> Export
          </button>
          <button className="btn primary">
            <Settings size={16} /> Adjust
          </button>

          <button
            className="btn success"
            onClick={() => setShowReceive(true)}
          >
            <Plus size={16} /> Receive
          </button>

        </div>

      </div>

      {/* TABLE */}

      <div className="inventory-table">

        <table>

          <thead>

            <tr>
              <th>Item Name</th>
              <th>Unit</th>
              <th>Quantity</th>
              <th>Last Updated</th>
              <th>Actions</th>
            </tr>

          </thead>

          <tbody>

            {loading && (

              <tr>
                <td colSpan="5" className="loading">
                  Loading inventory...
                </td>
              </tr>

            )}

            {!loading && filtered.length === 0 && (

              <tr>
                <td colSpan="5" className="loading">
                  No inventory items found
                </td>
              </tr>

            )}

            {filtered.map((item) => (

              <tr key={item.reliefItemID}>

                <td className="item-name">

                  <Package size={18} />

                  {item.reliefItemName}

                </td>

                <td>{item.unit}</td>

                <td>

                  <span className={`badge ${getColor(item.quantity)}`}>
                    {item.quantity.toLocaleString()}
                  </span>

                </td>

                <td>
                  {new Date(item.lastUpdated).toLocaleString()}
                </td>

                <td>

                  <button
                    className="adjust-btn"
                    onClick={() => {
                      setSelectedItem(item);
                      setShowAdjust(true);
                    }}
                  >
                    Adjust
                  </button>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

      {/* RECEIVE MODAL */}

      {showReceive && (

        <div className="modal-overlay">

          <div className="modal-box">

            <h3>Receive Inventory</h3>

            <input
              placeholder="Relief Item ID"
              value={receiveItemId}
              onChange={(e) => setReceiveItemId(e.target.value)}
            />

            <input
              placeholder="Quantity"
              value={receiveQty}
              onChange={(e) => setReceiveQty(e.target.value)}
            />

            <div className="modal-buttons">

              <button onClick={() => setShowReceive(false)}>
                Cancel
              </button>

              <button
                className="success"
                onClick={handleReceive}
              >
                Receive
              </button>

            </div>

          </div>

        </div>

      )}

      {/* ADJUST MODAL */}

      {showAdjust && selectedItem && (

        <div className="modal-overlay">

          <div className="modal-box">

            <h3>Adjust Inventory</h3>

            <p>
              Item: <b>{selectedItem.reliefItemName}</b>
            </p>

            <input
              placeholder="Adjustment Quantity (+/-)"
              value={adjustQty}
              onChange={(e) => setAdjustQty(e.target.value)}
            />

            <div className="modal-buttons">

              <button onClick={() => setShowAdjust(false)}>
                Cancel
              </button>

              <button
                className="primary"
                onClick={handleAdjust}
              >
                Adjust
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}
