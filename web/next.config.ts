import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Replit preview runs from a different origin, so allow it during dev.
  allowedDevOrigins: ["*.replit.dev", "*.repl.co"],
};

export default nextConfig;
