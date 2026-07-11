import { create } from "zustand";
import api from "../services/api";
import { useSocketStore } from "./socketStore";
import { useAuthStore } from "./authStore";

export const useChatStore = create((set, get) => ({
  chats: [],
  activeChat: null, // Selected chat object
  messages: [],
  isLoadingChats: false,
  isLoadingMessages: false,
  typingUsers: {}, // chatId -> Set of userIds typing

  // Fetch all chats/conversations
  fetchChats: async () => {
    set({ isLoadingChats: true });
    try {
      const res = await api.get("/chats");
      set({ chats: res.data.chats || [], isLoadingChats: false });
    } catch (err) {
      console.error("Failed to fetch chats:", err);
      set({ isLoadingChats: false });
    }
  },

  // Select a chat and load its messages
  selectChat: async (chat) => {
    set({ activeChat: chat, messages: [], isLoadingMessages: true });
    try {
      const chatId = chat.chat_id;
      // 1. Fetch messages
      const res = await api.get(`/messages/${chatId}`);
      set({ messages: res.data.messages || [], isLoadingMessages: false });

      // 2. Mark messages as seen in database
      await api.put(`/messages/seen/${chatId}`);

      // 3. Emit messageSeen event via socket
      const socket = get().socketInstance();
      if (socket) {
        socket.emit("messageSeen", { chatId });
      }

      // 4. Reset unread count locally for this chat
      get().resetUnseenCount(chatId);
    } catch (err) {
      console.error("Failed to load messages:", err);
      set({ isLoadingMessages: false });
    }
  },

  // Helper to get socket instance
  socketInstance: () => {
    return useSocketStore.getState().socket;
  },

  // Send a message
  sendChatMessage: async (messageText) => {
    const activeChat = get().activeChat;
    if (!activeChat) return;

    try {
      const res = await api.post("/messages", {
        chatId: activeChat.chat_id,
        message: messageText,
        messageType: "text",
      });

      const newMessage = res.data.data;
      // Note: We don't manually append it to messages here because the socket
      // "receiveMessage" listener will receive and append it for all participants!
      return { success: true, message: newMessage };
    } catch (err) {
      console.error("Failed to send message:", err);
      return { success: false, error: err.response?.data?.message || "Failed to send message" };
    }
  },

  // Typing indicators
  sendTypingStatus: (isTyping) => {
    const activeChat = get().activeChat;
    const socket = get().socketInstance();
    if (!activeChat || !socket) return;

    const eventName = isTyping ? "typing" : "stopTyping";
    socket.emit(eventName, { chatId: activeChat.chat_id });
  },

  // Local helper to reset unseen messages count
  resetUnseenCount: (chatId) => {
    const chats = get().chats.map((c) => {
      if (c.chat_id === chatId) {
        return { ...c, unseen_messages_count: 0 };
      }
      return c;
    });
    set({ chats });
  },

  // Real-time socket event binders
  bindSocketEvents: (socket) => {
    if (!socket) return;

    // Remove existing listeners to avoid duplicates
    socket.off("receiveMessage");
    socket.off("typing");
    socket.off("stopTyping");
    socket.off("messageSeen");
    socket.off("chatCreated");

    // Handle new chat created dynamically (e.g. on follow)
    socket.on("chatCreated", (chat) => {
      set((state) => {
        const exists = state.chats.some((c) => Number(c.chat_id) === Number(chat.chat_id));
        if (exists) return {};
        return { chats: [chat, ...state.chats] };
      });
    });

    // Handle incoming message
    socket.on("receiveMessage", async (message) => {
      const activeChat = get().activeChat;
      const currentUserId = useAuthStore.getState().user?.id;

      // If the message is for the currently open chat
      if (activeChat && Number(activeChat.chat_id) === Number(message.chat_id)) {
        // Append message
        set((state) => ({
          messages: [...state.messages, message],
        }));

        // If message is from someone else, mark it seen
        if (Number(message.sender_id) !== Number(currentUserId)) {
          try {
            await api.put(`/messages/seen/${activeChat.chat_id}`);
            socket.emit("messageSeen", { chatId: activeChat.chat_id });
          } catch (err) {
            console.error("Failed to auto-seen message:", err);
          }
        }
      }

      // Update chats list (update last message preview and unread count)
      set((state) => {
        const updatedChats = state.chats.map((c) => {
          if (Number(c.chat_id) === Number(message.chat_id)) {
            const isNotSender = Number(message.sender_id) !== Number(currentUserId);
            const isOpen = activeChat && Number(activeChat.chat_id) === Number(message.chat_id);
            return {
              ...c,
              last_message: message.message,
              last_message_time: message.created_at,
              last_message_sender_id: message.sender_id,
              unseen_messages_count:
                isNotSender && !isOpen
                  ? (c.unseen_messages_count || 0) + 1
                  : c.unseen_messages_count,
            };
          }
          return c;
        });

        // Re-order chats: move the chat that got the message to the top
        const messageChatIndex = updatedChats.findIndex(
          (c) => Number(c.chat_id) === Number(message.chat_id)
        );

        if (messageChatIndex > -1) {
          const [chatToMove] = updatedChats.splice(messageChatIndex, 1);
          updatedChats.unshift(chatToMove);
        }

        return { chats: updatedChats };
      });
    });

    // Handle typing indicator
    socket.on("typing", ({ chatId, userId }) => {
      set((state) => {
        const currentSet = state.typingUsers[chatId] || new Set();
        const newSet = new Set(currentSet);
        newSet.add(userId);
        return {
          typingUsers: { ...state.typingUsers, [chatId]: newSet },
        };
      });
    });

    // Handle stop typing indicator
    socket.on("stopTyping", ({ chatId, userId }) => {
      set((state) => {
        const currentSet = state.typingUsers[chatId] || new Set();
        const newSet = new Set(currentSet);
        newSet.delete(userId);
        return {
          typingUsers: { ...state.typingUsers, [chatId]: newSet },
        };
      });
    });

    // Handle seen status update
    socket.on("messageSeen", ({ chatId, seenBy }) => {
      const activeChat = get().activeChat;
      if (activeChat && Number(activeChat.chat_id) === Number(chatId)) {
        // Mark all messages that are from current user as seen
        set((state) => ({
          messages: state.messages.map((m) => {
            if (Number(m.sender_id) !== Number(seenBy)) {
              return { ...m, is_seen: true };
            }
            return m;
          }),
        }));
      }
    });
  },
}));
