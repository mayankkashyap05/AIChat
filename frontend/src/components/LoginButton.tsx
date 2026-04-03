"use client";

import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginButton() {
  const { login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleSuccess = async (response: CredentialResponse) => {
    if (!response.credential) {
      setError("No credential received from Google");
      return;
    }

    try {
      setError(null);
      await login(response.credential);
      router.push("/chat");
    } catch (err) {
      setError("Login failed. Please try again.");
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => setError("Google sign-in failed")}
        theme="filled_black"
        size="large"
        shape="pill"
        text="signin_with"
        width="280"
      />
      {error && (
        <p className="text-red-400 text-sm mt-2">{error}</p>
      )}
    </div>
  );
}