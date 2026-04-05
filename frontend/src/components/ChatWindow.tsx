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
  onOpenMobileSidebar: () => void;
}

const SUGGESTIONS = [
  { icon: "💡", text: "Explain quantum computing in simple terms" },
  { icon: "🐍", text: "Write a Python function to parse JSON" },
  { icon: "⚛️", text: "What are React Server Components?" },
  { icon: "🐛", text: "Help me debug a TypeScript type error" },
  { icon: "✍️", text: "Write a concise executive summary template" },
  { icon: "🔒", text: "Best practices for API authentication" },
];

/* ── Shared top bar ─────────────────────────────────────────────────── */
function TopBar({
  title,
  isSending,
  onOpenMobileSidebar,
}: {
  title?: string;
  isSending: boolean;
  onOpenMobileSidebar: () => void;
}) {
  return (
    <div className="glass border-b border-border flex items-center gap-2 flex-shrink-0 px-3 py-2.5 min-h-[48px]">
      <button
        onClick={onOpenMobileSidebar}
        className="flex lg:hidden flex-shrink-0 p-2 rounded-lg hover:bg-surface-2 text-text-muted hover:text-text-primary transition-colors focus-ring"
        aria-label="Open sidebar"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="flex-1 min-w-0">
        {title ? (
          <h1 className="font-semibold text-text-primary truncate text-sm leading-tight">
            {title}
          </h1>
        ) : (
          <span className="font-semibold text-sm text-text-primary lg:hidden">
            AI Chat
          </span>
        )}
      </div>

      {isSending && (
        <div className="flex items-center gap-1.5 text-xs text-accent bg-accent/10 border border-accent/20 px-2.5 py-1 rounded-full animate-fade-in flex-shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          <span className="hidden xs:inline">Generating…</span>
        </div>
      )}
    </div>
  );
}

export default function ChatWindow({
  activeChat,
  messages,
  isLoading,
  isSending,
  error,
  onSendMessage,
  onNewChat,
  onDismissError,
  onOpenMobileSidebar,
}: ChatWindowProps) {
  const messagesEndRef     = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [isCreating,    setIsCreating]    = useState(false);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
  }, []);

  /* Auto-scroll on new messages */
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last) return;
    if ((last.role === "assistant" && isSending) || last.role === "user") {
      scrollToBottom("smooth");
    }
  }, [messages, isSending, scrollToBottom]);

  /* Show / hide scroll-to-bottom FAB */
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 180);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  /* Suggestion tap — create chat then send */
  const handleSuggestion = useCallback(
    async (text: string) => {
      if (isCreating) return;
      setIsCreating(true);
      try {
        const chat = await onNewChat();
        if (chat) setTimeout(() => onSendMessage(text), 80);
      } finally {
        setIsCreating(false);
      }
    },
    [isCreating, onNewChat, onSendMessage]
  );

  const visibleMessages = messages.filter((m) => m.role !== "system");

  /* ── Welcome / empty state ──────────────────────────────────────── */
  if (!activeChat) {
    return (
      <div
        className="flex-1 flex flex-col min-w-0 bg-surface"
        style={{ minHeight: 0, overflow: "hidden" }}
      >
        <TopBar isSending={isSending} onOpenMobileSidebar={onOpenMobileSidebar} />

        {/* Scrollable area */}
        <div className="messages-scroll">
          <div className="min-h-full flex items-center justify-center px-4 py-8">
            <div className="w-full max-w-2xl flex flex-col items-center gap-8 animate-fade-in">

              {/* Header */}
              <div className="text-center flex flex-col items-center gap-3">
                <div className="relative inline-flex">
                  <div className="absolute inset-0 rounded-2xl bg-accent/20 blur-lg pointer-events-none" />
                  <div
                    className="relative rounded-2xl bg-gradient-to-br from-accent to-blue-500 flex items-center justify-center shadow-glow"
                    style={{
                      width:  "clamp(52px, 8vw, 64px)",
                      height: "clamp(52px, 8vw, 64px)",
                    }}
                  >
                    <svg
                      style={{
                        width:  "clamp(26px, 4vw, 32px)",
                        height: "clamp(26px, 4vw, 32px)",
                      }}
                      className="text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                </div>
                <h2
                  className="font-bold text-text-primary"
                  style={{ fontSize: "clamp(1.125rem, 4vw, 1.5rem)" }}
                >
                  How can I help you?
                </h2>
                <p className="text-text-secondary text-sm text-center px-2">
                  Start a conversation or pick a suggestion below.
                </p>
              </div>

              {/* Suggestions */}
              <div
                className="w-full grid gap-2"
                style={{
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
                }}
              >
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestion(s.text)}
                    disabled={isCreating}
                    className="group text-left p-3.5 rounded-2xl bg-surface-1 border border-border hover:border-accent/30 hover:bg-surface-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-wait"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="text-lg flex-shrink-0 leading-snug">{s.icon}</span>
                      <span className="text-xs sm:text-sm text-text-secondary group-hover:text-text-primary transition-colors leading-relaxed">
                        {s.text}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <MessageInput
          onSend={handleSuggestion}
          disabled={isSending || isCreating}
        />
      </div>
    );
  }

  /* ── Active chat ────────────────────────────────────────────────── */
  return (
    <div
      className="flex-1 flex flex-col min-w-0 bg-surface relative"
      style={{ minHeight: 0, overflow: "hidden" }}
    >
      <TopBar
        title={activeChat.title}
        isSending={isSending}
        onOpenMobileSidebar={onOpenMobileSidebar}
      />

      {/* Error bar */}
      {error && (
        <div className="flex items-center justify-between gap-3 px-4 py-2 bg-red-500/10 border-b border-red-500/20 animate-fade-in flex-shrink-0">
          <div className="flex items-center gap-2 text-red-400 min-w-0">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="truncate text-xs sm:text-sm">{error}</span>
          </div>
          <button
            onClick={onDismissError}
            className="flex-shrink-0 text-red-400 hover:text-red-300 text-xs underline underline-offset-2 whitespace-nowrap transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/*
       * THE scroll container.
       * .messages-scroll class sets:
       *   overflow-y: auto
       *   -webkit-overflow-scrolling: touch
       *   overscroll-behavior-y: contain
       *   touch-action: pan-y
       *   flex: 1 1 0%
       *   min-height: 0
       */}
      <div ref={scrollContainerRef} className="messages-scroll">
        {isLoading && visibleMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[200px]">
            <div className="flex flex-col items-center gap-3">
              <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <span className="text-text-muted text-sm">Loading messages…</span>
            </div>
          </div>
        ) : visibleMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[200px] px-4">
            <div className="text-center space-y-1">
              <p className="text-text-muted text-sm">No messages yet.</p>
              <p className="text-text-muted text-xs">Send a message below to start.</p>
            </div>
          </div>
        ) : (
          <div className="messages-list">
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
            <div ref={messagesEndRef} aria-hidden style={{ height: 1 }} />
          </div>
        )}
      </div>

      {/* Scroll-to-bottom FAB */}
      {showScrollBtn && (
        <button
          onClick={() => scrollToBottom("smooth")}
          className="absolute z-20 p-2.5 rounded-full bg-surface-2 border border-border-strong shadow-float hover:bg-surface-3 text-text-secondary hover:text-text-primary transition-all animate-fade-in"
          style={{
            bottom: "calc(var(--input-height, 80px) + 12px)",
            right:  "clamp(0.75rem, 2vw, 1.25rem)",
          }}
          aria-label="Scroll to bottom"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}

      <MessageInput onSend={onSendMessage} disabled={isSending} />
    </div>
  );
}