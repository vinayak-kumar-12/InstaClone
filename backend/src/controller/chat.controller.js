const {
  findChatBetweenUsers,
  createChat,
  getUserChats,
  getChatById,
  isParticipant,
} = require("../model/chat.model");
const { findUserById } = require("../model/user.model");

/**
 * Creates a new chat or retrieves the existing chat between the current user and a receiver
 * POST /api/chats
 */
const getOrCreateChat = async (req, res) => {
  try {
    const { receiverId } = req.body;
    const userId = req.user.id;

    if (!receiverId) {
      return res.status(400).json({
        success: false,
        message: "receiverId is required.",
      });
    }

    if (parseInt(receiverId) === parseInt(userId)) {
      return res.status(400).json({
        success: false,
        message: "You cannot start a chat with yourself.",
      });
    }

    // Verify receiver exists
    const receiver = await findUserById(receiverId);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: "Receiver user not found.",
      });
    }

    // Check if chat already exists
    let chat = await findChatBetweenUsers(userId, receiverId);

    if (chat) {
      const chatDetails = await getChatById(chat.chat_id);
      return res.status(200).json({
        success: true,
        message: "Chat retrieved successfully.",
        chat: chatDetails,
      });
    }

    // Check if current user follows the receiver user
    const { isFollowing } = require("../model/followers.model");
    const isUserFollowing = await isFollowing(userId, receiverId);
    if (!isUserFollowing) {
      return res.status(403).json({
        success: false,
        message: "You must follow this user to start a conversation.",
      });
    }

    // Create new chat
    const newChat = await createChat(userId, receiverId);
    const chatDetails = await getChatById(newChat.id);

    // Emit chatCreated event to both users
    const io = req.app.get("io");
    if (io) {
      const formatChatForParticipant = (chatData, targetId) => {
        const other = chatData.participants.find(p => Number(p.id) !== Number(targetId)) || {};
        return {
          chat_id: chatData.chat_id,
          created_at: chatData.created_at,
          updated_at: chatData.updated_at,
          participant_id: other.id,
          participant_username: other.username,
          participant_profile_pic: other.profile_pic,
          last_message: null,
          last_message_time: null,
          last_message_sender_id: null,
          unseen_messages_count: 0
        };
      };
      io.to(`user_${userId}`).emit("chatCreated", formatChatForParticipant(chatDetails, userId));
      io.to(`user_${receiverId}`).emit("chatCreated", formatChatForParticipant(chatDetails, receiverId));
    }

    return res.status(201).json({
      success: true,
      message: "Chat created successfully.",
      chat: chatDetails,
    });
  } catch (error) {
    console.error("Get/Create Chat Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * Retrieves all chats for the logged-in user
 * GET /api/chats
 */
const fetchUserChats = async (req, res) => {
  try {
    const userId = req.user.id;
    const chats = await getUserChats(userId);

    return res.status(200).json({
      success: true,
      chats,
    });
  } catch (error) {
    console.error("Fetch User Chats Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * Retrieves details for a specific chat, validating user authorization
 * GET /api/chats/:id
 */
const fetchChatDetails = async (req, res) => {
  try {
    const chatId = req.params.id;
    const userId = req.user.id;

    // Check if chat exists and user is a participant
    const participantCheck = await isParticipant(chatId, userId);
    if (!participantCheck) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a participant in this chat.",
      });
    }

    const chat = await getChatById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found.",
      });
    }

    return res.status(200).json({
      success: true,
      chat,
    });
  } catch (error) {
    console.error("Fetch Chat Details Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

module.exports = {
  getOrCreateChat,
  fetchUserChats,
  fetchChatDetails,
};
