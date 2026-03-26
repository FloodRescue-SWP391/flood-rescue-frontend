import "./ManagerDashboard.css";
import "./Inventory.css";
import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "react-hot-toast";
import {
  Search,
  Sliders,
  RefreshCw,
  Settings,
  Plus,
  Package,
  Trash2,
} from "lucide-react";
import signalRService from "../../services/signalrService";
import { CLIENT_EVENTS } from "../../data/signalrConstants";

import {
  getInventoryByWarehouse,
  receiveInventory,
  adjustInventory,
  removeInventoryStock,
} from "../../services/inventoryService";
import { getWarehouses, normalizeWarehouses } from "../../services/warehouseService";
import {
  normalizeReliefItem,
  reliefItemsService,
} from "../../services/reliefItemService";

const pickFirst = (source, keys, fallback = null) => {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return fallback;
};

const extractList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data?.content)) return data.data.content;
  if (Array.isArray(data?.data?.items)) return data.data.items;

  if (data && typeof data === "object") {
    const nestedArray = Object.values(data).find(Array.isArray);
    if (Array.isArray(nestedArray)) {
      return nestedArray;
    }
  }

  return [];
};

const getWarehouseIdValue = (warehouse) => {
  const rawId = pickFirst(
    warehouse,
    ["warehouseId", "WarehouseId", "warehouseID", "WarehouseID", "id", "ID"],
    "",
  );

  return rawId === undefined || rawId === null ? "" : String(rawId);
};

const normalizeInventoryItem = (item = {}, index = 0) => {
  const reliefItem = normalizeReliefItem(item);
  const inventoryId = pickFirst(
    item,
    ["inventoryID", "InventoryID", "inventoryId", "InventoryId", "id", "ID"],
    null,
  );
  const quantity = Number(
    pickFirst(item, ["quantity", "Quantity", "stockQuantity", "StockQuantity"], 0),
  );
  const lastUpdated = pickFirst(
    item,
    ["lastUpdated", "LastUpdated", "updatedAt", "UpdatedAt", "modifiedAt", "ModifiedAt"],
    null,
  );
  const warehouseID = pickFirst(
    item,
    ["warehouseID", "WarehouseID", "warehouseId", "WarehouseId"],
    null,
  );

  return {
    ...item,
    ...reliefItem,
    inventoryID: inventoryId,
    inventoryId: inventoryId,
    warehouseID,
    warehouseId: warehouseID,
    quantity: Number.isFinite(quantity) ? quantity : 0,
    lastUpdated,
    unit: pickFirst(item, ["unitName", "UnitName", "unit", "Unit"], reliefItem.unitName || ""),
    rowKey:
      inventoryId ||
      `${reliefItem.reliefItemID || reliefItem.id || "inventory"}-${warehouseID || "warehouse"}-${
        lastUpdated || index
      }-${index}`,
  };
};

const normalizeInventoryList = (items) => {
  if (!Array.isArray(items)) return [];
  return items
    .map((item, index) => normalizeInventoryItem(item, index))
    .sort((left, right) => {
      const leftTime = new Date(left?.lastUpdated || 0).getTime();
      const rightTime = new Date(right?.lastUpdated || 0).getTime();
      return rightTime - leftTime;
    });
};

const formatDateTime = (value) => {
  if (!value) return "Chưa có";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("vi-VN");
};

