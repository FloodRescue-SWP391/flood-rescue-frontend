import * as signalR from "@microsoft/signalr";
import { HUB_URL } from "../data/signalrConstants";

class SignalRService {
  constructor() {
    this.connection = null;
    this.isConnected = false;
    this.connectionPromise = null; // Để tránh multiple connection attempts
  }

  /**
   * Khởi tạo kết nối SignalR
   * Sử dụng JWT token để xác thực
   */
  async startConnection() {
    // Nếu đã connected rồi → khỏi connect nữa.
    if (
      this.isConnected &&
      this.connection?.state === signalR.HubConnectionState.Connected
    ) {
      console.log("SignalR already connected.");
      return;
    }
    // Nếu đang trong quá trình kết nối, chờ cho đến khi kết nối xong
    // Nếu đang connect dang dở → các nơi khác gọi vào sẽ đợi cùng 1 promise (không tạo kết nối mới).
    if (this.connectionPromise) {
      return this.connectionPromise;
    }
    // Nếu chưa gì cả → gọi _connect().
    this.connectionPromise = this._connect();
    return this.connectionPromise;
  }
  async _connect() {
    try {
      const token = localStorage.getItem("token");
      console.log("Creating SignalR connection...");
      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(HUB_URL, {
          accessTokenFactory: () => {
            const token = localStorage.getItem("token");
            if (!token) return "";
            return token.replace(/"/g, "").replace("Bearer ", "");
          },
          transport:
            signalR.HttpTransportType.WebSockets |
            signalR.HttpTransportType.ServerSentEvents |
            signalR.HttpTransportType.LongPolling,
        })
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (retryContext) => {
            const delays = [0, 2000, 5000, 10000, 30000];
            if (retryContext.previousRetryCount < delays.length) {
              return delays[retryContext.previousRetryCount];
            }
            return null;
          },
        })
        .configureLogging(signalR.LogLevel.Information)
        .build();

      this._setupEventHandlers();

      await this.connection.start();

      console.log(
        "SignalR started, connectionId:",
        this.connection.connectionId,
      );

      this.isConnected = true;

      console.log("SignalR connected");

      try {
        const role = localStorage.getItem("role");

        if (role === "Coordinator") {
          console.log("Joining group: Rescue Coordinator");
        }
      } catch (err) {
        console.error("JoinGroup error:", err);
      }
    } catch (error) {
      console.error("SignalR Connection Error:", error);
      this.isConnected = false;

      setTimeout(() => {
        const token = localStorage.getItem("token");
        this.connectionPromise = null;

        if (token) {
          this.startConnection();
        }
      }, 5000);
    } finally {
      this.connectionPromise = null;
    }
  }
  _setupEventHandlers() {
    // Khi kết nối bị đóng / mất kết nối hoàn toàn
    this.connection.onclose((error) => {
      this.isConnected = false;
      console.log("SignalR Connection closed.", error ? `Error: ${error}` : "");
    });
    // Khi đang reconnecting / đang cố nối lại
    this.connection.onreconnecting((error) => {
      this.isConnected = false;
      console.log("SignalR Reconnecting...", error ? `Error: ${error}` : "");
    });
    // Khi reconnected thành công / nối lại thành công
    this.connection.onreconnected((connectionId) => {
      this.isConnected = true;
      console.log("SignalR Reconnected! ConnectionId:", connectionId);
    });
  }
  /**
   * Đăng ký lắng nghe event từ Server
   * @param {string} eventName - Tên event (phải khớp với Backend)
   * @param {function} callback - Handler function
   */
  // đăng ký nghe event server bắn về

  async on(eventName, callback) {
    // ensure connection exists
    if (
      !this.connection ||
      this.connection.state !== signalR.HubConnectionState.Connected
    ) {
      await this.startConnection();
    }

    console.log(`📡 Subscribing to event: ${eventName}`);

    this.connection.on(eventName, (data) => {
      console.log(`📨 Event received: ${eventName}`, data);
      callback(data);
    });
  }
  /**
   * Hủy đăng ký event
   * @param {string} eventName - Tên event
   * @param {function} callback - (Optional) Specific handler to remove
   */
  // hủy đăng ký để tránh memory leak / handler chạy nhiều lần
  off(eventName, callback) {
    if (this.connection) {
      if (callback) {
        this.connection.off(eventName, callback);
      } else {
        this.connection.off(eventName);
      }
      console.log(`Unsubscribed from event: ${eventName}`);
    }
  }

  /**
   * Gọi method trên Server (Hub)
   * @param {string} methodName - Tên method (phải khớp với Hub)
   * @param  {...any} args - Arguments
   */
  // Client gọi hàm của Hub
  async invoke(methodName, ...args) {
    // Nếu chưa có connection → cố connect trước.
    if (!this.connection) {
      console.warn(
        "SignalR connection not initialized. Attempting to connect...",
      );
      await this.startConnection();
    }
    // Nếu đang connected → connection.invoke(methodName, ...args)
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      try {
        const result = await this.connection.invoke(methodName, ...args);
        console.log(`Invoked ${methodName} with args:`, args);
        return result;
      } catch (err) {
        console.error(`Error invoking ${methodName}:`, err);
        throw err;
      }
    } else {
      console.warn(
        `Cannot invoke ${methodName}: SignalR is not connected. State: ${this.connection?.state}`,
      );
    }
  }

  /**
   * Ngắt kết nối (Dùng khi logout)
   */
  async stopConnection() {
    if (this.connection) {
      try {
        // Dùng lúc logout để ngắt “đường dây”
        await this.connection.stop();
        console.log("SignalR Connection stopped.");
      } catch (err) {
        console.error("Error stopping SignalR:", err);
      } finally {
        // reset mọi thứ về null/false
        this.connection = null;
        this.isConnected = false;
        this.connectionPromise = null;
      }
    }
  }

  /**
   * Kiểm tra trạng thái connection
   */
  getState() {
    return {
      isConnected: this.isConnected,
      state: this.connection?.state || "Not initialized",
      connectionId: this.connection?.connectionId || null,
    };
  }
}

// Export Singleton instance
const signalRService = new SignalRService();
export default signalRService;
