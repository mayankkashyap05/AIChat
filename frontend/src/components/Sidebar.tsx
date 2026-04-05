"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ChatItem } from "@/hooks/useChat";

// ─── Types ─────────────────────────────────────────────────────────────────

interface SidebarProps {
  chats: ChatItem[];
  activeChat: ChatItem | null;
  onSelectChat: (chat: ChatItem) => void;
  onNewChat: () => void;
  onRenameChat: (chatId: string, title: string) => void;
  onDeleteChat: (chatId: string) => void;
  user: {
    id: string;
    name: string;
    email: string;
    profilePicture: string | null;
  };
  onLogout: () => void;
  onMobileClose?: () => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function groupChatsByDate(chats: ChatItem[]) {
  const now       = new Date();
  const today     = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86_400_000);
  const lastWeek  = new Date(today.getTime() - 7 * 86_400_000);

  const groups: Record<string, ChatItem[]> = {
    Today: [], Yesterday: [], "Last 7 days": [], Older: [],
  };

  for (const chat of chats) {
    const d = new Date(chat.updatedAt);
    if      (d >= today)     groups["Today"].push(chat);
    else if (d >= yesterday) groups["Yesterday"].push(chat);
    else if (d >= lastWeek)  groups["Last 7 days"].push(chat);
    else                     groups["Older"].push(chat);
  }
  return groups;
}

// ─── ChatItemRow ────────────────────────────────────────────────────────────

interface ChatItemRowProps {
  chat: ChatItem;
  isActive: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}

function ChatItemRow({
  chat, isActive, onSelect, onRename, onDelete,
}: ChatItemRowProps) {
  const [editing,  setEditing]  = useState(false);
  const [title,    setTitle]    = useState(chat.title);
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editing) setTitle(chat.title);
  }, [chat.title, editing]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close, { passive: true });
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
    };
  }, [menuOpen]);

  const confirmRename = useCallback(() => {
    const t = title.trim();
    if (t && t !== chat.title) onRename(t);
    else setTitle(chat.title);
    setEditing(false);
  }, [title, chat.title, onRename]);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open chat: ${chat.title}`}
      className={[
        "group relative flex items-center gap-2 px-3 py-2.5 rounded-xl",
        "cursor-pointer select-none transition-colors duration-150",
        isActive
          ? "bg-accent/15 text-text-primary border border-accent/25"
          : "text-text-secondary hover:bg-surface-2 hover:text-text-primary border border-transparent",
      ].join(" ")}
      onClick={() => !editing && onSelect()}
      onKeyDown={(e) => { if (e.key === "Enter" && !editing) onSelect(); }}
    >
      <svg
        className={`w-4 h-4 flex-shrink-0 ${
          isActive ? "text-accent" : "text-text-muted group-hover:text-text-secondary"
        }`}
        fill="none" stroke="currentColor" viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>

      {editing ? (
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter")  confirmRename();
            if (e.key === "Escape") { setTitle(chat.title); setEditing(false); }
          }}
          onBlur={confirmRename}
          autoFocus
          className="flex-1 min-w-0 bg-surface-3 text-text-primary text-sm px-2 py-0.5 rounded-md outline-none border border-accent/40 focus:border-accent"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="flex-1 min-w-0 truncate text-sm">{chat.title}</span>
      )}

      {!editing && (
        <div
          ref={menuRef}
          className={`relative flex-shrink-0 transition-opacity ${
            menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <button
            aria-label="Chat options"
            onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
            className="p-1.5 rounded-md hover:bg-surface-3 text-text-muted hover:text-text-primary transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 13.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm-5 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm10 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 min-w-[140px] bg-surface-2 border border-border-strong rounded-xl shadow-float py-1 animate-bounce-in">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  setEditing(true);
                  setTimeout(() => inputRef.current?.select(), 50);
                }}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Rename
              </button>
              <div className="h-px bg-border mx-2 my-1" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onDelete();
                }}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── DeleteModal ─────────────────────────────────────────────────────────────

