"use client";

import { useState, useRef, useEffect } from "react";

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled: boolean;
}

export default function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";
    }
  }, [input]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;

    onSend(trimmed);
    setInput("");

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-chat-border bg-chat-bg p-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end gap-3 bg-chat-input rounded-xl border border-chat-border focus-within:border-gray-500 transition-colors px-4 py-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a message..."
            disabled={disabled}
            rows={1}
            className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none resize-none text-sm leading-6 max-h-[200px]"
          />
          <button
            onClick={handleSend}
            disabled={disabled || !input.trim()}
            className={`p-1.5 rounded-lg transition-all ${
              input.trim() && !disabled
                ? "bg-teal-500 hover:bg-teal-600 text-white"
                : "text-gray-600 cursor-not-allowed"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19V5m0 0l-7 7m7-7l7 7"
              />
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-600 text-center mt-2">
          AI can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}