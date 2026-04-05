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
    <main
      className="w-full flex flex-col items-center justify-start bg-surface relative"
      style={{
        minHeight: "100dvh",
        overflowX: "hidden",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      } as React.CSSProperties}
    >
      {/* Ambient blobs — clipped so they never cause horizontal scroll */}
      <div
        className="fixed inset-0 pointer-events-none overflow-hidden"
        aria-hidden
        style={{ zIndex: 0 }}
      >
        <div
          className="absolute rounded-full bg-accent/5 blur-[80px]"
          style={{
            width:  "clamp(160px, 45vw, 500px)",
            height: "clamp(160px, 45vw, 500px)",
            top:    "-10%",
            left:   "-8%",
          }}
        />
        <div
          className="absolute rounded-full bg-blue-500/5 blur-[80px]"
          style={{
            width:  "clamp(140px, 40vw, 420px)",
            height: "clamp(140px, 40vw, 420px)",
            bottom: "-10%",
            right:  "-8%",
          }}
        />
      </div>

      {/* Grid overlay — fixed so it covers viewport regardless of scroll */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.018]"
        aria-hidden
        style={{
          zIndex: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
          backgroundSize: "clamp(28px, 4.5vw, 48px) clamp(28px, 4.5vw, 48px)",
        }}
      />

      {/* Content — always above the decorative layers */}
      <div
        className="relative w-full flex flex-col items-center"
        style={{
          zIndex: 1,
          maxWidth: "768px",
          margin: "0 auto",
          padding:
            "clamp(1.5rem, 5vh, 4rem) clamp(1rem, 4vw, 2rem) clamp(1.5rem, 5vh, 3rem)",
          gap: "clamp(1.75rem, 5vh, 3rem)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >

        {/* ── Hero ─────────────────────────────────────────────────── */}
        <div
          className="w-full text-center flex flex-col items-center animate-fade-in"
          style={{ gap: "clamp(0.875rem, 2.5vh, 1.5rem)" }}
        >
          {/* Logo mark */}
          <div className="relative inline-flex">
            <div className="absolute inset-0 rounded-2xl bg-accent/25 blur-xl pointer-events-none" />
            <div
              className="relative rounded-2xl bg-gradient-to-br from-accent to-blue-500 flex items-center justify-center shadow-glow"
              style={{
                width:  "clamp(52px, 10vw, 80px)",
                height: "clamp(52px, 10vw, 80px)",
                minWidth: "52px",
                minHeight: "52px",
              }}
            >
              <svg
                style={{
                  width:  "clamp(26px, 5vw, 40px)",
                  height: "clamp(26px, 5vw, 40px)",
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

          {/* Title + subtitle */}
          <div style={{ display: "flex", flexDirection: "column", gap: "clamp(0.375rem, 1vh, 0.75rem)" }}>
            <h1
              className="font-bold text-text-primary tracking-tight"
              style={{ fontSize: "clamp(1.75rem, 7vw, 3.75rem)", lineHeight: 1.15 }}
            >
              AI{" "}
              <span className="bg-gradient-to-r from-accent to-blue-400 bg-clip-text text-transparent">
                Chat
              </span>
            </h1>
            <p
              className="text-text-secondary leading-relaxed"
              style={{
                fontSize: "clamp(0.8125rem, 2.8vw, 1.125rem)",
                maxWidth: "min(480px, 90vw)",
                margin: "0 auto",
                paddingLeft: "clamp(0.5rem, 2vw, 1rem)",
                paddingRight: "clamp(0.5rem, 2vw, 1rem)",
              }}
            >
              One AI for everything — code, analyze, create, and solve.
              Lightning-fast, secure, and always improving.
            </p>
          </div>

          {/* Login button */}
          <div style={{ paddingTop: "clamp(0.125rem, 0.5vh, 0.375rem)" }}>
            <LoginButton />
          </div>

          <p
            className="text-text-muted"
            style={{ fontSize: "clamp(0.65rem, 1.8vw, 0.75rem)" }}
          >
            Sign in with Google · Your data never leaves our server
          </p>
        </div>

        {/* ── Feature grid ─────────────────────────────────────────── */}
        <div
          className="w-full animate-fade-in"
          style={{
            animationDelay: "0.1s",
            display: "grid",
            gap: "clamp(0.5rem, 1.5vw, 0.75rem)",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
          }}
        >
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className="group relative rounded-2xl bg-surface-1 border border-border hover:border-border-strong transition-all duration-300 hover:shadow-card-hover"
              style={{
                padding: "clamp(0.75rem, 2.5vw, 1rem)",
              }}
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <div className="relative flex items-start gap-3">
                <div
                  className="p-2 rounded-xl bg-accent/10 text-accent border border-accent/20 flex-shrink-0"
                  style={{ marginTop: "0.125rem" }}
                >
                  {f.icon}
                </div>
                <div className="min-w-0">
                  <div
                    className="font-semibold text-text-primary"
                    style={{
                      fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                      marginBottom: "0.25rem",
                    }}
                  >
                    {f.title}
                  </div>
                  <div
                    className="text-text-secondary leading-relaxed"
                    style={{ fontSize: "clamp(0.6875rem, 1.8vw, 0.75rem)" }}
                  >
                    {f.desc}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Footer ───────────────────────────────────────────────── */}
        <p
          className="text-text-muted text-center animate-fade-in"
          style={{
            fontSize: "clamp(0.6rem, 1.6vw, 0.75rem)",
            animationDelay: "0.2s",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}
        >
          Powered by Ollama · LiteLLM · PostgreSQL
        </p>

      </div>
    </main>
  );
}