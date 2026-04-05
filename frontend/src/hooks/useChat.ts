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
  const [chats,      setChats]      = useState<ChatItem[]>([]);
  const [activeChat, setActiveChat] = useState<ChatItem | null>(null);
  const [messages,   setMessages]   = useState<MessageItem[]>([]);
  const [isLoading,  setIsLoading]  = useState(false);
  const [isSending,  setIsSending]  = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const activeChatRef = useRef<ChatItem | null>(null);
  activeChatRef.current = activeChat;

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

  const createNewChat = useCallback(async (): Promise<ChatItem | null> => {
    try {
      const data    = await api.createChat();
      const newChat: ChatItem = data.chat;
      setChats((prev) => [newChat, ...prev]);
      setActiveChat(newChat);
      activeChatRef.current = newChat;
      setMessages([]);
      return newChat;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      const chat = activeChatRef.current;
      if (!chat || isSending) return;

      setIsSending(true);
      setError(null);

      const tempUserMsg: MessageItem = {
        id:        `temp-user-${Date.now()}`,
        role:      "user",
        content,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempUserMsg]);

      const tempAssistantId = `temp-assistant-${Date.now()}`;
      const tempAssistantMsg: MessageItem = {
        id:        tempAssistantId,
        role:      "assistant",
        content:   "",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempAssistantMsg]);

      try {
        await api.sendMessageStream(
          chat.id,
          content,
          /* onChunk */
          (chunk: string) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempAssistantId
                  ? { ...m, content: m.content + chunk }
                  : m
              )
            );
          },
          /* onDone */
          (messageId: string) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempAssistantId ? { ...m, id: messageId } : m
              )
            );
            fetchChats();
          },
          /* onError */
          (errorMsg: string) => {
            setError(errorMsg);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempAssistantId
                  ? { ...m, content: `⚠️ ${errorMsg}` }
                  : m
              )
            );
          }
        );
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsSending(false);
      }
    },
    [isSending, fetchChats]
  );

  const renameChat = useCallback(async (chatId: string, title: string) => {
    try {
      await api.updateChat(chatId, title);
      setChats((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, title } : c))
      );
      if (activeChatRef.current?.id === chatId) {
        setActiveChat((prev) => (prev ? { ...prev, title } : null));
      }
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const deleteChat = useCallback(async (chatId: string) => {
    try {
      await api.deleteChat(chatId);
      setChats((prev) => prev.filter((c) => c.id !== chatId));
      if (activeChatRef.current?.id === chatId) {
        setActiveChat(null);
        setMessages([]);
      }
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

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