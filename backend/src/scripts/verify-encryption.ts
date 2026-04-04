/**
 * Verification script — checks that messages in the DB are actually encrypted.
 *
 * Run with:
 *   npx tsx src/scripts/verify-encryption.ts
 */

import dotenv from "dotenv";
dotenv.config();

import { Pool } from "pg";
import { deriveUserKey, decryptMessage, isEncrypted } from "../services/encryption";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function verify() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  Encryption Verification");
  console.log("═══════════════════════════════════════════════════\n");

  // 1. Check raw DB content
  const rawResult = await pool.query(
    "SELECT message_id, content FROM messages LIMIT 5"
  );

  console.log("RAW DATABASE CONTENT (what an attacker sees):");
  console.log("─────────────────────────────────────────────");
  for (const row of rawResult.rows) {
    console.log(`  ID:      ${row.message_id}`);
    console.log(`  Content: ${row.content.substring(0, 60)}...`);
    console.log(`  Looks encrypted: ${isEncrypted(row.content) ? "✅ YES" : "❌ NO"}`);
    console.log("");
  }

  // 2. Check we can decrypt with correct key
  console.log("DECRYPTION TEST (what the user sees):");
  console.log("──────────────────────────────────────");

  const usersResult = await pool.query(
    "SELECT u.user_id, u.google_id, u.email FROM users u LIMIT 3"
  );

  for (const user of usersResult.rows) {
    const msgResult = await pool.query(
      `SELECT m.message_id, m.content
       FROM messages m
       JOIN chats c ON m.chat_id = c.chat_id
       WHERE c.user_id = $1 LIMIT 2`,
      [user.user_id]
    );

    if (msgResult.rows.length === 0) continue;

    const userKey = deriveUserKey(user.google_id);
    console.log(`  User: ${user.email}`);

    for (const msg of msgResult.rows) {
      try {
        const decrypted = decryptMessage(msg.content, userKey);
        console.log(`    ✅ Decrypted: "${decrypted.substring(0, 50)}..."`);
      } catch {
        console.log(`    ❌ Failed to decrypt message ${msg.message_id}`);
      }
    }
    console.log("");
  }

  // 3. Cross-user test: try to decrypt user A's message with user B's key
  console.log("CROSS-USER ISOLATION TEST:");
  console.log("──────────────────────────");

  if (usersResult.rows.length >= 2) {
    const userA = usersResult.rows[0];
    const userB = usersResult.rows[1];

    const msgResult = await pool.query(
      `SELECT m.content FROM messages m
       JOIN chats c ON m.chat_id = c.chat_id
       WHERE c.user_id = $1 LIMIT 1`,
      [userA.user_id]
    );

    if (msgResult.rows.length > 0) {
      const userBKey = deriveUserKey(userB.google_id);
      try {
        decryptMessage(msgResult.rows[0].content, userBKey);
        console.log("  ❌ SECURITY ISSUE: User B could decrypt User A's message!");
      } catch {
        console.log(
          "  ✅ Cross-user isolation working: User B CANNOT decrypt User A's messages"
        );
      }
    }
  } else {
    console.log("  (Need at least 2 users to test isolation)");
  }

  console.log("\n═══════════════════════════════════════════════════");
  await pool.end();
}

verify();