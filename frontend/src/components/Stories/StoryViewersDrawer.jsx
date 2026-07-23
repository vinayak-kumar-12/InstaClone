import React from "react";
import { X, Eye, Heart } from "lucide-react";

const StoryViewersDrawer = ({ isOpen, onClose, viewers = [] }) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4 animate-fade-in select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-3xl max-h-[75vh] flex flex-col overflow-hidden shadow-2xl animate-slide-up"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-900">
          <div className="flex items-center gap-2">
            <Eye size={18} className="text-zinc-400" />
            <h3 className="font-bold text-sm text-white">Story Viewers ({viewers.length})</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-900 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Viewers List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {viewers.length === 0 ? (
            <div className="text-center py-10 text-zinc-500">
              <Eye size={36} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold">No views yet</p>
              <p className="text-xs text-zinc-600 mt-0.5">When people view your story, they will show up here.</p>
            </div>
          ) : (
            viewers.map((viewer) => (
              <div
                key={viewer.id}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-900/60 transition"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={viewer.user?.profile_pic || "https://i.pravatar.cc/150"}
                    alt={viewer.user?.username}
                    className="w-10 h-10 rounded-full object-cover border border-zinc-800"
                  />
                  <div>
                    <h4 className="font-semibold text-sm text-white leading-tight">
                      {viewer.user?.username || "User"}
                    </h4>
                    <span className="text-[11px] text-zinc-500 block">
                      {new Date(viewer.viewedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>

                <div className="text-zinc-500">
                  <Eye size={16} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default StoryViewersDrawer;
