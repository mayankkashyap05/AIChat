"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled: boolean;
}

export default function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 220) + "px";
  }, [input]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }, [input, disabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = !!input.trim() && !disabled;

  return (
    <div className="flex-shrink-0 border-t border-border bg-surface/80 backdrop-blur-sm px-4 py-4">
      <div className="max-w-3xl mx-auto space-y-2">
        {/* Main input container */}
        <div className="relative bg-surface-1 border border-border hover:border-border-strong focus-within:border-accent/50 focus-within:shadow-glow-sm rounded-2xl transition-all duration-200">
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              disabled
                ? "AI is responding…"
                : "Message AI (Enter to send, Shift+Enter for newline)"
            }
            disabled={disabled}
            rows={1}
            className="w-full bg-transparent text-text-primary placeholder-text-muted text-sm leading-6 outline-none resize-none px-4 pt-3.5 pb-3 max-h-[220px] disabled:cursor-not-allowed"
          />

          {/* Bottom bar */}
          <div className="flex items-center justify-end px-3 pb-2.5">
            {/* Character count hint */}
            {input.length > 500 && (
              <span
                className={`text-xs mr-3 ${
                  input.length > 3000 ? "text-red-400" : "text-text-muted"
                }`}
              >
                {input.length.toLocaleString()}
              </span>
            )}

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!canSend}
              className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-150 focus-ring ${
                canSend
                  ? "bg-accent hover:bg-accent-hover text-white shadow-glow-sm"
                  : "bg-surface-3 text-text-muted cursor-not-allowed"
              }`}
              title="Send (Enter)"
            >
              {disabled ? (
                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
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
                    d="M5 12h14m-7-7l7 7-7 7"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-center text-xs text-text-muted">
          AI can make mistakes · All data stays on your server · Shift+Enter
          for newlines
        </p>
      </div>
    </div>
  );
}