const {
  followUser,
  isFollowing,
  unfollowUser,
  getFollowers,
  getFollowing,
  getFollowersCount,
  getFollowingCount,
} = require("../model/followers.model");

const { findUserById } = require("../model/user.model");

const followUserController = async (req, res) => {
  try {
    const follower_id = req.user.id;
    const { userId } = req.params;

    if (follower_id == userId) {
      return res.status(400).json({
        success: false,
        message: "You cannot follow yourself.",
      });
    }

    const user = await findUserById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const existingFollow = await isFollowing(follower_id, userId);

    if (existingFollow) {
      return res.status(400).json({
        success: false,
        message: "Already following this user.",
      });
    }

    const follow = await followUser(follower_id, userId);

    // Auto-create chat if not exists
    try {
      const { findChatBetweenUsers, createChat, getChatById } = require("../model/chat.model");
      let chat = await findChatBetweenUsers(follower_id, userId);
      if (!chat) {
        const newChat = await createChat(follower_id, userId);
        const chatDetails = await getChatById(newChat.id);
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
          io.to(`user_${follower_id}`).emit("chatCreated", formatChatForParticipant(chatDetails, follower_id));
          io.to(`user_${userId}`).emit("chatCreated", formatChatForParticipant(chatDetails, userId));
        }
      }
    } catch (chatErr) {
      console.error("Auto-chat creation on follow failed:", chatErr);
    }

    return res.status(201).json({
      success: true,
      message: "User followed successfully.",
      follow,
    });
  } catch (error) {
    console.error("Follow User Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const unfollowUserController = async (req, res) => {
  try {
    const follower_id = req.user.id;
    const { userId } = req.params;

    const existingFollow = await isFollowing(follower_id, userId);

    if (!existingFollow) {
      return res.status(404).json({
        success: false,
        message: "You are not following this user.",
      });
    }

    await unfollowUser(follower_id, userId);

    return res.status(200).json({
      success: true,
      message: "User unfollowed successfully.",
    });
  } catch (error) {
    console.error("Unfollow User Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getFollowersController = async (req, res) => {
  try {
    const { userId } = req.params;

    const followers = await getFollowers(userId);

    return res.status(200).json({
      success: true,
      count: followers.length,
      followers,
    });
  } catch (error) {
    console.error("Get Followers Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getFollowingController = async (req, res) => {
  try {
    const { userId } = req.params;

    const following = await getFollowing(userId);

    return res.status(200).json({
      success: true,
      count: following.length,
      following,
    });
  } catch (error) {
    console.error("Get Following Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getFollowCountsController = async (req, res) => {
  try {
    const { userId } = req.params;

    const followers = await getFollowersCount(userId);
    const following = await getFollowingCount(userId);

    return res.status(200).json({
      success: true,
      followers,
      following,
    });
  } catch (error) {
    console.error("Get Follow Counts Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  followUserController,
  unfollowUserController,
  getFollowersController,
  getFollowingController,
  getFollowCountsController,
};