const {
  createMessage,
  getMessagesByChatId,
  deleteMessageById,
  markMessagesAsSeen,
  getMessageById,
} = require("../model/message.model");
const { isParticipant, getChatById } = require("../model/chat.model");

/**
 * Sends a message in a chat
 * POST /api/messages
 */
const sendMessage = async (req, res) => {
  try {
    const { chatId, message, messageType = "text" } = req.body;
    const senderId = req.user.id;

    if (!chatId || !message) {
      return res.status(400).json({
        success: false,
        message: "chatId and message content are required.",
      });
    }

    // Verify user is a participant of the chat
    const isUserParticipant = await isParticipant(chatId, senderId);
    if (!isUserParticipant) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a participant in this chat.",
      });
    }

    // Save message to database
    const createdMessage = await createMessage({
      chatId,
      senderId,
      message,
      messageType,
    });

    // Fetch full message details with sender information
    const fullMessage = await getMessageById(createdMessage.id);

    // Broadcast message via Socket.io
    const io = req.app.get("io");
    if (io) {
      // Find the receiver user id to target their personal room
      const chat = await getChatById(chatId);
      if (chat && chat.participants) {
        chat.participants.forEach((participant) => {
          // Emit to all participants' personal rooms
          io.to(`user_${participant.id}`).emit("receiveMessage", fullMessage);
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: "Message sent successfully.",
      data: fullMessage,
    });
  } catch (error) {
    console.error("Send Message Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * Fetches message history for a specific chat
 * GET /api/messages/:chatId
 */
const fetchChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    // Verify user is a participant of the chat
    const isUserParticipant = await isParticipant(chatId, userId);
    if (!isUserParticipant) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a participant in this chat.",
      });
    }

    const messages = await getMessagesByChatId(chatId);

    return res.status(200).json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error("Fetch Chat Messages Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * Deletes a message by its ID (Sender only)
 * DELETE /api/messages/:id
 */
const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const deletedMessage = await deleteMessageById(id, userId);
    if (!deletedMessage) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized or message not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Message deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Message Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * Marks all messages in a chat as seen
 * PUT /api/messages/seen/:chatId
 */
const seenMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    // Verify user is a participant of the chat
    const isUserParticipant = await isParticipant(chatId, userId);
    if (!isUserParticipant) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a participant in this chat.",
      });
    }

    // Mark messages as seen in database
    const updatedCount = await markMessagesAsSeen(chatId, userId);

    // Broadcast seen status via Socket.io
    const io = req.app.get("io");
    if (io) {
      const chat = await getChatById(chatId);
      if (chat && chat.participants) {
        chat.participants.forEach((participant) => {
          // Notify other participants in their personal rooms
          if (participant.id !== userId) {
            io.to(`user_${participant.id}`).emit("messageSeen", {
              chatId: parseInt(chatId),
              seenBy: userId,
            });
          }
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Messages marked as seen successfully.",
      updatedCount,
    });
  } catch (error) {
    console.error("Seen Messages Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

module.exports = {
  sendMessage,
  fetchChatMessages,
  deleteMessage,
  seenMessages,
};
