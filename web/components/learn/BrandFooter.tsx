"use client";

import type { CSSProperties } from "react";
import { BRAND } from "@/config/terminology";

interface BrandFooterProps {
  style?: CSSProperties;
}

export default function BrandFooter({ style }: BrandFooterProps) {
  return (
    <div
      className="flex items-center px-4 sm:px-5 py-3 shrink-0"
      style={{
        borderTop: "1px solid rgba(128,80,192,0.15)",
        backgroundColor: "#fafafa",
        ...style,
      }}
    >
      {/* Logo */}
      <img
        src="/images/saphala-logo.png"
        alt={BRAND.name}
        className="h-8 sm:h-9 w-auto object-contain shrink-0"
        draggable={false}
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />

      {/* Text block */}
      <div className="flex flex-col ml-2.5" style={{ gap: "2px" }}>
        <span
          className="leading-tight font-semibold"
          style={{
            color: "#8050C0",
            fontSize: "clamp(14px, 2vw, 16px)",
            lineHeight: 1.2,
          }}
        >
          {BRAND.name}
        </span>
        <span
          className="leading-tight font-medium"
          style={{
            color: "#1040A0",
            fontSize: "clamp(12px, 1.6vw, 14px)",
            lineHeight: 1.2,
          }}
        >
          {BRAND.tagline}
        </span>
      </div>
    </div>
  );
}
