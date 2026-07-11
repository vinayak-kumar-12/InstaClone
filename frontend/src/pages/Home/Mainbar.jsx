import React, { useEffect, useState, useRef } from "react";
import { useFeedStore } from "../../store/feedStore";
import { useAuthStore } from "../../store/authStore";
import { FeedSkeleton, Shimmer } from "../../components/Skeletons";
import { Heart, MessageCircle, Bookmark, Trash2, Send, Clock, MapPin, X } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api";

// Simple time-ago formatter helper
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

const Mainbar = () => {
  const { posts, hasMore, isLoading, fetchFeed, likePost, addComment, deletePost, savedPostIds, savePost, fetchSavedPostIds } = useFeedStore();
  const currentUser = useAuthStore((state) => state.user);
  
  // Comments Modal State
  const [selectedPost, setSelectedPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Load feed and saved lists on mount
  useEffect(() => {
    fetchFeed(true);
    fetchSavedPostIds();
  }, [fetchFeed, fetchSavedPostIds]);

  // Infinite Scroll Trigger
  const observerTarget = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          fetchFeed();
        }
      },
      { threshold: 1.0 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [posts, hasMore, isLoading, fetchFeed]);

  // Load comment details for the modal
  const openComments = async (post) => {
    setSelectedPost(post);
    setComments([]);
    setIsLoadingComments(true);
    try {
      const res = await api.get(`/comments/${post.id}`);
      setComments(res.data.comments || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load comments.");
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    try {
      const res = await addComment(selectedPost.id, commentText);
      if (res.success) {
        setComments((prev) => [...prev, res.comment]);
        setCommentText("");
        toast.success("Comment added!");
      } else {
        toast.error(res.error || "Failed to add comment.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeletePost = async (postId) => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      const res = await deletePost(postId);
      if (res.success) {
        toast.success("Post deleted.");
        if (selectedPost?.id === postId) {
          setSelectedPost(null);
        }
      } else {
        toast.error(res.error || "Failed to delete post.");
      }
    }
  };

  return (
    <div className="w-full max-w-[620px] py-8 px-4 flex flex-col items-center">
      {/* STORIES BAR (PREMIUM LOOK) */}
      <div className="w-full flex gap-4 overflow-x-auto pb-4 mb-6 border-b border-zinc-900 scrollbar-none select-none">
        {/* Current User Story */}
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer">
          <div className="relative">
            <img
              src={currentUser?.profile_pic || "https://i.pravatar.cc/150"}
              alt="My Story"
              className="w-14 h-14 rounded-full object-cover p-[2px] border border-zinc-700"
            />
            <div className="absolute bottom-0 right-0 bg-blue-500 text-white rounded-full p-0.5 border-2 border-black flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3 h-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
          </div>
          <span className="text-xs text-zinc-400 max-w-[60px] truncate">Your Story</span>
        </div>

        {/* Mock Stories */}
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer">
            <div className="rounded-full bg-gradient-to-tr from-yellow-500 via-red-500 to-purple-600 p-[2px]">
              <img
                src={`https://i.pravatar.cc/150?img=${i + 15}`}
                alt="Story"
                className="w-14 h-14 rounded-full object-cover bg-black p-[2px]"
              />
            </div>
            <span className="text-xs text-zinc-400 max-w-[60px] truncate">friend_{i}</span>
          </div>
        ))}
      </div>

      {/* FEED POSTS */}
      <div className="w-full space-y-6">
        {posts.map((post) => (
          <div
            key={post.id}
            className="w-full border border-zinc-900 bg-zinc-950/20 rounded-xl overflow-hidden shadow-xl"
          >
            {/* Post Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-900">
              <div className="flex items-center gap-3">
                <img
                  src={post.profile_pic || "https://i.pravatar.cc/150"}
                  alt={post.username}
                  className="w-9 h-9 rounded-full object-cover"
                />
                <div>
                  <h3 className="font-semibold text-sm">{post.username}</h3>
                  {post.location && (
                    <span className="text-xs text-zinc-500 flex items-center gap-0.5">
                      <MapPin size={10} />
                      {post.location}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 text-zinc-400">
                <span className="text-xs">{formatTimeAgo(post.created_at)}</span>
                {currentUser?.id === post.user_id && (
                  <button
                    onClick={() => handleDeletePost(post.id)}
                    className="hover:text-red-500 transition cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Post Image Media */}
            <div className="relative bg-zinc-900 aspect-square flex items-center justify-center">
              <img
                src={post.media_url}
                alt="Media"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>

            {/* Post Action Buttons */}
            <div className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex gap-4">
                  <button
                    onClick={() => likePost(post.id)}
                    className="hover:scale-110 transition cursor-pointer"
                  >
                    {post.is_liked ? (
                      <Heart size={24} className="fill-red-500 text-red-500" />
                    ) : (
                      <Heart size={24} className="hover:text-zinc-400 text-white" />
                    )}
                  </button>

                  <button
                    onClick={() => openComments(post)}
                    className="hover:scale-110 hover:text-zinc-400 transition cursor-pointer"
                  >
                    <MessageCircle size={24} />
                  </button>
                </div>

                <button
                  onClick={() => savePost(post.id)}
                  className="hover:scale-110 hover:text-zinc-400 transition cursor-pointer"
                >
                  <Bookmark
                    size={24}
                    className={savedPostIds.has(post.id) ? "fill-white text-white" : "text-white"}
                  />
                </button>
              </div>

              {/* Likes & Comments Count */}
              <div>
                <p className="text-sm font-bold">{post.likes_count} likes</p>
                <p className="text-sm mt-1.5">
                  <span className="font-bold mr-2">{post.username}</span>
                  <span className="text-zinc-300">{post.caption}</span>
                </p>
                {post.comments_count > 0 && (
                  <button
                    onClick={() => openComments(post)}
                    className="text-sm text-zinc-500 hover:text-zinc-400 mt-2 font-medium"
                  >
                    View all {post.comments_count} comments
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* LOADING & EMPTY STATES */}
        {isLoading && (
          <>
            <FeedSkeleton />
            <FeedSkeleton />
          </>
        )}

        {!isLoading && posts.length === 0 && (
          <div className="w-full py-16 text-center border border-zinc-900 bg-zinc-950/20 rounded-xl p-8">
            <h2 className="text-xl font-bold text-zinc-300">Your Feed is Empty</h2>
            <p className="text-zinc-500 text-sm mt-2">
              Start following people or create posts to build your timeline.
            </p>
          </div>
        )}

        {/* Intersection Anchor */}
        <div ref={observerTarget} className="h-10 w-full" />
      </div>

      {/* COMMENTS DETAILS MODAL */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#18181b] border border-zinc-800 rounded-2xl w-full max-w-4xl h-[80vh] overflow-hidden flex flex-col md:flex-row">
            {/* Left Post Image */}
            <div className="flex-1 bg-black flex items-center justify-center border-r border-zinc-800 max-h-[40vh] md:max-h-full">
              <img
                src={selectedPost.media_url}
                alt="Post Media"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Right Comments Area */}
            <div className="w-full md:w-[420px] flex flex-col h-full bg-[#18181b]">
              {/* Header */}
              <div className="flex justify-between items-center p-4 border-b border-zinc-850">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedPost.profile_pic || "https://i.pravatar.cc/150"}
                    alt={selectedPost.username}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <span className="font-semibold text-sm">{selectedPost.username}</span>
                </div>
                <button
                  onClick={() => setSelectedPost(null)}
                  className="text-zinc-400 hover:text-white transition"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Comments Scroller */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Author original caption item */}
                <div className="flex items-start gap-3">
                  <img
                    src={selectedPost.profile_pic || "https://i.pravatar.cc/150"}
                    alt={selectedPost.username}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div>
                    <p className="text-sm">
                      <span className="font-bold mr-2">{selectedPost.username}</span>
                      <span className="text-zinc-300">{selectedPost.caption}</span>
                    </p>
                    <span className="text-zinc-500 text-xs mt-1 block">
                      {formatTimeAgo(selectedPost.created_at)}
                    </span>
                  </div>
                </div>

                <div className="border-t border-zinc-900 my-2" />

                {/* Comment Lists */}
                {isLoadingComments ? (
                  <div className="space-y-4">
                    <div className="flex gap-3"><Shimmer className="w-8 h-8 rounded-full" /><Shimmer className="h-10 w-2/3" /></div>
                    <div className="flex gap-3"><Shimmer className="w-8 h-8 rounded-full" /><Shimmer className="h-8 w-1/2" /></div>
                  </div>
                ) : comments.length === 0 ? (
                  <p className="text-zinc-500 text-center text-sm pt-8">No comments yet. Be the first!</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex items-start gap-3">
                      <img
                        src={comment.profile_pic || "https://i.pravatar.cc/150"}
                        alt={comment.username}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <p className="text-sm">
                          <span className="font-bold mr-2">{comment.username}</span>
                          <span className="text-zinc-300">{comment.comment}</span>
                        </p>
                        <span className="text-zinc-500 text-xs mt-1 block">
                          {formatTimeAgo(comment.created_at)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Form Input Footer */}
              <form onSubmit={handleSendComment} className="border-t border-zinc-850 p-4 bg-zinc-900/20">
                <div className="flex items-center bg-zinc-900 rounded-xl px-4 py-2 border border-zinc-800 focus-within:border-zinc-700 transition">
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-500"
                    disabled={isSubmittingComment}
                  />
                  <button
                    type="submit"
                    disabled={!commentText.trim() || isSubmittingComment}
                    className="text-blue-500 hover:text-blue-400 font-semibold text-sm ml-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isSubmittingComment ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Send size={16} />
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Mainbar;