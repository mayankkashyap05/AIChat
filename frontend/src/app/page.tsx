"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import LoginButton from "@/components/LoginButton";

const FEATURES = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: "Private by default",
    desc: "Every request stays on your server. Zero telemetry, zero cloud.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: "Streaming responses",
    desc: "Tokens render in real-time with GPU-accelerated local inference.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: "Persistent history",
    desc: "All conversations saved. Resume any chat from exactly where you left off.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
      </svg>
    ),
    title: "Multiple models",
    desc: "Switch between Llama 3, Mistral, Gemma and more in every chat.",
  },
];

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!loading && user) router.push("/chat");
  }, [user, loading, router]);

  if (loading || !mounted) {
    return (
      <div className="h-screen flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center animate-pulse">
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <span className="text-text-secondary text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-surface relative overflow-hidden">
      {/* Ambient background blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-accent/5 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/5 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-accent/3 blur-[150px]" />
      </div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10 w-full max-w-4xl mx-auto px-6 py-16 flex flex-col items-center gap-16">
        {/* Hero */}
        <div className="text-center space-y-6 animate-fade-in">
          {/* Logo */}
          <div className="relative inline-flex">
            <div className="absolute inset-0 rounded-2xl bg-accent/30 blur-xl" />
            <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-accent to-blue-500 flex items-center justify-center shadow-glow">
              <svg className="w-10 h-10 text-white drop-shadow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-5xl sm:text-6xl font-bold text-text-primary tracking-tight">
              AI{" "}
              <span className="bg-gradient-to-r from-accent to-blue-400 bg-clip-text text-transparent">
                Chat
              </span>
            </h1>
            <p className="text-text-secondary text-lg max-w-md mx-auto leading-relaxed">
              A private, self-hosted AI assistant powered by local models.
              <br />
              Fast, secure, and entirely under your control.
            </p>
          </div>

          {/* Login */}
          <div className="pt-2">
            <LoginButton />
          </div>

          <p className="text-text-muted text-xs">
            Sign in with Google · Your data never leaves your server
          </p>
        </div>

        {/* Feature grid */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className="group relative p-5 rounded-2xl bg-surface-1 border border-border hover:border-border-strong transition-all duration-300 hover:shadow-card-hover"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-start gap-4">
                <div className="mt-0.5 p-2.5 rounded-xl bg-accent/10 text-accent border border-accent/20 flex-shrink-0">
                  {f.icon}
                </div>
                <div>
                  <div className="font-semibold text-text-primary mb-1">{f.title}</div>
                  <div className="text-text-secondary text-sm leading-relaxed">{f.desc}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p className="text-text-muted text-xs text-center animate-fade-in" style={{ animationDelay: "0.2s" }}>
          Powered by Ollama · LiteLLM · PostgreSQL
        </p>
      </div>
    </main>
  );
}