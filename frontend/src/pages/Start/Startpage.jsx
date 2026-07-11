import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Startpage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/login");
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);
  return (
    <div className="min-h-screen w-full bg-[#101114] text-white flex flex-col items-center justify-between py-10">
      {/* Top Empty Space */}
      <div></div>

      {/* Center Content */}
      <div className="flex flex-col items-center">
        <img
          src="/Images/insta.png"
          alt="Instagram Logo"
          className="w-24 h-24 mb-4"
        />

        <h1 className="text-5xl font-bold leading-[1.2] bg-linear-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
          Instagram
        </h1>
      </div>

      {/* Bottom */}
      <div className="flex flex-col items-center">
        <p className="text-gray-400 text-lg mb-2">From</p>

        <img src="/Images/meta.png" alt="Meta" className="w-24" />
      </div>
    </div>
  );
};

export default Startpage;
