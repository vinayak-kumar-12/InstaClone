const { Pool } = require("pg");

// Dual-environment host resolution: Service name inside Docker, localhost outside Docker
const isDocker = process.env.IS_DOCKER === "true" || process.env.DOCKER_ENV === "true";
const rawHost = process.env.DB_HOST || "localhost";
const dbHost = isDocker ? (rawHost === "localhost" || rawHost === "127.0.0.1" ? "postgres" : rawHost) : (rawHost === "postgres" ? "localhost" : rawHost);

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: dbHost,
  database: process.env.DB_DATABASE || "InstaClone",
  password: process.env.DB_PASSWORD || "1234",
  port: parseInt(process.env.DB_PORT, 10) || 5432,
});

const postDB = async () => {
  try {
    const client = await pool.connect();
    console.log(`PostgreSQL Connected successfully (${dbHost}:${process.env.DB_PORT || 5432})`);

    // Alter users table to add failed login attempts and lockout timestamp if not exists
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS lock_until TIMESTAMP WITHOUT TIME ZONE DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS website VARCHAR(100) DEFAULT '',
      ADD COLUMN IF NOT EXISTS location VARCHAR(50) DEFAULT '';
    `);

    // Create indexes if they don't exist
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);
    `);

    // Create refresh_tokens table for rotation and revocation tracking
    await client.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(512) NOT NULL UNIQUE,
        expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        revoked BOOLEAN DEFAULT FALSE,
        replaced_by VARCHAR(512),
        ip_address VARCHAR(100),
        user_agent VARCHAR(255)
      );
    `);

    // Create index on refresh_tokens token for fast lookup
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
    `);

    // Create chats table
    await client.query(`
      CREATE TABLE IF NOT EXISTS chats (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create chat_participants table
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_participants (
        chat_id INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        PRIMARY KEY (chat_id, user_id)
      );
    `);

    // Create messages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        chat_id INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        message_type VARCHAR(50) DEFAULT 'text',
        is_seen BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    client.release();
    console.log("PostgreSQL Database Migrations Executed");
  } catch (error) {
    console.error("PostgreSQL Connection or Migration Failed:", error.message);
  }
};

module.exports = {
  pool,
  postDB,
};
