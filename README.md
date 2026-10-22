# نظام أرشفة معاملات البلدية — ArchiveFlow

React + Express + tRPC + Drizzle, running on PostgreSQL. Attachments and backups are stored in the database, so the app needs nothing but a Postgres connection to run.

## Run locally

```bash
pnpm install
cp .env.example .env            # set DATABASE_URL and SESSION_SECRET
pnpm dev                        # http://localhost:3000
```

The server applies the migrations in `drizzle/` automatically on boot and creates the first admin account when the accounts table is empty:

- username: `admin` (or `ADMIN_USERNAME`)
- password: `Admin@12345` (or `ADMIN_PASSWORD`) — **change it from المستخدمون after the first login.**

Set `SEED_DEMO_DATA=false` to start with an empty archive instead of the six sample transactions.

## Roles

| Role | Can |
| --- | --- |
| مدير النظام (`admin`) | everything: transactions, users and their roles, settings, backups, delete/restore |
| موظف تسجيل (`registration`) | register new transactions, edit their data, upload attachments |
| موظف متابعة (`followup`) | update status, assignee, department, priority and notes; archive completed transactions |
| قراءة فقط (`readonly`) | view, search, print and reports |

Permissions are defined once in `shared/permissions.ts` and enforced by the server (`server/routers.ts`); the UI only shows the actions a role has.

## Deploy (Render + any Postgres)

`render.yaml` describes the web service. Environment variables:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string (Neon, Render Postgres, …). TLS is used automatically for hosted databases. |
| `SESSION_SECRET` | random string used to sign sessions |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | optional credentials for the first admin account |
| `SEED_DEMO_DATA` | `false` to skip the sample transactions |

Build: `pnpm install --frozen-lockfile --prod=false && pnpm build` · Start: `pnpm start`

## Scripts

- `pnpm dev` — development server (Vite + API)
- `pnpm build` / `pnpm start` — production build (`dist/`) and server
- `pnpm check` / `pnpm test` — type check and unit tests
- `pnpm db:generate` — generate a new migration after changing `drizzle/schema.ts`
