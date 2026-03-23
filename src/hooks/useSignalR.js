import { useCallback, useEffect, useMemo, useState } from "react";
import signalRService from "../services/signalrService";

// Hook dùng khi 1 màn muốn đăng ký nhiều event SignalR theo dạng cấu hình.
const useSignalR = (events = []) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState("Disconnected");

  // Memoize events để tránh re-render loop
  const eventNamesKey = useMemo(
    () => JSON.stringify(events.map((event) => event.name)),
    [events],
  );

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        await signalRService.startConnection();
        if (!isMounted) return;

        // 2. Update state
        const state = signalRService.getState();
        setIsConnected(state.isConnected);
        setConnectionState(state.state);

        // 3. Đăng ký toàn bộ event truyền vào hook.
        // Cleanup listener khi rời màn hình.
        for (const event of events) {
          if (event?.name && event?.handler) {
            await signalRService.on(event.name, event.handler);
          }
        }
      } catch (error) {
        console.error("SignalR initialization error:", error);
        if (isMounted) {
          setIsConnected(false);
          setConnectionState("Error");
        }
      }
    };

    init();

    // Cleanup function
    return () => {
      isMounted = false;
      for (const event of events) {
        if (event?.name && event?.handler) {
          signalRService.off(event.name, event.handler);
        }
      }
    };
  }, [events, eventNamesKey]); // Dependency: groupName và events (serialized)

  // // Helper functions
  // const joinGroup = useCallback(async (newGroupName) => {
  //     await signalRService.invoke(SERVER_METHODS.JOIN_GROUP, newGroupName);
  // }, []);

  // const leaveGroup = useCallback(async (groupToLeave) => {
  //     await signalRService.invoke(SERVER_METHODS.LEAVE_GROUP, groupToLeave);
  // }, []);

  const reconnect = useCallback(async () => {
    await signalRService.startConnection();
    const state = signalRService.getState();
    setIsConnected(state.isConnected);
    setConnectionState(state.state);
  }, []);
  //     return {
  //         isConnected,
  //         connectionState,
  //         joinGroup,
  //         leaveGroup,
  //         service: signalRService
  //     };

  // }
  return { isConnected, connectionState, reconnect, service: signalRService };
};
export default useSignalR;
