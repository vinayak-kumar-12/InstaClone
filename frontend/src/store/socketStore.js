import { create } from "zustand";
import { io } from "socket.io-client";

export const useSocketStore = create((set, get) => ({
  socket: null,
  isConnected: false,
  onlineUsers: [],

  connectSocket: (accessToken) => {
    // If socket is already connected, don't connect again
    if (get().socket?.connected) return;

    // Disconnect old instances if any
    if (get().socket) {
      get().socket.disconnect();
    }

    const socketInstance = io("http://localhost:3000", {
      auth: {
        token: accessToken,
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketInstance.on("connect", () => {
      set({ isConnected: true });
      console.log("Socket.IO Connected to Server");
    });

    socketInstance.on("disconnect", () => {
      set({ isConnected: false });
      console.log("Socket.IO Disconnected from Server");
    });

    socketInstance.on("onlineUsers", (users) => {
      set({ onlineUsers: users });
    });

    set({ socket: socketInstance });
  },

  disconnectSocket: () => {
    const socketInstance = get().socket;
    if (socketInstance) {
      socketInstance.disconnect();
      set({ socket: null, isConnected: false, onlineUsers: [] });
    }
  },
}));
