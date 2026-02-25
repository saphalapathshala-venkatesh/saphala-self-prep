"use client";

import Link from "next/link";

interface LoginRequiredModalProps {
  returnTo: string;
  onClose: () => void;
}

export default function LoginRequiredModal({ returnTo, onClose }: LoginRequiredModalProps) {
  const loginHref = `/login?from=${encodeURIComponent(returnTo)}`;
  const registerHref = `/register?from=${encodeURIComponent(returnTo)}`;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-8"
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

        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-purple-100 flex items-center justify-center">
            <svg className="w-7 h-7 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-[#2D1B69]">Login Required</h3>
        </div>

        <p className="text-gray-600 text-sm text-center mb-8 leading-relaxed">
          Please log in to attempt this test and track your progress. Your results, insights, and XP rewards are saved in your account.
        </p>

        <div className="flex flex-col gap-3">
          <Link href={loginHref} className="btn-glossy-primary text-center py-3">
            Log In to Continue
          </Link>
          <Link href={registerHref} className="btn-glossy-secondary text-center py-3">
            Create Free Account
          </Link>
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors py-2"
          >
            Continue Browsing
          </button>
        </div>
      </div>
    </div>
  );
}
