// backend/src/database.ts
import { Pool, PoolClient } from "pg";
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
  content: string;
  model_name: string | null;
  created_at: Date;
}

export async function getChatMessages(
  chatId: string,
  googleId: string
): Promise<DbMessage[]> {
  const result = await pool.query(
    "SELECT * FROM messages WHERE chat_id = $1 ORDER BY created_at ASC",
    [chatId]
  );

  if (result.rows.length === 0) return [];

  const userKey = deriveUserKey(googleId);

  return result.rows.map((row) => {
    // Only attempt decryption if the value looks like a valid encrypted blob.
    // Plain-text legacy messages are short or contain characters not in base64.
    const looksEncrypted =
      row.content &&
      row.content.length >= 44 &&
      /^[A-Za-z0-9+/]+=*$/.test(row.content);

    if (!looksEncrypted) {
      // Legacy plain-text message — return as-is
      return row as DbMessage;
    }

    try {
      return {
        ...row,
        content: decryptMessage(row.content, userKey),
      } as DbMessage;
    } catch (err) {
      // Decryption failed on something that looked encrypted.
      // Log with message_id so it can be investigated, but do NOT
      // return raw ciphertext — return a safe placeholder instead.
      console.error(
        `Decryption failed for message ${row.message_id}:`,
        (err as Error).message
      );
      return {
        ...row,
        content: "[Message could not be decrypted]",
      } as DbMessage;
    }
  });
}

export async function createMessage(
  chatId: string,
  role: "system" | "user" | "assistant",
  content: string,
  googleId: string,
  modelName?: string
): Promise<DbMessage> {
  const userKey = deriveUserKey(googleId);
  const encryptedContent = encryptMessage(content, userKey);

  // Use a transaction so the message insert and chat timestamp update
  // are atomic — if either fails, neither is committed.
  const client: PoolClient = await pool.connect();
  try {
    await client.query("BEGIN");

    const result = await client.query(
      `INSERT INTO messages (chat_id, role, content, model_name)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [chatId, role, encryptedContent, modelName || null]
    );

    // Touch the chat's updated_at so sidebar ordering stays current.
    // The trigger on chats fires on UPDATE and also sets updated_at = NOW(),
    // but explicitly setting it here is harmless and makes intent clear.
    await client.query(
      "UPDATE chats SET updated_at = NOW() WHERE chat_id = $1",
      [chatId]
    );

    await client.query("COMMIT");

    return {
      ...result.rows[0],
      content, // return original plain text to callers
    } as DbMessage;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
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