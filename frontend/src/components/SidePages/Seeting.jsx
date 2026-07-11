import React, { useState } from "react";
import { Shield, Eye, Bell, User, HelpCircle } from "lucide-react";
import toast from "react-hot-toast";

const Seeting = () => {
  const [isPrivate, setIsPrivate] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleTogglePrivacy = () => {
    setIsPrivate(!isPrivate);
    toast.success(`Account set to ${!isPrivate ? "Private" : "Public"}`);
  };

  const handleToggleNotifications = () => {
    setNotificationsEnabled(!notificationsEnabled);
    toast.success(`Notifications ${!notificationsEnabled ? "Enabled" : "Disabled"}`);
  };

  return (
    <div className="w-full min-h-screen bg-black text-white flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-2xl h-16 border-b border-zinc-900 flex items-center px-6">
        <h1 className="text-xl font-bold">Settings</h1>
      </div>

      {/* Body */}
      <div className="w-full max-w-md px-6 py-10 space-y-6">
        {/* Account settings card */}
        <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3 border-b border-zinc-900 pb-3">
            <User size={18} className="text-zinc-400" />
            <h2 className="font-semibold text-sm">Account Preferences</h2>
          </div>

          <div className="flex justify-between items-center text-sm">
            <div>
              <p className="font-bold">Private Account</p>
              <p className="text-zinc-500 text-xs mt-0.5">Only approved people can see your posts.</p>
            </div>
            <button
              onClick={handleTogglePrivacy}
              className={`w-12 h-6 rounded-full p-1 transition duration-200 focus:outline-none cursor-pointer ${
                isPrivate ? "bg-blue-600" : "bg-zinc-800"
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full transition duration-200 transform ${
                  isPrivate ? "translate-x-6" : ""
                }`}
              />
            </button>
          </div>
        </div>

        {/* Notifications preferences card */}
        <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3 border-b border-zinc-900 pb-3">
            <Bell size={18} className="text-zinc-400" />
            <h2 className="font-semibold text-sm">Notifications</h2>
          </div>

          <div className="flex justify-between items-center text-sm">
            <div>
              <p className="font-bold">Push Notifications</p>
              <p className="text-zinc-500 text-xs mt-0.5">Receive alerts on likes, comments and follows.</p>
            </div>
            <button
              onClick={handleToggleNotifications}
              className={`w-12 h-6 rounded-full p-1 transition duration-200 focus:outline-none cursor-pointer ${
                notificationsEnabled ? "bg-blue-600" : "bg-zinc-800"
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full transition duration-200 transform ${
                  notificationsEnabled ? "translate-x-6" : ""
                }`}
              />
            </button>
          </div>
        </div>

        {/* Security and help cards */}
        <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3 border-b border-zinc-900 pb-3">
            <Shield size={18} className="text-zinc-400" />
            <h2 className="font-semibold text-sm">Security & Privacy</h2>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center cursor-pointer hover:bg-zinc-900/60 p-2 rounded-xl transition">
              <span className="font-bold">Blocked Accounts</span>
              <Eye size={16} className="text-zinc-500" />
            </div>
            <div className="flex justify-between items-center cursor-pointer hover:bg-zinc-900/60 p-2 rounded-xl transition">
              <span className="font-bold">Help & Support</span>
              <HelpCircle size={16} className="text-zinc-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Seeting;
