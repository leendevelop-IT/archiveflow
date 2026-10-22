import { customType, index, integer, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

/** Binary column for files kept inside the database (attachments, generated images). */
export const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

const instant = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: varchar("role", { length: 16 }).$type<"user" | "admin">().default("user").notNull(),
  createdAt: instant("createdAt").defaultNow().notNull(),
  updatedAt: instant("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
  lastSignedIn: instant("lastSignedIn").defaultNow().notNull(),
});

export type LocalRole = "admin" | "registration" | "followup" | "readonly";
export type LocalStatus = "active" | "suspended";

export const localAccounts = pgTable("local_accounts", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  role: varchar("role", { length: 24 }).$type<LocalRole>().default("readonly").notNull(),
  status: varchar("status", { length: 16 }).$type<LocalStatus>().default("active").notNull(),
  createdAt: instant("createdAt").defaultNow().notNull(),
  updatedAt: instant("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
  lastSignedIn: instant("lastSignedIn"),
});

export const localSessions = pgTable(
  "local_sessions",
  {
    id: serial("id").primaryKey(),
    accountId: integer("accountId").notNull(),
    tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
    expiresAt: instant("expiresAt").notNull(),
    createdAt: instant("createdAt").defaultNow().notNull(),
  },
  (table) => [index("local_sessions_account_idx").on(table.accountId)],
);

export const transactions = pgTable(
  "transactions",
  {
    id: serial("id").primaryKey(),
    number: varchar("number", { length: 80 }).notNull().unique(),
    type: varchar("type", { length: 32 }).notNull(),
    subject: varchar("subject", { length: 500 }).notNull(),
    party: varchar("party", { length: 300 }).notNull(),
    received: varchar("received", { length: 32 }).notNull(),
    due: varchar("due", { length: 32 }).notNull(),
    priority: varchar("priority", { length: 32 }).notNull(),
    status: varchar("status", { length: 32 }).notNull(),
    department: varchar("department", { length: 160 }).notNull(),
    assignee: varchar("assignee", { length: 160 }).notNull(),
    notes: text("notes").notNull(),
    attachment: varchar("attachment", { length: 500 }).notNull(),
    archived: integer("archived").default(0).notNull(),
    deletedAt: instant("deletedAt"),
    createdBy: integer("createdBy"),
    createdAt: instant("createdAt").defaultNow().notNull(),
    updatedAt: instant("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => [index("transactions_status_idx").on(table.status), index("transactions_due_idx").on(table.due)],
);

export const attachments = pgTable(
  "attachments",
  {
    id: serial("id").primaryKey(),
    transactionId: integer("transactionId").notNull(),
    fileName: varchar("fileName", { length: 255 }).notNull(),
    storageKey: varchar("storageKey", { length: 500 }).notNull(),
    mimeType: varchar("mimeType", { length: 120 }).notNull(),
    size: integer("size").notNull(),
    deletedAt: instant("deletedAt"),
    createdAt: instant("createdAt").defaultNow().notNull(),
  },
  (table) => [index("attachments_transaction_idx").on(table.transactionId)],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: serial("id").primaryKey(),
    transactionId: integer("transactionId"),
    accountId: integer("accountId"),
    action: varchar("action", { length: 80 }).notNull(),
    details: text("details"),
    createdAt: instant("createdAt").defaultNow().notNull(),
  },
  (table) => [index("audit_events_transaction_idx").on(table.transactionId)],
);

export const backupRecords = pgTable("backup_records", {
  id: serial("id").primaryKey(),
  kind: varchar("kind", { length: 16 }).$type<"manual" | "scheduled">().default("manual").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  storageKey: varchar("storageKey", { length: 500 }),
  transactionCount: integer("transactionCount").default(0).notNull(),
  sizeBytes: integer("sizeBytes").default(0).notNull(),
  payload: text("payload"),
  status: varchar("status", { length: 16 }).$type<"ready" | "failed">().default("ready").notNull(),
  createdBy: integer("createdBy"),
  createdAt: instant("createdAt").defaultNow().notNull(),
});

/** Files stored in the database (attachments and generated images). */
export const storedFiles = pgTable("stored_files", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 512 }).notNull().unique(),
  mimeType: varchar("mimeType", { length: 160 }).notNull(),
  size: integer("size").notNull(),
  data: bytea("data").notNull(),
  createdAt: instant("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type LocalAccount = typeof localAccounts.$inferSelect;
export type LocalSession = typeof localSessions.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;
export type StoredFile = typeof storedFiles.$inferSelect;
