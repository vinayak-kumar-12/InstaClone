import React, { useEffect, useState, useRef } from "react";
import { useChatStore } from "../../store/chatStore";
import { useSocketStore } from "../../store/socketStore";
import { useAuthStore } from "../../store/authStore";
import { ChatListSkeleton, MessageSkeleton } from "../Skeletons";
import { FiSend, FiEdit2, FiArrowLeft, FiMessageCircle } from "react-icons/fi";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";

const Message = () => {
  const {
    chats,
    activeChat,
    messages,
    isLoadingChats,
    isLoadingMessages,
    typingUsers,
    fetchChats,
    selectChat,
    sendChatMessage,
    sendTypingStatus,
  } = useChatStore();

  const onlineUsers = useSocketStore((state) => state.onlineUsers);
  const currentUser = useAuthStore((state) => state.user);
  
  const [typedMessage, setTypedMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Load chats on mount
  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoadingMessages]);

  const handleSelectChat = (chat) => {
    selectChat(chat);
  };

  const handleMessageChange = (e) => {
    setTypedMessage(e.target.value);

    // Handle typing status triggers
    if (!isTyping) {
      setIsTyping(true);
      sendTypingStatus(true);
    }

    // Reset stop typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTypingStatus(false);
    }, 2000);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!typedMessage.trim() || isSending) return;

    setIsSending(true);
    // Clear typing status instantly
    if (isTyping) {
      setIsTyping(false);
      sendTypingStatus(false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }

    const res = await sendChatMessage(typedMessage);
    setIsSending(false);

    if (res.success) {
      setTypedMessage("");
    } else {
      toast.error(res.error || "Failed to send message");
    }
  };

  // Helper to get participant info.
  // The chat list API (/chats) returns flat fields: participant_id, participant_username, participant_profile_pic.
  // getChatById returns a participants[] array. We handle both shapes here.
  const getParticipant = (chat) => {
    if (!chat) return {};

    // If the chat has a participants array (getChatById shape), use it
    if (chat.participants && Array.isArray(chat.participants)) {
      return chat.participants.find((p) => Number(p.id) !== Number(currentUser?.id)) || {};
    }

    // Otherwise use the flat fields returned by the chat list API
    return {
      id: chat.participant_id,
      username: chat.participant_username,
      profile_pic: chat.participant_profile_pic,
    };
  };

  // Check if a user is online
  const isUserOnline = (userId) => {
    return onlineUsers.includes(Number(userId));
  };

  // Check if participant is typing in the active chat
  const isParticipantTyping = () => {
    if (!activeChat) return false;
    const participant = getParticipant(activeChat);
    const set = typingUsers[activeChat.chat_id];
    return set ? set.has(Number(participant.id)) : false;
  };

  return (
    <div className="flex h-screen bg-black text-white w-full select-none overflow-hidden">
      {/* Left Chat List Panel */}
      <div className={`w-full md:w-[350px] border-r border-zinc-900 flex flex-col flex-shrink-0 bg-black ${
        activeChat ? "hidden md:flex" : "flex"
      }`}>
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-zinc-900">
          <h1 className="text-xl font-extrabold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            Messages
          </h1>
          <FiEdit2 size={18} className="text-zinc-400 hover:text-white cursor-pointer transition" />
        </div>

        {/* Chats list */}
        <div className="flex-1 overflow-y-auto">
          {isLoadingChats ? (
            <ChatListSkeleton />
          ) : chats.length === 0 ? (
            <div className="text-center text-zinc-500 py-16 px-4">
              <FiMessageCircle size={36} className="mx-auto text-zinc-600 mb-3" />
              <p className="text-sm font-semibold">No messages yet</p>
              <p className="text-xs mt-1 text-zinc-500">Suggested friends can be searched to initiate a chat.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-950">
              {chats.map((chat) => {
                const participant = getParticipant(chat);
                const online = isUserOnline(participant.id);
                const isActive = activeChat?.chat_id === chat.chat_id;
                const hasUnread = chat.unseen_messages_count > 0;

                return (
                  <div
                    key={chat.chat_id}
                    onClick={() => handleSelectChat(chat)}
                    className={`flex items-center gap-3 px-4 py-4 cursor-pointer transition ${
                      isActive ? "bg-zinc-900/60" : "hover:bg-zinc-950/40"
                    }`}
                  >
                    {/* Avatar with Online badge */}
                    <div className="relative">
                      <img
                        src={participant.profile_pic || "https://i.pravatar.cc/150"}
                        alt={participant.username}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      {online && (
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-black rounded-full" />
                      )}
                    </div>

                    {/* Chat Text Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <h2 className={`text-sm truncate ${hasUnread ? "font-bold text-white" : "text-zinc-300"}`}>
                          {participant.username}
                        </h2>
                      </div>
                      <p className={`text-xs truncate mt-0.5 ${
                        hasUnread ? "text-white font-bold" : "text-zinc-500"
                      }`}>
                        {chat.last_message || "Start a conversation"}
                      </p>
                    </div>

                    {/* Unread Badge */}
                    {hasUnread && (
                      <span className="bg-blue-600 text-[10px] text-white font-bold w-4 h-4 rounded-full flex items-center justify-center">
                        {chat.unseen_messages_count}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Chat Window */}
      <div className={`flex-1 flex flex-col h-full bg-[#0e0f11] ${
        !activeChat ? "hidden md:flex justify-center items-center" : "flex"
      }`}>
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b border-zinc-900 flex items-center px-4 gap-4 bg-black flex-shrink-0">
              <button
                onClick={() => selectChat(null)}
                className="md:hidden text-zinc-400 hover:text-white p-1"
              >
                <FiArrowLeft size={22} />
              </button>

              <div className="relative">
                <img
                  src={getParticipant(activeChat).profile_pic || "https://i.pravatar.cc/150"}
                  alt={getParticipant(activeChat).username}
                  className="w-10 h-10 rounded-full object-cover"
                />
                {isUserOnline(getParticipant(activeChat).id) && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-black rounded-full" />
                )}
              </div>

              <div>
                <h2 className="font-semibold text-sm">{getParticipant(activeChat).username}</h2>
                <p className="text-[10px] text-zinc-500">
                  {isUserOnline(getParticipant(activeChat).id) ? "Online now" : "Offline"}
                </p>
              </div>
            </div>

            {/* Chat Thread Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {isLoadingMessages ? (
                <MessageSkeleton />
              ) : (
                messages.map((m) => {
                  const isMe = Number(m.sender_id) === Number(currentUser?.id);
                  return (
                    <div
                      key={m.id}
                      className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      <div className="max-w-[70%]">
                        <div
                          className={`px-4 py-2.5 text-sm rounded-2xl ${
                            isMe
                              ? "bg-blue-600 text-white rounded-tr-none"
                              : "bg-zinc-800 text-zinc-150 rounded-tl-none"
                          }`}
                        >
                          <p>{m.message}</p>
                        </div>
                        {isMe && m.is_seen && (
                          <span className="text-[10px] text-zinc-500 block text-right mt-1 font-semibold">Seen</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              {/* Typing indicator bubble */}
              {isParticipantTyping() && (
                <div className="flex justify-start">
                  <div className="bg-zinc-800/50 px-4 py-3 rounded-2xl rounded-tl-none flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input Footer */}
            <form onSubmit={handleSendMessage} className="border-t border-zinc-900 p-4 bg-black flex-shrink-0">
              <div className="flex items-center bg-zinc-900 border border-zinc-850 rounded-2xl px-5 py-3 focus-within:border-zinc-700 transition">
                <input
                  type="text"
                  placeholder="Message..."
                  value={typedMessage}
                  onChange={handleMessageChange}
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-500"
                  disabled={isSending}
                />
                <button
                  type="submit"
                  disabled={!typedMessage.trim() || isSending}
                  className="text-blue-500 hover:text-blue-400 cursor-pointer disabled:opacity-40"
                >
                  {isSending ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <FiSend size={18} />
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="text-center space-y-3 px-6 select-none">
            <div className="w-20 h-20 bg-zinc-950 border border-zinc-900 rounded-full flex items-center justify-center mx-auto text-zinc-300">
              <FiMessageCircle size={36} className="stroke-[1.2]" />
            </div>
            <h2 className="text-xl font-bold">Your Messages</h2>
            <p className="text-sm text-zinc-500 max-w-xs mx-auto">
              Send private photos and messages to a friend or group. Select a conversation to start.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Message;