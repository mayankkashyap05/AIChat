"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ChatItem, MessageItem } from "@/hooks/useChat";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";

interface ChatWindowProps {
  activeChat: ChatItem | null;
  messages: MessageItem[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  onSendMessage: (content: string) => void;
  onNewChat: () => Promise<ChatItem | null>;
  onDismissError: () => void;
}

const SUGGESTIONS = [
  { icon: "💡", text: "Explain quantum computing in simple terms" },
  { icon: "🐍", text: "Write a Python function to parse JSON" },
  { icon: "⚛️", text: "What are React Server Components?" },
  { icon: "🐛", text: "Help me debug a TypeScript type error" },
  { icon: "✍️", text: "Write a concise executive summary template" },
  { icon: "🔒", text: "Best practices for API authentication" },
];

export default function ChatWindow({
  activeChat,
  messages,
  isLoading,
  isSending,
  error,
  onSendMessage,
  onNewChat,
  onDismissError,
}: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      messagesEndRef.current?.scrollIntoView({ behavior });
    },
    []
  );

  // Auto-scroll when messages stream in
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === "assistant" && isSending) {
      scrollToBottom("smooth");
    } else if (lastMsg?.role === "user") {
      scrollToBottom("smooth");
    }
  }, [messages, isSending, scrollToBottom]);

  // Show scroll-to-bottom button
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const handler = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 200);
    };
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, []);

  // Handle suggestion — create chat first, then send
  const handleSuggestion = useCallback(
    async (text: string) => {
      if (isCreating) return;
      setIsCreating(true);
      try {
        const chat = await onNewChat();
        if (chat) {
          setTimeout(() => onSendMessage(text), 80);
        }
      } finally {
        setIsCreating(false);
      }
    },
    [onNewChat, onSendMessage, isCreating]
  );

  const visibleMessages = messages.filter((m) => m.role !== "system");

  // ─── Empty / Welcome state ──────────────────────────────
  if (!activeChat) {
    return (
      <div className="flex-1 flex flex-col bg-surface overflow-hidden">
        <div className="flex-1 flex items-center justify-center overflow-y-auto px-4 py-8">
          <div className="w-full max-w-2xl space-y-10 animate-fade-in">
            {/* Welcome header */}
            <div className="text-center space-y-3">
              <div className="relative inline-flex">
                <div className="absolute inset-0 rounded-2xl bg-accent/20 blur-lg" />
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-blue-500 flex items-center justify-center shadow-glow">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-text-primary">
                How can I help you?
              </h2>
              <p className="text-text-secondary text-sm">
                Start a conversation or pick a suggestion below.
              </p>
            </div>

            {/* Suggestions grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestion(s.text)}
                  disabled={isCreating}
                  className="group text-left p-4 rounded-2xl bg-surface-1 border border-border hover:border-accent/30 hover:bg-surface-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-wait"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl flex-shrink-0 mt-0.5">{s.icon}</span>
                    <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors leading-relaxed">
                      {s.text}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Input always visible even on empty state */}
        <MessageInput
          onSend={handleSuggestion}
          disabled={isSending || isCreating}
        />
      </div>
    );
  }

  // ─── Active chat ────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col bg-surface overflow-hidden relative">
      {/* Chat header */}
      <div className="glass border-b border-border px-6 py-3 flex items-center gap-3 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-text-primary truncate text-sm">
            {activeChat.title}
          </h1>
        </div>
        {isSending && (
          <div className="flex items-center gap-2 text-xs text-accent bg-accent/10 border border-accent/20 px-3 py-1 rounded-full animate-fade-in">
            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            Generating…
          </div>
        )}
      </div>

      {/* Error bar */}
      {error && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-red-500/10 border-b border-red-500/20 animate-fade-in">
          <div className="flex items-center gap-2 text-red-400 text-sm min-w-0">
            <svg
              className="w-4 h-4 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="truncate">{error}</span>
          </div>
          <button
            onClick={onDismissError}
            className="text-red-400 hover:text-red-300 transition-colors flex-shrink-0 text-xs underline underline-offset-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Messages area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        {isLoading && visibleMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <span className="text-text-muted text-sm">
                Loading messages…
              </span>
            </div>
          </div>
        ) : visibleMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <p className="text-text-muted text-sm">No messages yet.</p>
              <p className="text-text-muted text-xs">
                Send a message below to start.
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto w-full px-4 py-6 space-y-1">
            {visibleMessages.map((message, idx) => (
              <MessageBubble
                key={message.id}
                message={message}
                isStreaming={
                  isSending &&
                  idx === visibleMessages.length - 1 &&
                  message.role === "assistant"
                }
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Scroll-to-bottom button */}
      {showScrollBtn && (
        <button
          onClick={() => scrollToBottom("smooth")}
          className="absolute bottom-28 right-6 z-20 p-2.5 rounded-full bg-surface-2 border border-border-strong shadow-float hover:bg-surface-3 text-text-secondary hover:text-text-primary transition-all animate-fade-in"
          title="Scroll to bottom"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      )}

      {/* Input */}
      <MessageInput onSend={onSendMessage} disabled={isSending} />
    </div>
  );
}