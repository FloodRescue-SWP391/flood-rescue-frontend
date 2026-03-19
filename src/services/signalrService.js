import * as signalR from "@microsoft/signalr";
import { HUB_URL } from "../data/signalrConstants";
// Service này quản lý 1 kết nối SignalR dùng chung cho toàn app.
class SignalRService {
  constructor() {
    this.connection = null;
    this.isConnected = false;
    this.connectionPromise = null;
  }

  // Chỉ tạo kết nối khi chưa connected; tránh mở nhiều connection trùng nhau.
  async startConnection() {
    if (
      this.isConnected &&
      this.connection?.state === signalR.HubConnectionState.Connected
    ) {
      return this.connection;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this._connect();
    return this.connectionPromise;
  }

  // Hàm private để khởi tạo HubConnection thật sự.
  async _connect() {
    try {
      console.log("Creating SignalR connection...");
      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(HUB_URL, {
          // Luôn đọc token mới nhất từ localStorage để tránh dính token cũ sau khi login/refresh.
          accessTokenFactory: () => {
            const token = localStorage.getItem("token") || "";
            return token.replace(/"/g, "").replace(/^Bearer\s+/i, "");
          },
          transport:
            signalR.HttpTransportType.WebSockets |
            signalR.HttpTransportType.ServerSentEvents |
            signalR.HttpTransportType.LongPolling,
        })
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (retryContext) => {
            const delays = [0, 2000, 5000, 10000, 30000];
            return retryContext.previousRetryCount < delays.length
              ? delays[retryContext.previousRetryCount]
              : null;
          },
        })
        .configureLogging(signalR.LogLevel.Information)
        .build();

      this._setupEventHandlers();
      await this.connection.start();
      this.isConnected = true;
      console.log("SignalR connected", this.connection.connectionId);
      return this.connection;
    } catch (error) {
      this.isConnected = false;
      console.error("SignalR connection error:", error);
      throw error;
    } finally {
      this.connectionPromise = null;
    }
  }

  _setupEventHandlers() {
    this.connection.onclose((error) => {
      this.isConnected = false;
      console.log("SignalR closed", error || "");
    });

    this.connection.onreconnecting((error) => {
      this.isConnected = false;
      console.log("SignalR reconnecting", error || "");
    });

    this.connection.onreconnected((connectionId) => {
      this.isConnected = true;
      console.log("SignalR reconnected", connectionId);
    });
  }

  // Đăng ký event từ backend. Gọi off trước để tránh 1 event bị subscribe nhiều lần.
  async on(eventName, callback) {
    await this.startConnection();
    if (!this.connection) return;

    this.connection.off(eventName, callback);
    this.connection.on(eventName, callback);
    console.log(`Subscribed: ${eventName}`);
  }

  // Gỡ listener khi unmount để tránh popup/toast bị lặp nhiều lần.
  off(eventName, callback) {
    if (!this.connection) return;
    if (callback) this.connection.off(eventName, callback);
    else this.connection.off(eventName);
  }

  async stopConnection() {
    if (!this.connection) return;
    try {
      await this.connection.stop();
    } finally {
      this.connection = null;
      this.isConnected = false;
      this.connectionPromise = null;
    }
  }

  getState() {
    return {
      isConnected: this.isConnected,
      state: this.connection?.state || "Not initialized",
      connectionId: this.connection?.connectionId || null,
    };
  }
}

const signalRService = new SignalRService();
export default signalRService;
