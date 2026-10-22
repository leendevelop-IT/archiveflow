import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { LOCAL_SESSION_COOKIE } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import { registerOAuthRoutes } from "./oauth";
import { publicPlatformScript } from "./publicConfig";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { ENV } from "./env";
import {
  createDailyBackupIfDue,
  ensureDefaultAdmin,
  ensureSeedTransactions,
  getAttachmentFile,
  getLocalAccountByToken,
  runMigrations,
} from "../db";
import { storageGetFile } from "../storage";

function contentDisposition(fileName: string) {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "'");
  return `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

async function localAccountFromRequest(req: express.Request) {
  const token = parseCookieHeader(req.headers.cookie ?? "")[LOCAL_SESSION_COOKIE];
  return token ? getLocalAccountByToken(token) : null;
}

async function startServer() {
  if (!ENV.cookieSecret) console.warn("[Config] SESSION_SECRET is not set; Manus platform sessions are disabled.");
  await runMigrations();

  const app = express();
  const server = createServer(app);
  app.set("trust proxy", 1);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  await ensureDefaultAdmin();
  await ensureSeedTransactions();
  createDailyBackupIfDue().catch(error => console.warn("[Backup] Daily backup skipped:", error));
  setInterval(() => createDailyBackupIfDue().catch(error => console.warn("[Backup] Daily backup failed:", error)), 60 * 60 * 1000);
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/api/platform/config.js", (_req, res) => {
    res.set("Cache-Control", "no-store").type("application/javascript").send(publicPlatformScript());
  });

  // Attachments live in the database; only signed-in users may open them.
  app.get("/api/attachments/:id", async (req, res) => {
    const account = await localAccountFromRequest(req);
    if (!account) return res.status(401).json({ error: "سجّل الدخول لعرض المرفق" });
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: "معرّف المرفق غير صالح" });
    const file = await getAttachmentFile(id);
    if (!file) return res.status(404).json({ error: "المرفق غير موجود" });
    res.set("Cache-Control", "private, max-age=0");
    res.set("Content-Disposition", contentDisposition(file.fileName));
    res.type(file.mimeType).send(file.data);
  });
  app.get("/api/files/*", async (req, res) => {
    const account = await localAccountFromRequest(req);
    if (!account) return res.status(401).json({ error: "سجّل الدخول لعرض الملف" });
    const key = decodeURIComponent(req.path.replace(/^\/api\/files\//, ""));
    const file = await storageGetFile(key);
    if (!file) return res.status(404).json({ error: "الملف غير موجود" });
    res.set("Cache-Control", "private, max-age=0");
    res.type(file.mimeType).send(file.data);
  });

  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = Number(process.env.PORT || "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT");
  server.on("error", error => { console.error("Server failed:", error.message); process.exit(1); });
  server.listen(port, "0.0.0.0", () => console.log(`Server listening on port ${port}`));
}

startServer().catch(error => { console.error(error); process.exit(1); });
