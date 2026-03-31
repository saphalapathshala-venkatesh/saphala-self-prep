"use client";

import { useState } from "react";

interface FormState {
  name: string;
  email: string;
  phone: string;
  message: string;
}

export default function ContactForm() {
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [serverMessage, setServerMessage] = useState("");

  function validate(): boolean {
    const newErrors: Partial<FormState> = {};
    if (!form.name.trim() || form.name.trim().length < 2)
      newErrors.name = "Please enter your name.";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      newErrors.email = "Please enter a valid email address.";
    if (!form.message.trim() || form.message.trim().length < 10)
      newErrors.message = "Message must be at least 10 characters.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormState]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate()) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/public/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, _hp: "" }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setServerMessage(data.message || "Thank you! We will get back to you soon.");
        setForm({ name: "", email: "", phone: "", message: "" });
      } else {
        setStatus("error");
        setServerMessage(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setServerMessage("Network error. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="text-center py-10 space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-[#2D1B69]">Message Sent!</h3>
        <p className="text-gray-600 text-sm">{serverMessage}</p>
        <button
          onClick={() => setStatus("idle")}
          className="btn-glossy-secondary text-sm"
        >
          Send Another Message
        </button>
      </div>
    );
  }

  return (
    <form className="space-y-6" onSubmit={onSubmit} noValidate>
      {/* Honeypot — hidden from real users, filled by bots */}
      <input type="text" name="_hp" className="hidden" tabIndex={-1} aria-hidden="true"
        value=""
        onChange={() => {}}
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Full Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="John Doe"
          className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all ${
            errors.name ? "border-red-400 bg-red-50" : "border-gray-200"
          }`}
          required
        />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email Address <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          placeholder="john@example.com"
          className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all ${
            errors.email ? "border-red-400 bg-red-50" : "border-gray-200"
          }`}
          required
        />
        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Phone <span className="text-gray-400 font-normal">(Optional)</span>
        </label>
        <input
          type="tel"
          name="phone"
          value={form.phone}
          onChange={handleChange}
          placeholder="10-digit mobile number"
          className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Message <span className="text-red-500">*</span>
        </label>
        <textarea
          name="message"
          value={form.message}
          onChange={handleChange}
          rows={5}
          placeholder="How can we help you?"
          className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all resize-none ${
            errors.message ? "border-red-400 bg-red-50" : "border-gray-200"
          }`}
          required
        />
        {errors.message && <p className="text-red-500 text-xs mt-1">{errors.message}</p>}
      </div>

      {status === "error" && (
        <p className="text-red-500 text-sm text-center">{serverMessage}</p>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="btn-glossy-primary w-full py-4 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === "loading" ? "Sending…" : "Send Message"}
      </button>
    </form>
  );
}
