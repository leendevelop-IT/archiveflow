import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { getLocalAccountByToken } from "../db";
import { LOCAL_SESSION_COOKIE } from "@shared/const";

export type TrpcContext = { req: CreateExpressContextOptions["req"]; res: CreateExpressContextOptions["res"]; user: User | null; localUser: { id:number; username:string; name:string; role:string; status:string } | null };
export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  let user: User | null = null; try { user = await sdk.authenticateRequest(opts.req); } catch { user = null; }
  let localUser = null; const token = (opts.req as any).cookies?.[LOCAL_SESSION_COOKIE] || (() => { const raw = opts.req.headers.cookie || ""; return raw.split(";").map(v => v.trim()).find(v => v.startsWith(`${LOCAL_SESSION_COOKIE}=`))?.split("=").slice(1).join("="); })();
  if (token) localUser = await getLocalAccountByToken(token);
  return { req: opts.req, res: opts.res, user, localUser };
}
