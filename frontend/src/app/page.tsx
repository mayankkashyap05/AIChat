"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import LoginButton from "@/components/LoginButton";

const FEATURES = [
  {
    icon: (
      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: "End-to-end encrypted",
    desc: "All data are encrypted. Only you can read your conversations.",
  },
  {
    icon: (
      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: "Streaming responses",
    desc: "Tokens render in real-time with GPU-accelerated inference.",
  },
  {
    icon: (
      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: "Persistent history",
    desc: "All conversations saved. Resume any chat from exactly where you left off.",
  },
  {
    icon: (
      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
      </svg>
    ),
    title: "Multiple domain capabilities",
    desc: "Excels across coding, finance, research, content creation, and real-world problem solving.",
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
      <div className="h-screen w-screen flex items-center justify-center bg-surface">
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
    <main className="min-h-screen w-full flex flex-col items-center justify-center bg-surface relative overflow-x-hidden overflow-y-auto">
      {/* Ambient blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div
          className="absolute rounded-full bg-accent/5 blur-[100px]"
          style={{
            width:  "clamp(200px, 50vw, 600px)",
            height: "clamp(200px, 50vw, 600px)",
            top:    "-15%",
            left:   "-10%",
          }}
        />
        <div
          className="absolute rounded-full bg-blue-500/5 blur-[100px]"
          style={{
            width:  "clamp(180px, 45vw, 500px)",
            height: "clamp(180px, 45vw, 500px)",
            bottom: "-15%",
            right:  "-10%",
          }}
        />
      </div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.018]"
        aria-hidden
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
          backgroundSize: "clamp(32px, 5vw, 48px) clamp(32px, 5vw, 48px)",
        }}
      />

      <div className="relative z-10 w-full max-w-3xl mx-auto flex flex-col items-center gap-10 px-4 py-10 sm:py-16">

        {/* Hero */}
        <div className="w-full text-center flex flex-col items-center gap-4 sm:gap-6 animate-fade-in">
          {/* Logo mark */}
          <div className="relative inline-flex">
            <div className="absolute inset-0 rounded-2xl bg-accent/25 blur-xl pointer-events-none" />
            <div
              className="relative rounded-2xl bg-gradient-to-br from-accent to-blue-500 flex items-center justify-center shadow-glow"
              style={{
                width:  "clamp(56px, 8vw, 80px)",
                height: "clamp(56px, 8vw, 80px)",
              }}
            >
              <svg
                style={{
                  width:  "clamp(28px, 4vw, 40px)",
                  height: "clamp(28px, 4vw, 40px)",
                }}
                className="text-white drop-shadow"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2 sm:space-y-3">
            <h1
              className="font-bold text-text-primary tracking-tight"
              style={{ fontSize: "clamp(2rem, 6vw, 3.75rem)" }}
            >
              AI{" "}
              <span className="bg-gradient-to-r from-accent to-blue-400 bg-clip-text text-transparent">
                Chat
              </span>
            </h1>
            <p
              className="text-text-secondary max-w-md mx-auto leading-relaxed px-2"
              style={{ fontSize: "clamp(0.875rem, 2.5vw, 1.125rem)" }}
            >
              One AI for everything — code, analyze, create, and solve.
              Lightning-fast, secure, and always improving.
            </p>
          </div>

          {/* Login */}
          <div className="pt-1">
            <LoginButton />
          </div>

          <p className="text-text-muted text-xs">
            Sign in with Google · Your data never leaves our server
          </p>
        </div>

        {/* Feature grid */}
        <div
          className="w-full grid gap-3 animate-fade-in"
          style={{
            animationDelay: "0.1s",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
          }}
        >
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className="group relative p-4 rounded-2xl bg-surface-1 border border-border hover:border-border-strong transition-all duration-300 hover:shadow-card-hover"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <div className="relative flex items-start gap-3">
                <div className="mt-0.5 p-2 rounded-xl bg-accent/10 text-accent border border-accent/20 flex-shrink-0">
                  {f.icon}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-text-primary mb-1 text-sm">
                    {f.title}
                  </div>
                  <div className="text-text-secondary text-xs leading-relaxed">
                    {f.desc}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p
          className="text-text-muted text-xs text-center animate-fade-in"
          style={{ animationDelay: "0.2s" }}
        >
          Powered by Ollama · LiteLLM · PostgreSQL
        </p>
      </div>
    </main>
  );
}