import { create } from "zustand";
import api from "../services/api";
import toast from "react-hot-toast";

export const useStoryStore = create((set, get) => ({
  storyFeed: [],
  activeUserIndex: 0,
  activeStoryIndex: 0,
  isViewerOpen: false,
  isUploadOpen: false,
  isViewersDrawerOpen: false,
  viewersList: [],
  isPaused: false,
  isMuted: false,
  isLoadingFeed: false,

  // Set Mute state
  setIsMuted: (muted) => set({ isMuted: muted }),

  // Set Pause state (long press / drawer open)
  setIsPaused: (paused) => set({ isPaused: paused }),

  // Open / Close Story Upload Modal
  setUploadOpen: (open) => set({ isUploadOpen: open }),

  // Open / Close Viewers Drawer
  setViewersDrawerOpen: (open) => {
    set({ isViewersDrawerOpen: open, isPaused: open });
  },

  // Fetch Stories Feed
  fetchStoriesFeed: async () => {
    set({ isLoadingFeed: true });
    try {
      const res = await api.get("/stories/feed");
      if (res.data && res.data.success) {
        set({ storyFeed: res.data.feed || [] });
      }
    } catch (err) {
      console.error("Failed to fetch stories feed:", err);
    } finally {
      set({ isLoadingFeed: false });
    }
  },

  // Open Fullscreen Story Viewer
  openViewer: (userIndex = 0, storyIndex = 0) => {
    const { storyFeed } = get();
    if (!storyFeed || storyFeed.length === 0) return;

    // Default to first unread story if available
    let targetStoryIdx = storyIndex;
    if (storyIndex === 0 && storyFeed[userIndex]) {
      const firstUnreadIdx = storyFeed[userIndex].stories.findIndex((s) => !s.isViewed);
      if (firstUnreadIdx !== -1) {
        targetStoryIdx = firstUnreadIdx;
      }
    }

    set({
      activeUserIndex: userIndex,
      activeStoryIndex: targetStoryIdx,
      isViewerOpen: true,
      isPaused: false,
      isViewersDrawerOpen: false,
    });

    // Record view for current initial story
    const currentStory = storyFeed[userIndex]?.stories[targetStoryIdx];
    if (currentStory) {
      get().recordView(currentStory.id || currentStory._id);
    }
  },

  // Close Fullscreen Story Viewer
  closeViewer: () => {
    set({
      isViewerOpen: false,
      isPaused: false,
      isViewersDrawerOpen: false,
      viewersList: [],
    });
  },

  // Move to Next Story Segment or Next User
  nextStory: () => {
    const { storyFeed, activeUserIndex, activeStoryIndex } = get();
    const currentUserGroup = storyFeed[activeUserIndex];
    if (!currentUserGroup) return;

    if (activeStoryIndex < currentUserGroup.stories.length - 1) {
      const nextIdx = activeStoryIndex + 1;
      set({ activeStoryIndex: nextIdx, isPaused: false });
      const nextStoryObj = currentUserGroup.stories[nextIdx];
      if (nextStoryObj) {
        get().recordView(nextStoryObj.id || nextStoryObj._id);
      }
    } else if (activeUserIndex < storyFeed.length - 1) {
      const nextUserIdx = activeUserIndex + 1;
      const nextUserGroup = storyFeed[nextUserIdx];
      const firstUnreadIdx = nextUserGroup.stories.findIndex((s) => !s.isViewed);
      const targetStoryIdx = firstUnreadIdx !== -1 ? firstUnreadIdx : 0;

      set({
        activeUserIndex: nextUserIdx,
        activeStoryIndex: targetStoryIdx,
        isPaused: false,
      });

      const nextStoryObj = nextUserGroup.stories[targetStoryIdx];
      if (nextStoryObj) {
        get().recordView(nextStoryObj.id || nextStoryObj._id);
      }
    } else {
      // Reached end of all stories
      get().closeViewer();
    }
  },

  // Move to Previous Story Segment or Previous User
  prevStory: () => {
    const { storyFeed, activeUserIndex, activeStoryIndex } = get();
    if (activeStoryIndex > 0) {
      const prevIdx = activeStoryIndex - 1;
      set({ activeStoryIndex: prevIdx, isPaused: false });
      const prevStoryObj = storyFeed[activeUserIndex]?.stories[prevIdx];
      if (prevStoryObj) {
        get().recordView(prevStoryObj.id || prevStoryObj._id);
      }
    } else if (activeUserIndex > 0) {
      const prevUserIdx = activeUserIndex - 1;
      const prevUserGroup = storyFeed[prevUserIdx];
      const lastStoryIdx = prevUserGroup.stories.length - 1;

      set({
        activeUserIndex: prevUserIdx,
        activeStoryIndex: lastStoryIdx,
        isPaused: false,
      });

      const prevStoryObj = prevUserGroup.stories[lastStoryIdx];
      if (prevStoryObj) {
        get().recordView(prevStoryObj.id || prevStoryObj._id);
      }
    }
  },

  // Record Story View in Backend & Mark Local Viewed
  recordView: async (storyId) => {
    if (!storyId) return;

    // Optimistically update local view status
    set((state) => ({
      storyFeed: state.storyFeed.map((group, uIdx) => {
        if (uIdx !== state.activeUserIndex) return group;
        const updatedStories = group.stories.map((s, sIdx) => {
          if (sIdx === state.activeStoryIndex || s.id === storyId || s._id === storyId) {
            return { ...s, isViewed: true };
          }
          return s;
        });

        const hasUnread = updatedStories.some((s) => !s.isViewed);
        return { ...group, stories: updatedStories, hasUnread };
      }),
    }));

    try {
      await api.post(`/stories/view/${storyId}`);
    } catch (err) {
      console.error("Failed to record story view:", err);
    }
  },

  // React to Story (❤️, 😂, 😍, 🔥, 👏)
  reactToStory: async (storyId, emoji) => {
    try {
      // Optimistic update
      set((state) => ({
        storyFeed: state.storyFeed.map((group) => ({
          ...group,
          stories: group.stories.map((s) =>
            s.id === storyId || s._id === storyId ? { ...s, userReaction: emoji } : s
          ),
        })),
      }));

      await api.post("/stories/reaction", { storyId, reaction: emoji });
      toast.success(`Reacted ${emoji}`);
    } catch (err) {
      console.error("Failed to react to story:", err);
    }
  },

  // Reply to Story via Direct Message
  replyToStory: async (storyId, text) => {
    try {
      await api.post("/stories/reply", { storyId, text });
      toast.success("Reply sent!");
    } catch (err) {
      console.error("Failed to reply to story:", err);
      toast.error("Failed to send reply.");
    }
  },

  // Delete Story
  deleteStory: async (storyId) => {
    try {
      await api.delete(`/stories/${storyId}`);
      toast.success("Story deleted.");

      // Refresh feed
      get().fetchStoriesFeed();
      get().closeViewer();
    } catch (err) {
      console.error("Failed to delete story:", err);
      toast.error("Failed to delete story.");
    }
  },

  // Fetch Viewers List for Story Owner
  fetchStoryViewers: async (storyId) => {
    if (!storyId) return;
    try {
      const res = await api.get(`/stories/viewers/${storyId}`);
      if (res.data && res.data.success) {
        set({ viewersList: res.data.viewers || [] });
      }
    } catch (err) {
      console.error("Failed to fetch story viewers:", err);
    }
  },

  // Upload Story (Image or Video)
  uploadStory: async ({ mediaUrl, mediaType, caption = "", privacy = "followers" }) => {
    try {
      const res = await api.post("/stories", {
        mediaUrl,
        mediaType,
        caption,
        privacy,
      });

      if (res.data && res.data.success) {
        toast.success("Story uploaded!");
        set({ isUploadOpen: false });
        get().fetchStoriesFeed();
        return true;
      }
    } catch (err) {
      console.error("Failed to upload story:", err);
      toast.error(err.response?.data?.message || "Failed to upload story.");
      return false;
    }
  },
}));
