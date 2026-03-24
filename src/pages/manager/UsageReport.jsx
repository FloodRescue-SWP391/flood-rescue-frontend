import "./UsageReport.css";
import { useEffect, useState } from "react";
import { Card, Button, Row, Col, Table } from "react-bootstrap";
import * as XLSX from "xlsx";

import { reliefItemsService } from "../../services/reliefItemService";
import { inventoryService } from "../../services/inventoryService";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export default function UsageReport() {
  const [items, setItems] = useState([]);
  const [inventory, setInventory] = useState([]);

  /* =========================
        LOAD DATA
  ========================= */

  const loadData = async () => {
    try {
      const itemsRes = await reliefItemsService.getAll();
      const inventoryRes = await inventoryService.getInventoryByWarehouse(1);

      let itemsList = [];
      if (Array.isArray(itemsRes)) itemsList = itemsRes;
      else if (Array.isArray(itemsRes?.data)) itemsList = itemsRes.data;
      else if (Array.isArray(itemsRes?.content)) itemsList = itemsRes.content;
      else if (Array.isArray(itemsRes?.items)) itemsList = itemsRes.items;
      else if (Array.isArray(itemsRes?.data?.content))
        itemsList = itemsRes.data.content;
      else if (typeof itemsRes === "object" && itemsRes !== null) {
        const potentialArray = Object.values(itemsRes).find(Array.isArray);
        if (potentialArray) itemsList = potentialArray;
      }
      setItems(itemsList);

      let invList = [];
      const data = inventoryRes?.json
        ? await inventoryRes.json()
        : inventoryRes;
      if (Array.isArray(data)) invList = data;
      else if (Array.isArray(data?.data)) invList = data.data;
      else if (Array.isArray(data?.content)) invList = data.content;
      else if (Array.isArray(data?.items)) invList = data.items;
      else if (Array.isArray(data?.data?.content)) invList = data.data.content;
      else if (Array.isArray(data?.data?.items)) invList = data.data.items;
      else if (typeof data === "object" && data !== null) {
        const potentialArray = Object.values(data).find(Array.isArray);
        if (potentialArray) invList = potentialArray;
        else
          invList = Object.values(data).filter(
            (item) =>
              typeof item === "object" &&
              item !== null &&
              (item.reliefItemID || item.id),
          );
      }
      setInventory(invList);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /* =========================
        KPI
  ========================= */

  const totalItems = items.length;

  const totalInventory = inventory.length;

  const totalQuantity = inventory.reduce((sum, i) => {
    return sum + (i.quantity || 0);
  }, 0);

  /* =========================
        BAR DATA
  ========================= */

  const barData = inventory.map((i) => ({
    name: i.reliefItemName,
    quantity: i.quantity,
  }));

  /* =========================
        LINE DATA
  ========================= */

  const grouped = {};

  inventory.forEach((i) => {
    const date = new Date(i.lastUpdated).toLocaleDateString();

    if (!grouped[date]) grouped[date] = 0;

    grouped[date] += i.quantity;
  });

  const lineData = Object.keys(grouped).map((d) => ({
    date: d,
    quantity: grouped[d],
  }));

  /* =========================
        EXPORT EXCEL
  ========================= */

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    const itemsSheet = XLSX.utils.json_to_sheet(items);
    const inventorySheet = XLSX.utils.json_to_sheet(inventory);

    XLSX.utils.book_append_sheet(wb, itemsSheet, "Relief Items");
    XLSX.utils.book_append_sheet(wb, inventorySheet, "Inventory");

    XLSX.writeFile(wb, "usage_report.xlsx");
  };

  /* =========================
        UI
  ========================= */

  return (
    <div className="report-wrap">
      {/* HEADER */}

      <div className="report-header">
        <div>
          <div className="report-title">Báo cáo sử dụng hệ thống</div>

          <div className="report-sub">
            Xuất phân tích tồn kho và vật phẩm cứu trợ
          </div>
        </div>

        <Button variant="success" onClick={exportExcel}>
          Xuất Excel
        </Button>
      </div>

      {/* KPI */}

      <Row className="mb-4">
        <Col md={4}>
          <Card className="report-card">
            <Card.Body>
              <div className="kpi-label">Vật phẩm cứu trợ</div>
              <div className="kpi-value">{totalItems}</div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="report-card">
            <Card.Body>
              <div className="kpi-label">Bản ghi tồn kho</div>
              <div className="kpi-value">{totalInventory}</div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="report-card">
            <Card.Body>
              <div className="kpi-label">Tổng số lượng</div>
              <div className="kpi-value">{totalQuantity}</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* CHARTS */}

      <div className="report-grid">
        <Card className="report-card">
          <Card.Body>
            <div className="chart-title">Xu hướng tồn kho</div>

            <div className="chart-box">
              <ResponsiveContainer>
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />

                  <Line
                    type="monotone"
                    dataKey="quantity"
                    stroke="#ef4444"
                    strokeWidth={3}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card.Body>
        </Card>

        <Card className="report-card">
          <Card.Body>
            <div className="chart-title">Phân bố tồn kho</div>

            <div className="chart-box">
              <ResponsiveContainer>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />

                  <Bar dataKey="quantity" fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card.Body>
        </Card>
      </div>

      {/* TABLE */}

      <Card className="report-card">
        <Card.Body>
          <div className="table-title">Dữ liệu tồn kho</div>

          <Table striped bordered hover>
            <thead>
              <tr>
                <th>Vật phẩm</th>
                <th>Số lượng</th>
                <th>Cập nhật lần cuối</th>
              </tr>
            </thead>

            <tbody>
              {inventory.map((i) => (
                <tr key={i.inventoryID}>
                  <td>{i.reliefItemName}</td>

                  <td>{i.quantity}</td>

                  <td>{new Date(i.lastUpdated).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
}
