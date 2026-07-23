import React, { useState, useRef } from "react";
import { X, Upload, Image as ImageIcon, Film, Loader2, Lock, Globe, Users } from "lucide-react";
import { useStoryStore } from "../../store/storyStore";
import toast from "react-hot-toast";
import api from "../../services/api";

const StoryUploadModal = ({ isOpen, onClose }) => {
  const uploadStory = useStoryStore((state) => state.uploadStory);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [mediaType, setMediaType] = useState("image");
  const [caption, setCaption] = useState("");
  const [privacy, setPrivacy] = useState("followers");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileSelect = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    if (selected.type.startsWith("image/")) {
      setMediaType("image");
    } else if (selected.type.startsWith("video/")) {
      setMediaType("video");
    } else {
      toast.error("Please select a valid image or video file.");
      return;
    }

    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || isSubmitting) return;

    setIsSubmitting(true);
    const loadingToast = toast.loading("Uploading story...");

    try {
      // Upload file via FormData
      const formData = new FormData();
      formData.append("file", file);

      const res = await api.post("/posts/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const mediaUrl = res.data.mediaUrl || res.data.url;

      if (!mediaUrl) {
        throw new Error("Failed to get uploaded media URL");
      }

      const success = await uploadStory({
        mediaUrl,
        mediaType,
        caption,
        privacy,
      });

      toast.dismiss(loadingToast);
      if (success) {
        setFile(null);
        setPreviewUrl("");
        setCaption("");
        onClose();
      }
    } catch (err) {
      console.error(err);
      toast.dismiss(loadingToast);
      toast.error(err.response?.data?.message || "Failed to upload story.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fade-in">
      <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden flex flex-col shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-900">
          <h3 className="font-bold text-base text-white">Create Story</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-900 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleUpload} className="p-5 space-y-4">
          {/* Media Preview Box */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="relative w-full h-72 bg-zinc-900 border-2 border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-zinc-700 transition overflow-hidden group"
          >
            {previewUrl ? (
              mediaType === "image" ? (
                <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
              ) : (
                <video src={previewUrl} controls className="w-full h-full object-contain" />
              )
            ) : (
              <div className="text-center p-6 space-y-2">
                <div className="w-14 h-14 bg-zinc-800/80 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition">
                  <Upload size={24} className="text-zinc-300" />
                </div>
                <p className="text-sm font-semibold text-zinc-300">Select Image or Video Story</p>
                <p className="text-xs text-zinc-500">Supports JPG, PNG, WEBP, MP4, MOV</p>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*,video/*"
              className="hidden"
            />
          </div>

          {/* Caption Input */}
          <input
            type="text"
            placeholder="Add a caption..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700 transition"
          />

          {/* Privacy Select */}
          <div className="flex items-center justify-between bg-zinc-900/40 border border-zinc-850 rounded-xl px-4 py-2 text-xs">
            <span className="text-zinc-400 font-semibold">Story Audience</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPrivacy("followers")}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer transition ${
                  privacy === "followers" ? "bg-blue-600 text-white font-bold" : "bg-zinc-800 text-zinc-400"
                }`}
              >
                <Users size={12} />
                <span>Followers</span>
              </button>
              <button
                type="button"
                onClick={() => setPrivacy("close_friends")}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer transition ${
                  privacy === "close_friends" ? "bg-emerald-600 text-white font-bold" : "bg-zinc-800 text-zinc-400"
                }`}
              >
                <Lock size={12} />
                <span>Close Friends</span>
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!file || isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Sharing Story...</span>
              </>
            ) : (
              <span>Share to Story</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default StoryUploadModal;
