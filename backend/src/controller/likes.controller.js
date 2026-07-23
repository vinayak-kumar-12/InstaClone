const {
  addLike,
  removeLike,
  isLiked,
  getPostLikesCount,
  getLikedUsers,
} = require("../model/likes.model");
const { getPostById } = require("../model/post.model");
const redisLockService = require("../services/redisLock.service");
const notificationQueueService = require("../services/notificationQueue.service");
const { invalidatePostCache } = require("../middleware/cache.middleware");

const toggleLike = async (req, res) => {
  const user_id = req.user.id;
  const { postId } = req.params;

  // 1. Acquire Distributed Lock to prevent duplicate concurrent likes
  const lockToken = await redisLockService.acquireLock(`post:${postId}:user:${user_id}`, "like", 3000);
  if (!lockToken) {
    return res.status(429).json({
      success: false,
      message: "Action in progress. Please try again.",
    });
  }

  try {
    const liked = await isLiked(user_id, postId);
    let isLikedNow = false;

    if (liked) {
      await removeLike(user_id, postId);
      isLikedNow = false;
    } else {
      await addLike(user_id, postId);
      isLikedNow = true;

      // Queue Notification asynchronously via Redis Queue Worker
      const post = await getPostById(postId, user_id);
      if (post && post.user_id) {
        notificationQueueService.enqueueNotification({
          recipientId: post.user_id,
          senderId: user_id,
          type: "like",
          entityType: "post",
          entityId: postId,
          title: "New Like",
          message: "liked your post.",
          image: post.media_url || "",
        });
      }
    }

    // Invalidate post cache
    invalidatePostCache(postId);

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
  } finally {
    await redisLockService.releaseLock(`post:${postId}:user:${user_id}`, "like", lockToken);
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