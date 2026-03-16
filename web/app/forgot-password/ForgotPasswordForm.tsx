"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, ArrowLeft, CheckCircle } from "lucide-react";

type Step = "verify" | "reset" | "done";

export default function ForgotPasswordForm() {
  const [step, setStep] = useState<Step>("verify");
  const [resetToken, setResetToken] = useState("");

  const [identifier, setIdentifier] = useState("");
  const [mobileLast4, setMobileLast4] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), mobileLast4: mobileLast4.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setResetToken(data.resetToken);
      setStep("reset");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setStep("done");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "done") {
    return (
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <CheckCircle className="w-16 h-16 text-green-500" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-[#2D1B69] mb-2">Password Reset Successful</h2>
          <p className="text-gray-600 text-sm">
            Password reset successful. Please log in with your new password.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-block w-full bg-[#6D4BCB] hover:bg-[#5a3aaa] text-white font-semibold py-3 px-6 rounded-xl transition-colors"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  if (step === "reset") {
    return (
      <form onSubmit={handleReset} className="space-y-5 text-left">
        <div>
          <h2 className="text-xl font-semibold text-[#2D1B69] mb-1">Set New Password</h2>
          <p className="text-sm text-gray-500">Choose a strong password for your account.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
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

  return (
    <form onSubmit={handleVerify} className="space-y-5 text-left">
      <div>
        <h2 className="text-xl font-semibold text-[#2D1B69] mb-1">Verify Your Identity</h2>
        <p className="text-sm text-gray-500">
          Enter your registered email or mobile, plus the last 4 digits of your mobile number.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email or Mobile Number
        </label>
        <input
          type="text"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          placeholder="email@example.com or 10-digit mobile"
          required
          autoFocus
          autoComplete="username"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Last 4 Digits of Registered Mobile
        </label>
        <input
          type="text"
          inputMode="numeric"
          maxLength={4}
          value={mobileLast4}
          onChange={(e) => setMobileLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 tracking-widest"
          placeholder="e.g. 4567"
          required
          autoComplete="off"
        />
        <p className="text-xs text-gray-400 mt-1">
          This is the last 4 digits of the mobile number you registered with.
        </p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#6D4BCB] hover:bg-[#5a3aaa] disabled:opacity-60 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
      >
        {loading ? "Verifying…" : "Verify Identity"}
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
