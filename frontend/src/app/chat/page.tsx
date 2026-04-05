"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useChat, ChatItem } from "@/hooks/useChat";
import Sidebar from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";

export default function ChatPage() {
  const { user, loading, logout } = useAuth();
  const router   = useRouter();
  const chatHook = useChat();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const scrollYRef = useRef(0);

  /* Auth guard */
  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  /* Load chats */
  useEffect(() => {
    if (user) chatHook.fetchChats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  /* Lock body scroll while drawer is open (preserves scroll pos) */
  useEffect(() => {
    if (drawerOpen) {
      scrollYRef.current = window.scrollY;
      document.body.style.position   = "fixed";
      document.body.style.top        = `-${scrollYRef.current}px`;
      document.body.style.width      = "100%";
      document.body.style.overflowY  = "scroll";
    } else {
      document.body.style.position   = "";
      document.body.style.top        = "";
      document.body.style.width      = "";
      document.body.style.overflowY  = "";
      window.scrollTo(0, scrollYRef.current);
    }
    return () => {
      document.body.style.position   = "";
      document.body.style.top        = "";
      document.body.style.width      = "";
      document.body.style.overflowY  = "";
    };
  }, [drawerOpen]);

  const handleSelectChat = useCallback(
    (chat: ChatItem) => {
      chatHook.loadChat(chat);
      setDrawerOpen(false);
    },
    [chatHook]
  );

  const handleNewChat = useCallback(async (): Promise<ChatItem | null> => {
    const result = await chatHook.createNewChat();
    setDrawerOpen(false);
    return result;
  }, [chatHook]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-text-secondary text-sm">Loading workspace…</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="chat-layout">
      {/* Mobile overlay */}
      {drawerOpen && (
        <div
          className="sidebar-overlay lg:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/*
       * Sidebar — fixed off-canvas drawer on mobile,
       * static flex child on desktop (lg+).
       */}
      <div
        className={[
          "sidebar-drawer",
          "lg:!transform-none lg:!transition-none lg:relative lg:z-auto",
          drawerOpen ? "open" : "",
        ].join(" ")}
      >
        <Sidebar
          chats={chatHook.chats}
          activeChat={chatHook.activeChat}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
          onRenameChat={chatHook.renameChat}
          onDeleteChat={chatHook.deleteChat}
          user={user}
          onLogout={logout}
          onMobileClose={() => setDrawerOpen(false)}
        />
      </div>

      {/* Main chat area */}
      <ChatWindow
        activeChat={chatHook.activeChat}
        messages={chatHook.messages}
        isLoading={chatHook.isLoading}
        isSending={chatHook.isSending}
        error={chatHook.error}
        onSendMessage={chatHook.sendMessage}
        onNewChat={handleNewChat}
        onDismissError={() => chatHook.setError(null)}
        onOpenMobileSidebar={() => setDrawerOpen(true)}
      />
    </div>
  );
}