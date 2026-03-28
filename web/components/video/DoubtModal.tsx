"use client";

import { useState } from "react";

interface DoubtModalProps {
  videoId: string;
  videoTitle: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function DoubtModal({ videoId, videoTitle, onClose, onSubmitted }: DoubtModalProps) {
  const [title, setTitle]   = useState("");
  const [body, setBody]     = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/student/doubts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, title: title.trim(), body: body.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to submit doubt");
      }
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#2D1B69] to-[#6D4BCB] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-lg">Ask a Doubt</h2>
            <p className="text-white/70 text-xs mt-0.5 truncate max-w-xs">{videoTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors p-1"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Doubt title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. What does this concept mean?"
              maxLength={120}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#6D4BCB]/40 focus:border-[#6D4BCB] transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Explain your doubt <span className="text-red-500">*</span>
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Describe your question in detail so the mentor can help you better..."
              rows={5}
              maxLength={2000}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#6D4BCB]/40 focus:border-[#6D4BCB] transition-colors resize-none"
              required
            />
            <p className="text-right text-xs text-gray-400 mt-1">{body.length}/2000</p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim() || !body.trim()}
              className="flex-1 py-2.5 rounded-xl bg-[#6D4BCB] text-white text-sm font-semibold hover:bg-[#5c3dba] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? "Submitting…" : "Submit Doubt"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
