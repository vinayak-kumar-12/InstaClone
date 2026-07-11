const { getUserFeed } = require("../model/feed.model");

const getFeed = async (req, res) => {
  try {
    const user_id = req.user.id;

    const limit = Number(req.query.limit) || 20;
    const offset = Number(req.query.offset) || 0;

    const posts = await getUserFeed(user_id, limit, offset);

    return res.status(200).json({
      success: true,
      count: posts.length,
      posts,
    });
  } catch (error) {
    console.error("Get Feed Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getFeed,
};
