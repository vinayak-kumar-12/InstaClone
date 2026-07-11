import React, { useState, useRef } from "react";
import { FiHome, FiPlusSquare } from "react-icons/fi";
import { RxVideo } from "react-icons/rx";
import { TbLocationShare } from "react-icons/tb";
import { IoSearchOutline } from "react-icons/io5";
import { FaRegHeart, FaHeart } from "react-icons/fa6";
import { CgProfile as ProfileIcon } from "react-icons/cg";
import { CiSettings } from "react-icons/ci";
import { TbBlocks } from "react-icons/tb";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { useFeedStore } from "../../store/feedStore";
import { Loader2, Image, MapPin, X } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api";

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const logoutAction = useAuthStore((state) => state.logoutAction);
  const currentUser = useAuthStore((state) => state.user);
  const fetchFeed = useFeedStore((state) => state.fetchFeed);

  // Create Post Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [caption, setCaption] = useState("");
  const [postLocation, setPostLocation] = useState("");
  const [postType, setPostType] = useState("post"); // post or reel
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const handleLogout = async () => {
    const loadingToast = toast.loading("Logging out...");
    await logoutAction();
    toast.dismiss(loadingToast);
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file.");
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!imageFile) {
      toast.error("Please select an image to upload.");
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("caption", caption);
    formData.append("post_type", postType);
    if (postLocation) {
      formData.append("location", postLocation);
    }

    try {
      await api.post("/posts", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success(`${postType === "reel" ? "Reel" : "Post"} uploaded successfully!`);
      setIsCreateOpen(false);
      // Reset form
      setImageFile(null);
      setImagePreview("");
      setCaption("");
      setPostLocation("");
      setPostType("post");
      
      // Refresh home feed
      fetchFeed(true);
      navigate("/home");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to create post.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Sidebar Container */}
      <div className="w-72 h-full border-r border-zinc-800 bg-black text-white flex flex-col justify-between py-8 px-5 select-none flex-shrink-0">
        <div>
          {/* Logo */}
          <Link to="/home" className="flex items-center gap-3 mb-10 px-3">
            <img
              src="/Images/insta.png"
              alt="Instagram"
              className="w-8 h-8"
            />
            <span className="text-xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
              Instagram
            </span>
          </Link>

          {/* Nav Items */}
          <div className="space-y-2">
            <Link
              to="/home"
              className={`flex items-center gap-4 p-3.5 rounded-xl hover:bg-zinc-900 cursor-pointer transition ${
                location.pathname === "/home" ? "bg-zinc-900 font-bold" : "text-zinc-300"
              }`}
            >
              <FiHome size={22} />
              <span className="text-md">Home</span>
            </Link>

            <Link
              to="/Search"
              className={`flex items-center gap-4 p-3.5 rounded-xl hover:bg-zinc-900 cursor-pointer transition ${
                location.pathname === "/Search" ? "bg-zinc-900 font-bold" : "text-zinc-300"
              }`}
            >
              <IoSearchOutline size={22} />
              <span className="text-md">Search</span>
            </Link>

            <Link
              to="/Message"
              className={`flex items-center gap-4 p-3.5 rounded-xl hover:bg-zinc-900 cursor-pointer transition ${
                location.pathname === "/Message" ? "bg-zinc-900 font-bold" : "text-zinc-300"
              }`}
            >
              <TbLocationShare size={22} />
              <span className="text-md">Messages</span>
            </Link>

            <Link
              to="/Reels"
              className={`flex items-center gap-4 p-3.5 rounded-xl hover:bg-zinc-900 cursor-pointer transition ${
                location.pathname === "/Reels" ? "bg-zinc-900 font-bold" : "text-zinc-300"
              }`}
            >
              <RxVideo size={22} />
              <span className="text-md">Reels</span>
            </Link>

            <Link
              to="/Notification"
              className={`flex items-center gap-4 p-3.5 rounded-xl hover:bg-zinc-900 cursor-pointer transition ${
                location.pathname === "/Notification" ? "bg-zinc-900 font-bold" : "text-zinc-300"
              }`}
            >
              <FaRegHeart size={22} />
              <span className="text-md">Notifications</span>
            </Link>

            {/* Create Post Action */}
            <div
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-4 p-3.5 rounded-xl hover:bg-zinc-900 cursor-pointer transition text-zinc-300"
            >
              <FiPlusSquare size={22} />
              <span className="text-md">Create</span>
            </div>

            {/* Profile Navigation */}
            <Link
              to={`/profile/${currentUser?.id || "me"}`}
              className={`flex items-center gap-4 p-3.5 rounded-xl hover:bg-zinc-900 cursor-pointer transition ${
                location.pathname.startsWith("/profile") ? "bg-zinc-900 font-bold" : "text-zinc-300"
              }`}
            >
              {currentUser?.profile_pic ? (
                <img
                  src={currentUser.profile_pic}
                  alt="Avatar"
                  className="w-6 h-6 rounded-full object-cover border border-zinc-700"
                />
              ) : (
                <ProfileIcon size={22} />
              )}
              <span className="text-md">Profile</span>
            </Link>

            <Link
              to="/Setting"
              className={`flex items-center gap-4 p-3.5 rounded-xl hover:bg-zinc-900 cursor-pointer transition ${
                location.pathname === "/Setting" ? "bg-zinc-900 font-bold" : "text-zinc-300"
              }`}
            >
              <CiSettings size={22} />
              <span className="text-md">Settings</span>
            </Link>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="space-y-2 border-t border-zinc-900 pt-4">
          <div
            onClick={handleLogout}
            className="flex items-center gap-4 p-3.5 rounded-xl hover:bg-red-950/20 text-red-400 hover:text-red-300 cursor-pointer transition"
          >
            <TbBlocks size={22} className="rotate-180" />
            <span className="text-md">Logout</span>
          </div>
        </div>
      </div>

      {/* CREATE POST MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#18181b] border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-850">
              <h2 className="text-lg font-bold">Create new post</h2>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-zinc-400 hover:text-white transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreatePost} className="flex-1 flex flex-col md:flex-row overflow-y-auto">
              {/* Media Preview Box */}
              <div className="flex-1 min-h-[300px] bg-zinc-950 flex flex-col items-center justify-center border-r border-zinc-800 p-6 relative">
                {imagePreview ? (
                  <>
                    <img
                      src={imagePreview}
                      alt="Upload Preview"
                      className="max-h-[350px] max-w-full object-contain rounded"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview("");
                      }}
                      className="absolute top-4 right-4 bg-black/60 p-1.5 rounded-full hover:bg-black/85 transition"
                    >
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-3 cursor-pointer text-zinc-400 hover:text-zinc-300 transition"
                  >
                    <Image size={48} className="stroke-[1.2]" />
                    <p className="text-sm font-semibold">Select from computer</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                )}
              </div>

              {/* Form Input Options */}
              <div className="w-full md:w-72 p-6 flex flex-col gap-5 justify-between">
                <div className="space-y-4">
                  {/* User Profile Info */}
                  <div className="flex items-center gap-3">
                    <img
                      src={currentUser?.profile_pic || "https://i.pravatar.cc/150"}
                      alt="Avatar"
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <span className="font-semibold text-sm">{currentUser?.username}</span>
                  </div>

                  {/* Caption Input */}
                  <textarea
                    placeholder="Write a caption..."
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="w-full h-24 bg-transparent text-sm resize-none outline-none border border-zinc-800 rounded-xl p-3 focus:border-zinc-700 transition"
                    maxLength={2200}
                  />

                  {/* Location Input */}
                  <div className="flex items-center gap-2 border border-zinc-800 rounded-xl px-3 py-2 bg-zinc-900/20">
                    <MapPin size={16} className="text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Add location"
                      value={postLocation}
                      onChange={(e) => setPostLocation(e.target.value)}
                      className="bg-transparent text-sm outline-none w-full"
                    />
                  </div>

                  {/* Post Type Selector */}
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
                      <input
                        type="radio"
                        name="postType"
                        value="post"
                        checked={postType === "post"}
                        onChange={() => setPostType("post")}
                        className="accent-blue-500"
                      />
                      <span>Post</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
                      <input
                        type="radio"
                        name="postType"
                        value="reel"
                        checked={postType === "reel"}
                        onChange={() => setPostType("reel")}
                        className="accent-blue-500"
                      />
                      <span>Reel</span>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !imageFile}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Sharing...</span>
                    </>
                  ) : (
                    <span>Share</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
