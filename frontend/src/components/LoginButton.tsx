"use client";

import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function LoginButton() {
  const { login }  = useAuth();
  const router     = useRouter();
  const [error,    setError]   = useState<string | null>(null);
  const [loading,  setLoading] = useState(false);
  const [btnWidth, setBtnWidth] = useState(280);

  /* Responsively size the Google button to fit the viewport */
  useEffect(() => {
    const update = () => {
      // leave 32px horizontal margin on each side, cap at 280px
      const available = Math.min(window.innerWidth - 64, 280);
      setBtnWidth(Math.max(200, available));
    };
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);

  const handleSuccess = async (response: CredentialResponse) => {
    if (!response.credential) {
      setError("No credential received from Google.");
      return;
    }
    try {
      setError(null);
      setLoading(true);
      await login(response.credential);
      router.push("/chat");
    } catch {
      setError("Sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex flex-col items-center"
      style={{ gap: "clamp(0.5rem, 1.5vh, 0.75rem)" }}
    >
      {loading ? (
        <div
          className="flex items-center gap-2 rounded-full bg-surface-2 border border-border text-text-secondary"
          style={{
            padding: "clamp(0.5rem, 1.5vw, 0.75rem) clamp(1rem, 4vw, 1.5rem)",
            fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
            minWidth: "200px",
            justifyContent: "center",
          }}
        >
          <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <span>Signing in…</span>
        </div>
      ) : (
        /* Key forces re-mount when width changes so Google re-renders correctly */
        <GoogleLogin
          key={btnWidth}
          onSuccess={handleSuccess}
          onError={() => setError("Google sign-in failed.")}
          theme="filled_black"
          size="large"
          shape="pill"
          text="signin_with"
          width={String(btnWidth)}
        />
      )}

      {error && (
        <div
          className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 animate-fade-in text-center"
          style={{
            padding: "clamp(0.375rem, 1.2vw, 0.5rem) clamp(0.75rem, 2.5vw, 1rem)",
            fontSize: "clamp(0.7rem, 1.8vw, 0.875rem)",
            maxWidth: "min(320px, 90vw)",
          }}
        >
          <svg
            className="flex-shrink-0"
            style={{ width: "clamp(14px, 2vw, 16px)", height: "clamp(14px, 2vw, 16px)" }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}