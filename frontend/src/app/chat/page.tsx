"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useChat } from "@/hooks/useChat";
import Sidebar from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";

export default function ChatPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const chatHook = useChat();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      chatHook.fetchChats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-chat-bg">
        <div className="animate-pulse text-gray-400 text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar
        chats={chatHook.chats}
        activeChat={chatHook.activeChat}
        onSelectChat={chatHook.loadChat}
        onNewChat={chatHook.createNewChat}
        onRenameChat={chatHook.renameChat}
        onDeleteChat={chatHook.deleteChat}
        user={user}
        onLogout={logout}
      />
      <ChatWindow
        activeChat={chatHook.activeChat}
        messages={chatHook.messages}
        isLoading={chatHook.isLoading}
        isSending={chatHook.isSending}
        error={chatHook.error}
        onSendMessage={chatHook.sendMessage}
        onNewChat={chatHook.createNewChat}
        onDismissError={() => chatHook.setError(null)}
      />
    </div>
  );
}