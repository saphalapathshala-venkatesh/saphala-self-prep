"use client";

import { useState } from "react";
import type { DoubtStatus } from "@prisma/client";

interface Props {
  doubtId: string;
  currentStatus: DoubtStatus;
}

export default function AdminDoubtActions({ doubtId, currentStatus }: Props) {
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [closing, setClosing] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyText.trim()) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/doubts/${doubtId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: replyText.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to post reply");
      }
      setSuccess("Reply posted. Refreshing…");
      setReplyText("");
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post reply");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClose() {
    setClosing(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/doubts/${doubtId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CLOSED" }),
      });
      if (!res.ok) throw new Error("Failed to close doubt");
      setSuccess("Doubt closed. Refreshing…");
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to close doubt");
    } finally {
      setClosing(false);
    }
  }

  if (currentStatus === "CLOSED") {
    return (
      <div className="px-5 py-3 border-t border-gray-50">
        <span className="text-xs text-gray-400 italic">This doubt is closed.</span>
      </div>
    );
  }

  return (
    <div className="px-5 py-4 border-t border-gray-50 space-y-3">
      <form onSubmit={handleReply} className="space-y-2">
        <textarea
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="Type your reply to the student…"
          rows={3}
          className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#6D4BCB]/30 focus:border-[#6D4BCB] resize-none transition-colors"
        />
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={submitting || !replyText.trim()}
            className="text-sm font-semibold bg-[#6D4BCB] hover:bg-[#5c3dba] disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
          >
            {submitting ? "Posting…" : "Post Reply"}
          </button>
          <button
            type="button"
            onClick={handleClose}
            disabled={closing}
            className="text-sm font-semibold text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {closing ? "Closing…" : "Close Doubt"}
          </button>
        </div>
      </form>
      {success && <p className="text-xs text-green-600 font-medium">{success}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
