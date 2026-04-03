import express from "express";
import cors from "cors";
import helmet from "helmet";
import winston from "winston";
import { config } from "./config";
import { generalLimiter } from "./middleware/rateLimit";
import authRouter from "./routes/auth";
import chatsRouter from "./routes/chats";
import messagesRouter from "./routes/messages";
import { pool, getAvailableModels } from "./database";
import { authMiddleware, AuthRequest } from "./middleware/auth";

// ─── Logger ────────────────────────────────────────────────
export const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

// ─── Express App ───────────────────────────────────────────
const app = express();

// Security
app.use(
  helmet({
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
  })
);

// CORS
app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body parsing
app.use(express.json({ limit: "1mb" }));

// Rate limiting
app.use(generalLimiter);

// ─── Routes ────────────────────────────────────────────────
app.use("/api/auth", authRouter);
app.use("/api/chats", chatsRouter);
app.use("/api/chats", messagesRouter);

// Models endpoint
app.get("/api/models", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const models = await getAvailableModels();
    res.json({ models, default: config.defaultModel });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch models" });
  }
});

// Health check
app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ status: "error", message: "Database unreachable" });
  }
});

// ─── Start ─────────────────────────────────────────────────
app.listen(config.port, () => {
  logger.info(`Backend server running on port ${config.port}`);
  logger.info(`Frontend URL: ${config.frontendUrl}`);
  logger.info(`LiteLLM URL: ${config.litellmBaseUrl}`);
  logger.info(`Default model: ${config.defaultModel}`);
});

export default app;