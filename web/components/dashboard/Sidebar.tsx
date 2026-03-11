"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  userName: string;
  onClose?: () => void;
}

const NAV_SECTIONS = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: "home",
    href: "/dashboard",
  },
  {
    key: "selfprep",
    label: "Saphala Self Prep",
    icon: "brain",
    children: [
      { label: "Smart Learning", href: "/smart-learning", comingSoon: true },
      { label: "TestHub", href: "/testhub", comingSoon: false },
    ],
  },
  {
    key: "learn",
    label: "Saphala Learn",
    icon: "play",
    children: [
      { label: "Pathshala", href: "/pathshala", comingSoon: true },
      { label: "Prep Library", href: "/prep-library", comingSoon: true },
    ],
  },
  {
    key: "results",
    label: "Results",
    icon: "trophy",
    href: "/results",
    comingSoon: true,
  },
  {
    key: "profile",
    label: "Profile",
    icon: "user",
    href: "/profile",
    comingSoon: true,
  },
] as const;

function NavIcon({ name, className }: { name: string; className?: string }) {
  const cn = className ?? "w-5 h-5";
  switch (name) {
    case "home":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
        </svg>
      );
    case "brain":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      );
    case "play":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "trophy":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 3h14M9 3v2a3 3 0 006 0V3M5 3a2 2 0 00-2 2v2a5 5 0 005 5m6-9a2 2 0 012 2v2a5 5 0 01-5 5m0 0v3m0 0h-2m2 0h2m-4 0a2 2 0 01-2 2h4a2 2 0 012-2" />
        </svg>
      );
    case "user":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
    default:
      return null;
  }
}

export default function Sidebar({ userName, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    selfprep: true,
    learn: false,
  });
  const [loggingOut, setLoggingOut] = useState(false);

  function toggleSection(key: string) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
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
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-5 border-b border-gray-100">
        <Link href="/dashboard" onClick={onClose} className="flex items-center gap-3">
          <img
            src="/images/saphala-logo.png"
            alt="Saphala Logo"
            className="h-9 w-auto object-contain"
          />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-[#2D1B69] leading-tight">
              Saphala Pathshala
            </span>
            <span className="text-[10px] text-gray-400 leading-tight">
              Self Prep
            </span>
          </div>
        </Link>
      </div>

      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-xs text-gray-400 uppercase tracking-wider">Student</p>
        <p className="text-sm font-medium text-[#2D1B69] truncate">{userName}</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
        {NAV_SECTIONS.map((section) => {
          if ("children" in section && section.children) {
            const isOpen = expanded[section.key];
            const hasActiveChild = section.children.some((c) => !c.comingSoon && isActive(c.href));
            return (
              <div key={section.key}>
                <button
                  onClick={() => toggleSection(section.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    hasActiveChild
                      ? "text-[#6D4BCB] bg-purple-50"
                      : "text-gray-600 hover:bg-gray-50 hover:text-[#2D1B69]"
                  }`}
                >
                  <NavIcon name={section.icon} />
                  <span className="flex-1 text-left">{section.label}</span>
                  <svg
                    className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isOpen && (
                  <div className="ml-8 mt-1 space-y-0.5">
                    {section.children.map((child) =>
                      child.comingSoon ? (
                        <span
                          key={child.label}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 cursor-default"
                        >
                          {child.label}
                          <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full leading-none">
                            Soon
                          </span>
                        </span>
                      ) : (
                        <Link
                          key={child.label}
                          href={child.href}
                          onClick={onClose}
                          className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive(child.href)
                              ? "text-[#6D4BCB] bg-purple-50 font-medium"
                              : "text-gray-600 hover:bg-gray-50 hover:text-[#2D1B69]"
                          }`}
                        >
                          {child.label}
                        </Link>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          }

          const item = section as { key: string; label: string; icon: string; href: string; comingSoon?: boolean };
          if (item.comingSoon) {
            return (
              <span
                key={item.key}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 cursor-default"
              >
                <NavIcon name={item.icon} />
                <span className="flex-1">{item.label}</span>
                <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full leading-none">
                  Soon
                </span>
              </span>
            );
          }

          return (
            <Link
              key={item.key}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? "text-[#6D4BCB] bg-purple-50"
                  : "text-gray-600 hover:bg-gray-50 hover:text-[#2D1B69]"
              }`}
            >
              <NavIcon name={item.icon} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-100">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {loggingOut ? "Logging out…" : "Logout"}
        </button>
      </div>
    </aside>
  );
}
