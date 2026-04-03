"use client";

import { MessageItem } from "@/hooks/useChat";
import ReactMarkdown from "react-markdown";

interface MessageBubbleProps {
  message: MessageItem;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`py-5 ${
        isUser ? "bg-transparent" : "bg-transparent"
      }`}
    >
      <div className="flex gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {isUser ? (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
              U
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-green-500 flex items-center justify-center text-white text-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-gray-400 mb-1.5">
            {isUser ? "You" : "AI Assistant"}
          </div>
          <div className="message-content text-gray-200 leading-relaxed">
            {message.content ? (
              <ReactMarkdown>{message.content}</ReactMarkdown>
            ) : (
              <span className="text-gray-500 italic">Thinking...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}