"use client";

import type { FormEvent } from "react";

export default function ContactForm() {
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
  }

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Full Name
        </label>
        <input
          type="text"
          placeholder="John Doe"
          className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email Address
        </label>
        <input
          type="email"
          placeholder="john@example.com"
          className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Message
        </label>
        <textarea
          rows={5}
          placeholder="How can we help you?"
          className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all resize-none"
          required
        />
      </div>

      <button type="submit" className="btn-glossy-primary w-full py-4">
        Send Message
      </button>
    </form>
  );
}
