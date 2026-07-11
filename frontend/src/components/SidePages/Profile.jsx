import React, { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { useChatStore } from "../../store/chatStore";
import { ProfileSkeleton } from "../Skeletons";
import { Grid, Heart, MessageCircle, UserCheck, UserPlus, Settings, X, Edit3, Bookmark, Share2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api";
import { useFeedStore } from "../../store/feedStore";

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

const Profile = () => {
  const { userId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);
  const updateUserProfileLocally = useAuthStore((state) => state.updateUserProfileLocally);
  const selectChat = useChatStore((state) => state.selectChat);

  // States
  const [profileUser, setProfileUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [stats, setStats] = useState({ followers: 0, following: 0 });
  const [isFollowingState, setIsFollowingState] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Follow list modals
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followersList, setFollowersList] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [isLoadingFollowList, setIsLoadingFollowList] = useState(false);

  // Edit Profile modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editBio, setEditBio] = useState("");
  const [editName, setEditName] = useState("");
  const [editPic, setEditPic] = useState("");

  // Post View Modal State
  const [selectedPost, setSelectedPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [activeTab, setActiveTab] = useState("posts");

  const { savedPostIds, savePost, fetchSavedPostIds } = useFeedStore();


  const isMe = !userId || Number(userId) === Number(currentUser?.id) || userId === "me";
  const targetUserId = isMe ? currentUser?.id : Number(userId);

  // Retrieve username and profile pic from route state if available (for other users)
  const { username, profile_pic, bio, name } = location.state || {};

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!targetUserId) return;
      setIsLoading(true);
      try {
        // 1. Fetch user posts
        const postsRes = await api.get(`/posts/user/${targetUserId}`);
        setPosts(postsRes.data.posts || []);

        // 2. Fetch stats
        const statsRes = await api.get(`/follow/count/${targetUserId}`);
        setStats({
          followers: Number(statsRes.data.followers || 0),
          following: Number(statsRes.data.following || 0),
        });

        // 3. Resolve user details
        if (isMe) {
          setProfileUser(currentUser);
        } else {
          // Find details from state or set a fallback matching post info
          const firstPost = postsRes.data.posts?.[0] || {};
          setProfileUser({
            id: targetUserId,
            username: username || firstPost.username || `user_${targetUserId}`,
            profile_pic: profile_pic || firstPost.profile_pic || "https://i.pravatar.cc/150",
            bio: bio || "No bio yet.",
            name: name || null,
          });

          // Check if logged in user follows this user
          const followingRes = await api.get(`/follow/following/${currentUser.id}`);
          const followingUsers = followingRes.data.following || [];
          const isFollowingUser = followingUsers.some((u) => Number(u.id) === Number(targetUserId));
          setIsFollowingState(isFollowingUser);
        }
      } catch (err) {
        console.error("Failed to load profile data:", err);
        toast.error("Failed to load profile data.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileData();
    fetchSavedPostIds();
  }, [targetUserId, isMe, currentUser?.id, username, profile_pic, bio, name, fetchSavedPostIds]);

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
      const res = await api.post(`/comments/${selectedPost.id}`, { comment: commentText });
      if (res.data.success) {
        setComments((prev) => [...prev, res.data.comment]);
        setCommentText("");
        // Update local state posts count
        setPosts((prev) =>
          prev.map((p) =>
            p.id === selectedPost.id
              ? { ...p, comments_count: parseInt(p.comments_count) + 1 }
              : p
          )
        );
        setSelectedPost((prev) => ({
          ...prev,
          comments_count: parseInt(prev.comments_count) + 1,
        }));
        toast.success("Comment added!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to add comment.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleLikePostInModal = async (postId) => {
    try {
      const isLikedNow = !selectedPost.is_liked;
      setSelectedPost((prev) => ({
        ...prev,
        is_liked: isLikedNow,
        likes_count: isLikedNow
          ? parseInt(prev.likes_count) + 1
          : parseInt(prev.likes_count) - 1,
      }));
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                is_liked: isLikedNow,
                likes_count: isLikedNow
                  ? parseInt(p.likes_count) + 1
                  : parseInt(p.likes_count) - 1,
              }
            : p
        )
      );

      await api.post(`/likes/${postId}`);
    } catch (err) {
      console.error("Failed to toggle like:", err);
    }
  };


  // Load followers list
  const loadFollowers = async () => {
    setShowFollowersModal(true);
    setIsLoadingFollowList(true);
    try {
      const res = await api.get(`/follow/followers/${targetUserId}`);
      setFollowersList(res.data.followers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingFollowList(false);
    }
  };

  // Load following list
  const loadFollowing = async () => {
    setShowFollowingModal(true);
    setIsLoadingFollowList(true);
    try {
      const res = await api.get(`/follow/following/${targetUserId}`);
      setFollowingList(res.data.following || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingFollowList(false);
    }
  };

  const handleFollowToggle = async () => {
    try {
      if (isFollowingState) {
        await api.delete(`/follow/${targetUserId}`);
        setIsFollowingState(false);
        setStats((prev) => ({ ...prev, followers: prev.followers - 1 }));
        toast.success("Unfollowed user");
      } else {
        await api.post(`/follow/${targetUserId}`);
        setIsFollowingState(true);
        setStats((prev) => ({ ...prev, followers: prev.followers + 1 }));
        toast.success("Followed user!");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Action failed");
    }
  };

  const handleMessageUser = async () => {
    const loadingToast = toast.loading("Opening chat...");
    try {
      const res = await api.post("/chats", { receiverId: targetUserId });
      const activeChat = res.data.chat;
      selectChat(activeChat);
      toast.dismiss(loadingToast);
      navigate("/Message");
    } catch (err) {
      toast.dismiss(loadingToast);
      console.error(err);
      toast.error("Could not initiate chat.");
    }
  };

  // Open Edit Profile modal
  const openEditProfile = () => {
    setEditBio(currentUser.bio || "");
    setEditName(currentUser.name || "");
    setEditPic(currentUser.profile_pic || "");
    setShowEditModal(true);
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    updateUserProfileLocally({
      bio: editBio,
      name: editName,
      profile_pic: editPic || "https://i.pravatar.cc/150",
    });
    setProfileUser((prev) => ({
      ...prev,
      bio: editBio,
      name: editName,
      profile_pic: editPic || "https://i.pravatar.cc/150",
    }));
    setShowEditModal(false);
    toast.success("Profile details updated locally!");
  };

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="w-full max-w-4xl mx-auto py-10 px-4 text-white overflow-y-auto relative">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out forwards;
        }
        .animate-scale-in {
          animation: scaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>

      {/* Ambient glow behind profile header */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-64 bg-gradient-to-b from-purple-900/10 via-blue-900/5 to-transparent blur-3xl pointer-events-none rounded-full" />

      {/* Profile Header Details */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8 sm:gap-16 border-b border-zinc-900/80 pb-10 mb-8 relative z-10">
        
        {/* Profile picture with subtle low-saturation gradient ring */}
        <div className="relative flex-shrink-0 group">
          <div className="absolute inset-0 bg-gradient-to-tr from-purple-950/40 via-zinc-800 to-blue-950/40 rounded-full p-[3px] transition duration-500 group-hover:rotate-180 pointer-events-none" />
          <img
            src={profileUser?.profile_pic || "https://i.pravatar.cc/150"}
            alt="Profile Avatar"
            className="w-32 h-32 sm:w-36 sm:h-36 rounded-full object-cover p-1 bg-black relative z-10 transition duration-300 group-hover:scale-98"
          />
        </div>

        <div className="space-y-5 flex-1 text-center sm:text-left">
          {/* Top Info Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <h2 className="text-2xl font-extrabold tracking-tight text-white">{profileUser?.name || profileUser?.username}</h2>
            <div className="flex items-center gap-2">
              {isMe ? (
                <>
                  <button
                    onClick={openEditProfile}
                    className="px-5 py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white rounded-full text-xs font-bold transition duration-300 hover:scale-105 active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-md hover:shadow-zinc-900/50"
                  >
                    <Edit3 size={13} />
                    <span>Edit Profile</span>
                  </button>
                  <button className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white rounded-full transition duration-300 hover:scale-105 active:scale-95 shadow-md">
                    <Settings size={14} className="hover:rotate-45 transition duration-300" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleFollowToggle}
                    className={`px-6 py-1.5 rounded-full text-xs font-bold transition duration-300 hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-md ${
                      isFollowingState
                        ? "bg-zinc-850 border border-zinc-800 text-white hover:bg-zinc-800"
                        : "bg-blue-600 hover:bg-blue-500 text-white hover:shadow-blue-900/30"
                    }`}
                  >
                    {isFollowingState ? (
                      <>
                        <UserCheck size={13} />
                        <span>Following</span>
                      </>
                    ) : (
                      <>
                        <UserPlus size={13} />
                        <span>Follow</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      if (!isFollowingState) {
                        toast.error("Follow this user to start messaging.");
                      } else {
                        handleMessageUser();
                      }
                    }}
                    className={`px-5 py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-full text-xs font-bold transition duration-300 hover:scale-105 active:scale-95 ${
                      !isFollowingState ? "opacity-40 cursor-not-allowed" : "cursor-pointer shadow-md"
                    }`}
                    title={!isFollowingState ? "Follow this user to start messaging." : ""}
                  >
                    Message
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Followers Stats - stacked vertically, distributed evenly */}
          <div className="flex justify-center sm:justify-start items-center gap-10 py-2 border-t border-b border-zinc-900/40 sm:border-none">
            <div className="flex flex-col items-center sm:items-start">
              <span className="text-lg font-extrabold text-white leading-none">{posts.length}</span>
              <span className="text-[11px] font-semibold tracking-wider text-zinc-500 uppercase mt-1">posts</span>
            </div>
            <div onClick={loadFollowers} className="flex flex-col items-center sm:items-start cursor-pointer group">
              <span className="text-lg font-extrabold text-white leading-none group-hover:text-blue-400 transition duration-300">{stats.followers}</span>
              <span className="text-[11px] font-semibold tracking-wider text-zinc-500 uppercase mt-1">followers</span>
            </div>
            <div onClick={loadFollowing} className="flex flex-col items-center sm:items-start cursor-pointer group">
              <span className="text-lg font-extrabold text-white leading-none group-hover:text-blue-400 transition duration-300">{stats.following}</span>
              <span className="text-[11px] font-semibold tracking-wider text-zinc-500 uppercase mt-1">following</span>
            </div>
          </div>

          {/* User Bio Details */}
          <div className="space-y-1">
            <h1 className="font-extrabold text-sm text-zinc-200">@{profileUser?.username}</h1>
            <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">{profileUser?.bio || "No bio yet."}</p>
          </div>
        </div>
      </div>

      {/* Tabs Container with sliding underline transition */}
      <div className="border-t border-zinc-900 flex justify-center mb-8 relative z-10">
        <div className="flex gap-12 relative -mt-[1px]">
          <button
            onClick={() => setActiveTab("posts")}
            className={`flex items-center gap-2 py-4 text-xs font-bold tracking-widest transition duration-300 relative ${
              activeTab === "posts" ? "text-white" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Grid size={14} />
            <span>POSTS</span>
          </button>
          
          {isMe && (
            <button
              onClick={() => setActiveTab("saved")}
              className={`flex items-center gap-2 py-4 text-xs font-bold tracking-widest transition duration-300 relative ${
                activeTab === "saved" ? "text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Bookmark size={14} />
              <span>SAVED</span>
            </button>
          )}

          {/* Underline indicator */}
          {isMe && (
            <div
              className="absolute top-0 h-[1.5px] bg-white transition-all duration-300 ease-out"
              style={{
                width: "70px",
                left: activeTab === "posts" ? "0px" : "118px",
              }}
            />
          )}
          {!isMe && (
            <div className="absolute top-0 h-[1.5px] bg-white w-[70px] left-0" />
          )}
        </div>
      </div>

      {/* User Post Images Grid */}
      {posts.length === 0 ? (
        <div className="text-center py-20 border border-zinc-900 bg-zinc-950/20 rounded-2xl p-8 relative z-10">
          <Grid className="mx-auto text-zinc-700 mb-3" size={40} />
          <h3 className="text-md font-bold text-zinc-300">No Posts Yet</h3>
          <p className="text-zinc-500 text-xs mt-1">When this user shares photos, they will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:gap-6 relative z-10">
          {posts.map((post) => (
            <div
              key={post.id}
              onClick={() => openComments(post)}
              className="aspect-square bg-zinc-900 relative group overflow-hidden rounded-xl border border-zinc-950 cursor-pointer shadow-lg hover:shadow-zinc-950/50 transition duration-300"
            >
              <img
                src={post.media_url}
                alt="Post media"
                className="w-full h-full object-cover transition duration-500 ease-out group-hover:scale-105"
              />
              {/* Overlay hover details */}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300 ease-out backdrop-blur-[2px]">
                <div className="flex gap-8 text-white text-base font-extrabold transform translate-y-2 group-hover:translate-y-0 transition duration-300 ease-out">
                  <span className="flex items-center gap-2">
                    <Heart size={18} className="fill-white text-white" />
                    <span>{post.likes_count || 0}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <MessageCircle size={18} className="fill-white text-white" />
                    <span>{post.comments_count || 0}</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}


      {/* FOLLOWERS LIST MODAL */}
      {showFollowersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#18181b] border border-zinc-800 rounded-2xl w-full max-w-sm overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-zinc-850">
              <h3 className="font-bold text-md">Followers</h3>
              <button onClick={() => setShowFollowersModal(false)} className="text-zinc-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-4 max-h-72 overflow-y-auto space-y-3">
              {isLoadingFollowList ? (
                <p className="text-zinc-500 text-xs text-center py-4">Loading list...</p>
              ) : followersList.length === 0 ? (
                <p className="text-zinc-500 text-xs text-center py-4">No followers yet.</p>
              ) : (
                followersList.map((f) => (
                  <div key={f.id} onClick={() => { setShowFollowersModal(false); navigate(`/profile/${f.id}`, { state: f }); }} className="flex items-center gap-3 cursor-pointer hover:bg-zinc-900 p-2 rounded-xl">
                    <img src={f.profile_pic || "https://i.pravatar.cc/150"} alt={f.username} className="w-9 h-9 rounded-full object-cover" />
                    <span className="text-sm font-semibold">{f.username}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* FOLLOWING LIST MODAL */}
      {showFollowingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#18181b] border border-zinc-800 rounded-2xl w-full max-w-sm overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-zinc-850">
              <h3 className="font-bold text-md">Following</h3>
              <button onClick={() => setShowFollowingModal(false)} className="text-zinc-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-4 max-h-72 overflow-y-auto space-y-3">
              {isLoadingFollowList ? (
                <p className="text-zinc-500 text-xs text-center py-4">Loading list...</p>
              ) : followingList.length === 0 ? (
                <p className="text-zinc-500 text-xs text-center py-4">Not following anyone yet.</p>
              ) : (
                followingList.map((f) => (
                  <div key={f.id} onClick={() => { setShowFollowingModal(false); navigate(`/profile/${f.id}`, { state: f }); }} className="flex items-center gap-3 cursor-pointer hover:bg-zinc-900 p-2 rounded-xl">
                    <img src={f.profile_pic || "https://i.pravatar.cc/150"} alt={f.username} className="w-9 h-9 rounded-full object-cover" />
                    <span className="text-sm font-semibold">{f.username}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#18181b] border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-zinc-850">
              <h3 className="font-bold text-md">Edit Profile Details</h3>
              <button onClick={() => setShowEditModal(false)} className="text-zinc-400 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Display Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-11 px-3 bg-zinc-900 border border-zinc-800 rounded-xl outline-none focus:border-zinc-700 text-sm"
                  placeholder="Your Name"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-500 block mb-1">Profile Photo URL</label>
                <input
                  type="text"
                  value={editPic}
                  onChange={(e) => setEditPic(e.target.value)}
                  className="w-full h-11 px-3 bg-zinc-900 border border-zinc-800 rounded-xl outline-none focus:border-zinc-700 text-sm"
                  placeholder="URL to profile image"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-500 block mb-1">Bio</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full h-24 p-3 bg-zinc-900 border border-zinc-800 rounded-xl outline-none focus:border-zinc-700 text-sm resize-none"
                  placeholder="Tell us about yourself..."
                />
              </div>

            </form>
          </div>
        </div>
      )}

      {/* POST DETAILS MODAL (Instagram-style two-column design) */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/75 backdrop-blur-md transition-all duration-300 ease-out animate-fade-in">
          {/* Close button outside/overlapping */}
          <button
            onClick={() => setSelectedPost(null)}
            className="absolute top-4 right-4 md:top-6 md:right-6 text-zinc-400 hover:text-white transition duration-300 p-2 hover:bg-zinc-900/60 rounded-full cursor-pointer z-50"
          >
            <X size={24} />
          </button>

          {/* Modal Container */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-5xl h-[85vh] md:h-[80vh] overflow-hidden flex flex-col md:flex-row shadow-2xl animate-scale-in">
            
            {/* Left Column: Media Container */}
            <div className="flex-1 bg-black flex items-center justify-center relative max-h-[45vh] md:max-h-full overflow-hidden border-b md:border-b-0 md:border-r border-zinc-900">
              <img
                src={selectedPost.media_url}
                alt="Post Media"
                className="w-full h-full object-contain max-h-[45vh] md:max-h-full"
              />
            </div>

            {/* Right Column: Sidebar details */}
            <div className="w-full md:w-[420px] flex flex-col h-full bg-zinc-950">
              
              {/* Sidebar Header */}
              <div className="flex items-center justify-between p-4 border-b border-zinc-900 bg-zinc-950">
                <div className="flex items-center gap-3">
                  <div className="relative p-[1.5px] bg-gradient-to-tr from-purple-900/40 to-blue-900/40 rounded-full">
                    <img
                      src={profileUser?.profile_pic || "https://i.pravatar.cc/150"}
                      alt={profileUser?.username}
                      className="w-8 h-8 rounded-full object-cover border border-black"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm hover:text-blue-400 transition cursor-pointer">
                      {profileUser?.username}
                    </span>
                    {selectedPost.location && (
                      <span className="text-[10px] text-zinc-500 font-medium">
                        {selectedPost.location}
                      </span>
                    )}
                  </div>
                </div>
                
                <button className="text-zinc-400 hover:text-white transition duration-300 p-1.5 hover:bg-zinc-900 rounded-full">
                  <Settings size={16} />
                </button>
              </div>

              {/* Sidebar Comments Scroller */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800">
                {/* Author's original caption */}
                <div className="flex items-start gap-3">
                  <img
                    src={profileUser?.profile_pic || "https://i.pravatar.cc/150"}
                    alt={profileUser?.username}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-zinc-900"
                  />
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-extrabold text-white mr-2 hover:text-blue-400 transition cursor-pointer">
                        {profileUser?.username}
                      </span>
                      <span className="text-zinc-300 leading-relaxed">{selectedPost.caption}</span>
                    </p>
                    <span className="text-[10px] text-zinc-500 mt-2 block font-semibold uppercase tracking-wider">
                      {formatTimeAgo(selectedPost.created_at)}
                    </span>
                  </div>
                </div>

                <div className="border-t border-zinc-900/80 my-3" />

                {/* Loading / List comments */}
                {isLoadingComments ? (
                  <div className="space-y-4 py-2">
                    <div className="flex gap-3 items-center">
                      <div className="w-8 h-8 rounded-full bg-zinc-900 animate-pulse" />
                      <div className="h-4 bg-zinc-900 rounded w-2/3 animate-pulse" />
                    </div>
                    <div className="flex gap-3 items-center">
                      <div className="w-8 h-8 rounded-full bg-zinc-900 animate-pulse" />
                      <div className="h-4 bg-zinc-900 rounded w-1/2 animate-pulse" />
                    </div>
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-10">
                    <MessageCircle size={32} className="mx-auto text-zinc-700 mb-2" />
                    <p className="text-zinc-500 text-xs">No comments yet. Start the conversation!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex items-start gap-3 group">
                        <img
                          src={comment.profile_pic || "https://i.pravatar.cc/150"}
                          alt={comment.username}
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-zinc-900"
                        />
                        <div className="flex-1">
                          <p className="text-sm">
                            <span className="font-extrabold text-white mr-2 hover:text-blue-400 transition cursor-pointer">
                              {comment.username}
                            </span>
                            <span className="text-zinc-300 leading-relaxed">{comment.comment}</span>
                          </p>
                          <span className="text-[10px] text-zinc-500 mt-1 block font-semibold uppercase tracking-wider">
                            {formatTimeAgo(comment.created_at)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sidebar Divider */}
              <div className="border-t border-zinc-900/80" />

              {/* Actions Row */}
              <div className="p-4 bg-zinc-950 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex gap-4">
                    <button
                      onClick={() => handleLikePostInModal(selectedPost.id)}
                      className="hover:scale-110 active:scale-95 transition duration-300 cursor-pointer"
                    >
                      {selectedPost.is_liked ? (
                        <Heart size={24} className="fill-red-500 text-red-500 filter drop-shadow-[0_0_4px_rgba(239,68,68,0.3)]" />
                      ) : (
                        <Heart size={24} className="hover:text-zinc-400 text-white transition duration-300" />
                      )}
                    </button>

                    <button className="hover:scale-110 hover:text-zinc-400 active:scale-95 transition duration-300 cursor-pointer">
                      <MessageCircle size={24} />
                    </button>

                    <button className="hover:scale-110 hover:text-zinc-400 active:scale-95 transition duration-300 cursor-pointer">
                      <Share2 size={24} />
                    </button>
                  </div>

                  <button
                    onClick={() => savePost(selectedPost.id)}
                    className="hover:scale-110 active:scale-95 transition duration-300 cursor-pointer"
                  >
                    <Bookmark
                      size={24}
                      className={savedPostIds.has(selectedPost.id) ? "fill-white text-white" : "text-white hover:text-zinc-400 transition duration-300"}
                    />
                  </button>
                </div>

                {/* Likes count & Timestamp */}
                <div className="space-y-1">
                  <p className="text-sm font-extrabold text-white">
                    {selectedPost.likes_count} likes
                  </p>
                  <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
                    {formatTimeAgo(selectedPost.created_at)}
                  </p>
                </div>
              </div>

              {/* Comment Input Footer */}
              <form onSubmit={handleSendComment} className="border-t border-zinc-900 p-4 bg-zinc-950">
                <div className="flex items-center bg-zinc-900/60 rounded-xl px-4 py-2 border border-zinc-800/80 focus-within:border-zinc-700/80 focus-within:bg-zinc-900 transition duration-300">
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-500 text-white"
                    disabled={isSubmittingComment}
                  />
                  <button
                    type="submit"
                    disabled={!commentText.trim() || isSubmittingComment}
                    className="text-blue-500 hover:text-blue-400 font-bold text-sm ml-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition duration-300"
                  >
                    {isSubmittingComment ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <span>Post</span>
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

export default Profile;
