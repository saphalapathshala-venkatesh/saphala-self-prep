"use client";

import { useState, useEffect, type FormEvent, type ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface FormErrors {
  identifier?: string;
  password?: string;
  general?: string;
}

function getOrCreateDeviceId(): string {
  try {
    let id = localStorage.getItem("sdp_device_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("sdp_device_id", id);
    }
    return id;
  } catch {
    return "";
  }
}

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams?.get("from") || "/dashboard";

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [formData, setFormData] = useState({ identifier: "", password: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [deviceBlocked, setDeviceBlocked] = useState(false);
  const [activeSessionBlock, setActiveSessionBlock] = useState(false);
  const [deviceId, setDeviceId] = useState<string>("");

  useEffect(() => {
    setDeviceId(getOrCreateDeviceId());
  }, []);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setDeviceBlocked(false);
    setActiveSessionBlock(false);
    setIsSubmitting(true);
    setErrors({});

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (deviceId) headers["X-Device-Id"] = deviceId;

    let response: Response;
    try {
      response = await fetch("/api/auth/login", {
        method: "POST",
        headers,
        body: JSON.stringify(formData),
        credentials: "include",
      });
    } catch {
      setIsSubmitting(false);
      setErrors({ general: "Unable to reach the server. Please check your internet connection and try again." });
      return;
    }

    let data: { error?: string; code?: string; success?: boolean; redirectTo?: string } = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      if (response.status === 503 || response.status === 502) {
        setErrors({ general: "Login service is temporarily unavailable. Please try again in a moment." });
      } else if (data.code === "DEVICE_BLOCKED") {
        setDeviceBlocked(true);
        setErrors({});
      } else if (data.code === "ACTIVE_SESSION_EXISTS") {
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

        {/* Device blocked — different device attempted */}
        {deviceBlocked && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-red-800">Login Blocked — Single Device Policy</p>
              <p className="text-xs text-red-700 mt-1 leading-relaxed">
                This account is already linked to another device. For account protection and access control, login on a new device is not allowed. Please use your registered device or contact support/admin if a reset is genuinely required.
              </p>
            </div>
          </div>
        )}

        {/* Active session block — fallback for no-deviceId edge case */}
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
                This account is currently logged in on another device or browser. Please sign out from your other device, or contact support to reset your session.
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

        {/* Single Device Policy notice */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
          <div className="flex items-start gap-2.5">
            <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div>
              <p className="text-xs font-semibold text-blue-800 mb-1">Single Device Policy</p>
              <p className="text-xs text-blue-700 leading-relaxed">
                This account is restricted to one registered device only. If your account is already linked to another device, login on this device will not be allowed.
              </p>
            </div>
          </div>
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

        <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <svg
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
          <p className="text-xs leading-relaxed text-amber-700">
            <span className="font-semibold">Auto logout after 15 minutes</span> — your session will
            be automatically signed out if there is no activity for 15 minutes. Save your work
            before stepping away.
          </p>
        </div>
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
