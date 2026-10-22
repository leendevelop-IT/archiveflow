import { LOCAL_SESSION_COOKIE } from "@shared/const";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { authenticateLocal, createLocalAccount, deleteLocalAccount, updateLocalAccount, listLocalAccounts, listTransactionHistory, listTransactions, createTransaction, updateTransaction, softDeleteTransaction, restoreTransaction, listDeletedTransactions, createBackup, listBackups, restoreBackup, uploadArchiveAttachment } from "./db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const localProtected = publicProcedure.use(({ ctx, next }) => { if (!ctx.localUser) throw new TRPCError({ code: "UNAUTHORIZED", message: "LOCAL_LOGIN_REQUIRED" }); return next({ ctx: { ...ctx, localUser: ctx.localUser } }); });
const localAdmin = localProtected.use(({ ctx, next }) => { if (ctx.localUser.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "ADMIN_REQUIRED" }); return next({ ctx: { ...ctx, localUser: ctx.localUser } }); });
const cookieOptions = { httpOnly: true, sameSite: "none" as const, secure: true, path: "/" };
const txInput = z.object({ number: z.string(), type: z.string(), subject: z.string().min(1), party: z.string().min(1), received: z.string(), due: z.string(), priority: z.string(), status: z.string(), department: z.string(), assignee: z.string(), notes: z.string(), attachment: z.string(), archived: z.boolean().optional() });

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { ctx.res.clearCookie("webdev_app_session", { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }),
    localMe: publicProcedure.query(opts => opts.ctx.localUser),
    localLogin: publicProcedure.input(z.object({ username: z.string().min(1), password: z.string().min(1) })).mutation(async ({ input, ctx }) => { const result = await authenticateLocal(input.username, input.password); if (!result) throw new TRPCError({ code: "UNAUTHORIZED", message: "اسم المستخدم أو كلمة المرور غير صحيحة" }); ctx.res.cookie(LOCAL_SESSION_COOKIE, result.token, cookieOptions); return result.account; }),
    localLogout: publicProcedure.mutation(async ({ ctx }) => { const raw = ctx.req.headers.cookie || ""; const token = raw.split(";").map(v => v.trim()).find(v => v.startsWith(`${LOCAL_SESSION_COOKIE}=`))?.split("=").slice(1).join("="); if (token) { const { deleteLocalSession } = await import("./db"); await deleteLocalSession(token); } ctx.res.clearCookie(LOCAL_SESSION_COOKIE, cookieOptions); return { success: true }; }),
    accounts: localAdmin.query(() => listLocalAccounts()),
    createAccount: localAdmin.input(z.object({ username: z.string().min(3), name: z.string().min(2), password: z.string().min(8), role: z.enum(["admin", "registration", "followup", "readonly"]), status: z.enum(["active", "suspended"]) })).mutation(({ input }) => createLocalAccount(input)),
    updateAccount: localAdmin.input(z.object({ id: z.number(), name: z.string().min(2).optional(), role: z.enum(["admin", "registration", "followup", "readonly"]).optional(), status: z.enum(["active", "suspended"]).optional() })).mutation(async ({ input, ctx }) => { if (input.id === ctx.localUser.id && (input.status === "suspended" || (input.role && input.role !== "admin"))) throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكنك تعطيل حسابك أو إزالة صلاحيات المدير عن نفسك" }); const { id, ...data } = input; return updateLocalAccount(id, data); }),
    deleteAccount: localAdmin.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => { if (input.id === ctx.localUser.id) throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن حذف الحساب المستخدم حاليًا" }); await deleteLocalAccount(input.id); return { success: true }; }),
  }),
  transactions: router({
    list: localProtected.query(() => listTransactions()),
    deleted: localAdmin.query(() => listDeletedTransactions()),
    history: localProtected.input(z.object({ id: z.number() })).query(({ input }) => listTransactionHistory(input.id)),
    create: localProtected.input(txInput).mutation(({ input, ctx }) => createTransaction(input, ctx.localUser.id)),
    update: localProtected.input(z.object({ id: z.number(), data: txInput.partial() })).mutation(({ input, ctx }) => updateTransaction(input.id, input.data, ctx.localUser.id)),
    archive: localProtected.input(z.object({ id: z.number() })).mutation(({ input, ctx }) => updateTransaction(input.id, { archived: true, status: "مكتملة" }, ctx.localUser.id)),
    delete: localAdmin.input(z.object({ id: z.number() })).mutation(({ input, ctx }) => softDeleteTransaction(input.id, ctx.localUser.id)),
    restore: localAdmin.input(z.object({ id: z.number() })).mutation(({ input, ctx }) => restoreTransaction(input.id, ctx.localUser.id)),
  }),
  attachments: router({ upload: localProtected.input(z.object({ transactionId: z.number(), fileName: z.string(), mimeType: z.string(), size: z.number(), base64: z.string().max(15000000) })).mutation(({ input }) => uploadArchiveAttachment(input)),
  }),
  backups: router({
    list: localAdmin.query(() => listBackups()),
    create: localAdmin.mutation(({ ctx }) => createBackup(ctx.localUser.id, "manual")),
    restore: localAdmin.input(z.object({ transactions: z.array(txInput) })).mutation(({ input, ctx }) => restoreBackup(input, ctx.localUser.id)),
  }),
});
export type AppRouter = typeof appRouter;
