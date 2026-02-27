// URL của SignalR Hub - PHẢI khớp với Program.cs: app.MapHub<NotificationHub>("/hubs/notification")
// Dùng relative URL để tự động lấy domain từ window.location
export const HUB_URL = import.meta.env.VITE_API_URL 
    ? `${import.meta.env.VITE_API_URL}/hubs/notification`
    : "https://localhost:7269/hubs/notification";  // Fallback cho dev

// Tên method mà Backend định nghĩa trong Hub
// Phải khớp với NotificationHub.cs
export const SERVER_METHODS = {
    JOIN_GROUP: "JoinGroup",  // NotificationHub.JoinGroup(string groupName)
    LEAVE_GROUP: "LeaveGroup" // NotificationHub.LeaveGroup(string groupName)
};

// Tên method mà Backend "bắn" về (trong RealtimeNotificationService)
export const CLIENT_EVENTS = {
    // Từ RescueRequestKafkaHandler.cs
    NEW_RESCUE_REQUEST: "NewRescueRequest",
    
    // Từ BackgroundJobService.cs (SendDailySummaryReportAsync)
    DAILY_SUMMARY_REPORT: "DailySummaryReport"
};

// Tên Group
// Tên Group phải khớp với Backend
// Lưu ý: User tự động join group theo Role khi connect (OnConnectedAsync)
// Hoặc có thể manual join bằng JoinGroup method
export const GROUPS = {
    RESCUE_COORDINATOR_GROUP: "RescueCoordinatorr",        // Role Rescue Coordinator 
    RESCUE_TEAM_GROUP: "RescueTeam"         // Role Rescue Team
};