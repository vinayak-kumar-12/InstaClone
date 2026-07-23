import React, { useEffect, useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { useSocketStore } from "../../store/socketStore";
import { Link } from "react-router-dom";
import api from "../../services/api";
import toast from "react-hot-toast";

const RightSidebar = () => {
  const currentUser = useAuthStore((state) => state.user);
  const [suggestions, setSuggestions] = useState([]);
  const [followingMap, setFollowingMap] = useState({});

  const socket = useSocketStore((state) => state.socket);

  useEffect(() => {
    if (!socket) return;

    const handleProfileUpdate = ({ userId, profilePic }) => {
      setSuggestions((prev) =>
        prev.map((user) => {
          if (Number(user.id) === Number(userId)) {
            return { ...user, avatar: profilePic, profile_pic: profilePic };
          }
          return user;
        })
      );
    };

    socket.on("profileUpdated", handleProfileUpdate);

    return () => {
      socket.off("profileUpdated", handleProfileUpdate);
    };
  }, [socket]);

  useEffect(() => {
    // Generate some premium suggestions
    const mockSuggestions = [
      { id: 22, username: "travel_explorer", name: "Sarah Connor", avatar: "https://i.pravatar.cc/150?img=33" },
      { id: 45, username: "chef_gordon", name: "Gordon Ramsay", avatar: "https://i.pravatar.cc/150?img=53" },
      { id: 18, username: "fitness_trainer", name: "Arnold S.", avatar: "https://i.pravatar.cc/150?img=68" },
      { id: 9, username: "tech_guru", name: "Linus T.", avatar: "https://i.pravatar.cc/150?img=11" },
    ];
    
    // Make sure suggestions don't include the current user
    const filtered = mockSuggestions.filter(u => Number(u.id) !== Number(currentUser?.id));
    setSuggestions(filtered);
  }, [currentUser]);

  const handleFollowToggle = async (userId) => {
    const isFollowing = followingMap[userId];
    
    try {
      if (isFollowing) {
        await api.delete(`/follow/${userId}`);
        setFollowingMap(prev => ({ ...prev, [userId]: false }));
        toast.success("Unfollowed user");
      } else {
        await api.post(`/follow/${userId}`);
        setFollowingMap(prev => ({ ...prev, [userId]: true }));
        toast.success("Followed user!");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Action failed");
    }
  };

  return (
    <div className="hidden xl:block w-72 h-screen bg-black text-white px-6 py-10 border-l border-zinc-900 flex-shrink-0 select-none">
      {/* Current User Card */}
      <div className="flex items-center justify-between mb-8">
        <Link to={`/profile/${currentUser?.id || "me"}`} className="flex items-center gap-3">
          <img
            src={currentUser?.profile_pic || "https://i.pravatar.cc/150"}
            alt={currentUser?.username}
            className="w-12 h-12 rounded-full object-cover border border-zinc-800"
          />
          <div>
            <h2 className="text-sm font-bold text-white hover:underline truncate max-w-[130px]">{currentUser?.username}</h2>
            <span className="text-xs text-zinc-500 truncate max-w-[130px] block">{currentUser?.email}</span>
          </div>
        </Link>
        <button className="text-xs font-semibold text-blue-500 hover:text-white transition">
          Switch
        </button>
      </div>

      {/* Suggested Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-zinc-400">Suggested for you</h3>
          <button className="text-xs font-semibold text-white hover:text-zinc-400 transition">See All</button>
        </div>

        {/* Suggestion List */}
        <div className="space-y-4">
          {suggestions.map((user) => (
            <div key={user.id} className="flex items-center justify-between">
              <Link to={`/profile/${user.id}`} state={{ username: user.username, profile_pic: user.avatar, name: user.name }} className="flex items-center gap-3">
                <img
                  src={user.avatar}
                  alt={user.username}
                  className="w-9 h-9 rounded-full object-cover border border-zinc-900"
                />
                <div>
                  <h4 className="text-sm font-semibold hover:underline truncate max-w-[120px]">{user.username}</h4>
                  <span className="text-xs text-zinc-500 truncate max-w-[120px] block">{user.name}</span>
                </div>
              </Link>
              
              <button
                onClick={() => handleFollowToggle(user.id)}
                className={`text-xs font-semibold cursor-pointer transition ${
                  followingMap[user.id] ? "text-zinc-400 hover:text-white" : "text-blue-500 hover:text-blue-400"
                }`}
              >
                {followingMap[user.id] ? "Following" : "Follow"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Mini Footer */}
      <div className="mt-12 text-[11px] text-zinc-600 space-y-3">
        <p className="hover:underline cursor-pointer">
          About • Help • Press • API • Jobs • Privacy • Terms • Locations • Language
        </p>
        <p>© 2026 INSTAGRAM FROM META</p>
      </div>
    </div>
  );
};

export default RightSidebar;
