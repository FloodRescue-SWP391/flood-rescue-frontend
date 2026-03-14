import { useEffect } from "react";
import signalRService from "../services/signalrService";
import { SERVER_METHODS } from "../data/signalrConstants";

const useSignalR = (groupName, events = []) => {
     const [isConnected, setIsConnected] = useState(false);
    const [connectionState, setConnectionState] = useState("Disconnected");

    // Memoize events để tránh re-render loop
    const eventsKey = JSON.stringify(events.map(e => e.name));

    useEffect(() => {
        let isMounted = true;

        const init = async () => {
            try {
                // 1. Khởi tạo kết nối SignalR
                await signalRService.startConnection();

                if (!isMounted) return;

                // 2. Update state
                const state = signalRService.getState();
                setIsConnected(state.isConnected);
                setConnectionState(state.state);

                // 3. Join Group nếu có groupName
                if (groupName && state.isConnected) {
                    await signalRService.invoke(SERVER_METHODS.JOIN_GROUP, groupName);
                    console.log(`Joined group: ${groupName}`);
                }

                // 4. Đăng ký các event handlers
                events.forEach(event => {
                    if (event.name && event.handler) {
                        signalRService.on(event.name, event.handler);
                    }
                });

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

            // Leave Group
            if (groupName) {
                signalRService.invoke(SERVER_METHODS.LEAVE_GROUP, groupName)
                    .catch(err => console.warn("Error leaving group:", err));
            }

            // Unsubscribe events
            events.forEach(event => {
                if (event.name) {
                    signalRService.off(event.name, event.handler);
                }
            });
        };
    }, [groupName, eventsKey]); // Dependency: groupName và events (serialized)

    // Helper functions
    const joinGroup = useCallback(async (newGroupName) => {
        await signalRService.invoke(SERVER_METHODS.JOIN_GROUP, newGroupName);
    }, []);

    const leaveGroup = useCallback(async (groupToLeave) => {
        await signalRService.invoke(SERVER_METHODS.LEAVE_GROUP, groupToLeave);
    }, []);

    return {
        isConnected,
        connectionState,
        joinGroup,
        leaveGroup,
        service: signalRService
    };
}
export default useSignalR;