interface DeleteModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteModal({ onConfirm, onCancel }: DeleteModalProps) {
  // Scroll lock
  useEffect(() => {
    const scrollY = window.scrollY;
    const prev = {
      position:  document.body.style.position,
      top:       document.body.style.top,
      width:     document.body.style.width,
      overflowY: document.body.style.overflowY,
    };
    document.body.style.position  = "fixed";
    document.body.style.top       = `-${scrollY}px`;
    document.body.style.width     = "100%";
    document.body.style.overflowY = "scroll";
    return () => {
      document.body.style.position  = prev.position;
      document.body.style.top       = prev.top;
      document.body.style.width     = prev.width;
      document.body.style.overflowY = prev.overflowY;
      window.scrollTo({ top: scrollY, behavior: "instant" });
    };
  }, []);

  // Keyboard handlers
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter")  onConfirm();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel, onConfirm]);

  // ── The portal content ──────────────────────────────────────────────────
  const modal = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      aria-describedby="delete-modal-desc"
      style={{
        // Covers the ENTIRE viewport — not just the sidebar
        position: "fixed",
        inset:    0,
        // Grid centering: single atomic operation on both axes
        display:      "grid",
        placeItems:   "center",
        // Breathing room from every edge including notches
        paddingTop:    "calc(env(safe-area-inset-top,    0px) + clamp(1rem, 4vh, 2rem))",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + clamp(1rem, 4vh, 2rem))",
        paddingLeft:   "calc(env(safe-area-inset-left,   0px) + clamp(1rem, 4vw, 2rem))",
        paddingRight:  "calc(env(safe-area-inset-right,  0px) + clamp(1rem, 4vw, 2rem))",
        // Backdrop
        backgroundColor:     "rgba(0, 0, 0, 0.65)",
        backdropFilter:      "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        // Above absolutely everything
        zIndex: 9999,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width:     "min(100%, 400px)",
          maxHeight: "100%",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          background:   "rgb(26, 26, 30)",
          border:       "1px solid rgba(255,255,255,0.12)",
          borderRadius: "1.25rem",
          boxShadow: [
            "0 0 0 1px rgba(255,255,255,0.04)",
            "0 8px 32px rgba(0,0,0,0.6)",
            "0 32px 64px rgba(0,0,0,0.4)",
          ].join(", "),
          padding:   "clamp(1.25rem, 4vw, 1.75rem)",
          animation: "modal-pop 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        }}
      >
        {/* Header */}
        <div
          style={{
            display:      "flex",
            alignItems:   "flex-start",
            gap:          "clamp(0.75rem, 2vw, 1rem)",
            marginBottom: "clamp(1rem, 3vw, 1.25rem)",
          }}
        >
          <div
            style={{
              flexShrink:     0,
              width:          "clamp(36px, 8vw, 44px)",
              height:         "clamp(36px, 8vw, 44px)",
              borderRadius:   "0.75rem",
              background:     "rgba(239, 68, 68, 0.12)",
              border:         "1px solid rgba(239, 68, 68, 0.25)",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
            }}
          >
            <svg
              style={{
                width:  "clamp(18px, 4vw, 22px)",
                height: "clamp(18px, 4vw, 22px)",
                color:  "rgb(248, 113, 113)",
              }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </div>

          <div style={{ minWidth: 0 }}>
            <h3
              id="delete-modal-title"
              style={{
                fontWeight:   600,
                fontSize:     "clamp(0.9375rem, 2.5vw, 1.0625rem)",
                color:        "rgb(240, 240, 242)",
                lineHeight:   1.3,
                marginBottom: "0.3rem",
              }}
            >
              Delete chat?
            </h3>
            <p
              id="delete-modal-desc"
              style={{
                fontSize:   "clamp(0.8125rem, 2vw, 0.875rem)",
                color:      "rgb(152, 152, 166)",
                lineHeight: 1.5,
              }}
            >
              This conversation will be permanently deleted and cannot be recovered.
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: "clamp(0.5rem, 2vw, 0.625rem)" }}>
          <button
            onClick={onCancel}
            autoFocus
            style={{
              flex:          1,
              padding:       "clamp(0.6rem, 2vw, 0.7rem) 1rem",
              borderRadius:  "0.75rem",
              border:        "1px solid rgba(255,255,255,0.1)",
              background:    "rgba(255,255,255,0.05)",
              color:         "rgb(152, 152, 166)",
              fontSize:      "clamp(0.8125rem, 2vw, 0.875rem)",
              fontWeight:    500,
              cursor:        "pointer",
              transition:    "background 0.15s, color 0.15s, border-color 0.15s",
              outline:       "none",
            }}
            onMouseEnter={(e) => {
              const b = e.currentTarget;
              b.style.background  = "rgba(255,255,255,0.09)";
              b.style.color       = "rgb(240,240,242)";
              b.style.borderColor = "rgba(255,255,255,0.18)";
            }}
            onMouseLeave={(e) => {
              const b = e.currentTarget;
              b.style.background  = "rgba(255,255,255,0.05)";
              b.style.color       = "rgb(152,152,166)";
              b.style.borderColor = "rgba(255,255,255,0.1)";
            }}
            onFocus={(e) => {
              e.currentTarget.style.outline      = "2px solid rgba(124,106,247,0.7)";
              e.currentTarget.style.outlineOffset = "2px";
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = "none";
            }}
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            style={{
              flex:          1,
              padding:       "clamp(0.6rem, 2vw, 0.7rem) 1rem",
              borderRadius:  "0.75rem",
              border:        "1px solid rgba(239,68,68,0.4)",
              background:    "rgb(220, 38, 38)",
              color:         "rgb(255, 255, 255)",
              fontSize:      "clamp(0.8125rem, 2vw, 0.875rem)",
              fontWeight:    600,
              cursor:        "pointer",
              transition:    "background 0.15s, box-shadow 0.15s",
              outline:       "none",
              boxShadow:     "0 2px 8px rgba(220,38,38,0.3)",
            }}
            onMouseEnter={(e) => {
              const b = e.currentTarget;
              b.style.background = "rgb(185, 28, 28)";
              b.style.boxShadow  = "0 4px 16px rgba(220,38,38,0.45)";
            }}
            onMouseLeave={(e) => {
              const b = e.currentTarget;
              b.style.background = "rgb(220, 38, 38)";
              b.style.boxShadow  = "0 2px 8px rgba(220,38,38,0.3)";
            }}
            onFocus={(e) => {
              e.currentTarget.style.outline      = "2px solid rgba(248,113,113,0.7)";
              e.currentTarget.style.outlineOffset = "2px";
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = "none";
            }}
          >
            Delete
          </button>
        </div>

