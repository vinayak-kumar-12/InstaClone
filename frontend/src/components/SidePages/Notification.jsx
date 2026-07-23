import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Heart,
  UserPlus,
  MessageSquare,
  Bell,
  Search,
  CheckCheck,
  Trash2,
  Check,
  MoreHorizontal,
  Flame,
  ShieldAlert,
  Sparkles,
  Bookmark,
  Share2,
  UserCheck,
  Send,
  Loader2,
  X,
} from "lucide-react";
import { useNotificationStore } from "../../store/notificationStore";
import { useSocketStore } from "../../store/socketStore";
import { useAuthStore } from "../../store/authStore";
import api from "../../services/api";
import toast from "react-hot-toast";

// Helper function to categorize timestamps into time groups
const getTimeGroup = (createdAt) => {
  const date = new Date(createdAt);
  const now = new Date();
  const diffMs = now - date;
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 24 && date.getDate() === now.getDate()) {
    return "Today";
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth() && date.getFullYear() === yesterday.getFullYear()) {
    return "Yesterday";
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays <= 7) {
    return "This Week";
  }

  return "Earlier";
};

// Time-ago formatting helper
const formatTimeAgo = (dateString) => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  } catch (err) {
    return "";
  }
};

// Filter category options
const FILTER_CATEGORIES = [
  { id: "all", label: "All" },
  { id: "likes", label: "Likes" },
  { id: "comments", label: "Comments" },
  { id: "followers", label: "Followers" },
  { id: "mentions", label: "Mentions" },
  { id: "messages", label: "Messages" },
  { id: "stories", label: "Stories" },
  { id: "system", label: "System" },
];

