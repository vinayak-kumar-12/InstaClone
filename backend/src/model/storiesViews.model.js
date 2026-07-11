const { pool } = require("../config/postgres");

// Add Story View
const addStoryView = async (story_id, viewer_id) => {
  const result = await pool.query(
    `
    INSERT INTO story_views (
      story_id,
      viewer_id
    )
    VALUES ($1, $2)
    RETURNING *;
    `,
    [story_id, viewer_id],
  );

  return result.rows[0];
};

// Check Already Viewed
const hasViewedStory = async (story_id, viewer_id) => {
  const result = await pool.query(
    `
    SELECT *
    FROM story_views
    WHERE story_id = $1
      AND viewer_id = $2;
    `,
    [story_id, viewer_id],
  );

  return result.rows[0];
};

// Get Story Viewers
const getStoryViews = async (story_id) => {
  const result = await pool.query(
    `
    SELECT
      u.id,
      u.username,
      u.profile_pic,
      sv.viewed_at
    FROM story_views sv
    JOIN users u
      ON sv.viewer_id = u.id
    WHERE sv.story_id = $1
    ORDER BY sv.viewed_at DESC;
    `,
    [story_id],
  );

  return result.rows;
};

// Story Views Count
const getStoryViewsCount = async (story_id) => {
  const result = await pool.query(
    `
    SELECT COUNT(*) AS views_count
    FROM story_views
    WHERE story_id = $1;
    `,
    [story_id],
  );

  return Number(result.rows[0].views_count);
};

module.exports = {
  addStoryView,
  hasViewedStory,
  getStoryViews,
  getStoryViewsCount,
};
