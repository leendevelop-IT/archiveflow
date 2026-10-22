import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, BarChart3, ClipboardList, LayoutDashboard, LogOut, Menu, Moon, Settings as SettingsIcon, Sun, UsersRound, X } from "lucide-react";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { DEFAULT_DEPARTMENTS, initialsOf, listFromText, loadSettings, ROLE_LABELS, type AccountRole, type ArchiveSettings, type Tx, type TxForm } from "@/lib/archive";
import { dueInfo, formatDateLong, todayIso } from "@/lib/format";
import { ConfirmDialog, Toast } from "@/components/ui";
import { TxFormDialog } from "@/components/TxFormDialog";
import { TxDetailDialog } from "@/components/TxDetailDialog";
import { Dashboard, type QuickFilter } from "@/pages/Dashboard";
import { Transactions, EMPTY_FILTERS, type TxFilters } from "@/pages/Transactions";
import { Reports } from "@/pages/Reports";
import { Users } from "@/pages/Users";
import { Settings } from "@/pages/Settings";
import { Login } from "@/pages/Login";
import "./index.css";

type Page = "dashboard" | "transactions" | "reports" | "users" | "settings";
type Account = { id: number; username: string; name: string; role: string; status: string };

const NAV: { key: Page; label: string; icon: typeof LayoutDashboard; adminOnly?: boolean }[] = [
  { key: "dashboard", label: "لوحة المتابعة", icon: LayoutDashboard },
  { key: "transactions", label: "المعاملات", icon: ClipboardList },
  { key: "reports", label: "التقارير", icon: BarChart3 },
  { key: "users", label: "المستخدمون", icon: UsersRound, adminOnly: true },
  { key: "settings", label: "الإعدادات", icon: SettingsIcon, adminOnly: true },
];

// Shown only while the server list has not arrived yet (or offline), so the screens are never blank.
const SEED: Tx[] = [
  { id: 1, number: "بلد/وارد/2026/00124", type: "واردة", subject: "طلب اعتماد مخطط تحسين الحديقة العامة", party: "أمانة المنطقة الشرقية", received: "2026-10-12", due: "2026-10-20", priority: "عالية", status: "جديدة", department: "الإدارة الهندسية", assignee: "أحمد العتيبي", notes: "يتطلب الرد خلال خمسة أيام عمل.", attachment: "مخطط-الحديقة.pdf" },
  { id: 2, number: "بلد/صادر/2026/00098", type: "صادرة", subject: "تعميم تنظيم ساعات العمل الشتوية", party: "جميع الإدارات", received: "2026-10-10", due: "2026-10-15", priority: "متوسطة", status: "قيد الإجراء", department: "الشؤون الإدارية", assignee: "نورة القحطاني", notes: "بانتظار اعتماد المدير العام.", attachment: "تعميم-الدوام.docx" },
  { id: 3, number: "بلد/داخلي/2026/00056", type: "داخلية", subject: "محضر اجتماع لجنة المشتريات", party: "إدارة المشتريات", received: "2026-10-08", due: "2026-10-13", priority: "منخفضة", status: "مكتملة", department: "المشتريات", assignee: "سارة الحربي", notes: "تمت الأرشفة بعد اعتماد المحضر.", attachment: "محضر-اللجنة.pdf" },
  { id: 4, number: "بلد/وارد/2026/00118", type: "واردة", subject: "مطالبة مالية عن أعمال صيانة الطرق", party: "شركة المسار للمقاولات", received: "2026-10-01", due: "2026-10-10", priority: "عالية", status: "متأخرة", department: "المالية", assignee: "خالد الشهري", notes: "مطلوب مراجعة المستخلص النهائي.", attachment: "مطالبة-مالية.pdf" },
  { id: 5, number: "بلد/وارد/2026/00121", type: "واردة", subject: "دعوة للمشاركة في ملتقى المدن الذكية", party: "وزارة البلديات والإسكان", received: "2026-10-11", due: "2026-10-18", priority: "متوسطة", status: "قيد الإجراء", department: "العلاقات العامة", assignee: "ريم المطيري", notes: "تأكيد أسماء المشاركين.", attachment: "دعوة-الملتقى.pdf" },
  { id: 6, number: "بلد/صادر/2026/00094", type: "صادرة", subject: "رد على استفسار رخصة محل تجاري", party: "مؤسسة روافد التجارية", received: "2026-10-05", due: "2026-10-12", priority: "منخفضة", status: "مكتملة", department: "التراخيص", assignee: "عبدالله الزهراني", notes: "تم الإرسال عبر منصة المراسلات.", attachment: "الرد-الرسمي.pdf" },
];

