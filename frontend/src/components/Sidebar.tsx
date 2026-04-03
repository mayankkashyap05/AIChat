"use client";

import { useState } from "react";
import { ChatItem } from "@/hooks/useChat";
import Image from "next/image";

interface SidebarProps {
  chats: ChatItem[];
  activeChat: ChatItem | null;
  onSelectChat: (chat: ChatItem) => void;
  onNewChat: () => void;
  onRenameChat: (chatId: string, title: string) => void;
  onDeleteChat: (chatId: string) => void;
  user: { id: string; name: string; email: string; profilePicture: string | null };
  onLogout: () => void;
}

export default function Sidebar({
  chats,
  activeChat,
  onSelectChat,
  onNewChat,
  onRenameChat,
  onDeleteChat,
  user,
  onLogout,
}: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const startRename = (chat: ChatItem) => {
    setEditingId(chat.id);
    setEditTitle(chat.title);
  };

  const confirmRename = (chatId: string) => {
    if (editTitle.trim()) {
      onRenameChat(chatId, editTitle.trim());
    }
    setEditingId(null);
  };

  if (!sidebarOpen) {
    return (
      <div className="w-0 relative">
        <button
          onClick={() => setSidebarOpen(true)}
          className="absolute top-3 left-3 z-50 p-2 bg-chat-sidebar rounded-lg hover:bg-chat-hover transition-colors"
          title="Open sidebar"
        >
          <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="w-[280px] min-w-[280px] bg-chat-sidebar flex flex-col h-full">
      {/* Header */}
      <div className="p-3 flex gap-2">
        <button
          onClick={onNewChat}
          className="flex-1 flex items-center gap-2 px-3 py-3 border border-chat-border rounded-lg hover:bg-chat-hover transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Chat
        </button>
        <button
          onClick={() => setSidebarOpen(false)}
          className="p-3 border border-chat-border rounded-lg hover:bg-chat-hover transition-colors"
          title="Close sidebar"
        >
          <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {chats.length === 0 && (
          <div className="text-gray-500 text-sm text-center py-8">
            No chats yet. Start a new one!
          </div>
        )}
        {chats.map((chat) => (
          <div
            key={chat.id}
            className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-sm ${
              activeChat?.id === chat.id
                ? "bg-chat-hover text-white"
                : "text-gray-300 hover:bg-chat-hover/50"
            }`}
            onClick={() => onSelectChat(chat)}
          >
            <svg className="w-4 h-4 flex-shrink-0 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>

            {editingId === chat.id ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmRename(chat.id);
                  if (e.key === "Escape") setEditingId(null);
                }}
                onBlur={() => confirmRename(chat.id)}
                autoFocus
                className="flex-1 bg-chat-input text-white text-sm px-2 py-0.5 rounded outline-none"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="flex-1 truncate">{chat.title}</span>
            )}

            {/* Action buttons (visible on hover) */}
            {activeChat?.id === chat.id && editingId !== chat.id && (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startRename(chat);
                  }}
                  className="p-1 hover:text-white text-gray-500 transition-colors"
                  title="Rename"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Delete this chat?")) onDeleteChat(chat.id);
                  }}
                  className="p-1 hover:text-red-400 text-gray-500 transition-colors"
                  title="Delete"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* User info */}
      <div className="p-3 border-t border-chat-border">
        <div className="flex items-center gap-3 px-2 py-2">
          {user.profilePicture ? (
            <Image
              src={user.profilePicture}
              alt={user.name}
              width={32}
              height={32}
              className="rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center text-white text-sm font-medium">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{user.name}</div>
            <div className="text-xs text-gray-500 truncate">{user.email}</div>
          </div>
          <button
            onClick={onLogout}
            className="p-1.5 hover:bg-chat-hover rounded-lg transition-colors text-gray-500 hover:text-white"
            title="Sign out"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}