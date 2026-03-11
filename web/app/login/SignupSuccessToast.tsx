"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function SignupSuccessToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (searchParams?.get("signup") === "success") {
      setVisible(true);
      router.replace("/login", { scroll: false });
      const timer = setTimeout(() => setVisible(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, router]);

  if (!visible) return null;

  return (
    <div className="bg-green-50 border border-green-300 text-green-800 rounded-xl px-5 py-4 flex items-start gap-3 shadow-sm mb-6">
      <svg
        className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      <div className="text-sm font-medium leading-relaxed">
        <p>Your account was created successfully.</p>
        <p>Welcome to Saphala Self Prep!</p>
        <p className="text-green-600 mt-1">You can now log in and start practicing tests.</p>
      </div>
    </div>
  );
}
