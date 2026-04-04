/**
 * ONE-TIME MIGRATION SCRIPT
 * Encrypts all existing plain-text messages in the database.
 *
 * Run with:
 *   npx tsx src/scripts/migrate-encrypt-messages.ts
 *
 * IMPORTANT:
 *   - Take a database backup before running
 *   - Run only once
 *   - Do not interrupt mid-run
 */

import dotenv from "dotenv";
dotenv.config();

import { Pool } from "pg";
import { deriveUserKey, encryptMessage, isEncrypted } from "../services/encryption";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  Message Encryption Migration");
  console.log("═══════════════════════════════════════════════════");
  console.log("");

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Get all users with their google_ids
    const usersResult = await client.query(
      "SELECT user_id, google_id, email FROM users"
    );
    const users = usersResult.rows;

    console.log(`Found ${users.length} users`);
    console.log("");

    let totalMessages = 0;
    let encryptedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const user of users) {
      // Get all messages for this user's chats
      const messagesResult = await client.query(
        `SELECT m.message_id, m.content
         FROM messages m
         JOIN chats c ON m.chat_id = c.chat_id
         WHERE c.user_id = $1`,
        [user.user_id]
      );

      const messages = messagesResult.rows;
      totalMessages += messages.length;

      if (messages.length === 0) {
        console.log(`  User ${user.email}: no messages, skipping`);
        continue;
      }

      console.log(
        `  User ${user.email}: encrypting ${messages.length} messages...`
      );

      // Derive this user's key
      const userKey = deriveUserKey(user.google_id);

      for (const msg of messages) {
        try {
          // Skip already-encrypted messages
          if (isEncrypted(msg.content)) {
            skippedCount++;
            continue;
          }

          // Encrypt the plain-text content
          const encrypted = encryptMessage(msg.content, userKey);

          // Update in database
          await client.query(
            "UPDATE messages SET content = $1 WHERE message_id = $2",
            [encrypted, msg.message_id]
          );

          encryptedCount++;
        } catch (err: any) {
          console.error(
            `    ✗ Failed to encrypt message ${msg.message_id}: ${err.message}`
          );
          errorCount++;
        }
      }

      console.log(`    ✓ Done`);
    }

    if (errorCount > 0) {
      console.log("");
      console.log(`⚠️  ${errorCount} messages failed — rolling back`);
      await client.query("ROLLBACK");
      process.exit(1);
    }

    await client.query("COMMIT");

    console.log("");
    console.log("═══════════════════════════════════════════════════");
    console.log("  Migration Complete");
    console.log("═══════════════════════════════════════════════════");
    console.log(`  Total messages:     ${totalMessages}`);
    console.log(`  Newly encrypted:    ${encryptedCount}`);
    console.log(`  Already encrypted:  ${skippedCount}`);
    console.log(`  Errors:             ${errorCount}`);
    console.log("");
    console.log("  ✅ All messages are now encrypted in the database");
    console.log("═══════════════════════════════════════════════════");
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();