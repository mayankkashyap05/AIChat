"use client";

import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginButton() {
  const { login }  = useAuth();
  const router     = useRouter();
  const [error,    setError]   = useState<string | null>(null);
  const [loading,  setLoading] = useState(false);

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
    <div className="flex flex-col items-center gap-3">
      {loading ? (
        <div className="flex items-center gap-2 px-6 py-3 rounded-full bg-surface-2 border border-border text-text-secondary text-sm">
          <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          Signing in…
        </div>
      ) : (
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={() => setError("Google sign-in failed.")}
          theme="filled_black"
          size="large"
          shape="pill"
          text="signin_with"
          width="280"
        />
      )}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fade-in max-w-xs text-center">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}
    </div>
  );
}