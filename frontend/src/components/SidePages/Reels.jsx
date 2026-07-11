import React, { useEffect, useState } from "react";
import { Music, Heart, MessageCircle, Share2, Volume2 } from "lucide-react";
import api from "../../services/api";
import { FeedSkeleton } from "../Skeletons";
import toast from "react-hot-toast";

const Reels = () => {
  const [reels, setReels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [likedMap, setLikedMap] = useState({});

  useEffect(() => {
    const fetchReels = async () => {
      setIsLoading(true);
      try {
        const res = await api.get("/posts/reels");
        setReels(res.data.reels || []);
      } catch (err) {
        console.error("Failed to load reels:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReels();
  }, []);

  const handleLikeToggle = (reelId) => {
    setLikedMap((prev) => ({
      ...prev,
      [reelId]: !prev[reelId],
    }));
    toast.success("Reel liked!");
  };

  if (isLoading) {
    return (
      <div className="w-full flex justify-center py-10 text-white">
        <div className="w-full max-w-[360px] space-y-4">
          <FeedSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen overflow-y-scroll snap-y snap-mandatory bg-black text-white flex justify-center scrollbar-none">
      {reels.length === 0 ? (
        <div className="self-center text-center p-8 text-zinc-500">
          <h3 className="font-bold text-lg text-zinc-400">No Reels Available</h3>
          <p className="text-xs mt-1">Upload a post with post_type set to "reel" to see it here.</p>
        </div>
      ) : (
        <div className="w-full max-w-[380px] h-full flex flex-col space-y-4 py-6">
          {reels.map((reel) => {
            const isLiked = likedMap[reel.id];
            return (
              <div
                key={reel.id}
                className="w-full aspect-[9/16] bg-zinc-950 rounded-2xl relative overflow-hidden snap-start flex-shrink-0 shadow-2xl border border-zinc-900"
              >
                {/* Media Image Backdrop */}
                <img
                  src={reel.media_url}
                  alt="Reel Media"
                  className="w-full h-full object-cover select-none"
                />

                {/* Bottom Overlay Info */}
                <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex justify-between items-end">
                  <div className="space-y-3 flex-1 min-w-0 pr-4">
                    {/* User profile */}
                    <div className="flex items-center gap-2">
                      <img
                        src="https://i.pravatar.cc/150?img=12"
                        className="w-8 h-8 rounded-full border border-white/20"
                        alt="creator"
                      />
                      <span className="text-sm font-bold truncate">creator_{reel.user_id}</span>
                      <button className="text-xs font-semibold border border-white/40 px-2 py-0.5 rounded hover:bg-white/10 transition">
                        Follow
                      </button>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-zinc-200 line-clamp-2">{reel.caption}</p>

                    {/* Music track */}
                    <div className="flex items-center gap-2 text-[10px] text-zinc-300 bg-black/40 rounded-full py-1 px-3 w-fit">
                      <Music size={10} className="animate-spin" style={{ animationDuration: "3s" }} />
                      <span className="truncate max-w-[120px]">Original Audio - creator_{reel.user_id}</span>
                    </div>
                  </div>

                  {/* Side Controls */}
                  <div className="flex flex-col items-center gap-4 text-white">
                    <button
                      onClick={() => handleLikeToggle(reel.id)}
                      className="flex flex-col items-center gap-1 group"
                    >
                      <Heart
                        size={24}
                        className={`transition group-active:scale-125 ${
                          isLiked ? "fill-red-500 text-red-500" : "text-white"
                        }`}
                      />
                      <span className="text-[10px] font-bold">12k</span>
                    </button>

                    <button className="flex flex-col items-center gap-1">
                      <MessageCircle size={24} />
                      <span className="text-[10px] font-bold">280</span>
                    </button>

                    <button className="flex flex-col items-center gap-1">
                      <Share2 size={24} />
                      <span className="text-[10px] font-bold">Share</span>
                    </button>

                    <button className="p-1 bg-black/40 rounded-full border border-white/10">
                      <Volume2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Reels;
