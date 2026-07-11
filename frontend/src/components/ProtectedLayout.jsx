import React, { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useSocketStore } from "../store/socketStore";
import { useChatStore } from "../store/chatStore";

const ProtectedLayout = () => {
  const { isAuthenticated, isRestoringSession, accessToken, restoreSession } = useAuthStore();
  const { connectSocket, disconnectSocket, socket } = useSocketStore();
  const { bindSocketEvents } = useChatStore();

  // Try to restore session on app load
  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  // Connect socket when authenticated
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      connectSocket(accessToken);
    }
    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated, accessToken, connectSocket, disconnectSocket]);

  // Bind socket events when socket instance changes
  useEffect(() => {
    if (socket) {
      bindSocketEvents(socket);
    }
  }, [socket, bindSocketEvents]);

  if (isRestoringSession) {
    return (
      <div className="min-h-screen w-full bg-black text-white flex flex-col items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <img
            src="/Images/insta.png"
            alt="Loading"
            className="w-16 h-16 animate-pulse"
          />
          <div className="w-12 h-1 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedLayout;
