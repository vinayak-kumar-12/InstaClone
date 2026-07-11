import { create } from "zustand";
import api from "../services/api";

export const useAuthStore = create((set, get) => ({
  user: null,
  currentUser: null, // Alias to support user queries
  accessToken: null,
  isAuthenticated: false,
  isRestoringSession: true,
  isLoading: false,
  loading: false, // Alias to support loading queries
  error: null,

  setAccessToken: (token) => set({ accessToken: token, isAuthenticated: !!token }),

  // Logs in the user and sets cookies/state
  loginAction: async (email, password) => {
    set({ isLoading: true, loading: true, error: null });
    try {
      const res = await api.post("/auth/login", { email, password });
      const { accessToken, user } = res.data.data;
      set({
        user,
        currentUser: user,
        accessToken,
        isAuthenticated: true,
        isRestoringSession: false,
        isLoading: false,
        loading: false,
      });
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || "Login failed";
      set({ error: message, isLoading: false, loading: false });
      return { success: false, error: message };
    }
  },

  // Signs up a new user
  signupAction: async (userData) => {
    set({ isLoading: true, loading: true, error: null });
    try {
      const res = await api.post("/auth/signup", userData);
      const { accessToken, user } = res.data.data;
      set({
        user,
        currentUser: user,
        accessToken,
        isAuthenticated: true,
        isRestoringSession: false,
        isLoading: false,
        loading: false,
      });
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || "Registration failed";
      set({ error: message, isLoading: false, loading: false });
      return { success: false, error: message };
    }
  },

  // Logs out the user and clears sessions
  logoutAction: async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error("Logout request failed:", err);
    } finally {
      // Always clear state locally
      set({
        user: null,
        currentUser: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
        loading: false,
      });
    }
  },

  // Alias for logoutAction to match required logout() method
  logout: async () => {
    await get().logoutAction();
  },

  // Restores session on page reload using the HttpOnly cookie
  restoreSession: async () => {
    if (get().isAuthenticated) {
      set({ isRestoringSession: false });
      return;
    }
    set({ isRestoringSession: true });
    try {
      // 1. Hit refresh endpoint to get a new access token
      const refreshRes = await api.post("/auth/refresh");
      const { accessToken } = refreshRes.data.data;
      set({ accessToken });

      // 2. Fetch current user data
      const userRes = await api.get("/auth/me");
      const fetchedUser = userRes.data.data.user;
      set({
        user: fetchedUser,
        currentUser: fetchedUser,
        isAuthenticated: true,
        isRestoringSession: false,
      });
    } catch (err) {
      // Silent error: means no session exists
      set({
        user: null,
        currentUser: null,
        accessToken: null,
        isAuthenticated: false,
        isRestoringSession: false,
      });
    }
  },

  // Updates current user's profile details locally
  updateUserProfileLocally: (updatedFields) => {
    const currentUserVal = get().user;
    if (currentUserVal) {
      const updatedUser = {
        ...currentUserVal,
        ...updatedFields,
      };
      set({
        user: updatedUser,
        currentUser: updatedUser,
      });
    }
  },
}));
