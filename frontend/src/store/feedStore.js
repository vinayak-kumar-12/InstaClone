import { create } from "zustand";
import api from "../services/api";

export const useFeedStore = create((set, get) => ({
  posts: [],
  hasMore: true,
  isLoading: false,
  offset: 0,
  limit: 10,
  savedPostIds: new Set(),

  // Fetch posts from feed with pagination
  fetchFeed: async (reset = false) => {
    if (get().isLoading) return;
    
    set({ isLoading: true });
    const currentOffset = reset ? 0 : get().offset;
    const currentLimit = get().limit;

    try {
      const res = await api.get(`/feed?limit=${currentLimit}&offset=${currentOffset}`);
      const fetchedPosts = res.data.posts || [];
      
      set((state) => ({
        posts: reset ? fetchedPosts : [...state.posts, ...fetchedPosts],
        offset: currentOffset + fetchedPosts.length,
        hasMore: fetchedPosts.length === currentLimit,
        isLoading: false,
      }));
    } catch (err) {
      console.error("Failed to fetch feed:", err);
      set({ isLoading: false });
    }
  },

  // Toggle Like Status
  likePost: async (postId) => {
    try {
      // Toggle locally first for instant user feedback (optimistic UI)
      set((state) => ({
        posts: state.posts.map((post) => {
          if (post.id === postId) {
            const isLikedNow = !post.is_liked;
            return {
              ...post,
              is_liked: isLikedNow,
              likes_count: isLikedNow 
                ? parseInt(post.likes_count) + 1 
                : parseInt(post.likes_count) - 1,
            };
          }
          return post;
        }),
      }));

      // Call backend
      await api.post(`/likes/${postId}`);
    } catch (err) {
      console.error("Failed to toggle like:", err);
      // Revert if error
      set((state) => ({
        posts: state.posts.map((post) => {
          if (post.id === postId) {
            const isLikedNow = !post.is_liked;
            return {
              ...post,
              is_liked: isLikedNow,
              likes_count: isLikedNow 
                ? parseInt(post.likes_count) + 1 
                : parseInt(post.likes_count) - 1,
            };
          }
          return post;
        }),
      }));
    }
  },

  // Add Comment to Post
  addComment: async (postId, commentText) => {
    try {
      const res = await api.post(`/comments/${postId}`, { comment: commentText });
      const newComment = res.data.comment;

      // Update comment count locally
      set((state) => ({
        posts: state.posts.map((post) => {
          if (post.id === postId) {
            return {
              ...post,
              comments_count: parseInt(post.comments_count) + 1,
            };
          }
          return post;
        }),
      }));

      return { success: true, comment: newComment };
    } catch (err) {
      console.error("Failed to add comment:", err);
      return { success: false, error: err.response?.data?.message || "Failed to add comment" };
    }
  },

  // Delete Post
  deletePost: async (postId) => {
    try {
      await api.delete(`/posts/${postId}`);
      // Remove locally
      set((state) => ({
        posts: state.posts.filter((post) => post.id !== postId),
      }));
      return { success: true };
    } catch (err) {
      console.error("Failed to delete post:", err);
      return { success: false, error: err.response?.data?.message || "Failed to delete post" };
    }
  },

  // Initialize Saved Posts list
  fetchSavedPostIds: async () => {
    try {
      const res = await api.get("/saved");
      const savedPosts = res.data.posts || [];
      const savedIds = new Set(savedPosts.map((p) => p.id));
      set({ savedPostIds: savedIds });
    } catch (err) {
      console.error("Failed to load saved posts:", err);
    }
  },

  // Toggle Save Post
  savePost: async (postId) => {
    const isSaved = get().savedPostIds.has(postId);
    
    // Optimistic UI update
    set((state) => {
      const newSaved = new Set(state.savedPostIds);
      if (isSaved) {
        newSaved.delete(postId);
      } else {
        newSaved.add(postId);
      }
      return { savedPostIds: newSaved };
    });

    try {
      if (isSaved) {
        await api.delete(`/saved/${postId}`);
      } else {
        await api.post(`/saved/${postId}`);
      }
    } catch (err) {
      console.error("Failed to save/unsave post:", err);
      // Revert on error
      set((state) => {
        const newSaved = new Set(state.savedPostIds);
        if (isSaved) {
          newSaved.add(postId);
        } else {
          newSaved.delete(postId);
        }
        return { savedPostIds: newSaved };
      });
    }
  },
}));
