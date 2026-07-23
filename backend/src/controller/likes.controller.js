const {
  addLike,
  removeLike,
  isLiked,
  getPostLikesCount,
  getLikedUsers,
} = require("../model/likes.model");
const { getPostById } = require("../model/post.model");
const { createAndEmitNotification } = require("../services/notification.service");

const toggleLike = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { postId } = req.params;

    const liked = await isLiked(user_id, postId);
    let isLikedNow = false;

    if (liked) {
      await removeLike(user_id, postId);
      isLikedNow = false;
    } else {
      await addLike(user_id, postId);
      isLikedNow = true;

      // Trigger Notification to Post Owner
      const post = await getPostById(postId, user_id);
      if (post && post.user_id) {
        const io = req.app.get("io");
        createAndEmitNotification({
          recipientId: post.user_id,
          senderId: user_id,
          type: "like",
          entityType: "post",
          entityId: postId,
          title: "New Like",
          message: "liked your post.",
          image: post.media_url || "",
          io,
        });
      }
    }

    // Always calculate from database
    const likesCount = await getPostLikesCount(postId);

    // Emit live Socket.IO update
    const io = req.app.get("io");
    if (io) {
      io.emit("postLikeUpdate", {
        postId: Number(postId),
        likesCount,
        userId: user_id,
        isLiked: isLikedNow,
      });
    }

    return res.status(200).json({
      success: true,
      message: isLikedNow ? "Post liked." : "Post unliked.",
      likesCount,
      isLiked: isLikedNow,
    });
  } catch (error) {
    console.error("Toggle Like Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getLikesCount = async (req, res) => {
  try {
    const { postId } = req.params;

    const likes = await getPostLikesCount(postId);

    return res.status(200).json({
      success: true,
      likes,
    });
  } catch (error) {
    console.error("Get Likes Count Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getLikesUsers = async (req, res) => {
  try {
    const { postId } = req.params;

    const users = await getLikedUsers(postId);

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Get Liked Users Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  toggleLike,
  getLikesCount,
  getLikesUsers,
};