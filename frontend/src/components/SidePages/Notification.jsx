import React, { useEffect, useState } from "react";
import { Heart, UserPlus, MessageSquare, Bell } from "lucide-react";

const Notification = () => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Generate some mock premium alerts
    setNotifications([
      {
        id: 1,
        type: "like",
        user: { username: "travel_explorer", avatar: "https://i.pravatar.cc/150?img=33" },
        text: "liked your post.",
        time: "5m ago",
      },
      {
        id: 2,
        type: "follow",
        user: { username: "chef_gordon", avatar: "https://i.pravatar.cc/150?img=53" },
        text: "started following you.",
        time: "2h ago",
      },
      {
        id: 3,
        type: "comment",
        user: { username: "fitness_trainer", avatar: "https://i.pravatar.cc/150?img=68" },
        text: 'commented: "Awesome post! Keep it up! 💪"',
        time: "1d ago",
      },
      {
        id: 4,
        type: "like",
        user: { username: "tech_guru", avatar: "https://i.pravatar.cc/150?img=11" },
        text: "liked your comment.",
        time: "2d ago",
      },
    ]);
  }, []);

  return (
    <div className="w-full min-h-screen bg-black text-white flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-2xl h-16 border-b border-zinc-900 flex items-center px-6">
        <h1 className="text-xl font-bold">Notifications</h1>
      </div>

      {/* Body */}
      <div className="w-full max-w-md px-6 py-10 flex-1">
        {notifications.length === 0 ? (
          <div className="text-center text-zinc-500 py-16">
            <Bell size={40} className="mx-auto text-zinc-700 mb-3" />
            <p className="text-sm font-semibold">No notifications</p>
            <p className="text-xs mt-1">Updates on likes, comments, and follows appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className="flex items-center justify-between p-3.5 hover:bg-zinc-950 rounded-2xl border border-transparent hover:border-zinc-900 transition"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={notif.user.avatar}
                    alt={notif.user.username}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <p className="text-sm text-zinc-300">
                      <span className="font-bold text-white mr-1">{notif.user.username}</span>
                      {notif.text}
                    </p>
                    <span className="text-zinc-600 text-xs mt-0.5 block">{notif.time}</span>
                  </div>
                </div>

                {/* Status Indicator Icon */}
                <div className="text-zinc-400">
                  {notif.type === "like" && <Heart size={16} className="text-red-500 fill-red-500" />}
                  {notif.type === "follow" && <UserPlus size={16} className="text-blue-500" />}
                  {notif.type === "comment" && <MessageSquare size={16} className="text-purple-500" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notification;
