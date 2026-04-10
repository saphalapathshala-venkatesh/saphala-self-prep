"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";

interface DashboardShellProps {
  userName: string;
  children: React.ReactNode;
}

export default function DashboardShell({ userName, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Desktop sidebar — sticky to viewport so logout is always visible */}
      <div className="hidden lg:flex flex-shrink-0 sticky top-0 h-screen">
        <Sidebar userName={userName} />
      </div>

      {/* Mobile drawer overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-[200] lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-64 z-10 shadow-2xl">
            <Sidebar userName={userName} onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile topbar */}
        <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-[100]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-[#2D1B69] hover:bg-gray-100 transition-colors"
            aria-label="Open menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <img
            src="/images/saphala-logo.png"
            alt="Saphala Logo"
            className="h-8 w-auto object-contain"
          />
          <span className="text-sm font-bold text-[#2D1B69]">Saphala Pathshala</span>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
