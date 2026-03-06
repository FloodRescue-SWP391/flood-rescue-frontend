import * as signalR from "@microsoft/signalr";
import { HUB_URL } from "../data/signalrConstants";

class SignalRService {
  constructor() {
    this.connection = null;
    this.connectionPromise = null;
  }

  buildConnection() {
    if (this.connection) return this.connection;

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, {
        accessTokenFactory: () => localStorage.getItem("token") || "",
        transport:
          signalR.HttpTransportType.WebSockets |
          signalR.HttpTransportType.ServerSentEvents |
          signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.connection.onclose((error) => {
      console.warn("[SignalR] closed", error);
    });

    this.connection.onreconnecting((error) => {
      console.warn("[SignalR] reconnecting", error);
    });

    this.connection.onreconnected((connectionId) => {
      console.log("[SignalR] reconnected", connectionId);
    });

    return this.connection;
  }

  async startConnection() {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      return;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this._startInternal();
    return this.connectionPromise;
  }

  async _startInternal() {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.warn("[SignalR] No token found, skip connect");
        return;
      }

      this.buildConnection();

      if (
        this.connection.state === signalR.HubConnectionState.Connected ||
        this.connection.state === signalR.HubConnectionState.Connecting
      ) {
        return;
      }

      await this.connection.start();
      console.log("[SignalR] Connected successfully");
    } catch (error) {
      console.error("[SignalR] Start connection failed", error);
    } finally {
      this.connectionPromise = null;
    }
  }

  async stopConnection() {
    if (!this.connection) return;

    try {
      if (
        this.connection.state === signalR.HubConnectionState.Connected ||
        this.connection.state === signalR.HubConnectionState.Connecting ||
        this.connection.state === signalR.HubConnectionState.Reconnecting
      ) {
        await this.connection.stop();
      }
    } catch (error) {
      console.error("[SignalR] Stop connection failed", error);
    } finally {
      this.connection = null;
      this.connectionPromise = null;
    }
  }

  on(eventName, callback) {
    this.buildConnection();
    this.connection.off(eventName, callback);
    this.connection.on(eventName, callback);
  }

  off(eventName, callback) {
    if (!this.connection) return;
    this.connection.off(eventName, callback);
  }
}

const signalRService = new SignalRService();
export default signalRService;