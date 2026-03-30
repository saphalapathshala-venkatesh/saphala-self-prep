"use client";

import { useState, useRef } from "react";

interface Props {
  courseId: string;
  initialUrl: string | null;
}

export default function AdminCourseThumbnailEditor({ courseId, initialUrl }: Props) {
  const [url,     setUrl]     = useState(initialUrl ?? "");
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const preview = url.trim();

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thumbnailUrl: url.trim() || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Save failed");
      } else {
        setSaved(true);
        if (savedTimer.current) clearTimeout(savedTimer.current);
        savedTimer.current = setTimeout(() => setSaved(false), 2500);
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Live preview */}
      {preview && (
        <div className="relative w-full h-28 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={preview}
            src={preview}
            alt="Thumbnail preview"
            className={`w-full h-full object-cover transition-opacity duration-200 ${imgError ? "opacity-20" : "opacity-100"}`}
            onLoad={() => setImgError(false)}
            onError={() => setImgError(true)}
          />
          {imgError && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
              Cannot load preview
            </div>
          )}
          <button
            onClick={() => { setUrl(""); setImgError(false); }}
            className="absolute top-1.5 right-1.5 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] hover:bg-black/70 transition-colors"
            title="Clear thumbnail"
          >
            ✕
          </button>
        </div>
      )}

      {/* URL input row */}
      <div className="flex gap-2 items-center">
        <input
          type="url"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setImgError(false); setSaved(false); }}
          placeholder="Paste image URL (JPG, PNG, WebP)…"
          className="flex-1 min-w-0 text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#6D4BCB] focus:border-[#6D4BCB] text-[#2D1B69]"
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className={`shrink-0 text-xs font-semibold px-3 py-2 rounded-lg transition-colors ${
            saved
              ? "bg-green-600 text-white"
              : "bg-[#6D4BCB] text-white hover:bg-[#5C3DB5] disabled:opacity-50"
          }`}
        >
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
        </button>
      </div>

      {error && <p className="text-[10px] text-red-500">{error}</p>}
      {!preview && (
        <p className="text-[10px] text-gray-400">
          Paste a direct image link. The preview updates automatically.
        </p>
      )}
    </div>
  );
}
