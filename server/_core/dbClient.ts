import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "node:path";
import { Pool } from "pg";

export type Database = NodePgDatabase<Record<string, never>>;

let _db: Database | null = null;
let _pool: Pool | null = null;

/** TLS is needed for hosted databases (Neon, Render external URLs); local and Render-internal hosts speak plain TCP. */
export function sslFor(connectionString: string) {
  if (process.env.DATABASE_SSL === "disable") return false;
  if (process.env.DATABASE_SSL === "no-verify") return { rejectUnauthorized: false };
  try {
    const host = new URL(connectionString).hostname.replace(/^\[|\]$/g, "");
    const isLocal = host === "localhost" || !host.includes(".") || /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":");
    if (isLocal) return false;
    return host.endsWith(".neon.tech") ? { rejectUnauthorized: true } : { rejectUnauthorized: false };
  } catch {
    return false;
  }
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: sslFor(process.env.DATABASE_URL), max: 5 });
      _pool.on("error", (error) => console.error("[Database] Pool error:", error.message));
      _db = drizzle(_pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export function requireDb(db: Database | null): Database {
  if (!db) throw new Error("Database is not available");
  return db;
}

/** Applies the SQL migrations in ./drizzle on boot, so a fresh database is ready without manual steps. */
export async function runMigrations() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] DATABASE_URL is not set; running without a database.");
    return;
  }
  const migrationsFolder = process.env.DRIZZLE_MIGRATIONS_DIR || path.resolve(process.cwd(), "drizzle");
  await migrate(db, { migrationsFolder });
  console.log("[Database] Migrations are up to date.");
}

export async function closeDb() {
  await _pool?.end();
  _pool = null;
  _db = null;
}

/** True when a Postgres error (possibly wrapped by Drizzle) is a unique-constraint violation. */
export function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; current && depth < 4; depth++) {
    const code = (current as { code?: unknown }).code;
    if (code === "23505") return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}
