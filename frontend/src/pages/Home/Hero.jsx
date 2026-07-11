import React from "react";
import Mainbar from "./Mainbar";
import RightSidebar from "./RightSidebar";

const Hero = () => {
  return (
    <div className="w-full h-full flex overflow-hidden">
      {/* Center Feed */}
      <div className="flex-1 flex justify-center overflow-y-auto">
        <Mainbar />
      </div>

      {/* Right Suggestions Sidebar */}
      <RightSidebar />
    </div>
  );
};

export default Hero;