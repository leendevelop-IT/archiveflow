// Files are kept inside the application database (table `stored_files`), so the app
// runs on any host without an object-storage account. Downloads go through
// authenticated routes under /api/files/.

import { eq } from "drizzle-orm";
import { storedFiles } from "../drizzle/schema";
import { getDb, requireDb } from "./_core/dbClient";

export const MAX_STORED_FILE_BYTES = 25 * 1024 * 1024;

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export function storageUrl(key: string) {
  return `/api/files/${normalizeKey(key).split("/").map(encodeURIComponent).join("/")}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const db = requireDb(await getDb());
  const key = appendHashSuffix(normalizeKey(relKey));
  const bytes = typeof data === "string" ? Buffer.from(data, "utf8") : Buffer.from(data);
  if (bytes.length > MAX_STORED_FILE_BYTES) throw new Error("File is too large to store");
  await db
    .insert(storedFiles)
    .values({ key, mimeType: contentType, size: bytes.length, data: bytes })
    .onConflictDoUpdate({ target: storedFiles.key, set: { mimeType: contentType, size: bytes.length, data: bytes } });
  return { key, url: storageUrl(key) };
}

export async function storageGetFile(relKey: string): Promise<{ key: string; mimeType: string; size: number; data: Buffer } | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(storedFiles).where(eq(storedFiles.key, normalizeKey(relKey))).limit(1);
  if (!row) return null;
  return { key: row.key, mimeType: row.mimeType, size: row.size, data: Buffer.from(row.data) };
}

export async function storageDelete(relKey: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(storedFiles).where(eq(storedFiles.key, normalizeKey(relKey)));
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: storageUrl(key) };
}

/** Same-origin download path; the route checks the caller's session before streaming the file. */
export async function storageGetSignedUrl(relKey: string): Promise<string> {
  return storageUrl(relKey);
}