export default function Inventory() {
  const [warehouseId, setWarehouseId] = useState("");
  const [warehouses, setWarehouses] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [itemCatalog, setItemCatalog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [deletingRowKeys, setDeletingRowKeys] = useState({});

  const [search, setSearch] = useState("");

  const [showReceive, setShowReceive] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);

  const [selectedItem, setSelectedItem] = useState(null);

  const [receiveItemId, setReceiveItemId] = useState("");
  const [receiveQty, setReceiveQty] = useState("");
  const [adjustQty, setAdjustQty] = useState("");

  const exportInventoryToExcel = () => {
    const wb = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(inventory);
    XLSX.utils.book_append_sheet(wb, sheet, "Inventory");
    XLSX.writeFile(wb, "inventory_export.xlsx");
  };

  const loadInventory = async () => {
    if (!warehouseId) {
      setInventory([]);
      return;
    }

    try {
      setLoading(true);
      const res = await getInventoryByWarehouse(warehouseId);
      console.log("Inventory API:", res);
      setInventory(normalizeInventoryList(extractList(res)));
    } catch (err) {
      console.error("Load inventory error:", err);
      toast.error(err?.message || "Không thể tải dữ liệu tồn kho.");
      setInventory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, [warehouseId]);

  const loadWarehouses = async () => {
    try {
      const res = await getWarehouses();
      const list = normalizeWarehouses(extractList(res));
      setWarehouses(list);

      if (list.length > 0 && !warehouseId) {
        setWarehouseId(getWarehouseIdValue(list[0]));
      }
    } catch (err) {
      console.error("Load warehouses error:", err);
      toast.error(err?.message || "Không thể tải danh sách kho.");
    }
  };

  useEffect(() => {
    loadWarehouses();
  }, []);

  const loadReliefItemCatalog = async () => {
    try {
      setCatalogLoading(true);
      const res = await reliefItemsService.getAll();
      const list = extractList(res)
        .map((item) => normalizeReliefItem(item))
        .sort((left, right) => Number(left?.reliefItemID || 0) - Number(right?.reliefItemID || 0));

      setItemCatalog(list);
    } catch (err) {
      console.error("Load relief item catalog error:", err);
      toast.error(err?.message || "Không thể tải bảng mã vật phẩm.");
      setItemCatalog([]);
    } finally {
      setCatalogLoading(false);
    }
  };

  useEffect(() => {
    loadReliefItemCatalog();
  }, []);

  useEffect(() => {
    const handleDeliveryStarted = async (data) => {
      console.log("DeliveryStarted on Inventory page:", data);
      await loadInventory();

      toast.success(
        "Đội cứu hộ vừa xác nhận nhận hàng. Kiểm tra tồn kho; nếu backend chưa tự trừ thì manager điều chỉnh tay.",
      );
    };

    const handleReliefItemChanged = async () => {
      await Promise.all([loadInventory(), loadReliefItemCatalog()]);
    };

    const init = async () => {
      try {
        await signalRService.startConnection();
        await signalRService.on(
          CLIENT_EVENTS.DELIVERY_STARTED,
          handleDeliveryStarted,
        );
        await signalRService.on(
          CLIENT_EVENTS.RELIEF_ITEM_UPDATED,
          handleReliefItemChanged,
        );
        await signalRService.on(
          CLIENT_EVENTS.RELIEF_ITEM_CREATED,
          handleReliefItemChanged,
        );
      } catch (error) {
        console.error("SignalR init error in Inventory page:", error);
      }
    };

    init();

    return () => {
      signalRService.off(
        CLIENT_EVENTS.DELIVERY_STARTED,
        handleDeliveryStarted,
      );
      signalRService.off(
        CLIENT_EVENTS.RELIEF_ITEM_UPDATED,
        handleReliefItemChanged,
      );
      signalRService.off(
        CLIENT_EVENTS.RELIEF_ITEM_CREATED,
        handleReliefItemChanged,
      );
    };
  }, [warehouseId]);

  const filtered = inventory.filter((item) =>
    String(item?.reliefItemName || "")
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  const getColor = (qty) => {
    if (qty >= 1000) return "badge-green";
    if (qty >= 300) return "badge-yellow";
    return "badge-red";
  };

  const handleReceive = async () => {
    try {
      await receiveInventory({
        warehouseID: Number(warehouseId) || warehouseId,
        items: [
          {
            reliefItemID: Number(receiveItemId),
            quantity: Number(receiveQty),
          },
        ],
      });

      setShowReceive(false);
      setReceiveItemId("");
      setReceiveQty("");
      toast.success(
        "Nhập kho thành công. Nếu vật phẩm đã có sẵn, hệ thống sẽ cộng thêm vào dòng hiện có.",
      );
      await loadInventory();
    } catch (err) {
      console.error("Receive inventory error:", err);
      toast.error(err?.message || "Không thể nhập kho.");
    }
  };

  const handleAdjust = async () => {
    try {
      await adjustInventory({
        warehouseID: Number(warehouseId) || warehouseId,
        items: [
          {
            reliefItemID: selectedItem?.reliefItemID,
            adjustmentQuantity: Number(adjustQty),
          },
        ],
      });

      setShowAdjust(false);
      setAdjustQty("");
      toast.success("Điều chỉnh tồn kho thành công.");
      await loadInventory();
    } catch (err) {
      console.error("Adjust inventory error:", err);
      toast.error(err?.message || "Không thể điều chỉnh tồn kho.");
    }
  };

  // NEW: Xóa tồn kho của đúng kho hiện tại bằng cách adjust âm về 0,
  // không xóa ReliefItem toàn hệ thống.
  const handleDeleteItem = async (item) => {
    const rowKey = String(item?.rowKey || item?.inventoryID || item?.reliefItemID || "");
    const inventoryID = item?.inventoryID || item?.inventoryId || null;
    const reliefItemID = item?.reliefItemID || item?.reliefItemId || item?.id;
    const itemName = item?.reliefItemName || item?.itemName || `ID ${reliefItemID}`;
    const currentQuantity = Math.abs(Number(item?.quantity) || 0);

    if (!reliefItemID) {
      toast.error("Không tìm thấy ReliefItemID hợp lệ để xóa.");
      return;
    }

    if (!currentQuantity) {
      toast.error("Dòng tồn kho này không còn số lượng để xóa.");
      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa tồn kho của "${itemName}" trong kho hiện tại không?`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingRowKeys((prev) => ({
      ...prev,
      [rowKey]: true,
    }));

    try {
      const payload = {
        warehouseID: Number(warehouseId) || warehouseId,
        inventoryID,
        reliefItemID,
        quantity: currentQuantity,
      };

      console.log("removeInventoryStock payload:", payload);
      await removeInventoryStock(payload);

      toast.success(`Đã xóa tồn kho của "${itemName}" khỏi kho hiện tại.`);
      await loadInventory();
    } catch (err) {
      console.error("Delete inventory row error:", {
        error: err,
        item,
        inventoryID,
        reliefItemID,
        warehouseId,
        currentQuantity,
      });
      toast.error(err?.message || "Không thể xóa tồn kho.");
    } finally {
      setDeletingRowKeys((prev) => ({
        ...prev,
        [rowKey]: false,
      }));
    }
  };

  const getWarehouseName = () => {
    if (!warehouseId) return "Chưa chọn kho";

    const warehouse = warehouses.find(
      (entry) => getWarehouseIdValue(entry) === String(warehouseId),
    );

    if (warehouse) {
      return warehouse.name || warehouse.warehouseName || `Kho ${warehouseId}`;
    }

    return `Kho ${warehouseId}`;
  };

  return (
    <div className="inventory-page">
      <div className="mp-wrap">
      <div className="inventory-header panel-card manager-page-hero">
        <div>
          <div className="dashboardManager-title inventory-page-title">
            Quản lý hàng tồn kho
          </div>
          <div className="panel-sub inventory-page-subtitle">
            Theo dõi tồn kho từng kho, điều chỉnh số lượng và nhập kho cho vật phẩm cứu trợ.
          </div>
          <h2>Quản lý kho</h2>
          <p>Hệ thống quản lý hàng cứu trợ thiên tai</p>
        </div>
      </div>

      <div className="card panel-card inventory-warehouse-card">
        <label>Chọn kho</label>

        <select
          value={warehouseId ?? ""}
          onChange={(event) => setWarehouseId(event.target.value)}
        >
          {warehouses.map((warehouse, index) => (
            <option
              key={`warehouse-${getWarehouseIdValue(warehouse) || index}`}
              value={getWarehouseIdValue(warehouse)}
            >
              {warehouse.name ||
                warehouse.warehouseName ||
                `Kho ${getWarehouseIdValue(warehouse)}`}
            </option>
          ))}
        </select>

        <div className="viewing">
          Đang xem: <b>{getWarehouseName()}</b>
        </div>
      </div>

      <div className="toolbar panel-card inventory-toolbar-card">
        <div className="search-box">
          <Search size={18} />

          <input
            placeholder="Tìm kiếm vật phẩm..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="toolbar-buttons">
          <button className="btn" type="button">
            <Sliders size={16} /> Sắp xếp
          </button>

          <button className="btn" type="button" onClick={loadInventory}>
            <RefreshCw size={16} /> Làm mới
          </button>

          <button className="btn" type="button" onClick={exportInventoryToExcel}>
            <Settings size={16} /> Xuất file
          </button>

          <button className="btn primary" type="button">
            <Settings size={16} /> Điều chỉnh
          </button>

          <button
            className="btn success"
            type="button"
            onClick={() => setShowReceive(true)}
          >
            <Plus size={16} /> Nhập kho
          </button>
        </div>
      </div>

      <div className="inventory-table panel-card inventory-table-card">
        <table>
          <thead>
            <tr>
              <th>Mã ID</th>
              <th>Tên vật phẩm</th>
              <th>Đơn vị</th>
              <th>Số lượng</th>
              <th>Cập nhật lần cuối</th>
              <th>Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan="6" className="loading">
                  Đang tải dữ liệu kho...
                </td>
              </tr>
            )}

            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan="6" className="loading">
                  Không tìm thấy vật phẩm nào
                </td>
              </tr>
            )}

            {filtered.map((item) => (
              <tr key={item.rowKey}>
                <td>
                  <strong>#{item.reliefItemID || item.id || "?"}</strong>
                </td>

                <td className="item-name">
                  <Package size={18} />
                  {item.reliefItemName || "Chưa rõ tên"}
                </td>

                <td>{item.unit || "Chưa rõ"}</td>

                <td>
                  <span className={`badge ${getColor(item.quantity)}`}>
                    {(Number(item.quantity) || 0).toLocaleString("vi-VN")}
                  </span>
                </td>

                <td>{formatDateTime(item.lastUpdated)}</td>

                <td>
                  <div className="inventory-actions">
                    <button
                      className="adjust-btn"
                      type="button"
                      onClick={() => {
                        setSelectedItem(item);
                        setShowAdjust(true);
                      }}
                    >
                      Điều chỉnh
                    </button>

                    <button
                      className="delete-btn"
                      type="button"
                      onClick={() => handleDeleteItem(item)}
                      disabled={Boolean(deletingRowKeys[String(item.rowKey)])}
                    >
                      <Trash2 size={16} />
                      {deletingRowKeys[String(item.rowKey)]
                        ? "Đang xóa"
                        : "Xóa"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card panel-card inventory-reference">
        <div className="reference-header">
          <div>
            <h3 className="reference-title">Bảng mã vật phẩm</h3>
            <p className="reference-note">
              Manager nhập đúng `ReliefItemID` theo bảng này khi thêm hàng vào kho.
            </p>
          </div>

          <button className="btn" type="button" onClick={loadReliefItemCatalog}>
            <RefreshCw size={16} /> Làm mới mã
          </button>
        </div>

        <div className="inventory-table">
          <table>
            <thead>
              <tr>
                <th>ReliefItemID</th>
                <th>Tên vật phẩm</th>
                <th>Danh mục</th>
                <th>Đơn vị</th>
              </tr>
            </thead>

            <tbody>
              {catalogLoading && (
                <tr>
                  <td colSpan="4" className="loading">
                    Đang tải bảng mã vật phẩm...
                  </td>
                </tr>
              )}

              {!catalogLoading && itemCatalog.length === 0 && (
                <tr>
                  <td colSpan="4" className="loading">
                    Chưa có dữ liệu mã vật phẩm.
                  </td>
                </tr>
              )}

              {!catalogLoading &&
                itemCatalog.map((item) => (
                  <tr key={`catalog-${item.reliefItemID || item.id}`}>
                    <td>
                      <strong>#{item.reliefItemID || item.id || "?"}</strong>
                    </td>
                    <td>{item.reliefItemName || "Chưa rõ tên"}</td>
                    <td>{item.categoryName || "Chưa rõ"}</td>
                    <td>{item.unitName || "Chưa rõ"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {showReceive && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>Nhập kho</h3>

            <p className="modal-helper-text">
              Xem bảng mã vật phẩm bên dưới để nhập đúng `ReliefItemID`.
            </p>

            <input
              placeholder="ID vật phẩm cứu trợ"
              value={receiveItemId}
              onChange={(event) => setReceiveItemId(event.target.value)}
            />

            <input
              placeholder="Số lượng"
              value={receiveQty}
              onChange={(event) => setReceiveQty(event.target.value)}
            />

            <div className="modal-buttons">
              <button type="button" onClick={() => setShowReceive(false)}>
                Hủy
              </button>

              <button className="success" type="button" onClick={handleReceive}>
                Nhập
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdjust && selectedItem && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>Điều chỉnh tồn kho</h3>

            <p>
              Vật phẩm: <b>{selectedItem.reliefItemName}</b>
            </p>

            <input
              placeholder="Số lượng điều chỉnh (+/-)"
              value={adjustQty}
              onChange={(event) => setAdjustQty(event.target.value)}
            />

            <div className="modal-buttons">
              <button
                type="button"
                onClick={() => {
                  setShowAdjust(false);
                  setAdjustQty("");
                }}
              >
                Hủy
              </button>

              <button className="primary" type="button" onClick={handleAdjust}>
                Điều chỉnh
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
