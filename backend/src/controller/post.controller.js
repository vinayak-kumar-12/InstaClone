const {
  createPost,
  getPostById,
  getAllPosts,
  getAllReels,
  getPostsByUser,
  getReelsByUser,
  updatePost,
  deletePost,
} = require("../model/post.model");
const { uploadStream } = require("../utils/cloudinaryUpload");

// Create Post / Reel / Story
const createNewPost = async (req, res) => {
  try {
    const {
      caption,
      post_type = "post",
      location,
    } = req.body;

    const user_id = req.user.id;

    // Validate that a file is uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided. Please upload an image.",
      });
    }

    if (!["post", "reel", "story"].includes(post_type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post type.",
      });
    }

    // Upload the image buffer to Cloudinary
    const uploadResult = await uploadStream(req.file.buffer);

    // Call the model to store the post in the database using the secure_url
    const post = await createPost({
      user_id,
      caption,
      media_url: uploadResult.secure_url,
      media_type: "image", // Since we validated that the file is an image in the multer filter
      post_type,
      location,
    });

    return res.status(201).json({
      success: true,
      message: `${post_type.charAt(0).toUpperCase() + post_type.slice(1)} created successfully.`,
      post,
    });
  } catch (error) {
    console.error("Create Post Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get All Posts
const getPosts = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 20;
    const offset = Number(req.query.offset) || 0;

    const posts = await getAllPosts(limit, offset);

    return res.status(200).json({
      success: true,
      count: posts.length,
      posts,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get All Reels
const getReels = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 20;
    const offset = Number(req.query.offset) || 0;

    const reels = await getAllReels(limit, offset);

    return res.status(200).json({
      success: true,
      count: reels.length,
      reels,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get Single Post / Reel / Story
const getSinglePost = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await getPostById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found.",
      });
    }

    return res.status(200).json({
      success: true,
      post,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get User Posts
const getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;

    const posts = await getPostsByUser(userId);

    return res.status(200).json({
      success: true,
      count: posts.length,
      posts,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get User Reels
const getUserReels = async (req, res) => {
  try {
    const { userId } = req.params;

    const reels = await getReelsByUser(userId);

    return res.status(200).json({
      success: true,
      count: reels.length,
      reels,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update Post / Reel / Story
const editPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { caption, location } = req.body;

    const post = await updatePost(id, caption, location);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Updated successfully.",
      post,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete Post / Reel / Story
const removePost = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await getPostById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found.",
      });
    }

    await deletePost(id);

    return res.status(200).json({
      success: true,
      message: "Deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createNewPost,
  getPosts,
  getReels,
  getSinglePost,
  getUserPosts,
  getUserReels,
  editPost,
  removePost,
};