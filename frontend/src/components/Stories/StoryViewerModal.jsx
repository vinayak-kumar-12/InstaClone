import React, { useEffect, useState, useRef } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Trash2,
  Eye,
  Send,
  Heart,
  MoreHorizontal,
  Lock,
} from "lucide-react";
import { useStoryStore } from "../../store/storyStore";
import { useAuthStore } from "../../store/authStore";
import StoryViewersDrawer from "./StoryViewersDrawer";

const EMOJI_REACTIONS = ["❤️", "😂", "😍", "🔥", "👏"];

// Helper for time ago formatting
const formatTimeAgo = (dateString) => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    return `${diffHours}h ago`;
  } catch (err) {
    return "";
  }
};

const StoryViewerModal = () => {
  const {
    storyFeed,
    activeUserIndex,
    activeStoryIndex,
    isViewerOpen,
    isPaused,
    isMuted,
    isViewersDrawerOpen,
    viewersList,
    setIsMuted,
    setIsPaused,
    setViewersDrawerOpen,
    closeViewer,
    nextStory,
    prevStory,
    reactToStory,
    replyToStory,
    deleteStory,
    fetchStoryViewers,
  } = useStoryStore();

  const currentUser = useAuthStore((state) => state.user);
  const [replyText, setReplyText] = useState("");
  const [progress, setProgress] = useState(0);
  const videoRef = useRef(null);

  const activeUserGroup = storyFeed[activeUserIndex];
  const activeStory = activeUserGroup?.stories[activeStoryIndex];
  const isOwner = Number(activeUserGroup?.userId) === Number(currentUser?.id);

  // Keyboard navigation shortcuts
  useEffect(() => {
    if (!isViewerOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft") {
        prevStory();
      } else if (e.key === "ArrowRight") {
        nextStory();
      } else if (e.key === "Escape") {
        closeViewer();
      } else if (e.key === " ") {
        e.preventDefault();
        setIsPaused(!isPaused);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isViewerOpen, isPaused, nextStory, prevStory, closeViewer, setIsPaused]);

  // Handle Automatic Progress Timer (5 Seconds for images)
  useEffect(() => {
    if (!isViewerOpen || !activeStory || isPaused || isViewersDrawerOpen) return;

    // Reset progress on story change
    setProgress(0);
    const duration = activeStory.mediaType === "video" ? 15000 : 5000;
    const intervalTime = 50;
    const increment = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          nextStory();
          return 100;
        }
        return prev + increment;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isViewerOpen, activeStoryIndex, activeUserIndex, isPaused, isViewersDrawerOpen]);

  // Fetch viewers when owner opens story or viewers drawer
  useEffect(() => {
    if (isOwner && activeStory) {
      fetchStoryViewers(activeStory.id || activeStory._id);
    }
  }, [isOwner, activeStoryIndex, activeUserIndex]);

  if (!isViewerOpen || !activeUserGroup || !activeStory) return null;

  const handleSendReply = (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    replyToStory(activeStory.id || activeStory._id, replyText);
    setReplyText("");
  };

  const handleEmojiClick = (emoji) => {
    reactToStory(activeStory.id || activeStory._id, emoji);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center select-none overflow-hidden animate-fade-in">
      {/* Background Ambient Blur */}
      <div className="absolute inset-0 opacity-30 filter blur-3xl pointer-events-none">
        <img src={activeStory.mediaUrl} alt="" className="w-full h-full object-cover" />
      </div>

      {/* Main Story Container */}
      <div className="relative w-full max-w-sm sm:max-w-md h-full sm:h-[90vh] bg-black sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col items-center justify-between border border-zinc-900">
        {/* Top Progress Segmented Bars */}
        <div className="absolute top-3 inset-x-3 z-30 flex gap-1.5 px-2">
          {activeUserGroup.stories.map((storyItem, idx) => {
            let barWidth = "0%";
            if (idx < activeStoryIndex) barWidth = "100%";
            if (idx === activeStoryIndex) barWidth = `${progress}%`;

            return (
              <div key={storyItem.id || storyItem._id || idx} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-75 ease-linear"
                  style={{ width: barWidth }}
                />
              </div>
            );
          })}
        </div>

        {/* Story Header Bar */}
        <div className="absolute top-7 inset-x-3 z-30 flex items-center justify-between px-3 text-white">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <img
                src={activeUserGroup.user?.profile_pic || "https://i.pravatar.cc/150"}
                alt={activeUserGroup.user?.username}
                className="w-9 h-9 rounded-full object-cover border border-black/50"
              />
              {activeStory.privacy === "close_friends" && (
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-0.5 border border-black" title="Close Friends">
                  <Lock size={10} className="text-white" />
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm leading-tight text-white drop-shadow-md">
                  {activeUserGroup.user?.username}
                </span>
                <span className="text-xs text-white/70 drop-shadow-md">
                  {formatTimeAgo(activeStory.createdAt)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeStory.mediaType === "video" && (
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-1.5 text-white/80 hover:text-white rounded-full transition cursor-pointer"
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
            )}

            <button
              onClick={() => setIsPaused(!isPaused)}
              className="p-1.5 text-white/80 hover:text-white rounded-full transition cursor-pointer"
            >
              {isPaused ? <Play size={18} /> : <Pause size={18} />}
            </button>

            {isOwner && (
              <button
                onClick={() => deleteStory(activeStory.id || activeStory._id)}
                title="Delete Story"
                className="p-1.5 text-white/80 hover:text-red-400 rounded-full transition cursor-pointer"
              >
                <Trash2 size={18} />
              </button>
            )}

            <button
              onClick={closeViewer}
              className="p-1.5 text-white/80 hover:text-white rounded-full transition cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Media Content Display */}
        <div
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
          className="relative w-full h-full flex items-center justify-center bg-zinc-950 overflow-hidden"
        >
          {activeStory.mediaType === "video" ? (
            <video
              ref={videoRef}
              src={activeStory.mediaUrl}
              autoPlay
              muted={isMuted}
              playsInline
              className="w-full h-full object-contain"
            />
          ) : (
            <img
              src={activeStory.mediaUrl}
              alt="Story"
              className="w-full h-full object-contain"
            />
          )}

          {/* Touch Area Navigation overlay (Left 35%, Right 65%) */}
          <div
            onClick={prevStory}
            className="absolute left-0 top-0 bottom-0 w-1/3 z-20 cursor-pointer"
          />
          <div
            onClick={nextStory}
            className="absolute right-0 top-0 bottom-0 w-2/3 z-20 cursor-pointer"
          />
        </div>

        {/* Bottom Bar: Owner Viewers Trigger or Viewer Reply & Reactions */}
        <div className="absolute bottom-4 inset-x-3 z-30 space-y-3">
          {isOwner ? (
            <button
              onClick={() => setViewersDrawerOpen(true)}
              className="w-full bg-black/60 backdrop-blur-md border border-zinc-800 hover:bg-zinc-900/80 text-white rounded-2xl py-2.5 px-4 flex items-center justify-between transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Eye size={16} className="text-zinc-400" />
                <span className="text-xs font-bold">Seen by {viewersList.length}</span>
              </div>
              <div className="flex -space-x-2">
                {viewersList.slice(0, 3).map((v) => (
                  <img
                    key={v.id}
                    src={v.user?.profile_pic || "https://i.pravatar.cc/150"}
                    alt=""
                    className="w-6 h-6 rounded-full object-cover border border-black"
                  />
                ))}
              </div>
            </button>
          ) : (
            <div className="space-y-2">
              {/* Quick Emoji Reactions */}
              <div className="flex items-center justify-around bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl py-1.5 px-3">
                {EMOJI_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleEmojiClick(emoji)}
                    className="text-xl hover:scale-125 transition cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Reply Form Input */}
              <form onSubmit={handleSendReply} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={`Reply to ${activeUserGroup.user?.username}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 bg-black/60 backdrop-blur-md border border-white/20 rounded-full px-4 py-2.5 text-xs text-white placeholder-white/60 focus:outline-none focus:border-white transition"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim()}
                  className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-full transition cursor-pointer"
                >
                  <Send size={14} />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Side Arrow Navigation Buttons for Desktop */}
      <button
        onClick={prevStory}
        disabled={activeUserIndex === 0 && activeStoryIndex === 0}
        className="hidden md:flex absolute left-8 top-1/2 -translate-y-1/2 p-3 bg-zinc-900/80 hover:bg-zinc-800 disabled:opacity-20 text-white rounded-full transition cursor-pointer border border-zinc-800"
      >
        <ChevronLeft size={24} />
      </button>

      <button
        onClick={nextStory}
        className="hidden md:flex absolute right-8 top-1/2 -translate-y-1/2 p-3 bg-zinc-900/80 hover:bg-zinc-800 text-white rounded-full transition cursor-pointer border border-zinc-800"
      >
        <ChevronRight size={24} />
      </button>

      {/* Viewers Drawer */}
      <StoryViewersDrawer
        isOpen={isViewersDrawerOpen}
        onClose={() => setViewersDrawerOpen(false)}
        viewers={viewersList}
      />
    </div>
  );
};

export default StoryViewerModal;
