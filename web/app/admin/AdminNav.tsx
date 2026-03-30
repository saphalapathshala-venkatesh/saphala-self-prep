"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/admin/users",   label: "Users" },
  { href: "/admin/doubts",  label: "Doubts" },
  { href: "/admin/videos",  label: "Video XP" },
  { href: "/admin/courses", label: "Courses" },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
      <div className="max-w-5xl mx-auto px-6 flex items-center gap-1 h-12">
        <span className="text-xs font-bold text-[#2D1B69] tracking-wide mr-4">Admin</span>
        {navLinks.map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                active
                  ? "bg-[#6D4BCB] text-white"
                  : "text-gray-500 hover:text-[#2D1B69] hover:bg-gray-50"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
