// backend/src/database.ts
import { Pool } from "pg";
import { config } from "./config";
import { deriveUserKey, encryptMessage, decryptMessage } from "./services/encryption";

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  console.error("Unexpected database pool error:", err);
});

// ─── User queries ──────────────────────────────────────────────────────────────

export interface DbUser {
  user_id: string;
  google_id: string;
  email: string;
  name: string;
  profile_picture: string | null;
  created_at: Date;
  updated_at: Date;
}

export async function findUserByGoogleId(googleId: string): Promise<DbUser | null> {
  const result = await pool.query(
    "SELECT * FROM users WHERE google_id = $1",
    [googleId]
  );
  return result.rows[0] || null;
}

export async function createUser(
  googleId: string,
  email: string,
  name: string,
  profilePicture: string | null
): Promise<DbUser> {
  const result = await pool.query(
    `INSERT INTO users (google_id, email, name, profile_picture)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (google_id) DO UPDATE SET
       email = EXCLUDED.email,
       name = EXCLUDED.name,
       profile_picture = EXCLUDED.profile_picture
     RETURNING *`,
    [googleId, email, name, profilePicture]
  );
  return result.rows[0];
}

// ─── Chat queries ──────────────────────────────────────────────────────────────

export interface DbChat {
  chat_id: string;
  user_id: string;
  model_id: string | null;
  title: string;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
}

export async function getUserChats(userId: string): Promise<DbChat[]> {
  const result = await pool.query(
    `SELECT * FROM chats
     WHERE user_id = $1 AND is_deleted = FALSE
     ORDER BY updated_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function getChatById(
  chatId: string,
  userId: string
): Promise<DbChat | null> {
  const result = await pool.query(
    "SELECT * FROM chats WHERE chat_id = $1 AND user_id = $2 AND is_deleted = FALSE",
    [chatId, userId]
  );
  return result.rows[0] || null;
}

export async function createChat(
  userId: string,
  title?: string
): Promise<DbChat> {
  const result = await pool.query(
    "INSERT INTO chats (user_id, title) VALUES ($1, $2) RETURNING *",
    [userId, title || "New Chat"]
  );
  return result.rows[0];
}

export async function updateChatTitle(
  chatId: string,
  userId: string,
  title: string
): Promise<DbChat | null> {
  const result = await pool.query(
    `UPDATE chats SET title = $1
     WHERE chat_id = $2 AND user_id = $3 AND is_deleted = FALSE
     RETURNING *`,
    [title, chatId, userId]
  );
  return result.rows[0] || null;
}

export async function softDeleteChat(
  chatId: string,
  userId: string
): Promise<boolean> {
  const result = await pool.query(
    "UPDATE chats SET is_deleted = TRUE WHERE chat_id = $1 AND user_id = $2",
    [chatId, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

// ─── Message queries (WITH ENCRYPTION) ────────────────────────────────────────

export interface DbMessage {
  message_id: string;
  chat_id: string;
  role: "system" | "user" | "assistant";
  content: string;           // Always DECRYPTED when returned from these functions
  model_name: string | null;
  created_at: Date;
}

/**
 * Retrieves all messages for a chat, decrypting content using the user's key.
 *
 * @param chatId   - The chat to fetch messages for
 * @param googleId - The owning user's Google ID (used to derive decryption key)
 */
export async function getChatMessages(
  chatId: string,
  googleId: string        // ← NEW PARAMETER
): Promise<DbMessage[]> {
  const result = await pool.query(
    "SELECT * FROM messages WHERE chat_id = $1 ORDER BY created_at ASC",
    [chatId]
  );

  if (result.rows.length === 0) return [];

  // Derive the user's unique decryption key
  const userKey = deriveUserKey(googleId);

  // Decrypt every message
  return result.rows.map((row) => {
    try {
      return {
        ...row,
        content: decryptMessage(row.content, userKey),
      };
    } catch (err) {
      // If decryption fails (e.g., legacy plain-text message), return as-is
      // Remove this fallback after running the migration script
      console.warn(`Failed to decrypt message ${row.message_id}, returning raw`);
      return row;
    }
  });
}

/**
 * Saves a message, encrypting the content with the user's key.
 *
 * @param chatId    - The chat to save to
 * @param role      - 'user' | 'assistant' | 'system'
 * @param content   - Plain text content (will be encrypted before storage)
 * @param googleId  - The owning user's Google ID (used to derive encryption key)
 * @param modelName - Optional model name
 */
export async function createMessage(
  chatId: string,
  role: "system" | "user" | "assistant",
  content: string,
  googleId: string,       // ← NEW PARAMETER
  modelName?: string
): Promise<DbMessage> {
  // Derive the user's unique encryption key
  const userKey = deriveUserKey(googleId);

  // Encrypt the content before storing
  const encryptedContent = encryptMessage(content, userKey);

  const result = await pool.query(
    `INSERT INTO messages (chat_id, role, content, model_name)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [chatId, role, encryptedContent, modelName || null]
  );

  // Touch the chat's updated_at
  await pool.query(
    "UPDATE chats SET updated_at = NOW() WHERE chat_id = $1",
    [chatId]
  );

  // Return with DECRYPTED content (so callers always get plain text)
  return {
    ...result.rows[0],
    content, // original plain text
  };
}

// ─── Model queries ─────────────────────────────────────────────────────────────

export async function getAvailableModels(): Promise<
  { model_id: string; name: string }[]
> {
  const result = await pool.query(
    "SELECT model_id, name FROM models ORDER BY name"
  );
  return result.rows;
}