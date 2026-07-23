import { create } from "zustand";
import api from "../services/api";
import toast from "react-hot-toast";

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  page: 1,
  hasMore: false,
  filter: "all", // all, likes, comments, followers, mentions, messages, stories, system
  searchQuery: "",
  isLoading: false,
  isFetchingMore: false,

  // Set Filter Tab
  setFilter: (category) => {
    set({ filter: category, page: 1 });
    get().fetchNotifications(true);
  },

  // Set Search Query
  setSearchQuery: (query) => {
    set({ searchQuery: query, page: 1 });
    get().fetchNotifications(true);
  },

  // Fetch Unread Badge Count
  fetchUnreadCount: async () => {
    try {
      const res = await api.get("/notifications/count");
      if (res.data && typeof res.data.unreadCount === "number") {
        set({ unreadCount: res.data.unreadCount });
      }
    } catch (err) {
      console.error("Failed to fetch unread count:", err);
    }
  },

  // Fetch Notifications List (Supports Reset & Pagination)
  fetchNotifications: async (reset = false) => {
    const { page, filter, searchQuery, notifications, isLoading, isFetchingMore } = get();
    if (isLoading || isFetchingMore) return;

    const targetPage = reset ? 1 : page;
    if (reset) {
      set({ isLoading: true, page: 1 });
    } else {
      set({ isFetchingMore: true });
    }

    try {
      const res = await api.get("/notifications", {
        params: {
          page: targetPage,
          limit: 20,
          category: filter,
          search: searchQuery,
        },
      });

      if (res.data && res.data.success) {
        const newNotifications = res.data.notifications || [];
        set({
          notifications: reset ? newNotifications : [...notifications, ...newNotifications],
          hasMore: res.data.pagination?.hasMore || false,
          unreadCount: typeof res.data.unreadCount === "number" ? res.data.unreadCount : get().unreadCount,
          page: targetPage + 1,
        });
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
      toast.error("Could not load notifications");
    } finally {
      set({ isLoading: false, isFetchingMore: false });
    }
  },

  // Mark Single Notification as Read
  markAsRead: async (id) => {
    try {
      // Optimistic Update
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id || n._id === id ? { ...n, isRead: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));

      await api.patch(`/notifications/${id}/read`);
    } catch (err) {
      console.error("Failed to mark as read:", err);
      get().fetchUnreadCount();
    }
  },

  // Mark All Notifications as Read
  markAllAsRead: async () => {
    try {
      // Optimistic Update
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      }));

      await api.patch("/notifications/read-all");
      toast.success("All notifications marked as read");
    } catch (err) {
      console.error("Failed to mark all as read:", err);
      toast.error("Failed to mark all as read");
      get().fetchNotifications(true);
    }
  },

  // Delete Single Notification
  deleteNotification: async (id) => {
    try {
      const targetNotif = get().notifications.find((n) => n.id === id || n._id === id);
      const wasUnread = targetNotif && !targetNotif.isRead;

      // Optimistic Update
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id && n._id !== id),
        unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
      }));

      await api.delete(`/notifications/${id}`);
      toast.success("Notification deleted");
    } catch (err) {
      console.error("Failed to delete notification:", err);
      toast.error("Failed to delete notification");
      get().fetchNotifications(true);
    }
  },

  // Clear All Notifications
  clearAllNotifications: async () => {
    try {
      set({ notifications: [], unreadCount: 0 });
      await api.delete("/notifications/clear-all");
      toast.success("All notifications cleared");
    } catch (err) {
      console.error("Failed to clear notifications:", err);
      toast.error("Failed to clear notifications");
      get().fetchNotifications(true);
    }
  },

  // Handle Real-Time Incoming Notification from Socket.IO
  handleRealtimeNew: (notification) => {
    set((state) => {
      // Avoid duplicate notifications in local state
      const exists = state.notifications.some(
        (n) => n.id === notification.id || n._id === notification.id
      );
      if (exists) return state;

      return {
        notifications: [notification, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      };
    });
  },

  // Handle Real-Time Unread Count Update from Socket.IO
  handleRealtimeCount: (count) => {
    if (typeof count === "number") {
      set({ unreadCount: count });
    }
  },
}));
