import OpenAI from "openai";
import { config } from "../config";

const openai = new OpenAI({
  baseURL: config.litellmBaseUrl + "/v1",
  apiKey: config.litellmMasterKey,
});

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function getAIResponse(
  messages: ChatMessage[],
  model?: string
): Promise<string> {
  const modelName = model || config.defaultModel;

  // Prepend system prompt if not already present
  const fullMessages: ChatMessage[] = [];
  if (messages.length === 0 || messages[0].role !== "system") {
    fullMessages.push({ role: "system", content: config.systemPrompt });
  }
  fullMessages.push(...messages);

  // Trim to max context length
  const trimmed = trimMessages(fullMessages, config.maxMessagesContext);

  try {
    const completion = await openai.chat.completions.create({
      model: modelName,
      messages: trimmed,
      temperature: 0.7,
      max_tokens: 4096,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from model");
    }
    return content;
  } catch (error: any) {
    console.error("AI service error:", error.message || error);
    throw new Error(`AI request failed: ${error.message || "Unknown error"}`);
  }
}

export async function getAIResponseStream(
  messages: ChatMessage[],
  model?: string
): Promise<AsyncIterable<string>> {
  const modelName = model || config.defaultModel;

  const fullMessages: ChatMessage[] = [];
  if (messages.length === 0 || messages[0].role !== "system") {
    fullMessages.push({ role: "system", content: config.systemPrompt });
  }
  fullMessages.push(...messages);

  const trimmed = trimMessages(fullMessages, config.maxMessagesContext);

  const stream = await openai.chat.completions.create({
    model: modelName,
    messages: trimmed,
    temperature: 0.7,
    max_tokens: 4096,
    stream: true,
  });

  async function* generateChunks() {
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }

  return generateChunks();
}

function trimMessages(messages: ChatMessage[], maxCount: number): ChatMessage[] {
  if (messages.length <= maxCount) return messages;

  // Keep system message + last (maxCount - 1) messages
  const systemMessages = messages.filter((m) => m.role === "system");
  const nonSystemMessages = messages.filter((m) => m.role !== "system");

  const keep = nonSystemMessages.slice(-(maxCount - systemMessages.length));
  return [...systemMessages, ...keep];
}