const Notification = () => {
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);

  const {
    notifications,
    unreadCount,
    filter,
    searchQuery,
    isLoading,
    isFetchingMore,
    hasMore,
    setFilter,
    setSearchQuery,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    handleRealtimeNew,
    handleRealtimeCount,
  } = useNotificationStore();

  const socket = useSocketStore((state) => state.socket);
  const [followingMap, setFollowingMap] = useState({});

  // Initial Fetch on Mount
  useEffect(() => {
    fetchNotifications(true);
  }, []);

  // Socket.IO Listeners for Real-Time Instant Notification Updates
  useEffect(() => {
    if (!socket) return;

    const onNewNotif = (notif) => {
      handleRealtimeNew(notif);
    };

    const onCountUpdate = ({ unreadCount }) => {
      handleRealtimeCount(unreadCount);
    };

    socket.on("notification:new", onNewNotif);
    socket.on("notification:count", onCountUpdate);

    return () => {
      socket.off("notification:new", onNewNotif);
      socket.off("notification:count", onCountUpdate);
    };
  }, [socket, handleRealtimeNew, handleRealtimeCount]);

  // Group notifications into time sections
  const groupedNotifications = useMemo(() => {
    const groups = {
      Today: [],
      Yesterday: [],
      "This Week": [],
      Earlier: [],
    };

    notifications.forEach((notif) => {
      const group = getTimeGroup(notif.createdAt);
      if (groups[group]) {
        groups[group].push(notif);
      } else {
        groups["Earlier"].push(notif);
      }
    });

    return groups;
  }, [notifications]);

  // Handle Follow Back Action
  const handleFollowToggle = async (e, userId) => {
    e.stopPropagation();
    const isFollowing = followingMap[userId];
    try {
      if (isFollowing) {
        await api.delete(`/follow/${userId}`);
        setFollowingMap((prev) => ({ ...prev, [userId]: false }));
        toast.success("Unfollowed user");
      } else {
        await api.post(`/follow/${userId}`);
        setFollowingMap((prev) => ({ ...prev, [userId]: true }));
        toast.success("Followed user!");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Action failed");
    }
  };

  // Render Icon according to notification type
  const renderNotificationIcon = (type) => {
    switch (type) {
      case "like":
      case "story_like":
        return <Heart size={16} className="text-red-500 fill-red-500" />;
      case "comment":
      case "reply":
      case "story_reply":
        return <MessageSquare size={16} className="text-purple-400 fill-purple-400/20" />;
      case "follow":
      case "follow_accept":
        return <UserPlus size={16} className="text-blue-500" />;
      case "message":
      case "group_message":
        return <Send size={16} className="text-emerald-400" />;
      case "trending_post":
        return <Flame size={16} className="text-amber-500" />;
      case "save_post":
        return <Bookmark size={16} className="text-yellow-400" />;
      case "share_post":
        return <Share2 size={16} className="text-sky-400" />;
      case "security_alert":
      case "login_alert":
        return <ShieldAlert size={16} className="text-orange-500" />;
      case "welcome":
      case "feature_update":
      case "announcement":
        return <Sparkles size={16} className="text-pink-400" />;
      default:
        return <Bell size={16} className="text-zinc-400" />;
    }
  };

  return (
    <div className="w-full min-h-screen bg-black text-white flex flex-col items-center select-none pb-16">
      {/* Header Container */}
      <div className="w-full max-w-2xl border-b border-zinc-900 sticky top-0 bg-black/90 backdrop-blur-md z-30 px-6 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <span className="bg-pink-500/20 text-pink-400 text-xs font-bold px-2.5 py-0.5 rounded-full border border-pink-500/30">
                {unreadCount} new
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                title="Mark all as read"
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 px-3 py-1.5 rounded-lg cursor-pointer transition border border-zinc-800"
              >
                <CheckCheck size={14} className="text-blue-400" />
                <span>Read All</span>
              </button>
            )}

            {notifications.length > 0 && (
              <button
                onClick={clearAllNotifications}
                title="Clear all notifications"
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-red-400 bg-zinc-900 hover:bg-zinc-800 px-3 py-1.5 rounded-lg cursor-pointer transition border border-zinc-800"
              >
                <Trash2 size={14} />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Search Bar */}
        <div className="relative w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by username or message..."
            className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl pl-10 pr-9 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 text-xs">
          {FILTER_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id)}
              className={`px-3.5 py-1.5 rounded-full font-semibold cursor-pointer whitespace-nowrap transition ${
                filter === cat.id
                  ? "bg-white text-black font-bold"
                  : "bg-zinc-900 text-zinc-400 hover:bg-zinc-850 hover:text-white border border-zinc-850"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Body */}
      <div className="w-full max-w-2xl px-6 py-6 flex-1">
        {isLoading ? (
          /* Loading Skeleton */
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <div
                key={n}
                className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-zinc-900 animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-zinc-900 rounded-full" />
                  <div className="space-y-2">
                    <div className="w-40 h-3 bg-zinc-900 rounded" />
                    <div className="w-24 h-2 bg-zinc-900/70 rounded" />
                  </div>
                </div>
                <div className="w-8 h-8 bg-zinc-900 rounded-xl" />
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          /* Empty State */
          <div className="text-center text-zinc-500 py-20 bg-zinc-950/40 rounded-3xl border border-zinc-900/80 px-6 my-6">
            <Bell size={48} className="mx-auto text-zinc-700 mb-4 animate-bounce" />
            <h3 className="text-base font-bold text-zinc-300">No notifications found</h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No notifications matching "${searchQuery}".`
                : filter !== "all"
                ? `No notifications in ${filter} category right now.`
                : "When you receive likes, comments, or follow requests, they will appear here."}
            </p>
          </div>
        ) : (
          /* Grouped Notification List */
          <div className="space-y-8">
            {Object.entries(groupedNotifications).map(([groupTitle, groupItems]) => {
              if (groupItems.length === 0) return null;

              return (
                <div key={groupTitle} className="space-y-3">
                  <h2 className="text-xs font-bold tracking-wider text-zinc-500 uppercase px-1">
                    {groupTitle}
                  </h2>

                  <div className="space-y-2.5">
                    {groupItems.map((notif) => (
                      <div
                        key={notif.id || notif._id}
                        onClick={() => markAsRead(notif.id || notif._id)}
                        className={`group relative flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition duration-200 ${
                          !notif.isRead
                            ? "bg-zinc-900/70 border-zinc-800 shadow-md"
                            : "bg-zinc-950/40 border-zinc-900/60 hover:bg-zinc-950 hover:border-zinc-800"
                        }`}
                      >
                        <div className="flex items-center gap-3.5 flex-1 min-w-0">
                          {/* Profile Picture with Unread Indicator Ring */}
                          <div className="relative flex-shrink-0">
                            <img
                              src={notif.sender?.profile_pic || notif.image || "https://i.pravatar.cc/150"}
                              alt={notif.sender?.username || "User"}
                              className="w-11 h-11 rounded-full object-cover border border-zinc-800"
                            />
                            {!notif.isRead && (
                              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-pink-500 rounded-full border-2 border-black" />
                            )}
                          </div>

                          {/* Message Context */}
                          <div className="flex-1 min-w-0 pr-2">
                            <p className="text-sm text-zinc-300 leading-snug">
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (notif.sender?.id) navigate(`/profile/${notif.sender.id}`);
                                }}
                                className="font-bold text-white hover:underline cursor-pointer mr-1.5"
                              >
                                {notif.sender?.username || "Someone"}
                              </span>
                              {notif.message}
                            </p>
                            <span className="text-zinc-500 text-[11px] mt-1 block font-medium">
                              {formatTimeAgo(notif.createdAt)}
                            </span>
                          </div>
                        </div>

                        {/* Right Content: Media Thumbnail or Follow Button or Action Menu */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {/* Follow Button Action */}
                          {notif.type === "follow" && (
                            <button
                              onClick={(e) => handleFollowToggle(e, notif.senderId)}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition ${
                                followingMap[notif.senderId]
                                  ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                                  : "bg-blue-600 hover:bg-blue-500 text-white"
                              }`}
                            >
                              {followingMap[notif.senderId] ? "Following" : "Follow"}
                            </button>
                          )}

                          {/* Post Image Thumbnail Preview if applicable */}
                          {notif.image && notif.type !== "follow" && (
                            <img
                              src={notif.image}
                              alt="Thumbnail"
                              className="w-10 h-10 rounded-lg object-cover border border-zinc-800"
                            />
                          )}

                          {/* Icon Badge */}
                          <div className="p-2 bg-zinc-900/80 rounded-xl border border-zinc-800">
                            {renderNotificationIcon(notif.type)}
                          </div>

                          {/* Hover Actions: Mark Read / Delete */}
                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition duration-150">
                            {!notif.isRead && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notif.id || notif._id);
                                }}
                                title="Mark as read"
                                className="p-1.5 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-900 rounded-lg cursor-pointer"
                              >
                                <Check size={14} />
                              </button>
                            )}

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notif.id || notif._id);
                              }}
                              title="Delete notification"
                              className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-900 rounded-lg cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notification;
