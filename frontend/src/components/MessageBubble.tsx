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
    } catch {
      /* ignore */
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all duration-150 text-text-muted hover:text-text-primary hover:bg-surface-3"
      title="Copy code"
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-400">Copied!</span>
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy
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
    } catch {/* ignore */}
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-lg text-text-muted hover:text-text-secondary hover:bg-surface-2 transition-all focus-ring"
      title="Copy message"
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

export default function MessageBubble({ message, isStreaming = false }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isEmpty = !message.content;

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className={`group flex gap-3 py-4 px-2 rounded-2xl transition-colors hover:bg-surface-1/40 ${isUser ? "flex-row-reverse" : "flex-row"} animate-fade-in`}>
      {/* Avatar */}
      <div className="flex-shrink-0 mt-0.5">
        {isUser ? (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
            U
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-blue-500 flex items-center justify-center shadow-sm">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>

      {/* Bubble content */}
      <div className={`flex flex-col gap-1.5 max-w-[85%] min-w-0 ${isUser ? "items-end" : "items-start"}`}>
        {/* Sender name + time */}
        <div className={`flex items-center gap-2 px-1 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
          <span className="text-xs font-semibold text-text-secondary">
            {isUser ? "You" : "AI Assistant"}
          </span>
          <span className="text-xs text-text-muted">
            {formatTime(message.createdAt)}
          </span>
          {message.modelName && !isUser && (
            <span className="text-xs text-text-muted bg-surface-2 border border-border px-2 py-0.5 rounded-full">
              {message.modelName.replace("ollama/", "")}
            </span>
          )}
        </div>

        {/* Message body */}
        <div
          className={`relative rounded-2xl px-4 py-3 ${
            isUser
              ? "bg-accent/20 border border-accent/25 text-text-primary rounded-tr-sm"
              : "bg-surface-1 border border-border text-text-primary rounded-tl-sm"
          }`}
        >
          {isEmpty ? (
            <LoadingThinking />
          ) : isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="message-content">
              <ReactMarkdown
                components={{
                  code({ node, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || "");
                    const codeStr = String(children).replace(/\n$/, "");
                    const isBlock = codeStr.includes("\n") || match;

                    if (isBlock) {
                      const lang = match?.[1] || "text";
                      return (
                        <div className="code-block-wrapper my-3 rounded-xl overflow-hidden border border-border">
                          <div className="code-block-header">
                            <span className="text-accent/80 font-mono">{lang}</span>
                            <CopyButton text={codeStr} />
                          </div>
                          <SyntaxHighlighter
                            style={oneDark}
                            language={lang}
                            PreTag="div"
                            customStyle={{
                              margin: 0,
                              borderRadius: 0,
                              background: "#12121a",
                              fontSize: "0.83rem",
                              lineHeight: "1.6",
                              padding: "1em 1.25em",
                            }}
                            codeTagProps={{ style: { fontFamily: "JetBrains Mono, monospace" } }}
                          >
                            {codeStr}
                          </SyntaxHighlighter>
                        </div>
                      );
                    }

                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
              {isStreaming && <span className="typing-cursor" aria-hidden />}
            </div>
          )}
        </div>

        {/* Actions row — shown on hover */}
        {!isEmpty && !isStreaming && (
          <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity px-1 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
            <CopyMessageButton text={message.content} />
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingThinking() {
  return (
    <div className="flex items-center gap-2 py-1">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
      <span className="text-xs text-text-muted">Thinking…</span>
    </div>
  );
}