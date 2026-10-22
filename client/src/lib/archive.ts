// Shared types, option lists and label maps for the transaction archive.
// Keeping these in one place means the form, the table and the filters never disagree.

export type TxType = "واردة" | "صادرة" | "داخلية";
export type TxPriority = "عالية" | "متوسطة" | "منخفضة";
export type TxStatus = "جديدة" | "قيد الإجراء" | "مكتملة" | "متأخرة";

export type Tx = {
  id: number;
  number: string;
  type: TxType;
  subject: string;
  party: string;
  received: string;
  due: string;
  priority: TxPriority;
  status: TxStatus;
  department: string;
  assignee: string;
  notes: string;
  attachment: string;
  archived?: boolean;
};

/** What the add/edit form produces. The attachment bytes travel separately from the record. */
export type TxForm = Omit<Tx, "id" | "number"> & {
  attachmentBase64?: string;
  attachmentMime?: string;
  attachmentSize?: number;
};

export const TX_TYPES: TxType[] = ["واردة", "صادرة", "داخلية"];
export const TX_STATUSES: TxStatus[] = ["جديدة", "قيد الإجراء", "مكتملة", "متأخرة"];
export const TX_PRIORITIES: TxPriority[] = ["عالية", "متوسطة", "منخفضة"];
export const DEFAULT_DEPARTMENTS = ["الإدارة العامة", "الإدارة الهندسية", "المالية", "الشؤون الإدارية", "المشتريات", "التراخيص", "العلاقات العامة"];

/** Short plain-language description shown next to each type when choosing it. */
export const TYPE_HINTS: Record<TxType, string> = {
  "واردة": "وصلت من جهة خارجية",
  "صادرة": "أرسلتها البلدية إلى جهة أخرى",
  "داخلية": "بين إدارات البلدية",
};

export const TYPE_SLUG: Record<TxType, "incoming" | "outgoing" | "internal"> = { "واردة": "incoming", "صادرة": "outgoing", "داخلية": "internal" };
export const STATUS_SLUG: Record<TxStatus, "new" | "progress" | "done" | "late"> = { "جديدة": "new", "قيد الإجراء": "progress", "مكتملة": "done", "متأخرة": "late" };
export const PRIORITY_SLUG: Record<TxPriority, "high" | "medium" | "low"> = { "عالية": "high", "متوسطة": "medium", "منخفضة": "low" };

export { ROLE_LABELS, ROLE_HINTS, ROLE_ORDER, can, type AccountRole, type Permission } from "@shared/permissions";
import type { AccountRole } from "@shared/permissions";

export type Account = { id: number; username: string; name: string; role: AccountRole; status: "active" | "suspended" };

export const initialsOf = (name: string) => (name.trim().split(/\s+/)[0] ?? "").slice(0, 1);

/** Settings saved in the browser. The server keeps the records; these only shape how the app looks and numbers things. */
export type ArchiveSettings = {
  org: string; prefix: string; year: string; email: string; phone: string;
  dateFormat: "ميلادي" | "هجري" | "هجري وميلادي"; digits: string;
  departments: string; alertDays: string; header: string;
};
export const DEFAULT_SETTINGS: ArchiveSettings = {
  org: "أرشيف المعاملات", prefix: "بلد", year: String(new Date().getFullYear()), email: "", phone: "",
  dateFormat: "ميلادي", digits: "5",
  departments: DEFAULT_DEPARTMENTS.join("\n"), alertDays: "3", header: "تقرير المعاملات",
};
export const SETTINGS_KEY = "archive-settings";

export function loadSettings(): ArchiveSettings {
  try {
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    const merged = { ...DEFAULT_SETTINGS, ...stored } as ArchiveSettings;
    // Older versions stored a different label for the date format.
    if ((merged.dateFormat as string) === "ميلادي فقط") merged.dateFormat = "ميلادي";
    if ((merged.dateFormat as string) === "هجري فقط") merged.dateFormat = "هجري";
    return merged;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export const listFromText = (text: string, fallback: string[]) => {
  const items = text.split("\n").map((line) => line.trim()).filter(Boolean);
  return items.length ? items : fallback;
};
