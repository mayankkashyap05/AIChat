"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import LoginButton from "@/components/LoginButton";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/chat");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-chat-bg">
        <div className="animate-pulse text-gray-400 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-chat-bg">
      <div className="text-center space-y-8">
        {/* Logo/Title */}
        <div className="space-y-3">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-teal-400 to-blue-500 rounded-2xl flex items-center justify-center">
            <svg
              className="w-9 h-9 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
          </div>
          <h1 className="text-4xl font-semibold text-white">AI Chat</h1>
          <p className="text-gray-400 text-lg max-w-md mx-auto">
            Chat with AI models running locally on your infrastructure.
            Fast, private, and under your control.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-sm">
          <div className="bg-chat-hover rounded-xl p-4 space-y-2">
            <div className="text-teal-400 font-medium">🔒 Private</div>
            <div className="text-gray-400">
              Your data stays on your server. No third-party model APIs.
            </div>
          </div>
          <div className="bg-chat-hover rounded-xl p-4 space-y-2">
            <div className="text-teal-400 font-medium">⚡ Fast</div>
            <div className="text-gray-400">
              Streaming responses with local GPU acceleration.
            </div>
          </div>
          <div className="bg-chat-hover rounded-xl p-4 space-y-2">
            <div className="text-teal-400 font-medium">💬 Persistent</div>
            <div className="text-gray-400">
              All chats saved. Pick up any conversation where you left off.
            </div>
          </div>
        </div>

        {/* Login */}
        <div className="pt-4">
          <LoginButton />
        </div>

        <p className="text-gray-600 text-xs">
          Sign in with your Google account to get started
        </p>
      </div>
    </div>
  );
}