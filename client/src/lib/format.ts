import { loadSettings, type Tx } from "./archive";

// Western digits everywhere: reference numbers, amounts and date inputs already use them,
// so mixing in Arabic-Indic digits only made the screen harder to scan.
const GREGORIAN = "ar-SA-u-ca-gregory-nu-latn";
const HIJRI = "ar-SA-u-ca-islamic-umalqura-nu-latn";

const initialSettings = loadSettings();
let dateFormat = initialSettings.dateFormat;
let alertDays = Math.max(1, Number(initialSettings.alertDays) || 3);
/** Called by Settings after saving so every date on screen follows the new choice. */
export const setDateFormat = (value: typeof dateFormat) => { dateFormat = value; };
/** How many days before the due date a transaction counts as "due soon". */
export const setAlertDays = (value: number) => { alertDays = Math.max(1, value || 3); };

const parse = (iso: string) => {
  const date = new Date(`${iso}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const long = (locale: string, date: Date) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(date);
const short = (locale: string, date: Date) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(date);

/** Compact date for tables. Follows the "صيغة التاريخ" setting; "هجري وميلادي" shows the Gregorian one here and both in details. */
export function formatDate(iso: string) {
  const date = parse(iso);
  if (!date) return iso || "—";
  return short(dateFormat === "هجري" ? HIJRI : GREGORIAN, date);
}

/** Full date for detail views; shows both calendars when the setting asks for both. */
export function formatDateLong(iso: string) {
  const date = parse(iso);
  if (!date) return iso || "—";
  if (dateFormat === "هجري") return long(HIJRI, date);
  if (dateFormat === "هجري وميلادي") return `${long(GREGORIAN, date)} (${long(HIJRI, date)})`;
  return long(GREGORIAN, date);
}

export const formatDateTime = (value: string | Date) =>
  new Intl.DateTimeFormat(GREGORIAN, { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" }).format(typeof value === "string" ? new Date(value) : value);

export const formatNumber = (value: number) => new Intl.NumberFormat("en-US").format(value);

export const todayIso = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

export const addDaysIso = (iso: string, days: number) => {
  const date = parse(iso) ?? new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const plural = (n: number, one: string, two: string, many: string, more: string) =>
  n === 1 ? one : n === 2 ? two : n >= 3 && n <= 10 ? `${n} ${many}` : `${n} ${more}`;
const days = (n: number) => plural(n, "يوم واحد", "يومين", "أيام", "يومًا");

export type DueTone = "done" | "late" | "soon" | "ok";
export type DueInfo = { tone: DueTone; label: string; daysLeft: number };

/** Turns a due date into the sentence a clerk actually needs: "متأخرة 3 أيام", "تستحق غدًا"… */
export function dueInfo(tx: Pick<Tx, "due" | "status">, today = todayIso()): DueInfo {
  const dueDate = parse(tx.due);
  const now = parse(today);
  if (tx.status === "مكتملة") return { tone: "done", label: "مكتملة", daysLeft: 0 };
  if (!dueDate || !now) return { tone: "ok", label: "بدون موعد", daysLeft: 0 };
  const daysLeft = Math.round((dueDate.getTime() - now.getTime()) / 86_400_000);
  if (daysLeft < 0) return { tone: "late", label: `متأخرة ${days(-daysLeft)}`, daysLeft };
  if (daysLeft === 0) return { tone: "soon", label: "تستحق اليوم", daysLeft };
  if (daysLeft === 1) return { tone: "soon", label: "تستحق غدًا", daysLeft };
  if (daysLeft <= alertDays) return { tone: "soon", label: `تستحق بعد ${days(daysLeft)}`, daysLeft };
  return { tone: "ok", label: `بعد ${days(daysLeft)}`, daysLeft };
}

export const isOverdue = (tx: Pick<Tx, "due" | "status">) => dueInfo(tx).tone === "late";
export const isDueSoon = (tx: Pick<Tx, "due" | "status">) => dueInfo(tx).tone === "soon";

export const countLabel = (n: number, singular: string, dual: string, plural3to10: string, pluralMany: string) =>
  n === 0 ? `لا توجد ${pluralMany}` : plural(n, `${singular} واحدة`, dual, plural3to10, pluralMany);

/** "6 معاملات", "معاملة واحدة", "معاملتان" */
export const txCount = (n: number) => countLabel(n, "معاملة", "معاملتان", "معاملات", "معاملة");
