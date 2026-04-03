"use client";

import { useEffect, useRef } from "react";
import { ChatItem, MessageItem } from "@/hooks/useChat";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import LoadingDots from "./LoadingDots";

interface ChatWindowProps {
  activeChat: ChatItem | null;
  messages: MessageItem[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  onSendMessage: (content: string, model?: string) => void;
  onNewChat: () => void;
  onDismissError: () => void;
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
}: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Empty state
  if (!activeChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-chat-bg">
        <div className="text-center space-y-6 max-w-lg px-4">
          <div className="w-14 h-14 mx-auto bg-gradient-to-br from-teal-400 to-blue-500 rounded-2xl flex items-center justify-center">
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
          <div>
            <h2 className="text-2xl font-medium text-white mb-2">AI Chat</h2>
            <p className="text-gray-400">
              Start a new conversation or select an existing one from the sidebar.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {[
              "Explain quantum computing in simple terms",
              "Write a Python function to sort a list",
              "What are the pros and cons of TypeScript?",
              "Help me debug my React component",
            ].map((suggestion, i) => (
              <button
                key={i}
                onClick={async () => {
                  await onNewChat();
                  // Small delay to ensure chat is created before sending
                  setTimeout(() => onSendMessage(suggestion), 100);
                }}
                className="text-left px-4 py-3 bg-chat-hover rounded-xl border border-chat-border hover:border-gray-500 transition-colors text-gray-300"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-chat-bg overflow-hidden">
      {/* Error bar */}
      {error && (
        <div className="bg-red-900/40 border-b border-red-800 px-4 py-2 flex items-center justify-between">
          <span className="text-red-300 text-sm">⚠️ {error}</span>
          <button
            onClick={onDismissError}
            className="text-red-400 hover:text-red-200 text-sm"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <LoadingDots />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            Send a message to start the conversation
          </div>
        ) : (
          <div className="max-w-3xl mx-auto py-6 px-4">
            {messages
              .filter((m) => m.role !== "system")
              .map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
            {isSending && messages[messages.length - 1]?.content === "" && (
              <div className="py-4 flex justify-start">
                <LoadingDots />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <MessageInput onSend={onSendMessage} disabled={isSending} />
    </div>
  );
}