import { defineConfig } from "@prisma/config";

// In Replit, Secrets are already in process.env, so dotenv is optional.
// If you also use local .env, uncomment the next line:
// import "dotenv/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
