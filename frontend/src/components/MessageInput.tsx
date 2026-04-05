"use client";

import {
  useState,
  useRef,
  useLayoutEffect,
  useEffect,
  useCallback,
} from "react";

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled: boolean;
}

const LINE_HEIGHT = 24;   // px — must match .chat-textarea line-height (1.6 × 15px ≈ 24px)
const MAX_HEIGHT  = 160;  // px — ~6 lines before textarea scrolls internally
const PADDING_TOP = 13;   // px — top padding inside textarea

export default function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [input, setInput] = useState("");
  const textareaRef       = useRef<HTMLTextAreaElement>(null);

  /* ── Auto-resize ─────────────────────────────────────────────────── */
  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, MAX_HEIGHT);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > MAX_HEIGHT ? "auto" : "hidden";
  }, []);

  /* After every input change — useLayoutEffect avoids a visible jump */
  useLayoutEffect(() => {
    resize();
  }, [input, resize]);

  /* Also handle orientation / window resize */
  useEffect(() => {
    window.addEventListener("resize", resize, { passive: true });
    return () => window.removeEventListener("resize", resize);
  }, [resize]);

  /* ── Send ────────────────────────────────────────────────────────── */
  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput("");
    const el = textareaRef.current;
    if (el) {
      el.style.height = `${LINE_HEIGHT + PADDING_TOP}px`;
      el.style.overflowY = "hidden";
    }
  }, [input, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const canSend  = input.trim().length > 0 && !disabled;
  const showCount = input.length > 500;
  const overLimit = input.length > 3000;

  return (
    <div className="input-wrapper">
      <div className="input-inner">

        {/* Textarea + action bar container */}
        <div className={`textarea-container${disabled ? " disabled" : ""}`}>

          {/*
           * The textarea:
           *  - font-size is max(16px, ...) → prevents iOS auto-zoom on focus
           *  - overflow-y starts hidden; switches to auto when > MAX_HEIGHT
           *  - touch-action: auto → lets the finger scroll inside when tall
           *  - resize: none → we handle it manually
           */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? "AI is responding…" : "Message AI…"}
            disabled={disabled}
            rows={1}
            aria-label="Message input"
            className="chat-textarea"
            style={{
              height:     `${LINE_HEIGHT + PADDING_TOP}px`,
              overflowY:  "hidden",
              touchAction: "auto",
            }}
          />

          {/* Bottom action bar */}
          <div className="input-bottom-bar">
            {/* Hint */}
            <span
              className="text-2xs text-text-muted truncate hidden xs:block select-none"
              aria-hidden
            >
              {disabled ? "Generating…" : "Shift + Enter for new line"}
            </span>

            <div className="flex items-center gap-2 ml-auto flex-shrink-0">
              {/* Character count */}
              {showCount && (
                <span
                  className={`text-2xs tabular-nums select-none ${
                    overLimit ? "text-red-400" : "text-text-muted"
                  }`}
                  aria-live="polite"
                  aria-label={`${input.length} characters`}
                >
                  {input.length.toLocaleString()}
                  {overLimit && " — too long"}
                </span>
              )}

              {/* Send button */}
              <button
                onClick={handleSend}
                disabled={!canSend}
                aria-label="Send message"
                className={`send-btn${canSend ? " active" : " inactive"}`}
              >
                {disabled ? (
                  /* Spinner */
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <circle
                      className="opacity-25"
                      cx="12" cy="12" r="10"
                      stroke="currentColor"
                      strokeWidth="3"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                ) : (
                  /* Arrow */
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 12h14m-7-7l7 7-7 7"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="input-disclaimer">
          AI can make mistakes · All data stays on your server
        </p>
      </div>
    </div>
  );
}