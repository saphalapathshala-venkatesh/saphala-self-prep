import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.replit.dev", "*.repl.co"],
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
