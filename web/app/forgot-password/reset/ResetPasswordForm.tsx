"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";

export default function ResetPasswordForm({ token }: { token: string }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <XCircle className="w-14 h-14 text-red-400 mx-auto" />
        <h2 className="text-xl font-semibold text-[#2D1B69]">Invalid Reset Link</h2>
        <p className="text-gray-500 text-sm">
          This password reset link is missing or malformed.
        </p>
        <Link
          href="/forgot-password"
          className="inline-block bg-[#6D4BCB] hover:bg-[#5a3aaa] text-white font-semibold py-3 px-6 rounded-xl transition-colors text-sm"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center space-y-4">
        <CheckCircle className="w-14 h-14 text-green-500 mx-auto" />
        <h2 className="text-xl font-semibold text-[#2D1B69]">Password Reset Successful</h2>
        <p className="text-gray-500 text-sm">
          Your password has been updated. Please log in with your new password.
        </p>
        <Link
          href="/login"
          className="inline-block w-full bg-[#6D4BCB] hover:bg-[#5a3aaa] text-white font-semibold py-3 px-6 rounded-xl transition-colors"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken: token, newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 text-left">
      <div>
        <h2 className="text-xl font-semibold text-[#2D1B69] mb-1">Set New Password</h2>
        <p className="text-sm text-gray-500">Choose a strong password for your account.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}{" "}
          {error.toLowerCase().includes("expired") || error.toLowerCase().includes("invalid") ? (
            <Link href="/forgot-password" className="underline font-medium">
              Request a new link
            </Link>
          ) : null}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
        <div className="relative">
          <input
            type={showNew ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            placeholder="At least 8 characters, 1 letter, 1 number"
            required
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShowNew((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            tabIndex={-1}
          >
            {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
        <div className="relative">
          <input
            type={showConfirm ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            placeholder="Repeat your new password"
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            tabIndex={-1}
          >
            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#6D4BCB] hover:bg-[#5a3aaa] disabled:opacity-60 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
      >
        {loading ? "Resetting…" : "Reset Password"}
      </button>
    </form>
  );
}
