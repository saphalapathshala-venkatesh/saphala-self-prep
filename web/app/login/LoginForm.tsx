"use client";

import type { FormEvent } from "react";
import Link from 'next/link';

export default function LoginForm() {
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Later connect to auth / API
  }

  return (
    <>
      <form className="space-y-6" onSubmit={onSubmit}>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <input
            type="email"
            placeholder="email@example.com"
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all"
            required
          />
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <Link href="#" className="text-xs text-purple-600 hover:underline">Forgot password?</Link>
          </div>
          <input
            type="password"
            placeholder="••••••••"
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all"
            required
          />
        </div>

        <button type="submit" className="btn-glossy-primary w-full py-4 mt-2">
          Log In
        </button>
      </form>

      <div className="mt-8 pt-8 border-t border-gray-100 text-center">
        <p className="text-gray-600 text-sm">
          Don&apos;t have an account?{' '}
          <Link href="#" className="text-purple-600 font-bold hover:underline">Create Account</Link>
        </p>
      </div>
    </>
  );
}
