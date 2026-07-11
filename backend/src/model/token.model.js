const { pool } = require("../config/postgres");

/**
 * Inserts a new refresh token into the database
 */
const createRefreshToken = async ({
  userId,
  token,
  expiresAt,
  ipAddress = "",
  userAgent = "",
}) => {
  const result = await pool.query(
    `
    INSERT INTO refresh_tokens 
    (user_id, token, expires_at, ip_address, user_agent)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
    `,
    [userId, token, expiresAt, ipAddress, userAgent]
  );
  return result.rows[0];
};

/**
 * Finds a refresh token details
 */
const findRefreshToken = async (token) => {
  const result = await pool.query(
    "SELECT * FROM refresh_tokens WHERE token = $1",
    [token]
  );
  return result.rows[0];
};

/**
 * Revokes a specific refresh token by marking it revoked
 */
const revokeRefreshToken = async (token, replacedBy = null) => {
  const result = await pool.query(
    `
    UPDATE refresh_tokens 
    SET revoked = TRUE, replaced_by = $1
    WHERE token = $2
    RETURNING *;
    `,
    [replacedBy, token]
  );
  return result.rows[0];
};

/**
 * Revokes all refresh tokens belonging to a user (used if token reuse is detected)
 */
const revokeAllUserTokens = async (userId) => {
  const result = await pool.query(
    `
    UPDATE refresh_tokens 
    SET revoked = TRUE 
    WHERE user_id = $1;
    `,
    [userId]
  );
  return result.rowCount;
};

/**
 * Deletes expired tokens from database to free space
 */
const deleteExpiredTokens = async () => {
  const result = await pool.query(
    `
    DELETE FROM refresh_tokens 
    WHERE expires_at < CURRENT_TIMESTAMP;
    `
  );
  return result.rowCount;
};

module.exports = {
  createRefreshToken,
  findRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  deleteExpiredTokens,
};
