import React, { useState, useEffect } from "react";
import { FiArrowLeft, FiSearch } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { UserSearchSkeleton } from "../Skeletons";
import api from "../../services/api";

const Search = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch users from backend with debouncing
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers([]);
      return;
    }

    setIsLoading(true);

    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await api.get(`/auth/search?q=${encodeURIComponent(searchQuery.trim())}`);
        setFilteredUsers(res.data.users || []);
      } catch (err) {
        console.error("Search failed:", err);
        setFilteredUsers([]);
      } finally {
        setIsLoading(false);
      }
    }, 300); // 300ms debounce delay

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  return (
    <div className="w-full min-h-screen bg-black text-white flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-2xl h-16 border-b border-zinc-900 flex items-center px-6">
        <button
          onClick={() => navigate("/home")}
          className="mr-5 hover:bg-zinc-900 p-2.5 rounded-full transition cursor-pointer"
        >
          <FiArrowLeft size={22} />
        </button>
        <h1 className="text-xl font-bold">Search Users</h1>
      </div>

      {/* Body */}
      <div className="w-full max-w-md px-6 py-10 flex-1 flex flex-col">
        {/* Search Input Box */}
        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 focus-within:border-zinc-700 transition">
          <FiSearch size={22} className="text-zinc-500 mr-3" />
          <input
            type="text"
            placeholder="Search by username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent outline-none w-full text-md placeholder:text-zinc-500"
          />
        </div>

        {/* Results / Skeletons */}
        <div className="mt-8 flex-1">
          {isLoading ? (
            <UserSearchSkeleton />
          ) : searchQuery.trim() === "" ? (
            <div className="text-center text-zinc-500 py-12">
              <h2 className="text-md font-semibold text-zinc-400">Search Accounts</h2>
              <p className="text-xs mt-2 text-zinc-500 max-w-xs mx-auto">
                Find accounts by typing their usernames to connect, follow, or start chatting.
              </p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <p className="text-zinc-500 text-center text-sm py-12">No accounts found matching "{searchQuery}"</p>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  onClick={() => navigate(`/profile/${user.id}`, { state: user })}
                  className="flex items-center gap-3 p-3.5 hover:bg-zinc-900/60 border border-transparent hover:border-zinc-900 rounded-2xl cursor-pointer transition"
                >
                  <img
                    src={user.profile_pic || "https://i.pravatar.cc/150"}
                    alt={user.username}
                    className="w-11 h-11 rounded-full object-cover"
                  />
                  <div>
                    <h3 className="font-semibold text-sm">{user.username}</h3>
                    <span className="text-zinc-500 text-xs">{user.bio || "View Profile"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Search;