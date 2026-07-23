const { pool } = require("../config/postgres");

// Create Post / Reel / Story
const createPost = async ({
  user_id,
  caption,
  media_url,
  media_type,
  post_type = "post",
  location = "",
}) => {
  const result = await pool.query(
    `
    INSERT INTO posts (
      user_id,
      caption,
      media_url,
      media_type,
      post_type,
      location
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
    `,
    [user_id, caption, media_url, media_type, post_type, location],
  );

  return result.rows[0];
};

// Get Post By ID
const getPostById = async (id, currentUserId = null) => {
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
        AND l.user_id = $2
      ) AS is_liked

    FROM posts p

    JOIN users u
      ON p.user_id = u.id

    WHERE p.id = $1;
    `,
    [id, currentUserId],
  );

  return result.rows[0];
};

// Get All Posts (Only Normal Posts)
const getAllPosts = async (limit = 20, offset = 0, currentUserId = null) => {
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
        AND l.user_id = $3
      ) AS is_liked

    FROM posts p

    JOIN users u
      ON p.user_id = u.id

    WHERE p.post_type = 'post'
    ORDER BY p.created_at DESC
    LIMIT $1
    OFFSET $2;
    `,
    [limit, offset, currentUserId],
  );

  return result.rows;
};

// Get All Reels
const getAllReels = async (limit = 20, offset = 0) => {
  const result = await pool.query(
    `
    SELECT *
    FROM posts
    WHERE post_type = 'reel'
    ORDER BY created_at DESC
    LIMIT $1
    OFFSET $2;
    `,
    [limit, offset],
  );

  return result.rows;
};

// Get User Posts
const getPostsByUser = async (user_id, currentUserId = null) => {
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
        AND l.user_id = $2
      ) AS is_liked

    FROM posts p

    JOIN users u
      ON p.user_id = u.id

    WHERE p.user_id = $1
      AND p.post_type = 'post'
    ORDER BY p.created_at DESC;
    `,
    [user_id, currentUserId],
  );

  return result.rows;
};

// Get User Reels
const getReelsByUser = async (user_id) => {
  const result = await pool.query(
    `
    SELECT *
    FROM posts
    WHERE user_id = $1
      AND post_type = 'reel'
    ORDER BY created_at DESC;
    `,
    [user_id],
  );

  return result.rows;
};

// Update Post / Reel
const updatePost = async (id, caption, location) => {
  const result = await pool.query(
    `
    UPDATE posts
    SET
      caption = $1,
      location = $2,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
    RETURNING *;
    `,
    [caption, location, id],
  );

  return result.rows[0];
};

// Delete Post / Reel
const deletePost = async (id) => {
  const result = await pool.query(
    `
    DELETE FROM posts
    WHERE id = $1
    RETURNING *;
    `,
    [id],
  );

  return result.rows[0];
};
const getAllStories = async () => {
  const result = await pool.query(
    `
    SELECT
      p.*,
      u.username,
      u.profile_pic
    FROM posts p
    JOIN users u
      ON p.user_id = u.id
    WHERE p.post_type = 'story'
      AND p.created_at >= NOW() - INTERVAL '24 HOURS'
    ORDER BY p.created_at DESC;
    `,
  );

  return result.rows;
};
const getUserStories = async (user_id) => {
  const result = await pool.query(
    `
    SELECT *
    FROM posts
    WHERE user_id = $1
      AND post_type = 'story'
      AND created_at >= NOW() - INTERVAL '24 HOURS'
    ORDER BY created_at DESC;
    `,
    [user_id],
  );

  return result.rows;
};

module.exports = {
  createPost,
  getPostById,
  getAllPosts,
  getAllReels,
  getPostsByUser,
  getReelsByUser,
  updatePost,
  deletePost,
  getUserStories,
  getAllStories,
};
