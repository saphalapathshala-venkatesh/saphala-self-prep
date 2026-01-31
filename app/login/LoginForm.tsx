"use client";

import type { FormEvent } from "react";

export default function LoginForm() {
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Later connect to auth / API
  }

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email
        </label>
        <input
          type="email"
          placeholder="you@example.com"
          className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Password
        </label>
        <input
          type="password"
          placeholder="••••••••"
          className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all"
          required
        />
      </div>

      <button type="submit" className="btn-glossy-primary w-full py-4">
        Login
      </button>
    </form>
  );
}