        {/* Keyboard hint */}
        <p
          style={{
            marginTop:  "clamp(0.625rem, 2vw, 0.875rem)",
            textAlign:  "center",
            fontSize:   "0.6875rem",
            color:      "rgba(152,152,166,0.5)",
            userSelect: "none",
          }}
          aria-hidden="true"
        >
          Press{" "}
          <kbd
            style={{
              fontFamily:   "monospace",
              background:   "rgba(255,255,255,0.07)",
              padding:      "0.1em 0.35em",
              borderRadius: "4px",
              fontSize:     "0.9em",
            }}
          >
            Esc
          </kbd>{" "}
          to cancel
        </p>
      </div>
    </div>
  );

  // ── Mount on document.body via portal ───────────────────────────────────
  // This escapes overflow:hidden, z-index stacking contexts, and any
  // transform on ancestor elements — the modal always covers the full screen.
  return createPortal(modal, document.body);
}

// ─── Sidebar (main export) ───────────────────────────────────────────────────

export default function Sidebar({
  chats, activeChat, onSelectChat, onNewChat,
  onRenameChat, onDeleteChat, user, onLogout, onMobileClose,
}: SidebarProps) {
  const [isCollapsed,     setIsCollapsed]     = useState(false);
  const [search,          setSearch]          = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filtered = search.trim()
    ? chats.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()))
    : chats;

  const grouped  = groupChatsByDate(filtered);
  const hasChats = chats.length > 0;

  const confirmDelete = useCallback(() => {
    if (deleteConfirmId) {
      onDeleteChat(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  }, [deleteConfirmId, onDeleteChat]);

  /* Collapsed sidebar — desktop only */
  if (isCollapsed) {
    return (
      <>
        <aside className="hidden lg:flex flex-col items-center py-3 px-2 gap-3 bg-surface-1 border-r border-border h-full w-14 flex-shrink-0">
          <button
            onClick={() => setIsCollapsed(false)}
            className="p-2.5 rounded-xl hover:bg-surface-2 text-text-muted hover:text-text-primary transition-colors focus-ring"
            aria-label="Expand sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="h-px w-full bg-border" />
          <button
            onClick={onNewChat}
            className="p-2.5 rounded-xl hover:bg-accent/15 text-text-muted hover:text-accent transition-colors focus-ring"
            aria-label="New chat"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </aside>

        {deleteConfirmId && (
          <DeleteModal
            onConfirm={confirmDelete}
            onCancel={() => setDeleteConfirmId(null)}
          />
        )}
      </>
    );
  }

  /* Full sidebar */
  return (
    <>
      <aside className="w-full h-full bg-surface-1 border-r border-border flex flex-col overflow-hidden lg:w-[272px] lg:min-w-[272px] lg:flex-shrink-0">

        {/* Top bar */}
        <div className="flex items-center gap-2 px-3 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-accent to-blue-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <span className="font-semibold text-sm text-text-primary truncate">AI Chat</span>
          </div>

          <button
            onClick={onNewChat}
            className="p-2 rounded-lg hover:bg-accent/15 text-text-muted hover:text-accent transition-colors focus-ring flex-shrink-0"
            aria-label="New chat"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>

          <button
            onClick={() => setIsCollapsed(true)}
            className="hidden lg:flex p-2 rounded-lg hover:bg-surface-2 text-text-muted hover:text-text-primary transition-colors focus-ring flex-shrink-0"
            aria-label="Collapse sidebar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>

          {onMobileClose && (
            <button
              onClick={onMobileClose}
              className="flex lg:hidden p-2 rounded-lg hover:bg-surface-2 text-text-muted hover:text-text-primary transition-colors focus-ring flex-shrink-0"
              aria-label="Close sidebar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Search */}
        {hasChats && (
          <div className="px-3 pt-2 pb-1 flex-shrink-0">
            <div className="flex items-center gap-2 bg-surface-2 border border-border rounded-lg px-3 py-1.5">
              <svg className="w-3.5 h-3.5 text-text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search chats…"
                className="flex-1 min-w-0 bg-transparent text-sm text-text-primary placeholder-text-muted outline-none"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="flex-shrink-0 text-text-muted hover:text-text-secondary transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Chat list */}
        <div
          className="flex-1 min-h-0 px-2 py-2"
          style={{
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            overscrollBehavior: "contain",
          } as React.CSSProperties}
        >
          {!hasChats ? (
            <div className="flex flex-col items-center justify-center h-36 gap-3 text-center px-4">
              <div className="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center">
                <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <p className="text-text-secondary text-sm font-medium">No chats yet</p>
                <p className="text-text-muted text-xs mt-1">Start a conversation</p>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-text-muted text-sm px-3">
              No chats match &ldquo;{search}&rdquo;
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([label, items]) =>
                items.length === 0 ? null : (
                  <div key={label}>
                    <p className="px-3 py-1 text-xs font-semibold text-text-muted uppercase tracking-wider">
                      {label}
                    </p>
                    <div className="space-y-0.5 mt-1">
                      {items.map((chat) => (
                        <ChatItemRow
                          key={chat.id}
                          chat={chat}
                          isActive={activeChat?.id === chat.id}
                          onSelect={() => onSelectChat(chat)}
                          onRename={(t) => onRenameChat(chat.id, t)}
                          onDelete={() => setDeleteConfirmId(chat.id)}
                        />
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* User panel */}
        <div
          className="border-t border-border p-3 flex-shrink-0"
          style={{
            paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))",
          }}
        >
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-2 transition-colors group">
            {user.profilePicture ? (
              <Image
                src={user.profilePicture}
                alt={user.name}
                width={34}
                height={34}
                className="rounded-full ring-2 ring-border flex-shrink-0"
              />
            ) : (
              <div className="w-[34px] h-[34px] rounded-full bg-gradient-to-br from-accent to-blue-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-text-primary truncate">{user.name}</div>
              <div className="text-xs text-text-muted truncate">{user.email}</div>
            </div>
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-all focus-ring flex-shrink-0"
              aria-label="Sign out"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Portal renders directly on document.body — always full-screen centered */}
      {deleteConfirmId && (
        <DeleteModal
          onConfirm={confirmDelete}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}
    </>
  );
}