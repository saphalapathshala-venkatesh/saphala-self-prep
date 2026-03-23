"use client";

import { useState, useRef } from "react";

interface Props {
  orderId: string;
  packageName: string;
  paidPaise: number;
  onClose: () => void;
  onSuccess: () => void;
}

const REASON_OPTIONS = [
  { value: "CHANGED_MIND", label: "Changed my mind" },
  { value: "TECHNICAL_ISSUE", label: "Technical issue" },
  { value: "CONTENT_NOT_AS_DESCRIBED", label: "Content not as described" },
  { value: "DUPLICATE_PURCHASE", label: "Duplicate purchase" },
  { value: "COURSE_NOT_STARTED", label: "Course not started" },
  { value: "OTHER", label: "Other reason" },
];

function paise(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(amount / 100);
}

export default function RefundModal({ orderId, packageName, paidPaise, onClose, onSuccess }: Props) {
  const [reasonCategory, setReasonCategory] = useState("");
  const [explanation, setExplanation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const submitLock = useRef(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitLock.current || isSubmitting) return;
    submitLock.current = true;
    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/student/refund-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, reasonCategory, explanation }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not submit refund request. Please try again.");
        return;
      }
      onSuccess();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
      submitLock.current = false;
    }
  }

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h3 className="text-lg font-bold text-[#2D1B69] mb-1">Request Refund</h3>
        <p className="text-sm text-gray-500 mb-5">
          For <strong>{packageName}</strong> · {paise(paidPaise)}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Reason category */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Reason <span className="text-red-500">*</span>
            </label>
            <select
              value={reasonCategory}
              onChange={(e) => setReasonCategory(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6D4BCB]/30 focus:border-[#6D4BCB] text-gray-700 bg-white"
            >
              <option value="">Select a reason</option>
              {REASON_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Explanation */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Explain your request <span className="text-red-500">*</span>
            </label>
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              required
              minLength={10}
              rows={4}
              placeholder="Please describe your reason in detail (minimum 10 characters)"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6D4BCB]/30 focus:border-[#6D4BCB] resize-none text-gray-700"
            />
            <p className="text-xs text-gray-400 mt-1">{explanation.length} characters</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !reasonCategory || explanation.trim().length < 10}
              className="flex-1 py-3 rounded-xl bg-[#6D4BCB] hover:bg-[#5C3DB5] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting…
                </>
              ) : (
                "Submit Request"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
