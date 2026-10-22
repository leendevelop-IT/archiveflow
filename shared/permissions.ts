// Role-based permissions, shared by the server (enforced) and the client (UI).

export type AccountRole = "admin" | "registration" | "followup" | "readonly";

export type Permission =
  | "transactions.create"   // register new transactions
  | "transactions.edit"     // change any field of a transaction
  | "transactions.followUp" // change follow-up fields only (status, assignee, department, priority, notes)
  | "transactions.archive"  // mark as completed and archive
  | "transactions.delete"   // move to / restore from the recycle bin
  | "attachments.upload"
  | "users.manage"
  | "settings.manage"
  | "backups.manage";

export const ROLE_PERMISSIONS: Record<AccountRole, readonly Permission[]> = {
  admin: [
    "transactions.create", "transactions.edit", "transactions.followUp", "transactions.archive", "transactions.delete",
    "attachments.upload", "users.manage", "settings.manage", "backups.manage",
  ],
  registration: ["transactions.create", "transactions.edit", "transactions.followUp", "attachments.upload"],
  followup: ["transactions.followUp", "transactions.archive"],
  readonly: [],
};

/** Fields a follow-up officer may change. Everything else on a transaction is registration data. */
export const FOLLOW_UP_FIELDS = ["status", "assignee", "department", "priority", "notes"] as const;
export type FollowUpField = (typeof FOLLOW_UP_FIELDS)[number];

export const ROLE_LABELS: Record<AccountRole, string> = {
  admin: "مدير النظام",
  registration: "موظف تسجيل",
  followup: "موظف متابعة",
  readonly: "قراءة فقط",
};

export const ROLE_HINTS: Record<AccountRole, string> = {
  admin: "كل الصلاحيات: المعاملات والمستخدمون والإعدادات والنسخ الاحتياطي والحذف",
  registration: "تسجيل المعاملات الجديدة وتعديل بياناتها ورفع المرفقات",
  followup: "تحديث حالة المعاملة والموظف المسؤول والملاحظات، وأرشفتها عند الإنجاز",
  readonly: "الاطلاع والبحث والطباعة والتقارير فقط",
};

export const ROLE_ORDER: AccountRole[] = ["registration", "followup", "readonly", "admin"];

export function isAccountRole(value: unknown): value is AccountRole {
  return typeof value === "string" && value in ROLE_PERMISSIONS;
}

export function can(role: string | null | undefined, permission: Permission): boolean {
  return isAccountRole(role) ? ROLE_PERMISSIONS[role].includes(permission) : false;
}

/** Keeps only the follow-up fields of a partial transaction update. */
export function pickFollowUpFields<T extends Record<string, unknown>>(data: T): Partial<Pick<T, FollowUpField & keyof T>> {
  const out: Record<string, unknown> = {};
  for (const key of FOLLOW_UP_FIELDS) if (key in data && data[key] !== undefined) out[key] = data[key];
  return out as Partial<Pick<T, FollowUpField & keyof T>>;
}
