import React, { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

const PublicLayout = () => {
  const { isAuthenticated, isRestoringSession, restoreSession } = useAuthStore();

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

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

  if (isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
};

export default PublicLayout;
