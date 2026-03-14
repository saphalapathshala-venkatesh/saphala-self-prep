"use client";

import { useState, type FormEvent, type ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface FormErrors {
  identifier?: string;
  password?: string;
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

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
        setErrors({ general: data.error || "Login failed. Please try again." });
        setIsSubmitting(false);
        return;
      }

      // Show brief success state on this page before redirect
      setLoginSuccess(true);

      // Append login=success so dashboard can show the welcome toast
      const dest = new URL(from, window.location.origin);
      dest.searchParams.set("login", "success");

      // Small delay so the success banner is visible, then redirect
      setTimeout(() => {
        router.replace(dest.pathname + dest.search);
      }, 900);
    } catch {
      setIsSubmitting(false);
      setErrors({ general: "Login failed. Please check your connection and try again." });
    }
  }

  // ── Success state ────────────────────────────────────────────────────────
  if (loginSuccess) {
    return (
      <div className="space-y-6">
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-4 h-4 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-green-800">Logged in successfully!</p>
            <p className="text-xs text-green-600 mt-0.5">Redirecting to your dashboard…</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
          <svg
            className="w-4 h-4 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
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
        {errors.general && (
          <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-100 flex items-start gap-2">
            <svg
              className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
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
            <Link href="#" className="text-xs text-purple-600 hover:underline">
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

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-glossy-primary w-full py-4 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="w-4 h-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
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
