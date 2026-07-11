const { pool } = require("../config/postgres");

/**
 * Finds a direct 1-to-1 chat between two users
 * @param {number} user1 - ID of the first user
 * @param {number} user2 - ID of the second user
 * @returns {Promise<object|null>} - Resolves with the chat ID if it exists
 */
const findChatBetweenUsers = async (user1, user2) => {
  const query = `
    SELECT cp1.chat_id
    FROM chat_participants cp1
    JOIN chat_participants cp2 ON cp1.chat_id = cp2.chat_id
    WHERE cp1.user_id = $1 AND cp2.user_id = $2
      AND (SELECT COUNT(*) FROM chat_participants WHERE chat_id = cp1.chat_id) = 2
    LIMIT 1;
  `;
  const result = await pool.query(query, [user1, user2]);
  return result.rows[0] ? result.rows[0] : null;
};

/**
 * Creates a new direct chat between two users inside a transaction
 * @param {number} user1 - ID of the first user
 * @param {number} user2 - ID of the second user
 * @returns {Promise<object>} - Resolves with the created chat details
 */
const createChat = async (user1, user2) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Insert new chat record
    const chatResult = await client.query(
      "INSERT INTO chats (created_at, updated_at) VALUES (CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *"
    );
    const chat = chatResult.rows[0];

    // Insert participants
    const insertParticipantsQuery = `
      INSERT INTO chat_participants (chat_id, user_id)
      VALUES ($1, $2), ($1, $3);
    `;
    await client.query(insertParticipantsQuery, [chat.id, user1, user2]);

    await client.query("COMMIT");
    return chat;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Gets all chats for a given user, including participant info, last message, and unseen count
 * @param {number} userId - ID of the logged-in user
 * @returns {Promise<Array>} - Resolves with a list of chats
 */
const getUserChats = async (userId) => {
  const query = `
    SELECT 
      c.id AS chat_id,
      c.created_at,
      c.updated_at,
      u.id AS participant_id,
      u.username AS participant_username,
      u.profile_pic AS participant_profile_pic,
      m.message AS last_message,
      m.created_at AS last_message_time,
      m.sender_id AS last_message_sender_id,
      (
        SELECT COUNT(*)::int
        FROM messages 
        WHERE chat_id = c.id AND sender_id = u.id AND is_seen = FALSE
      ) AS unseen_messages_count
    FROM chats c
    JOIN chat_participants cp ON c.id = cp.chat_id
    JOIN chat_participants cp_other ON c.id = cp_other.chat_id AND cp_other.user_id != $1
    JOIN users u ON cp_other.user_id = u.id
    LEFT JOIN LATERAL (
      SELECT message, created_at, sender_id
      FROM messages
      WHERE chat_id = c.id
      ORDER BY created_at DESC
      LIMIT 1
    ) m ON TRUE
    WHERE cp.user_id = $1
    ORDER BY COALESCE(m.created_at, c.updated_at) DESC;
  `;
  const result = await pool.query(query, [userId]);
  return result.rows;
};

/**
 * Gets a specific chat's details and verify participants
 * @param {number} chatId - ID of the chat
 * @returns {Promise<object|null>} - Resolves with the chat and its participants
 */
const getChatById = async (chatId) => {
  const query = `
    SELECT 
      c.id AS chat_id,
      c.created_at,
      c.updated_at,
      json_agg(
        json_build_object(
          'id', u.id,
          'username', u.username,
          'profile_pic', u.profile_pic
        )
      ) AS participants
    FROM chats c
    JOIN chat_participants cp ON c.id = cp.chat_id
    JOIN users u ON cp.user_id = u.id
    WHERE c.id = $1
    GROUP BY c.id;
  `;
  const result = await pool.query(query, [chatId]);
  return result.rows[0] ? result.rows[0] : null;
};

/**
 * Helper function to check if a user is a participant of a chat
 * @param {number} chatId - ID of the chat
 * @param {number} userId - ID of the user
 * @returns {Promise<boolean>} - Resolves with true if the user is a participant
 */
const isParticipant = async (chatId, userId) => {
  const query = `
    SELECT 1 
    FROM chat_participants 
    WHERE chat_id = $1 AND user_id = $2 
    LIMIT 1;
  `;
  const result = await pool.query(query, [chatId, userId]);
  return result.rows.length > 0;
};

module.exports = {
  findChatBetweenUsers,
  createChat,
  getUserChats,
  getChatById,
  isParticipant,
};
