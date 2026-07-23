const { pool } = require("../config/postgres");

// Save Post
const savePost = async (user_id, post_id) => {
  const result = await pool.query(
    `
    INSERT INTO saved_posts (
      user_id,
      post_id
    )
    VALUES ($1, $2)
    RETURNING *;
    `,
    [user_id, post_id]
  );

  return result.rows[0];
};

// Check Saved Post
const isPostSaved = async (user_id, post_id) => {
  const result = await pool.query(
    `
    SELECT *
    FROM saved_posts
    WHERE user_id = $1
      AND post_id = $2;
    `,
    [user_id, post_id]
  );

  return result.rows[0];
};

// Unsave Post
const unsavePost = async (user_id, post_id) => {
  const result = await pool.query(
    `
    DELETE FROM saved_posts
    WHERE user_id = $1
      AND post_id = $2
    RETURNING *;
    `,
    [user_id, post_id]
  );

  return result.rows[0];
};

// Get Saved Posts
const getSavedPosts = async (user_id) => {
  const result = await pool.query(
    `
    SELECT
      p.id,
      p.caption,
      p.media_url,
      p.media_type,
      p.location,
      p.created_at,

      u.id AS user_id,
      u.username,
      u.profile_pic,

      (
        SELECT COUNT(*)
        FROM likes l
        WHERE l.post_id = p.id
      ) AS likes_count,

      (
        SELECT COUNT(*)
        FROM comments c
        WHERE c.post_id = p.id
      ) AS comments_count,

      EXISTS (
        SELECT 1
        FROM likes l
        WHERE l.post_id = p.id
        AND l.user_id = $1
      ) AS is_liked

    FROM saved_posts s

    JOIN posts p
      ON s.post_id = p.id

    JOIN users u
      ON p.user_id = u.id

    WHERE s.user_id = $1

    ORDER BY s.created_at DESC;
    `,
    [user_id]
  );

  return result.rows;
};

// Saved Posts Count
const getSavedPostsCount = async (user_id) => {
  const result = await pool.query(
    `
    SELECT COUNT(*) AS saved_count
    FROM saved_posts
    WHERE user_id = $1;
    `,
    [user_id]
  );

  return Number(result.rows[0].saved_count);
};

module.exports = {
  savePost,
  isPostSaved,
  unsavePost,
  getSavedPosts,
  getSavedPostsCount,
};