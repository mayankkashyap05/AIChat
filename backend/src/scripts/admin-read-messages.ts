/**
 * ADMIN MESSAGE READER
 * 
 * Allows admins to read encrypted messages from the database.
 * Requires access to ENCRYPTION_MASTER_SECRET in .env
 * 
 * Usage:
 *   # Read all messages for a specific user (by email)
 *   npx tsx src/scripts/admin-read-messages.ts --email user@example.com
 * 
 *   # Read messages for a specific chat
 *   npx tsx src/scripts/admin-read-messages.ts --chat <chat_id>
 * 
 *   # Read all users and their chat counts
 *   npx tsx src/scripts/admin-read-messages.ts --list-users
 * 
 *   # Read everything (all users, all chats)
 *   npx tsx src/scripts/admin-read-messages.ts --all
 * 
 *   # Search for a keyword across all messages
 *   npx tsx src/scripts/admin-read-messages.ts --search "keyword"
 */

import dotenv from "dotenv";
dotenv.config();

import { Pool } from "pg";
import { deriveUserKey, decryptMessage } from "../services/encryption";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ─── CLI argument parsing ──────────────────────────────────────────────────────
const args = process.argv.slice(2);

function getArg(flag: string): string | null {
  const idx = args.indexOf(flag);
  if (idx === -1) return null;
  return args[idx + 1] || null;
}

