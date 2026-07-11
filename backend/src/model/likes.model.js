const { pool } = require("../config/postgres");

const addLike = async (user_id, post_id) => {
  const result = await pool.query(
    `
    INSERT INTO likes (user_id, post_id)
    VALUES ($1, $2)
    RETURNING *;
    `,
    [user_id, post_id],
  );

  return result.rows[0];
};

const removeLike = async (user_id, post_id) => {
  const result = await pool.query(
    `
    DELETE FROM likes
    WHERE user_id = $1
      AND post_id = $2
    RETURNING *;
    `,
    [user_id, post_id],
  );

  return result.rows[0];
};

const isLiked = async (user_id, post_id) => {
  const result = await pool.query(
    `
    SELECT *
    FROM likes
    WHERE user_id = $1
      AND post_id = $2;
    `,
    [user_id, post_id],
  );

  return result.rows[0];
};

const getPostLikesCount = async (post_id) => {
  const result = await pool.query(
    `
    SELECT COUNT(*) AS total_likes
    FROM likes
    WHERE post_id = $1;
    `,
    [post_id],
  );

  return Number(result.rows[0].total_likes);
};

const getLikedUsers = async (post_id) => {
  const result = await pool.query(
    `
    SELECT
      u.id,
      u.username,
      u.email,
      u.bio,
      u.profile_pic
    FROM likes l
    JOIN users u
      ON l.user_id = u.id
    WHERE l.post_id = $1;
    `,
    [post_id],
  );

  return result.rows;
};

module.exports = {
  addLike,
  removeLike,
  isLiked,
  getPostLikesCount,
  getLikedUsers,
};
