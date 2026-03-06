import { useEffect } from "react";
import signalRService from "../services/signalrService";

export default function useSignalR(eventHandlers = {}) {
  useEffect(() => {
    const entries = Object.entries(eventHandlers);

    entries.forEach(([eventName, handler]) => {
      if (typeof handler === "function") {
        signalRService.on(eventName, handler);
      }
    });

    return () => {
      entries.forEach(([eventName, handler]) => {
        if (typeof handler === "function") {
          signalRService.off(eventName, handler);
        }
      });
    };
  }, [eventHandlers]);
}