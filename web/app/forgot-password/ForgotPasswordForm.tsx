"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle } from "lucide-react";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setSuccessMsg(
        data.message ??
          "If an account with that email exists, a reset link has been sent."
      );
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="text-center space-y-5">
        <div className="flex justify-center">
          <CheckCircle className="w-16 h-16 text-green-500" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-[#2D1B69] mb-2">Check your inbox</h2>
          <p className="text-gray-600 text-sm leading-relaxed">{successMsg}</p>
        </div>
        <p className="text-xs text-gray-400">
          The link expires in 15 minutes. Check your spam folder if you don&apos;t see it.
        </p>
        <button
          onClick={() => { setSent(false); setEmail(""); }}
          className="text-sm text-[#6D4BCB] hover:underline"
        >
          Try a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 text-left">
      <div>
        <h2 className="text-xl font-semibold text-[#2D1B69] mb-1">Reset your password</h2>
        <p className="text-sm text-gray-500">
          Enter your registered email address and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email Address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          placeholder="you@example.com"
          required
          autoFocus
          autoComplete="email"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#6D4BCB] hover:bg-[#5a3aaa] disabled:opacity-60 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
      >
        {loading ? "Sending…" : "Send Reset Link"}
      </button>

      <div className="text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#6D4BCB] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Login
        </Link>
      </div>
    </form>
  );
}
