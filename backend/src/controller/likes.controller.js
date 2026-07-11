const {
  addLike,
  removeLike,
  isLiked,
  getPostLikesCount,
  getLikedUsers,
} = require("../model/likes.model");

const toggleLike = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { postId } = req.params;

    const liked = await isLiked(user_id, postId);

    if (liked) {
      await removeLike(user_id, postId);

      return res.status(200).json({
        success: true,
        message: "Post unliked.",
      });
    }

    await addLike(user_id, postId);

    return res.status(201).json({
      success: true,
      message: "Post liked.",
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