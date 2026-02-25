"use client";

import { useState, useEffect } from "react";

export function useAuthStatus() {
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/status", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setIsAuthed(data.isAuthed))
      .catch(() => setIsAuthed(false));
  }, []);

  return { isAuthed };
}
