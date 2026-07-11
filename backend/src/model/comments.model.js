const { pool } = require("../config/postgres");

const createComment = async (user_id, post_id, comment) => {
  const result = await pool.query(
    `
    INSERT INTO comments (
      user_id,
      post_id,
      comment
    )
    VALUES ($1, $2, $3)
    RETURNING *;
    `,
    [user_id, post_id, comment],
  );

  return result.rows[0];
};

const getCommentsByPost = async (post_id) => {
  const result = await pool.query(
    `
    SELECT
      c.id,
      c.comment,
      c.created_at,
      c.updated_at,
      u.id AS user_id,
      u.username,
      u.profile_pic
    FROM comments c
    JOIN users u
      ON c.user_id = u.id
    WHERE c.post_id = $1
    ORDER BY c.created_at ASC;
    `,
    [post_id],
  );

  return result.rows;
};

const getCommentById = async (id) => {
  const result = await pool.query(
    `
    SELECT *
    FROM comments
    WHERE id = $1;
    `,
    [id],
  );

  return result.rows[0];
};

const updateComment = async (id, comment) => {
  const result = await pool.query(
    `
    UPDATE comments
    SET
      comment = $1,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *;
    `,
    [comment, id],
  );

  return result.rows[0];
};

const deleteComment = async (id) => {
  const result = await pool.query(
    `
    DELETE FROM comments
    WHERE id = $1
    RETURNING *;
    `,
    [id],
  );

  return result.rows[0];
};

module.exports = {
  createComment,
  getCommentsByPost,
  getCommentById,
  updateComment,
  deleteComment,
};
