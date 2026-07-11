import React from "react";

export const Shimmer = ({ className = "" }) => (
  <div className={`animate-pulse bg-zinc-800 rounded ${className}`} />
);

export const FeedSkeleton = () => (
  <div className="w-full max-w-[500px] border border-zinc-800 bg-zinc-950/40 rounded-xl p-4 space-y-4 mb-6">
    <div className="flex items-center space-x-3">
      <Shimmer className="w-10 h-10 rounded-full" />
      <div className="space-y-2 flex-1">
        <Shimmer className="h-4 w-1/3" />
        <Shimmer className="h-3 w-1/4" />
      </div>
    </div>
    <Shimmer className="w-full h-80 rounded-lg" />
    <div className="flex justify-between items-center py-2">
      <div className="flex space-x-4">
        <Shimmer className="w-6 h-6 rounded-full" />
        <Shimmer className="w-6 h-6 rounded-full" />
      </div>
      <Shimmer className="w-6 h-6 rounded-full" />
    </div>
    <div className="space-y-2">
      <Shimmer className="h-3 w-3/4" />
      <Shimmer className="h-3 w-1/2" />
    </div>
  </div>
);

export const ProfileSkeleton = () => (
  <div className="w-full max-w-4xl mx-auto py-10 px-4 space-y-10">
    <div className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-16 border-b border-zinc-800 pb-10">
      <Shimmer className="w-32 h-32 rounded-full" />
      <div className="space-y-4 flex-1">
        <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
          <Shimmer className="h-8 w-40" />
          <Shimmer className="h-8 w-24 rounded-lg" />
        </div>
        <div className="flex gap-6 justify-center sm:justify-start">
          <Shimmer className="h-5 w-20" />
          <Shimmer className="h-5 w-20" />
          <Shimmer className="h-5 w-20" />
        </div>
        <div className="space-y-2">
          <Shimmer className="h-4 w-1/2" />
          <Shimmer className="h-4 w-3/4" />
        </div>
      </div>
    </div>
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Shimmer key={i} className="aspect-square rounded-md" />
      ))}
    </div>
  </div>
);

export const ChatListSkeleton = () => (
  <div className="space-y-3 p-4">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <div key={i} className="flex items-center space-x-3 p-2">
        <Shimmer className="w-12 h-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Shimmer className="h-4 w-1/3" />
          <Shimmer className="h-3 w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

export const MessageSkeleton = () => (
  <div className="space-y-4 p-5">
    <div className="flex justify-start">
      <Shimmer className="w-[45%] h-10 rounded-2xl" />
    </div>
    <div className="flex justify-end">
      <Shimmer className="w-[35%] h-12 rounded-2xl" />
    </div>
    <div className="flex justify-start">
      <Shimmer className="w-[50%] h-10 rounded-2xl" />
    </div>
    <div className="flex justify-end">
      <Shimmer className="w-[30%] h-10 rounded-2xl" />
    </div>
  </div>
);

export const UserSearchSkeleton = () => (
  <div className="space-y-4">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="flex items-center justify-between p-3 rounded-lg">
        <div className="flex items-center space-x-3">
          <Shimmer className="w-12 h-12 rounded-full" />
          <div className="space-y-2">
            <Shimmer className="h-4 w-28" />
            <Shimmer className="h-3 w-20" />
          </div>
        </div>
        <Shimmer className="w-20 h-8 rounded-lg" />
      </div>
    ))}
  </div>
);
