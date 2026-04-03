import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.BACKEND_PORT || "4000", 10),
  databaseUrl: process.env.DATABASE_URL || "postgresql://aichat:aichat@localhost:5432/aichat",
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  litellmBaseUrl: process.env.LITELLM_BASE_URL || "http://litellm:4000",
  litellmMasterKey: process.env.LITELLM_MASTER_KEY || "sk-litellm-master-key-change-me",
  defaultModel: process.env.DEFAULT_MODEL || "ollama/llama3.2",
  jwtExpiresIn: "7d",
  maxMessagesContext: 50,
  systemPrompt:
    "You are a helpful, harmless, and honest AI assistant. Answer questions clearly and concisely.",
};