const {
  savePost,
  isPostSaved,
  unsavePost,
  getSavedPosts,
  getSavedPostsCount,
} = require("../model/savedPost.model");

const { getPostById } = require("../model/post.model");

// Save Post
const savePostController = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { postId } = req.params;

    const post = await getPostById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found.",
      });
    }

    const saved = await isPostSaved(user_id, postId);

    if (saved) {
      return res.status(400).json({
        success: false,
        message: "Post already saved.",
      });
    }

    const savedPost = await savePost(user_id, postId);

    return res.status(201).json({
      success: true,
      message: "Post saved successfully.",
      savedPost,
    });
  } catch (error) {
    console.error("Save Post Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Unsave Post
const unsavePostController = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { postId } = req.params;

    const saved = await isPostSaved(user_id, postId);

    if (!saved) {
      return res.status(404).json({
        success: false,
        message: "Saved post not found.",
      });
    }

    await unsavePost(user_id, postId);

    return res.status(200).json({
      success: true,
      message: "Post removed from saved successfully.",
    });
  } catch (error) {
    console.error("Unsave Post Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get Saved Posts
const getSavedPostsController = async (req, res) => {
  try {
    const user_id = req.user.id;

    const posts = await getSavedPosts(user_id);

    return res.status(200).json({
      success: true,
      count: posts.length,
      posts,
    });
  } catch (error) {
    console.error("Get Saved Posts Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get Saved Posts Count
const getSavedPostsCountController = async (req, res) => {
  try {
    const user_id = req.user.id;

    const count = await getSavedPostsCount(user_id);

    return res.status(200).json({
      success: true,
      saved_posts: count,
    });
  } catch (error) {
    console.error("Get Saved Posts Count Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  savePostController,
  unsavePostController,
  getSavedPostsController,
  getSavedPostsCountController,
};