import React from "react";
import Mainbar from "./Mainbar";
import RightSidebar from "./RightSidebar";

const Hero = () => {
  return (
    <div className="w-full h-full flex overflow-hidden">
      {/* Feed Area */}
      <main className="flex-1 flex justify-center overflow-y-auto px-6">
        <div className="w-full max-w-[500px]">
          <Mainbar />
        </div>
      </main>

      {/* Right Sidebar */}
      <aside className="hidden xl:block w-[320px] flex-shrink-0">
        <RightSidebar />
      </aside>
    </div>
  );
};

export default Hero;
