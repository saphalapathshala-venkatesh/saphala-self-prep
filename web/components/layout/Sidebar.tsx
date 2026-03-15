"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  userName: string;
  onClose?: () => void;
}

// ── Icons ────────────────────────────────────────────────────────────────────

function Icon({ name, className }: { name: string; className?: string }) {
  const cn = className ?? "w-5 h-5";
  switch (name) {
    case "home":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
        </svg>
      );
    case "clipboard":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      );
    case "history":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "user":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
    case "play":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "book":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      );
    case "brain":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      );
    case "chevron-left":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      );
    case "chevron-right":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      );
    case "logout":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      );
    case "cards":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
        </svg>
      );
    default:
      return null;
  }
}

// ── Nav config ───────────────────────────────────────────────────────────────

const PRIMARY_NAV = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: "home" },
  { key: "testhub", label: "TestHub", href: "/testhub", icon: "clipboard" },
  { key: "attempts", label: "My Attempts", href: "/dashboard/attempts", icon: "history" },
  { key: "ebooks", label: "Ebooks", href: "/learn/lessons", icon: "brain" },
  { key: "flashcards", label: "Flashcards", href: "/learn/flashcards", icon: "cards" },
  { key: "pdfs", label: "PDFs", href: "/learn/pdfs", icon: "book" },
  { key: "profile", label: "Profile", href: "/dashboard/profile", icon: "user" },
] as const;

const UPCOMING_NAV = [
  { key: "pathshala", label: "Pathshala", icon: "play" },
] as const;

// ── Component ────────────────────────────────────────────────────────────────

export default function Sidebar({ userName, onClose }: SidebarProps) {
  const pathname = usePathname();
  const isMobileDrawer = !!onClose;
  const [collapsed, setCollapsed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [upcomingOpen, setUpcomingOpen] = useState(false);

  // Persist desktop collapse state
  useEffect(() => {
    if (isMobileDrawer) return;
    try {
      const stored = localStorage.getItem("saphala_sidebar_collapsed");
      if (stored === "true") setCollapsed(true);
    } catch {}
  }, [isMobileDrawer]);

  function toggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    if (next) setUpcomingOpen(false);
    try {
      localStorage.setItem("saphala_sidebar_collapsed", String(next));
    } catch {}
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      const data = await res.json();
      window.location.href = data.redirectTo || "/";
    } catch {
      setLoggingOut(false);
    }
  }

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(href + "/");
  }

  const isCollapsed = !isMobileDrawer && collapsed;

  return (
    <aside
      className={`
        ${isCollapsed ? "w-16" : "w-64"}
        bg-white border-r border-gray-200 flex flex-col h-full
        transition-[width] duration-200 ease-in-out overflow-hidden relative
      `}
    >
      {/* Brand */}
      <div
        className={`flex items-center border-b border-gray-100 flex-shrink-0 ${
          isCollapsed ? "justify-center py-4 px-2" : "gap-3 p-4"
        }`}
      >
        <Link
          href="/dashboard"
          onClick={onClose}
          className="flex items-center gap-3 min-w-0"
        >
          <img
            src="/images/saphala-logo.png"
            alt="Saphala Logo"
            className="h-9 w-9 object-contain flex-shrink-0"
          />
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-[#2D1B69] leading-tight truncate">
                Saphala Pathshala
              </span>
              <span className="text-[10px] text-gray-400 leading-tight">Self Prep</span>
            </div>
          )}
        </Link>
      </div>

      {/* User chip (expanded only) */}
      {!isCollapsed && (
        <div className="px-4 py-2.5 border-b border-gray-100 flex-shrink-0">
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-medium">Student</p>
          <p className="text-sm font-semibold text-[#2D1B69] truncate">{userName}</p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {PRIMARY_NAV.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.key}
              href={item.href}
              onClick={onClose}
              title={isCollapsed ? item.label : undefined}
              className={`
                flex items-center rounded-lg text-sm font-medium transition-colors
                ${isCollapsed ? "justify-center w-10 h-10 mx-auto" : "gap-3 px-3 py-2.5"}
                ${
                  active
                    ? "text-[#6D4BCB] bg-purple-50"
                    : "text-gray-600 hover:bg-gray-50 hover:text-[#2D1B69]"
                }
              `}
            >
              <Icon name={item.icon} className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

        {/* Divider + Upcoming (expanded only) */}
        {!isCollapsed && (
          <div className="pt-3">
            <button
              onClick={() => setUpcomingOpen((p) => !p)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-widest hover:text-gray-500 transition-colors"
            >
              <span className="flex-1 text-left">Coming Soon</span>
              <svg
                className={`w-3 h-3 transition-transform ${upcomingOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {upcomingOpen && (
              <div className="mt-1 space-y-0.5">
                {UPCOMING_NAV.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 cursor-default select-none"
                  >
                    <Icon name={item.icon} className="w-5 h-5 flex-shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full leading-none font-medium">
                      Soon
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Logout */}
      <div className="p-2 border-t border-gray-100 flex-shrink-0 space-y-1">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          title={isCollapsed ? "Logout" : undefined}
          className={`
            w-full flex items-center rounded-lg text-sm font-medium text-red-500
            hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50
            ${isCollapsed ? "justify-center w-10 h-10 mx-auto" : "gap-3 px-3 py-2.5"}
          `}
        >
          <Icon name="logout" className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span>{loggingOut ? "Logging out…" : "Logout"}</span>}
        </button>

        {/* Desktop collapse toggle */}
        {!isMobileDrawer && (
          <button
            onClick={toggleCollapse}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`
              w-full flex items-center rounded-lg text-xs text-gray-400
              hover:bg-gray-50 hover:text-gray-600 transition-colors
              ${isCollapsed ? "justify-center w-10 h-10 mx-auto" : "gap-2 px-3 py-2"}
            `}
          >
            <Icon
              name={isCollapsed ? "chevron-right" : "chevron-left"}
              className="w-4 h-4 flex-shrink-0"
            />
            {!isCollapsed && <span>Collapse</span>}
          </button>
        )}
      </div>
    </aside>
  );
}
