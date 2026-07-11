const { pool } = require("../config/postgres");

//followuser
const followUser = async (follower_id, following_id) => {
  const result = await pool.query(
    `
        INSERT INTO followers( follower_id ,following_id)
        VALUES($1,$2)
        RETURNING *;
        `,
    [follower_id, following_id],
  );
  return result.rows[0];
};

// isfollowing

const isFollowing = async (follower_id, following_id) => {
  const result = await pool.query(
    `
    SELECT *
    FROM followers
    WHERE follower_id = $1
      AND following_id = $2;
    `,
    [follower_id, following_id],
  );

  return result.rows[0];
};

// Unfollow User
const unfollowUser = async (follower_id, following_id) => {
  const result = await pool.query(
    `
    DELETE FROM followers
    WHERE follower_id = $1
      AND following_id = $2
    RETURNING *;
    `,
    [follower_id, following_id],
  );

  return result.rows[0];
};

// Get Followers
const getFollowers = async (user_id) => {
  const result = await pool.query(
    `
    SELECT
      u.id,
      u.username,
      u.email,
      u.bio,
      u.profile_pic
    FROM followers f
    JOIN users u
      ON f.follower_id = u.id
    WHERE f.following_id = $1;
    `,
    [user_id],
  );

  return result.rows;
};

// Get Following
const getFollowing = async (user_id) => {
  const result = await pool.query(
    `
    SELECT
      u.id,
      u.username,
      u.email,
      u.bio,
      u.profile_pic
    FROM followers f
    JOIN users u
      ON f.following_id = u.id
    WHERE f.follower_id = $1;
    `,
    [user_id],
  );

  return result.rows;
};

// Followers Count
const getFollowersCount = async (user_id) => {
  const result = await pool.query(
    `
    SELECT COUNT(*) AS followers_count
    FROM followers
    WHERE following_id = $1;
    `,
    [user_id],
  );

  return Number(result.rows[0].followers_count);
};

// Following Count
const getFollowingCount = async (user_id) => {
  const result = await pool.query(
    `
    SELECT COUNT(*) AS following_count
    FROM followers
    WHERE follower_id = $1;
    `,
    [user_id],
  );

  return Number(result.rows[0].following_count);
};

module.exports = {
  followUser,
  isFollowing,
  unfollowUser,
  getFollowers,
  getFollowing,
  getFollowersCount,
  getFollowingCount,
};
