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
    <div className="mb-6 bg-green-50 border border-green-200 rounded-xl px-5 py-4 flex items-start gap-3 shadow-sm">
      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <svg
          className="w-3.5 h-3.5 text-green-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold text-green-800">
          Account created successfully.
        </p>
        <p className="text-xs text-green-600 mt-0.5 leading-relaxed">
          Please log in to access your Saphala Pathshala dashboard.
        </p>
      </div>
    </div>
  );
}
