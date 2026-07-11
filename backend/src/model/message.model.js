const { pool } = require("../config/postgres");

/**
 * Creates a message and updates the chat's updated_at timestamp in a transaction
 * @param {object} params - Message parameter object
 * @returns {Promise<object>} - Resolves with the created message
 */
const createMessage = async ({ chatId, senderId, message, messageType = "text" }) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Insert message record
    const insertMessageQuery = `
      INSERT INTO messages (chat_id, sender_id, message, message_type, is_seen, created_at, updated_at)
      VALUES ($1, $2, $3, $4, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *;
    `;
    const messageResult = await client.query(insertMessageQuery, [
      chatId,
      senderId,
      message,
      messageType,
    ]);
    const newMessage = messageResult.rows[0];

    // Update the parent chat's updated_at timestamp
    await client.query(
      "UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [chatId]
    );

    await client.query("COMMIT");
    return newMessage;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Fetches all messages for a given chat, ordered by creation time
 * @param {number} chatId - ID of the chat
 * @returns {Promise<Array>} - List of messages
 */
const getMessagesByChatId = async (chatId) => {
  const query = `
    SELECT 
      m.id,
      m.chat_id,
      m.sender_id,
      m.message,
      m.message_type,
      m.is_seen,
      m.created_at,
      m.updated_at,
      u.username AS sender_username,
      u.profile_pic AS sender_profile_pic
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.chat_id = $1
    ORDER BY m.created_at ASC;
  `;
  const result = await pool.query(query, [chatId]);
  return result.rows;
};

/**
 * Deletes a message by its ID, ensuring that only the sender can delete it
 * @param {number} messageId - ID of the message to delete
 * @param {number} senderId - ID of the user requesting deletion
 * @returns {Promise<object|null>} - Deleted message details, or null if unauthorized/not found
 */
const deleteMessageById = async (messageId, senderId) => {
  const query = `
    DELETE FROM messages 
    WHERE id = $1 AND sender_id = $2 
    RETURNING *;
  `;
  const result = await pool.query(query, [messageId, senderId]);
  return result.rows[0] ? result.rows[0] : null;
};

/**
 * Marks all incoming messages in a chat as seen by updating their status
 * @param {number} chatId - ID of the chat
 * @param {number} userId - ID of the current user (marking other person's messages as seen)
 * @returns {Promise<number>} - Count of messages marked as seen
 */
const markMessagesAsSeen = async (chatId, userId) => {
  const query = `
    UPDATE messages 
    SET is_seen = TRUE, updated_at = CURRENT_TIMESTAMP
    WHERE chat_id = $1 AND sender_id != $2 AND is_seen = FALSE
    RETURNING *;
  `;
  const result = await pool.query(query, [chatId, userId]);
  return result.rowCount;
};

/**
 * Fetches a single message with sender username and profile picture details
 * @param {number} messageId - ID of the message
 * @returns {Promise<object|null>} - Message object, or null if not found
 */
const getMessageById = async (messageId) => {
  const query = `
    SELECT 
      m.id,
      m.chat_id,
      m.sender_id,
      m.message,
      m.message_type,
      m.is_seen,
      m.created_at,
      m.updated_at,
      u.username AS sender_username,
      u.profile_pic AS sender_profile_pic
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.id = $1;
  `;
  const result = await pool.query(query, [messageId]);
  return result.rows[0] ? result.rows[0] : null;
};

module.exports = {
  createMessage,
  getMessagesByChatId,
  deleteMessageById,
  markMessagesAsSeen,
  getMessageById,
};
