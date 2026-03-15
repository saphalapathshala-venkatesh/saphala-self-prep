"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function LoginSuccessToast({ displayName }: { displayName: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (searchParams?.get("login") === "success") {
      setVisible(true);
      router.replace("/dashboard", { scroll: false });
      const timer = setTimeout(() => setVisible(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, router]);

  if (!visible) return null;

  return (
    <div className="bg-green-50 border border-green-300 text-green-800 rounded-xl px-5 py-4 flex items-center gap-3 shadow-sm animate-in fade-in">
      <svg
        className="w-5 h-5 text-green-600 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      <span className="text-sm font-medium">
        Logged in successfully as {displayName}
      </span>
    </div>
  );
}
