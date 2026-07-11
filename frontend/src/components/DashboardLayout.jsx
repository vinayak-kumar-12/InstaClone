import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../pages/Home/LeftSidebar";
import OfflineIndicator from "./OfflineIndicator";

const DashboardLayout = () => {
  return (
    <div className="w-full h-screen bg-black text-white flex overflow-hidden">
      {/* Fixed Left Navigation Sidebar */}
      <Sidebar />

      {/* Dynamic Content Outlet */}
      <div className="flex-1 h-full overflow-y-auto">
        <Outlet />
      </div>

      {/* Online/Offline Status Indicator */}
      <OfflineIndicator />
    </div>
  );
};

export default DashboardLayout;