const TYPE_SLUG_AR: Record<Tx["type"], string> = { "واردة": "وارد", "صادرة": "صادر", "داخلية": "داخلي" };

function pageFromPath(): Page {
  const path = window.location.pathname;
  if (path.startsWith("/transactions")) return "transactions";
  if (path.startsWith("/reports")) return "reports";
  if (path.startsWith("/users")) return "users";
  if (path.startsWith("/settings")) return "settings";
  return "dashboard";
}

/** Builds the next reference number from the settings and the highest number already used for that type and year. */
function nextNumber(type: Tx["type"], settings: ArchiveSettings, txs: Tx[]) {
  const prefix = `${settings.prefix || "بلد"}/${TYPE_SLUG_AR[type]}/${settings.year || new Date().getFullYear()}/`;
  const digits = Math.min(8, Math.max(3, Number(settings.digits) || 5));
  const highest = txs.reduce((max, tx) => {
    if (!tx.number.startsWith(prefix)) return max;
    const serial = Number(tx.number.slice(prefix.length));
    return Number.isFinite(serial) ? Math.max(max, serial) : max;
  }, 0);
  return `${prefix}${String(highest + 1).padStart(digits, "0")}`;
}

function AppShell({ account, onSignedOut }: { account: Account; onSignedOut: () => void }) {
  const { theme, toggleTheme } = useTheme();
  const isAdmin = account.role === "admin";
  const canEdit = account.role !== "readonly";
  const roleLabel = ROLE_LABELS[account.role as AccountRole] ?? account.role;

  const [settings, setSettings] = useState<ArchiveSettings>(loadSettings);
  const departments = useMemo(() => listFromText(settings.departments, DEFAULT_DEPARTMENTS), [settings.departments]);
  const [page, setPage] = useState<Page>(pageFromPath);
  const [mobileNav, setMobileNav] = useState(false);
  const [txs, setTxs] = useState<Tx[]>(() => { try { return JSON.parse(localStorage.getItem("archive-txs") || "null") || SEED; } catch { return SEED; } });
  const serverTxs = trpc.transactions.list.useQuery(undefined, { retry: false });
  const createTx = trpc.transactions.create.useMutation();
  const updateTx = trpc.transactions.update.useMutation();
  const archiveTx = trpc.transactions.archive.useMutation();
  const deleteTx = trpc.transactions.delete.useMutation();
  const uploadAttachment = trpc.attachments.upload.useMutation();
  const logout = trpc.auth.localLogout.useMutation({ onSettled: onSignedOut });

  const [filters, setFilters] = useState<TxFilters>(EMPTY_FILTERS);
  const [formTarget, setFormTarget] = useState<"new" | Tx | null>(() => (window.location.pathname === "/transactions/new" ? "new" : null));
  const [selected, setSelected] = useState<Tx | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "archive" | "delete"; tx: Tx } | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" }>({ message: "", tone: "success" });

  useEffect(() => { if (serverTxs.data) setTxs(serverTxs.data as unknown as Tx[]); }, [serverTxs.data]);
  useEffect(() => { localStorage.setItem("archive-txs", JSON.stringify(txs)); }, [txs]);
  useEffect(() => {
    const match = window.location.pathname.match(/^\/transactions\/(\d+)$/);
    if (match) { const found = txs.find((t) => t.id === Number(match[1])); if (found) setSelected(found); }
    // Only on first load: deep links like /transactions/12 open that transaction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const onPop = () => setPage(pageFromPath());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  useEffect(() => {
    if (!mobileNav) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileNav(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileNav]);

  const notify = useCallback((message: string, tone: "success" | "error" = "success") => {
    setToast({ message, tone });
    window.setTimeout(() => setToast((current) => (current.message === message ? { message: "", tone } : current)), 3200);
  }, []);

  const go = useCallback((target: Page) => {
    setPage(target);
    setMobileNav(false);
    window.history.pushState({}, "", target === "dashboard" ? "/" : `/${target}`);
    window.scrollTo({ top: 0 });
  }, []);

  const filtered = useMemo(() => txs.filter((t) => {
    if (filters.type && t.type !== filters.type) return false;
    if (filters.status && t.status !== filters.status) return false;
    if (filters.priority && t.priority !== filters.priority) return false;
    if (filters.department && t.department !== filters.department) return false;
    if (filters.due) { const tone = dueInfo(t).tone; if (tone !== filters.due || t.archived) return false; }
    if (filters.query) { const q = filters.query.trim(); if (q && !`${t.number} ${t.subject} ${t.party} ${t.department} ${t.assignee}`.includes(q)) return false; }
    return true;
  }).sort((a, b) => b.received.localeCompare(a.received) || b.id - a.id), [txs, filters]);

  const lateCount = useMemo(() => txs.filter((t) => !t.archived && dueInfo(t).tone === "late").length, [txs]);

  const openNew = () => setFormTarget("new");
  const closeForm = useCallback(() => setFormTarget(null), []);
  const closeDetail = useCallback(() => setSelected(null), []);
  const closeConfirm = useCallback(() => setConfirm(null), []);

  const saveTx = (form: TxForm) => {
    const { attachmentBase64, attachmentMime, attachmentSize, ...data } = form;
    if (formTarget && formTarget !== "new") {
      updateTx.mutate({ id: formTarget.id, data }, {
        onSuccess: (updated) => {
          if (updated) {
            const next = updated as unknown as Tx;
            setTxs((prev) => prev.map((t) => (t.id === formTarget.id ? next : t)));
            if (attachmentBase64 && attachmentMime && attachmentSize) uploadAttachment.mutate({ transactionId: formTarget.id, fileName: data.attachment, mimeType: attachmentMime, size: attachmentSize, base64: attachmentBase64 }, { onError: () => notify("تم حفظ المعاملة لكن تعذر رفع المرفق", "error") });
            setSelected((current) => (current && current.id === formTarget.id ? next : current));
          }
          notify("تم حفظ التعديلات");
          setFormTarget(null);
        },
        onError: () => notify("تعذر حفظ التعديلات، حاول مرة أخرى", "error"),
      });
      return;
    }
    const number = nextNumber(form.type, settings, txs);
    createTx.mutate({ ...data, number }, {
      onSuccess: (created) => {
        const next = created as unknown as Tx;
        setTxs((prev) => [next, ...prev]);
        if (attachmentBase64 && attachmentMime && attachmentSize) uploadAttachment.mutate({ transactionId: created.id, fileName: data.attachment, mimeType: attachmentMime, size: attachmentSize, base64: attachmentBase64 }, { onError: () => notify("تم حفظ المعاملة لكن تعذر رفع المرفق", "error") });
        notify(`تم تسجيل المعاملة برقم ${number}`);
        setFormTarget(null);
      },
      onError: (error) => notify(error.data?.code === "CONFLICT" ? error.message : "تعذر حفظ المعاملة، تأكد من الاتصال ثم حاول مرة أخرى", "error"),
    });
  };

  const runConfirm = () => {
    if (!confirm) return;
    const { kind, tx } = confirm;
    if (kind === "archive") {
      archiveTx.mutate({ id: tx.id }, {
        onSuccess: (updated) => { setTxs((prev) => prev.map((t) => (t.id === tx.id ? (updated as unknown as Tx) : t))); notify("تمت أرشفة المعاملة"); setConfirm(null); setSelected(null); },
        onError: () => { notify("تعذرت الأرشفة، حاول مرة أخرى", "error"); setConfirm(null); },
      });
    } else {
      deleteTx.mutate({ id: tx.id }, {
        onSuccess: () => { setTxs((prev) => prev.filter((t) => t.id !== tx.id)); notify("نُقلت المعاملة إلى سلة المحذوفات"); setConfirm(null); setSelected(null); },
        onError: () => { notify("تعذر الحذف، حاول مرة أخرى", "error"); setConfirm(null); },
      });
    }
  };

  const exportCsv = (rows: Tx[]) => {
    const header = ["رقم المعاملة", "النوع", "الموضوع", "الجهة", "القسم", "الموظف المسؤول", "تاريخ الورود", "موعد الاستحقاق", "الأولوية", "الحالة", "ملاحظات"];
    const lines = rows.map((t) => [t.number, t.type, t.subject, t.party, t.department, t.assignee, t.received, t.due, t.priority, t.status, t.notes].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
    const csv = [header.join(","), ...lines].join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    link.download = `المعاملات-${todayIso()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    notify("تم تصدير الملف، افتحه في Excel");
  };

  const searchFromDashboard = (query: string) => { setFilters({ ...EMPTY_FILTERS, query }); go("transactions"); };
  const quickFilter = (filter: QuickFilter) => { setFilters({ ...EMPTY_FILTERS, status: filter.status ?? "", due: filter.due ?? "" }); go("transactions"); };

  const visibleNav = NAV.filter((item) => !item.adminOnly || isAdmin);
  const effectivePage: Page = (page === "users" || page === "settings") && !isAdmin ? "dashboard" : page;
  const today = formatDateLong(todayIso());

  return (
    <div className="app-shell" dir="rtl">
      <a href="#main" className="skip-link">تخطي إلى المحتوى</a>
      {mobileNav && <button type="button" className="nav-backdrop" aria-label="إغلاق القائمة" onClick={() => setMobileNav(false)} />}

      <aside className={`sidebar ${mobileNav ? "open" : ""}`} id="sidebar" aria-label="القائمة الرئيسية">
        <div className="sidebar-top">
          <div className="brand brand-light">
            <span className="brand-mark"><Archive size={22} aria-hidden="true" /></span>
            <strong>{settings.org}</strong>
          </div>
          <button type="button" className="icon-btn icon-btn-light sidebar-close" onClick={() => setMobileNav(false)} aria-label="إغلاق القائمة"><X size={20} aria-hidden="true" /></button>
        </div>
        <nav className="side-nav">
          {visibleNav.map(({ key, label, icon: Icon }) => (
            <button key={key} type="button" className={effectivePage === key ? "active" : ""} aria-current={effectivePage === key ? "page" : undefined} onClick={() => go(key)}>
              <Icon size={20} aria-hidden="true" />
              <span>{label}</span>
              {key === "dashboard" && lateCount > 0 && <b className="nav-count nav-count-alert" title={`${lateCount} متأخرة`}>{lateCount}</b>}
            </button>
          ))}
        </nav>
        <div className="sidebar-user">
          <span className="avatar avatar-light" aria-hidden="true">{initialsOf(account.name)}</span>
          <div>
            <strong>{account.name}</strong>
            <small>{roleLabel}</small>
          </div>
          <button type="button" className="icon-btn icon-btn-light" onClick={() => logout.mutate()} disabled={logout.isPending} aria-label="تسجيل الخروج" title="تسجيل الخروج">
            <LogOut size={19} aria-hidden="true" />
          </button>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <button type="button" className="icon-btn mobile-menu" onClick={() => setMobileNav(true)} aria-label="فتح القائمة" aria-controls="sidebar" aria-expanded={mobileNav}><Menu size={22} aria-hidden="true" /></button>
          <div className="brand brand-compact mobile-only">
            <span className="brand-mark"><Archive size={18} aria-hidden="true" /></span>
            <strong>{settings.org}</strong>
          </div>
          <span className="topbar-date desktop-only">اليوم {today}</span>
          <div className="topbar-actions">
            <button type="button" className="icon-btn" onClick={toggleTheme} aria-label={theme === "light" ? "الوضع الداكن" : "الوضع الفاتح"} title={theme === "light" ? "الوضع الداكن" : "الوضع الفاتح"}>
              {theme === "light" ? <Moon size={20} aria-hidden="true" /> : <Sun size={20} aria-hidden="true" />}
            </button>
          </div>
        </header>

        <main id="main" className="content" tabIndex={-1}>
          {effectivePage === "dashboard" && <Dashboard txs={txs} canEdit={canEdit} onNew={openNew} onOpen={setSelected} onSearch={searchFromDashboard} onQuickFilter={quickFilter} onShowAll={() => { setFilters(EMPTY_FILTERS); go("transactions"); }} />}
          {effectivePage === "transactions" && <Transactions data={filtered} total={txs.length} filters={filters} setFilters={setFilters} departments={departments} canEdit={canEdit} onNew={openNew} onOpen={setSelected} onExport={() => exportCsv(filtered)} />}
          {effectivePage === "reports" && <Reports txs={txs} departments={departments} onExport={() => exportCsv(txs)} orgName={settings.header || settings.org} />}
          {effectivePage === "users" && <Users currentUserId={account.id} notify={notify} />}
          {effectivePage === "settings" && <Settings notify={notify} onSaved={setSettings} />}
        </main>
      </div>

      {formTarget && (
        <TxFormDialog
          initial={formTarget === "new" ? undefined : formTarget}
          departments={departments}
          currentUserName={account.name}
          saving={createTx.isPending || updateTx.isPending}
          onClose={closeForm}
          onSave={saveTx}
        />
      )}
      {selected && !formTarget && (
        <TxDetailDialog
          tx={selected}
          canEdit={canEdit}
          canDelete={isAdmin}
          onClose={closeDetail}
          onEdit={() => setFormTarget(selected)}
          onArchive={() => setConfirm({ kind: "archive", tx: selected })}
          onDelete={() => setConfirm({ kind: "delete", tx: selected })}
        />
      )}
      {confirm && (
        <ConfirmDialog
          title={confirm.kind === "archive" ? "أرشفة هذه المعاملة؟" : "حذف هذه المعاملة؟"}
          body={confirm.kind === "archive"
            ? <p>ستُعلَّم المعاملة <strong>{confirm.tx.number}</strong> كمكتملة وتُحفظ في الأرشيف. يمكنك فتحها وتعديلها لاحقًا.</p>
            : <p>ستُنقل المعاملة <strong>{confirm.tx.number}</strong> إلى سلة المحذوفات ولن تظهر في القوائم. يستطيع مدير النظام استعادتها لاحقًا.</p>}
          confirmLabel={confirm.kind === "archive" ? "نعم، أرشفها" : "نعم، احذفها"}
          tone={confirm.kind === "archive" ? "default" : "danger"}
          busy={archiveTx.isPending || deleteTx.isPending}
          onConfirm={runConfirm}
          onCancel={closeConfirm}
        />
      )}
      <Toast message={toast.message} tone={toast.tone} />
    </div>
  );
}

function AuthGate() {
  const utils = trpc.useUtils();
  const me = trpc.auth.localMe.useQuery(undefined, { retry: false });
  const [account, setAccount] = useState<Account | null>(null);
  const orgName = loadSettings().org;
  if (me.isLoading) return <div className="full-loading" dir="rtl"><span className="brand-mark"><Archive size={22} aria-hidden="true" /></span><span>جارٍ تحميل نظام الأرشفة…</span></div>;
  const current = account ?? (me.data as Account | null | undefined) ?? null;
  if (current) return <AppShell key={current.id} account={current} onSignedOut={() => { setAccount(null); utils.auth.localMe.setData(undefined, null); utils.auth.localMe.invalidate(); }} />;
  return <Login orgName={orgName} onLoggedIn={(next) => { setAccount(next); utils.auth.localMe.setData(undefined, next); }} />;
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="light" switchable>
      <AuthGate />
    </ThemeProvider>
  );
}
