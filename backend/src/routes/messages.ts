import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { messageLimiter } from "../middleware/rateLimit";
import { getChatById, getChatMessages, createMessage } from "../database";
import { getAIResponse, getAIResponseStream, ChatMessage } from "../services/ai";

const router = Router();

router.use(authMiddleware);

// GET /api/chats/:chatId/messages — list messages in a chat
router.get("/:chatId/messages", async (req: AuthRequest, res: Response) => {
  try {
    // Verify chat belongs to user
    const chat = await getChatById(req.params.chatId, req.user!.userId);
    if (!chat) {
      res.status(404).json({ error: "Chat not found" });
      return;
    }

    const messages = await getChatMessages(req.params.chatId);
    res.json({
      messages: messages.map((m) => ({
        id: m.message_id,
        role: m.role,
        content: m.content,
        modelName: m.model_name,
        createdAt: m.created_at,
      })),
    });
  } catch (error: any) {
    console.error("List messages error:", error.message);
    res.status(500).json({ error: "Failed to list messages" });
  }
});

// POST /api/chats/:chatId/messages — send a message and get AI response
router.post("/:chatId/messages", messageLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const { content, model, stream: useStream } = req.body;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      res.status(400).json({ error: "Message content is required" });
      return;
    }

    // Verify chat belongs to user
    const chat = await getChatById(req.params.chatId, req.user!.userId);
    if (!chat) {
      res.status(404).json({ error: "Chat not found" });
      return;
    }

    // Save user message
    const userMessage = await createMessage(req.params.chatId, "user", content.trim());

    // Get chat history for context
    const history = await getChatMessages(req.params.chatId);
    const contextMessages: ChatMessage[] = history.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // ─── Streaming response ────────────────────────────────
    if (useStream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");

      try {
        const stream = await getAIResponseStream(contextMessages, model);
        let fullResponse = "";

        for await (const chunk of stream) {
          fullResponse += chunk;
          res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
        }

        // Save assistant message
        const assistantMessage = await createMessage(
          req.params.chatId,
          "assistant",
          fullResponse,
          model
        );

        // Auto-title on first exchange
        if (history.length <= 1) {
          await autoTitleChat(req.params.chatId, content.trim());
        }

        res.write(
          `data: ${JSON.stringify({
            done: true,
            messageId: assistantMessage.message_id,
          })}\n\n`
        );
        res.end();
      } catch (aiError: any) {
        res.write(
          `data: ${JSON.stringify({ error: aiError.message || "AI request failed" })}\n\n`
        );
        res.end();
      }
      return;
    }

    // ─── Non-streaming response ────────────────────────────
    const aiResponse = await getAIResponse(contextMessages, model);

    // Save assistant message
    const assistantMessage = await createMessage(
      req.params.chatId,
      "assistant",
      aiResponse,
      model
    );

    // Auto-title on first exchange
    if (history.length <= 1) {
      await autoTitleChat(req.params.chatId, content.trim());
    }

    res.json({
      userMessage: {
        id: userMessage.message_id,
        role: userMessage.role,
        content: userMessage.content,
        createdAt: userMessage.created_at,
      },
      assistantMessage: {
        id: assistantMessage.message_id,
        role: assistantMessage.role,
        content: assistantMessage.content,
        modelName: assistantMessage.model_name,
        createdAt: assistantMessage.created_at,
      },
    });
  } catch (error: any) {
    console.error("Send message error:", error.message);
    res.status(500).json({ error: "Failed to process message" });
  }
});

// Auto-generate a chat title from the first user message
async function autoTitleChat(chatId: string, firstMessage: string): Promise<void> {
  try {
    const title =
      firstMessage.length > 60 ? firstMessage.substring(0, 57) + "..." : firstMessage;

    const { pool } = require("../database");
    await pool.query("UPDATE chats SET title = $1 WHERE chat_id = $2", [title, chatId]);
  } catch (error) {
    // Non-critical, ignore
  }
}

export default router;