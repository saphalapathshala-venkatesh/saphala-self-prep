"use client";

import { useState } from "react";

interface Props {
  videoId: string;
  initialXpEnabled: boolean;
  initialXpValue: number;
}

export default function AdminVideoXpControls({ videoId, initialXpEnabled, initialXpValue }: Props) {
  const [enabled, setEnabled] = useState(initialXpEnabled);
  const [xpValue, setXpValue] = useState(String(initialXpValue));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save(newEnabled: boolean, newXpValue: string) {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/videos/${videoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          xpEnabled: newEnabled,
          xpValue: Math.max(0, parseInt(newXpValue, 10) || 0),
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      /* silent — rare, retry will work */
    } finally {
      setSaving(false);
    }
  }

  function handleToggle() {
    const next = !enabled;
    setEnabled(next);
    save(next, xpValue);
  }

  function handleBlur() {
    save(enabled, xpValue);
  }

  return (
    <>
      <div className="w-20 flex items-center justify-center">
        <input
          type="number"
          min={0}
          max={9999}
          value={xpValue}
          onChange={(e) => setXpValue(e.target.value)}
          onBlur={handleBlur}
          disabled={!enabled}
          className="w-16 text-center text-sm border border-gray-200 rounded-lg px-1 py-1 focus:outline-none focus:ring-2 focus:ring-[#6D4BCB]/30 focus:border-[#6D4BCB] disabled:bg-gray-50 disabled:text-gray-300 transition-colors"
        />
      </div>
      <div className="w-16 flex items-center justify-center gap-1.5">
        <button
          type="button"
          onClick={handleToggle}
          disabled={saving}
          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${enabled ? "bg-[#6D4BCB]" : "bg-gray-200"} disabled:opacity-50`}
          role="switch"
          aria-checked={enabled}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 ${enabled ? "translate-x-4" : "translate-x-0"}`}
          />
        </button>
        {saved && (
          <svg className="w-3.5 h-3.5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
    </>
  );
}
