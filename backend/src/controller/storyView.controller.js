const {
  addStoryView,
  hasViewedStory,
  getStoryViewers,
  getStoryViewsCount,
} = require("../model/storiesViews.model");

const { getPostById } = require("../model/post.model");

// View Story
const viewStoryController = async (req, res) => {
  try {
    const viewer_id = req.user.id;
    const { storyId } = req.params;

    const story = await getPostById(storyId);

    if (!story || story.post_type !== "story") {
      return res.status(404).json({
        success: false,
        message: "Story not found.",
      });
    }

    const viewed = await hasViewedStory(storyId, viewer_id);

    if (viewed) {
      return res.status(200).json({
        success: true,
        message: "Story already viewed.",
      });
    }

    const view = await addStoryView(storyId, viewer_id);

    return res.status(201).json({
      success: true,
      message: "Story viewed successfully.",
      view,
    });
  } catch (error) {
    console.error("View Story Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get Story Viewers
const getStoryViewersController = async (req, res) => {
  try {
    const { storyId } = req.params;

    const story = await getPostById(storyId);

    if (!story || story.post_type !== "story") {
      return res.status(404).json({
        success: false,
        message: "Story not found.",
      });
    }

    const viewers = await getStoryViewers(storyId);

    return res.status(200).json({
      success: true,
      count: viewers.length,
      viewers,
    });
  } catch (error) {
    console.error("Get Story Viewers Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get Story Views Count
const getStoryViewsCountController = async (req, res) => {
  try {
    const { storyId } = req.params;

    const story = await getPostById(storyId);

    if (!story || story.post_type !== "story") {
      return res.status(404).json({
        success: false,
        message: "Story not found.",
      });
    }

    const views = await getStoryViewsCount(storyId);

    return res.status(200).json({
      success: true,
      views,
    });
  } catch (error) {
    console.error("Get Story Views Count Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  viewStoryController,
  getStoryViewersController,
  getStoryViewsCountController,
};