import { Pool, PoolClient } from "pg";
import { config } from "./config";
import { logger } from "./index";

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  console.error("Unexpected database pool error:", err);
});

// ─── User queries ──────────────────────────────────────────

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
  const result = await pool.query("SELECT * FROM users WHERE google_id = $1", [googleId]);
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

// ─── Chat queries ──────────────────────────────────────────

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

export async function getChatById(chatId: string, userId: string): Promise<DbChat | null> {
  const result = await pool.query(
    "SELECT * FROM chats WHERE chat_id = $1 AND user_id = $2 AND is_deleted = FALSE",
    [chatId, userId]
  );
  return result.rows[0] || null;
}

export async function createChat(userId: string, title?: string): Promise<DbChat> {
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
    "UPDATE chats SET title = $1 WHERE chat_id = $2 AND user_id = $3 AND is_deleted = FALSE RETURNING *",
    [title, chatId, userId]
  );
  return result.rows[0] || null;
}

export async function softDeleteChat(chatId: string, userId: string): Promise<boolean> {
  const result = await pool.query(
    "UPDATE chats SET is_deleted = TRUE WHERE chat_id = $1 AND user_id = $2",
    [chatId, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

// ─── Message queries ───────────────────────────────────────

export interface DbMessage {
  message_id: string;
  chat_id: string;
  role: "system" | "user" | "assistant";
  content: string;
  model_name: string | null;
  created_at: Date;
}

export async function getChatMessages(chatId: string): Promise<DbMessage[]> {
  const result = await pool.query(
    "SELECT * FROM messages WHERE chat_id = $1 ORDER BY created_at ASC",
    [chatId]
  );
  return result.rows;
}

export async function createMessage(
  chatId: string,
  role: "system" | "user" | "assistant",
  content: string,
  modelName?: string
): Promise<DbMessage> {
  const result = await pool.query(
    `INSERT INTO messages (chat_id, role, content, model_name)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [chatId, role, content, modelName || null]
  );

  // Touch the chat's updated_at
  await pool.query("UPDATE chats SET updated_at = NOW() WHERE chat_id = $1", [chatId]);

  return result.rows[0];
}

// ─── Model queries ─────────────────────────────────────────

export async function getAvailableModels(): Promise<{ model_id: string; name: string }[]> {
  const result = await pool.query("SELECT model_id, name FROM models ORDER BY name");
  return result.rows;
}