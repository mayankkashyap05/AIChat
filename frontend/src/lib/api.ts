// Change this line:
// const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// To this:
const API_URL = "";

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  private headers(): HeadersInit {
    const h: HeadersInit = {
      "Content-Type": "application/json",
    };
    if (this.token) {
      h["Authorization"] = `Bearer ${this.token}`;
    }
    return h;
  }

  // ─── Auth ─────────────────────────────────────────
  async loginWithGoogle(credential: string) {
    const res = await fetch(`${API_URL}/api/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential }),
    });
    if (!res.ok) throw new Error("Login failed");
    return res.json();
  }

  async getMe() {
    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error("Not authenticated");
    return res.json();
  }

  // ─── Chats ────────────────────────────────────────
  async getChats() {
    const res = await fetch(`${API_URL}/api/chats`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error("Failed to fetch chats");
    return res.json();
  }

  async createChat(title?: string) {
    const res = await fetch(`${API_URL}/api/chats`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error("Failed to create chat");
    return res.json();
  }

  async updateChat(chatId: string, title: string) {
    const res = await fetch(`${API_URL}/api/chats/${chatId}`, {
      method: "PATCH",
      headers: this.headers(),
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error("Failed to update chat");
    return res.json();
  }

  async deleteChat(chatId: string) {
    const res = await fetch(`${API_URL}/api/chats/${chatId}`, {
      method: "DELETE",
      headers: this.headers(),
    });
    if (!res.ok) throw new Error("Failed to delete chat");
    return res.json();
  }

  // ─── Messages ─────────────────────────────────────
  async getMessages(chatId: string) {
    const res = await fetch(`${API_URL}/api/chats/${chatId}/messages`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error("Failed to fetch messages");
    return res.json();
  }

  async sendMessage(chatId: string, content: string, model?: string) {
    const res = await fetch(`${API_URL}/api/chats/${chatId}/messages`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ content, model, stream: false }),
    });
    if (!res.ok) throw new Error("Failed to send message");
    return res.json();
  }

  async sendMessageStream(
    chatId: string,
    content: string,
    onChunk: (text: string) => void,
    onDone: (messageId: string) => void,
    onError: (error: string) => void,
    model?: string
  ) {
    const res = await fetch(`${API_URL}/api/chats/${chatId}/messages`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ content, model, stream: true }),
    });

    if (!res.ok) {
      onError("Failed to send message");
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      onError("No response body");
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              onChunk(data.content);
            } else if (data.done) {
              onDone(data.messageId);
            } else if (data.error) {
              onError(data.error);
            }
          } catch {
            // skip malformed JSON
          }
        }
      }
    }
  }

  // ─── Models ───────────────────────────────────────
  async getModels() {
    const res = await fetch(`${API_URL}/api/models`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error("Failed to fetch models");
    return res.json();
  }
}

export const api = new ApiClient();