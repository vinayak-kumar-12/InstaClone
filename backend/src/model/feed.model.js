const { pool } = require("../config/postgres");

const getUserFeed = async (user_id, limit = 20, offset = 0) => {
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

    FROM posts p

    JOIN users u
      ON p.user_id = u.id

    WHERE p.post_type = 'post'
      AND (p.user_id = $1 OR p.user_id IN (
        SELECT following_id
        FROM followers
        WHERE follower_id = $1
      ))

    ORDER BY p.created_at DESC

    LIMIT $2
    OFFSET $3;
    `,
    [user_id, limit, offset]
  );

  return result.rows;
};

module.exports = {
  getUserFeed,
};