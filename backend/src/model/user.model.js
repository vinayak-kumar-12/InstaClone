const { pool } = require("../config/postgres");

const createUser = async ({
  username,
  email,
  password,
  bio = "",
  profilePic = "",
}) => {
  const result = await pool.query(
    `
    INSERT INTO users 
    (username,email,password,bio,profile_pic)

    VALUES($1,$2,$3,$4,$5)

    RETURNING *;
    `,
    [username, email, password, bio, profilePic],
  );

  return result.rows[0];
};

const findUserByEmail = async (email) => {
  const result = await pool.query("SELECT * FROM users WHERE email=$1", [
    email,
  ]);

  return result.rows[0];
};

const findUserByUsername = async (username) => {
  const result = await pool.query("SELECT * FROM users WHERE username=$1", [
    username,
  ]);

  return result.rows[0];
};

const findUserById = async (id) => {
  const result = await pool.query("SELECT * FROM users WHERE id=$1", [id]);

  return result.rows[0];
};

const incrementFailedAttempts = async (id) => {
  const result = await pool.query(
    "UPDATE users SET failed_login_attempts = failed_login_attempts + 1 WHERE id = $1 RETURNING failed_login_attempts",
    [id]
  );
  return result.rows[0] ? result.rows[0].failed_login_attempts : 0;
};

const lockAccount = async (id, lockUntil) => {
  const result = await pool.query(
    "UPDATE users SET lock_until = $1 WHERE id = $2 RETURNING lock_until",
    [lockUntil, id]
  );
  return result.rows[0] ? result.rows[0].lock_until : null;
};

const resetFailedAttempts = async (id) => {
  await pool.query(
    "UPDATE users SET failed_login_attempts = 0, lock_until = NULL WHERE id = $1",
    [id]
  );
};

const searchUsersModel = async (query, currentUserId) => {
  const result = await pool.query(
    `
    SELECT id, username, email, bio, profile_pic
    FROM users
    WHERE username ILIKE $1
      AND id <> $2
    LIMIT 20;
    `,
    [`%${query}%`, currentUserId]
  );
  return result.rows;
};

module.exports = {
  createUser,
  findUserByEmail,
  findUserByUsername,
  findUserById,
  incrementFailedAttempts,
  lockAccount,
  resetFailedAttempts,
  searchUsersModel,
};
