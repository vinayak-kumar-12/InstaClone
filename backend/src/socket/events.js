const { createMessage, getMessageById, markMessagesAsSeen } = require("../model/message.model");
const { isParticipant, getChatById } = require("../model/chat.model");

/**
 * Registers real-time messaging events for a connected socket
 * @param {object} io - Socket.io server instance
 * @param {object} socket - Connected socket client instance
 * @param {Map} onlineUsers - Map tracking currently connected users
 */
const registerEvents = (io, socket, onlineUsers) => {
  const userId = socket.user.id;

  // 1. Join Chat Room
  socket.on("join", ({ chatId }) => {
    socket.join(`chat_${chatId}`);
    console.log(`Socket ${socket.id} (User: ${userId}) joined room: chat_${chatId}`);
  });

  // 2. Send Message (Real-time socket channel)
  socket.on("sendMessage", async ({ chatId, message, messageType = "text" }, callback) => {
    try {
      // Access control: check if sender is a participant in this chat
      const isUserParticipant = await isParticipant(chatId, userId);
      if (!isUserParticipant) {
        if (callback) callback({ success: false, error: "Access denied. You are not in this chat." });
        return;
      }

      // Save message in PostgreSQL database
      const createdMessage = await createMessage({
        chatId,
        senderId: userId,
        message,
        messageType,
      });

      // Get full message details (with sender username and profile picture)
      const fullMessage = await getMessageById(createdMessage.id);

      // Send to all participants in their personal rooms
      const chat = await getChatById(chatId);
      if (chat && chat.participants) {
        chat.participants.forEach((participant) => {
          io.to(`user_${participant.id}`).emit("receiveMessage", fullMessage);
        });
      }

      // Send acknowledgment back to client
      if (callback) {
        callback({ success: true, data: fullMessage });
      }
    } catch (error) {
      console.error("Socket sendMessage error:", error);
      if (callback) {
        callback({ success: false, error: "Failed to send message." });
      }
    }
  });

  // 3. Typing Indicator
  socket.on("typing", async ({ chatId }) => {
    const chat = await getChatById(chatId);
    if (chat && chat.participants) {
      chat.participants.forEach((participant) => {
        if (participant.id !== userId) {
          io.to(`user_${participant.id}`).emit("typing", { chatId: parseInt(chatId), userId });
        }
      });
    }
  });

  // 4. Stop Typing Indicator
  socket.on("stopTyping", async ({ chatId }) => {
    const chat = await getChatById(chatId);
    if (chat && chat.participants) {
      chat.participants.forEach((participant) => {
        if (participant.id !== userId) {
          io.to(`user_${participant.id}`).emit("stopTyping", { chatId: parseInt(chatId), userId });
        }
      });
    }
  });

  // 5. Mark Message as Seen
  socket.on("messageSeen", async ({ chatId }) => {
    try {
      const isUserParticipant = await isParticipant(chatId, userId);
      if (!isUserParticipant) return;

      // Update database status
      await markMessagesAsSeen(chatId, userId);

      // Emit read receipt event to other participants
      const chat = await getChatById(chatId);
      if (chat && chat.participants) {
        chat.participants.forEach((participant) => {
          if (participant.id !== userId) {
            io.to(`user_${participant.id}`).emit("messageSeen", {
              chatId: parseInt(chatId),
              seenBy: userId,
            });
          }
        });
      }
    } catch (error) {
      console.error("Socket messageSeen error:", error);
    }
  });
};

module.exports = registerEvents;
