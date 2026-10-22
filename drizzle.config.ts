import { defineConfig } from "drizzle-kit";

// `drizzle-kit generate` only needs the schema; `drizzle-kit migrate` needs DATABASE_URL.
export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://localhost:5432/archiveflow",
  },
});
