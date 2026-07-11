const {
  createPost,
  getPostById,
  getAllStories,
  getUserStories,
  deletePost,
} = require("../model/post.model");

// Create Story
const createStory = async (req, res) => {
  try {
    const user_id = req.user.id;

    const {
      caption,
      media_url,
      media_type,
      location,
    } = req.body;

    if (!media_url || !media_type) {
      return res.status(400).json({
        success: false,
        message: "Media URL and Media Type are required.",
      });
    }

    const story = await createPost({
      user_id,
      caption,
      media_url,
      media_type,
      post_type: "story",
      location,
    });

    return res.status(201).json({
      success: true,
      message: "Story created successfully.",
      story,
    });
  } catch (error) {
    console.error("Create Story Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get All Stories
const getStories = async (req, res) => {
  try {
    const stories = await getAllStories();

    return res.status(200).json({
      success: true,
      count: stories.length,
      stories,
    });
  } catch (error) {
    console.error("Get Stories Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get User Stories
const getStoriesByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const stories = await getUserStories(userId);

    return res.status(200).json({
      success: true,
      count: stories.length,
      stories,
    });
  } catch (error) {
    console.error("Get User Stories Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete Story
const removeStory = async (req, res) => {
  try {
    const { id } = req.params;

    const story = await getPostById(id);

    if (!story || story.post_type !== "story") {
      return res.status(404).json({
        success: false,
        message: "Story not found.",
      });
    }

    await deletePost(id);

    return res.status(200).json({
      success: true,
      message: "Story deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Story Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createStory,
  getStories,
  getStoriesByUser,
  removeStory,
};