"use client";

import { useState, type FormEvent, type ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface FormErrors {
  identifier?: string;
  password?: string;
  devicePolicy?: string;
  general?: string;
}

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams?.get("from") || "/dashboard";

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [formData, setFormData] = useState({ identifier: "", password: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [devicePolicyAccepted, setDevicePolicyAccepted] = useState(false);
  const [activeSessionBlock, setActiveSessionBlock] = useState(false);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setActiveSessionBlock(false);

    if (!devicePolicyAccepted) {
      setErrors({ devicePolicy: "Please confirm you understand the one-device policy before logging in." });
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === "ACTIVE_SESSION_EXISTS") {
          setActiveSessionBlock(true);
          setErrors({});
        } else if (data.code === "ACCOUNT_BLOCKED") {
          setErrors({ general: "Your account has been blocked. Please contact support." });
        } else if (data.code === "ACCOUNT_INACTIVE") {
          setErrors({ general: "Your account is inactive. Please contact support." });
        } else {
          setErrors({ general: data.error || "Login failed. Please try again in a moment." });
        }
        setIsSubmitting(false);
        return;
      }

      setLoginSuccess(true);

      const dest = new URL(from, window.location.origin);
      dest.searchParams.set("login", "success");

      setTimeout(() => {
        router.replace(dest.pathname + dest.search);
      }, 900);
    } catch {
      setIsSubmitting(false);
      setErrors({ general: "Login failed. Please check your connection and try again." });
    }
  }

  // ── Success state ─────────────────────────────────────────────────────────
  if (loginSuccess) {
    return (
      <div className="space-y-6">
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-green-800">Logged in successfully!</p>
            <p className="text-xs text-green-600 mt-0.5">Redirecting to your dashboard…</p>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Please wait…
        </div>
      </div>
    );
  }

  // ── Login form ────────────────────────────────────────────────────────────
  return (
    <>
      <form className="space-y-6" onSubmit={onSubmit}>

        {/* Active session block — shown when another device is already logged in */}
        {activeSessionBlock && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-800">Account already active on another device</p>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                This account is currently logged in on another device or browser. For security and fair usage, only one active session is allowed at a time. Please sign out from your other device, or contact support to reset your session.
              </p>
            </div>
          </div>
        )}

        {/* General errors */}
        {errors.general && (
          <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-100 flex items-start gap-2">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {errors.general}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email or Mobile Number
          </label>
          <input
            type="text"
            name="identifier"
            value={formData.identifier}
            onChange={handleChange}
            placeholder="email@example.com or 10-digit mobile"
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all"
            autoComplete="username"
            required
          />
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <Link href="/forgot-password" className="text-xs text-purple-600 hover:underline">
              Forgot password?
            </Link>
          </div>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all"
            autoComplete="current-password"
            required
          />
        </div>

        {/* One-device policy notice */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 space-y-3">
          <div className="flex items-start gap-2.5">
            <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-xs text-blue-800 leading-relaxed">
              <span className="font-semibold">One-device policy:</span> This account supports one active device at a time. If this account is already active on another device, login will be blocked until you sign out there or contact support.
            </p>
          </div>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={devicePolicyAccepted}
              onChange={(e) => {
                setDevicePolicyAccepted(e.target.checked);
                if (errors.devicePolicy) {
                  setErrors((prev) => ({ ...prev, devicePolicy: undefined }));
                }
              }}
              className="mt-0.5 w-4 h-4 shrink-0 accent-purple-600 cursor-pointer"
            />
            <span className="text-xs text-blue-700 leading-relaxed">
              I understand the one-device policy.
            </span>
          </label>
          {errors.devicePolicy && (
            <p className="text-red-500 text-xs ml-6">{errors.devicePolicy}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-glossy-primary w-full py-4 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Verifying…
            </span>
          ) : (
            "Log In"
          )}
        </button>
      </form>

      <div className="mt-8 pt-8 border-t border-gray-100 text-center">
        <p className="text-gray-600 text-sm">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-purple-600 font-bold hover:underline">
            Create Account
          </Link>
        </p>
      </div>
    </>
  );
}
