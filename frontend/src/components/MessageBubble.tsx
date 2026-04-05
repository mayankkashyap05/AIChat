"use client";

import React, { useState, useCallback } from "react";
import { MessageItem } from "@/hooks/useChat";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface MessageBubbleProps {
  message: MessageItem;
  isStreaming?: boolean;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-2 py-1 rounded-md text-2xs transition-colors text-text-muted hover:text-text-primary hover:bg-surface-3"
      aria-label="Copy code"
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-400">Copied</span>
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span className="hidden xs:inline">Copy</span>
        </>
      )}
    </button>
  );
}

function CopyMessageButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-lg text-text-muted hover:text-text-secondary hover:bg-surface-2 transition-colors focus-ring"
      aria-label="Copy message"
    >
      {copied ? (
        <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );
}

export default function MessageBubble({
  message,
  isStreaming = false,
}: MessageBubbleProps) {
  const isUser  = message.role === "user";
  const isEmpty = !message.content;

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div
      className={`group flex gap-2 py-3 rounded-xl transition-colors hover:bg-surface-1/30 animate-fade-in ${
        isUser ? "flex-row-reverse" : "flex-row"
      }`}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 mt-1">
        {isUser ? (
          <div
            className="rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold shadow-sm"
            style={{
              width:    "clamp(26px, 4vw, 32px)",
              height:   "clamp(26px, 4vw, 32px)",
              fontSize: "clamp(9px, 1.5vw, 11px)",
            }}
          >
            U
          </div>
        ) : (
          <div
            className="rounded-full bg-gradient-to-br from-accent to-blue-500 flex items-center justify-center shadow-sm"
            style={{
              width:  "clamp(26px, 4vw, 32px)",
              height: "clamp(26px, 4vw, 32px)",
            }}
          >
            <svg
              style={{
                width:  "clamp(13px, 2vw, 16px)",
                height: "clamp(13px, 2vw, 16px)",
              }}
              className="text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>

      {/* Content column */}
      <div
        className={`flex flex-col gap-1 min-w-0 ${isUser ? "items-end" : "items-start"}`}
        style={{ maxWidth: "min(85%, 680px)" }}
      >
        {/* Meta row */}
        <div
          className={`flex items-center gap-1.5 px-0.5 flex-wrap ${
            isUser ? "flex-row-reverse" : "flex-row"
          }`}
        >
          <span className="text-2xs font-semibold text-text-secondary whitespace-nowrap">
            {isUser ? "You" : "AI Assistant"}
          </span>
          <span className="text-2xs text-text-muted whitespace-nowrap">
            {formatTime(message.createdAt)}
          </span>
          {message.modelName && !isUser && (
            <span className="text-2xs text-text-muted bg-surface-2 border border-border px-1.5 py-0.5 rounded-full whitespace-nowrap">
              {message.modelName.replace("ollama/", "")}
            </span>
          )}
        </div>

        {/* Bubble */}
        <div
          className={`relative rounded-2xl min-w-0 w-full overflow-hidden ${
            isUser
              ? "bg-accent/20 border border-accent/25 rounded-tr-sm"
              : "bg-surface-1 border border-border rounded-tl-sm"
          }`}
          style={{
            padding:
              "clamp(0.5rem, 2vw, 0.75rem) clamp(0.625rem, 2.5vw, 1rem)",
          }}
        >
          {isEmpty ? (
            <LoadingThinking />
          ) : isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-text-primary">
              {message.content}
            </p>
          ) : (
            <div className="message-content">
              <ReactMarkdown
                components={{
                  table: ({ children }) => (
                    <div className="table-wrapper">
                      <table>{children}</table>
                    </div>
                  ),
                  code({ className, children }) {
                    const match   = /language-(\w+)/.exec(className || "");
                    const codeStr = String(children).replace(/\n$/, "");
                    const isBlock = codeStr.includes("\n") || !!match;

                    if (isBlock) {
                      const lang = match?.[1] || "text";
                      return (
                        <div className="code-block-wrapper my-2 border border-border">
                          <div className="code-block-header">
                            <span className="text-accent/80 font-mono">{lang}</span>
                            <CopyButton text={codeStr} />
                          </div>
                          <div className="code-block-scroll">
                            <SyntaxHighlighter
                              style={oneDark}
                              language={lang}
                              PreTag="div"
                              customStyle={{
                                margin:       0,
                                borderRadius: 0,
                                background:   "#12121a",
                                fontSize:     "clamp(0.7rem, 1.8vw, 0.82rem)",
                                lineHeight:   "1.6",
                                padding:      "0.75em 1em",
                              }}
                              codeTagProps={{
                                style: { fontFamily: "JetBrains Mono, monospace" },
                              }}
                            >
                              {codeStr}
                            </SyntaxHighlighter>
                          </div>
                        </div>
                      );
                    }
                    return <code className={className}>{children}</code>;
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
              {isStreaming && <span className="typing-cursor" aria-hidden />}
            </div>
          )}
        </div>

        {/* Copy action */}
        {!isEmpty && !isStreaming && (
          <div
            className={`flex items-center gap-1 px-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${
              isUser ? "flex-row-reverse" : "flex-row"
            }`}
          >
            <CopyMessageButton text={message.content} />
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingThinking() {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-accent"
            style={{
              animation:      "pulse-dot 1.4s ease-in-out infinite",
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
      <span className="text-xs text-text-muted">Thinking…</span>
    </div>
  );
}