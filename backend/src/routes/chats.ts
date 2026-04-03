import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import {
  getUserChats,
  getChatById,
  createChat,
  updateChatTitle,
  softDeleteChat,
} from "../database";

const router = Router();

// All chat routes require auth
router.use(authMiddleware);

// GET /api/chats — list user's chats
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const chats = await getUserChats(req.user!.userId);
    res.json({
      chats: chats.map((c) => ({
        id: c.chat_id,
        title: c.title,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      })),
    });
  } catch (error: any) {
    console.error("List chats error:", error.message);
    res.status(500).json({ error: "Failed to list chats" });
  }
});

// POST /api/chats — create a new chat
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const { title } = req.body;
    const chat = await createChat(req.user!.userId, title);
    res.status(201).json({
      chat: {
        id: chat.chat_id,
        title: chat.title,
        createdAt: chat.created_at,
        updatedAt: chat.updated_at,
      },
    });
  } catch (error: any) {
    console.error("Create chat error:", error.message);
    res.status(500).json({ error: "Failed to create chat" });
  }
});

// GET /api/chats/:chatId — get a specific chat
router.get("/:chatId", async (req: AuthRequest, res: Response) => {
  try {
    const chat = await getChatById(req.params.chatId, req.user!.userId);
    if (!chat) {
      res.status(404).json({ error: "Chat not found" });
      return;
    }
    res.json({
      chat: {
        id: chat.chat_id,
        title: chat.title,
        createdAt: chat.created_at,
        updatedAt: chat.updated_at,
      },
    });
  } catch (error: any) {
    console.error("Get chat error:", error.message);
    res.status(500).json({ error: "Failed to get chat" });
  }
});

// PATCH /api/chats/:chatId — rename a chat
router.patch("/:chatId", async (req: AuthRequest, res: Response) => {
  try {
    const { title } = req.body;
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      res.status(400).json({ error: "Title is required" });
      return;
    }

    const chat = await updateChatTitle(req.params.chatId, req.user!.userId, title.trim());
    if (!chat) {
      res.status(404).json({ error: "Chat not found" });
      return;
    }

    res.json({
      chat: {
        id: chat.chat_id,
        title: chat.title,
        createdAt: chat.created_at,
        updatedAt: chat.updated_at,
      },
    });
  } catch (error: any) {
    console.error("Update chat error:", error.message);
    res.status(500).json({ error: "Failed to update chat" });
  }
});

// DELETE /api/chats/:chatId — soft delete a chat
router.delete("/:chatId", async (req: AuthRequest, res: Response) => {
  try {
    const deleted = await softDeleteChat(req.params.chatId, req.user!.userId);
    if (!deleted) {
      res.status(404).json({ error: "Chat not found" });
      return;
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error("Delete chat error:", error.message);
    res.status(500).json({ error: "Failed to delete chat" });
  }
});

export default router;