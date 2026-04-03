"use client";

import { useState, useCallback, useRef } from "react";
import { api } from "@/lib/api";

export interface ChatItem {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageItem {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  modelName?: string;
  createdAt: string;
}

export function useChat() {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [activeChat, setActiveChat] = useState<ChatItem | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  // Fetch all chats
  const fetchChats = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.getChats();
      setChats(data.chats);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load messages for a chat
  const loadChat = useCallback(async (chat: ChatItem) => {
    try {
      setActiveChat(chat);
      setIsLoading(true);
      setError(null);
      const data = await api.getMessages(chat.id);
      setMessages(data.messages);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create new chat
  const createNewChat = useCallback(async () => {
    try {
      const data = await api.createChat();
      const newChat = data.chat;
      setChats((prev) => [newChat, ...prev]);
      setActiveChat(newChat);
      setMessages([]);
      return newChat;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }, []);

  // Send message (streaming)
  const sendMessage = useCallback(
    async (content: string, model?: string) => {
      if (!activeChat || isSending) return;

      setIsSending(true);
      setError(null);
      abortRef.current = false;

      // Optimistic: add user message
      const tempUserMsg: MessageItem = {
        id: `temp-user-${Date.now()}`,
        role: "user",
        content,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempUserMsg]);

      // Placeholder for assistant message
      const tempAssistantId = `temp-assistant-${Date.now()}`;
      const tempAssistantMsg: MessageItem = {
        id: tempAssistantId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempAssistantMsg]);

      try {
        await api.sendMessageStream(
          activeChat.id,
          content,
          // onChunk
          (chunk: string) => {
            if (abortRef.current) return;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempAssistantId ? { ...m, content: m.content + chunk } : m
              )
            );
          },
          // onDone
          (messageId: string) => {
            setMessages((prev) =>
              prev.map((m) => (m.id === tempAssistantId ? { ...m, id: messageId } : m))
            );
            // Refresh chat list for title updates
            fetchChats();
          },
          // onError
          (errorMsg: string) => {
            setError(errorMsg);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempAssistantId
                  ? { ...m, content: "⚠️ Error: " + errorMsg }
                  : m
              )
            );
          },
          model
        );
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsSending(false);
      }
    },
    [activeChat, isSending, fetchChats]
  );

  // Rename chat
  const renameChat = useCallback(
    async (chatId: string, title: string) => {
      try {
        await api.updateChat(chatId, title);
        setChats((prev) =>
          prev.map((c) => (c.id === chatId ? { ...c, title } : c))
        );
        if (activeChat?.id === chatId) {
          setActiveChat((prev) => (prev ? { ...prev, title } : null));
        }
      } catch (err: any) {
        setError(err.message);
      }
    },
    [activeChat]
  );

  // Delete chat
  const deleteChat = useCallback(
    async (chatId: string) => {
      try {
        await api.deleteChat(chatId);
        setChats((prev) => prev.filter((c) => c.id !== chatId));
        if (activeChat?.id === chatId) {
          setActiveChat(null);
          setMessages([]);
        }
      } catch (err: any) {
        setError(err.message);
      }
    },
    [activeChat]
  );

  return {
    chats,
    activeChat,
    messages,
    isLoading,
    isSending,
    error,
    fetchChats,
    loadChat,
    createNewChat,
    sendMessage,
    renameChat,
    deleteChat,
    setActiveChat,
    setError,
  };
}