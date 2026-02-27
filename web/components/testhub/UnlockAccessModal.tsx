"use client";

import Link from "next/link";

interface UnlockAccessModalProps {
  onClose: () => void;
}

export default function UnlockAccessModal({ onClose }: UnlockAccessModalProps) {
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

        <div className="text-center mb-5">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-purple-100 flex items-center justify-center">
            <svg className="w-7 h-7 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-[#2D1B69]">Unlock Full Practice Experience</h3>
        </div>

        <p className="text-gray-600 text-sm text-center mb-6 leading-relaxed">
          This test is part of the complete preparation series designed to strengthen your exam readiness.
          Unlock full access to continue your learning journey and access performance insights.
        </p>

        <ul className="space-y-3 mb-8">
          {[
            "Full Test Series Access",
            "Performance Insights",
            "Smart Reinforcement",
            "Detailed Analytics",
          ].map((item) => (
            <li key={item} className="flex items-center gap-3 text-sm text-gray-700">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center">
                <svg className="w-3 h-3 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
              {item}
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-3">
          <Link href="/plans" className="btn-glossy-primary text-center py-3">
            Unlock Full Access
          </Link>
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors py-2"
          >
            Continue Exploring
          </button>
        </div>
      </div>
    </div>
  );
}