function hasFlag(flag: string): boolean {
  return args.includes(flag);
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function printSeparator(char = "═", width = 70) {
  console.log(char.repeat(width));
}

function printHeader(title: string) {
  printSeparator();
  console.log(`  ${title}`);
  printSeparator();
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleString();
}

// ─── Core: decrypt messages for a user ────────────────────────────────────────
interface RawMessage {
  message_id: string;
  chat_id: string;
  role: string;
  content: string;
  model_name: string | null;
  created_at: Date;
}

interface RawUser {
  user_id: string;
  google_id: string;
  email: string;
  name: string;
  created_at: Date;
}

interface RawChat {
  chat_id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
}

async function decryptMessagesForUser(
  user: RawUser,
  chatId?: string
): Promise<void> {
  // Derive this user's decryption key
  const userKey = deriveUserKey(user.google_id);

  // Build query
  let query = `
    SELECT 
      m.message_id,
      m.chat_id,
      m.role,
      m.content,
      m.model_name,
      m.created_at,
      c.title as chat_title
    FROM messages m
    JOIN chats c ON m.chat_id = c.chat_id
    WHERE c.user_id = $1
      AND c.is_deleted = FALSE
  `;
  const params: string[] = [user.user_id];

  if (chatId) {
    query += ` AND m.chat_id = $2`;
    params.push(chatId);
  }

  query += ` ORDER BY m.chat_id, m.created_at ASC`;

  const result = await pool.query(query, params);

  if (result.rows.length === 0) {
    console.log("  No messages found.\n");
    return;
  }

  // Group by chat
  const chatGroups = new Map<string, typeof result.rows>();
  for (const row of result.rows) {
    if (!chatGroups.has(row.chat_id)) {
      chatGroups.set(row.chat_id, []);
    }
    chatGroups.get(row.chat_id)!.push(row);
  }

  // Print each chat
  for (const [chatId, messages] of chatGroups) {
    const chatTitle = messages[0].chat_title;
    console.log(`\n  📁 Chat: "${chatTitle}"`);
    console.log(`     ID: ${chatId}`);
    console.log(`     Messages: ${messages.length}`);
    console.log("  " + "─".repeat(60));

    for (const msg of messages) {
      // Attempt decryption
      let content: string;
      let decryptStatus: string;

      try {
        content = decryptMessage(msg.content, userKey);
        decryptStatus = "✅";
      } catch {
        // Fallback for legacy plain-text messages
        content = msg.content;
        decryptStatus = "⚠️  (not encrypted / legacy)";
      }

      // Role label
      const roleLabel =
        msg.role === "user"
          ? "👤 User     "
          : msg.role === "assistant"
          ? "🤖 Assistant"
          : "⚙️  System   ";

      console.log(`\n  ${roleLabel} ${decryptStatus}`);
      console.log(`  Time: ${formatDate(msg.created_at)}`);
      if (msg.model_name) {
        console.log(`  Model: ${msg.model_name}`);
      }
      console.log(`  Message:`);

      // Word-wrap content at 65 chars
      const lines = content.match(/.{1,65}(\s|$)/g) || [content];
      for (const line of lines) {
        console.log(`    ${line.trimEnd()}`);
      }
    }

    console.log("");
  }
}

// ─── Command: list users ───────────────────────────────────────────────────────
async function cmdListUsers() {
  printHeader("ALL USERS");

  const result = await pool.query(`
    SELECT 
      u.user_id,
      u.email,
      u.name,
      u.created_at,
      COUNT(DISTINCT c.chat_id) as chat_count,
      COUNT(m.message_id) as message_count
    FROM users u
    LEFT JOIN chats c ON c.user_id = u.user_id AND c.is_deleted = FALSE
    LEFT JOIN messages m ON m.chat_id = c.chat_id
    GROUP BY u.user_id
    ORDER BY u.created_at DESC
  `);

  if (result.rows.length === 0) {
    console.log("  No users found.");
    return;
  }

  console.log(
    `  ${"EMAIL".padEnd(35)} ${"NAME".padEnd(20)} ${"CHATS".padEnd(8)} ${"MESSAGES".padEnd(10)} JOINED`
  );
  console.log("  " + "─".repeat(95));

  for (const row of result.rows) {
    console.log(
      `  ${row.email.padEnd(35)} ${row.name.padEnd(20)} ${String(row.chat_count).padEnd(8)} ${String(row.message_count).padEnd(10)} ${formatDate(row.created_at)}`
    );
  }

  console.log(`\n  Total users: ${result.rows.length}`);
  printSeparator();
}

// ─── Command: read by email ────────────────────────────────────────────────────
async function cmdReadByEmail(email: string) {
  printHeader(`MESSAGES FOR: ${email}`);

  const userResult = await pool.query(
    "SELECT * FROM users WHERE email = $1",
    [email]
  );

  if (userResult.rows.length === 0) {
    console.log(`  ❌ No user found with email: ${email}`);
    return;
  }

  const user = userResult.rows[0];
  console.log(`  User ID:  ${user.user_id}`);
  console.log(`  Name:     ${user.name}`);
  console.log(`  Email:    ${user.email}`);
  console.log(`  Joined:   ${formatDate(user.created_at)}`);

  await decryptMessagesForUser(user);
  printSeparator();
}

// ─── Command: read by chat ID ──────────────────────────────────────────────────
async function cmdReadByChat(chatId: string) {
  printHeader(`MESSAGES IN CHAT: ${chatId}`);

  // Find the chat and its owner
  const chatResult = await pool.query(
    `SELECT c.*, u.user_id, u.google_id, u.email, u.name
     FROM chats c
     JOIN users u ON c.user_id = u.user_id
     WHERE c.chat_id = $1`,
    [chatId]
  );

  if (chatResult.rows.length === 0) {
    console.log(`  ❌ No chat found with ID: ${chatId}`);
    return;
  }

  const row = chatResult.rows[0];
  const user: RawUser = {
    user_id: row.user_id,
    google_id: row.google_id,
    email: row.email,
    name: row.name,
    created_at: row.created_at,
  };

  console.log(`  Chat Title: ${row.title}`);
  console.log(`  Owner:      ${row.email} (${row.name})`);
  console.log(`  Created:    ${formatDate(row.created_at)}`);

  await decryptMessagesForUser(user, chatId);
  printSeparator();
}

// ─── Command: read all ─────────────────────────────────────────────────────────
async function cmdReadAll() {
  printHeader("ALL MESSAGES (ALL USERS)");
  console.log("  ⚠️  WARNING: Displaying ALL user messages\n");

  const usersResult = await pool.query(
    "SELECT * FROM users ORDER BY created_at DESC"
  );

  if (usersResult.rows.length === 0) {
    console.log("  No users found.");
    return;
  }

  for (const user of usersResult.rows) {
    console.log(`\n${"▓".repeat(70)}`);
    console.log(`  👤 USER: ${user.name} <${user.email}>`);
    console.log(`  ID: ${user.user_id}`);
    console.log(`${"▓".repeat(70)}`);

    await decryptMessagesForUser(user);
  }

  printSeparator();
}

// ─── Command: search ───────────────────────────────────────────────────────────
async function cmdSearch(keyword: string) {
  printHeader(`SEARCH: "${keyword}"`);
  console.log("  Decrypting all messages to search...\n");

  const usersResult = await pool.query("SELECT * FROM users");
  const keywordLower = keyword.toLowerCase();

  let matchCount = 0;

  for (const user of usersResult.rows) {
    const userKey = deriveUserKey(user.google_id);

    const messagesResult = await pool.query(
      `SELECT m.*, c.title as chat_title
       FROM messages m
       JOIN chats c ON m.chat_id = c.chat_id
       WHERE c.user_id = $1 AND c.is_deleted = FALSE
       ORDER BY m.created_at ASC`,
      [user.user_id]
    );

    for (const msg of messagesResult.rows) {
      let content: string;
      try {
        content = decryptMessage(msg.content, userKey);
      } catch {
        content = msg.content; // legacy plain text
      }

      if (content.toLowerCase().includes(keywordLower)) {
        matchCount++;

        // Highlight the keyword in output
        const highlighted = content.replace(
          new RegExp(keyword, "gi"),
          (match) => `>>>${match}<<<`
        );

        console.log(`  Match #${matchCount}`);
        console.log(`  User:    ${user.email}`);
        console.log(`  Chat:    ${msg.chat_title}`);
        console.log(`  Role:    ${msg.role}`);
        console.log(`  Time:    ${formatDate(msg.created_at)}`);
        console.log(`  Content: ${highlighted.substring(0, 200)}`);
        console.log("  " + "─".repeat(60));
      }
    }
  }

  console.log(`\n  Total matches: ${matchCount}`);
  printSeparator();
}

// ─── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  // Verify master secret is available
  if (!process.env.ENCRYPTION_MASTER_SECRET) {
    console.error("❌ ENCRYPTION_MASTER_SECRET not set in .env");
    console.error("   Cannot decrypt messages without it.");
    process.exit(1);
  }

  console.log("");
  printHeader("ADMIN MESSAGE READER");
  console.log(`  Time: ${new Date().toLocaleString()}`);
  console.log(`  DB:   ${process.env.DATABASE_URL?.split("@")[1] || "connected"}`);
  printSeparator();
  console.log("");

  try {
    if (hasFlag("--list-users")) {
      await cmdListUsers();

    } else if (getArg("--email")) {
      await cmdReadByEmail(getArg("--email")!);

    } else if (getArg("--chat")) {
      await cmdReadByChat(getArg("--chat")!);

    } else if (hasFlag("--all")) {
      await cmdReadAll();

    } else if (getArg("--search")) {
      await cmdSearch(getArg("--search")!);

    } else {
      // Show help
      console.log("  USAGE:");
      console.log("");
      console.log("  List all users:");
      console.log("    npx tsx src/scripts/admin-read-messages.ts --list-users");
      console.log("");
      console.log("  Read messages by email:");
      console.log("    npx tsx src/scripts/admin-read-messages.ts --email user@example.com");
      console.log("");
      console.log("  Read a specific chat:");
      console.log("    npx tsx src/scripts/admin-read-messages.ts --chat <chat_id>");
      console.log("");
      console.log("  Read all messages:");
      console.log("    npx tsx src/scripts/admin-read-messages.ts --all");
      console.log("");
      console.log("  Search across all messages:");
      console.log('    npx tsx src/scripts/admin-read-messages.ts --search "keyword"');
      console.log("");
      printSeparator();
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});