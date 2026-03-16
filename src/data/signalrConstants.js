// URL SignalR Hub để toàn bộ frontend kết nối realtime với backend.
// Các event bên dưới phải khớp đúng tên backend SendAsync để frontend nhận đúng sự kiện.
export const HUB_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/hubs/notification`
  : "https://apifloodrescue.huydevops.id.vn/hubs/notification";

export const CLIENT_EVENTS = {
  NEW_RESCUE_REQUEST: "NewRescueRequest",
  RECEIVE_TEAM_RESPONSE: "ReceiveTeamResponse",
  RECEIVE_MISSION_NOTIFICATION: "ReceiveMissionNotification",
  INCIDENT_REPORTED: "IncidentReported",
  INCIDENT_RESOLVED: "IncidentResolved",
  RELIEF_ORDER_CREATED_COORDINATOR: "ReliefOrderCreatedCoordinator",
  ORDER_PREPARED: "OrderPrepared",
  DELIVERY_STARTED: "DeliveryStarted",
  MISSION_COMPLETED: "MissionCompleted",
  DAILY_SUMMARY_REPORT: "DailySummaryReport",
};

export const GROUPS = {
  RESCUE_COORDINATOR_GROUP: "Rescue Coordinator",
  MANAGER_GROUP: "Inventory Manager",
  ADMIN_GROUP: "Admin",
};
