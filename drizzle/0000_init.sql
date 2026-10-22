CREATE TABLE "attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"transactionId" integer NOT NULL,
	"fileName" varchar(255) NOT NULL,
	"storageKey" varchar(500) NOT NULL,
	"mimeType" varchar(120) NOT NULL,
	"size" integer NOT NULL,
	"deletedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"transactionId" integer,
	"accountId" integer,
	"action" varchar(80) NOT NULL,
	"details" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "backup_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" varchar(16) DEFAULT 'manual' NOT NULL,
	"fileName" varchar(255) NOT NULL,
	"storageKey" varchar(500),
	"transactionCount" integer DEFAULT 0 NOT NULL,
	"sizeBytes" integer DEFAULT 0 NOT NULL,
	"payload" text,
	"status" varchar(16) DEFAULT 'ready' NOT NULL,
	"createdBy" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "local_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(64) NOT NULL,
	"name" varchar(160) NOT NULL,
	"passwordHash" varchar(255) NOT NULL,
	"role" varchar(24) DEFAULT 'readonly' NOT NULL,
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp with time zone,
	CONSTRAINT "local_accounts_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "local_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"accountId" integer NOT NULL,
	"tokenHash" varchar(128) NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "local_sessions_tokenHash_unique" UNIQUE("tokenHash")
);
--> statement-breakpoint
CREATE TABLE "stored_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(512) NOT NULL,
	"mimeType" varchar(160) NOT NULL,
	"size" integer NOT NULL,
	"data" "bytea" NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stored_files_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"number" varchar(80) NOT NULL,
	"type" varchar(32) NOT NULL,
	"subject" varchar(500) NOT NULL,
	"party" varchar(300) NOT NULL,
	"received" varchar(32) NOT NULL,
	"due" varchar(32) NOT NULL,
	"priority" varchar(32) NOT NULL,
	"status" varchar(32) NOT NULL,
	"department" varchar(160) NOT NULL,
	"assignee" varchar(160) NOT NULL,
	"notes" text NOT NULL,
	"attachment" varchar(500) NOT NULL,
	"archived" integer DEFAULT 0 NOT NULL,
	"deletedAt" timestamp with time zone,
	"createdBy" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" varchar(16) DEFAULT 'user' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE INDEX "attachments_transaction_idx" ON "attachments" USING btree ("transactionId");--> statement-breakpoint
CREATE INDEX "audit_events_transaction_idx" ON "audit_events" USING btree ("transactionId");--> statement-breakpoint
CREATE INDEX "local_sessions_account_idx" ON "local_sessions" USING btree ("accountId");--> statement-breakpoint
CREATE INDEX "transactions_status_idx" ON "transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "transactions_due_idx" ON "transactions" USING btree ("due");