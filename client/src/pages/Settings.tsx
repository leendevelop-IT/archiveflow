import { useRef, useState } from "react";
import { Bell, Building2, Database, Download, Hash, Layers, Save, ShieldCheck, Upload } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { DEFAULT_DEPARTMENTS, listFromText, loadSettings, SETTINGS_KEY, type ArchiveSettings } from "@/lib/archive";
import { formatDateTime, setAlertDays, setDateFormat } from "@/lib/format";
import { Field, PageHeader, SectionHead } from "@/components/ui";

const TABS = [
  { key: "org", label: "بيانات الجهة", icon: Building2 },
  { key: "numbering", label: "الترقيم والتواريخ", icon: Hash },
  { key: "departments", label: "الأقسام", icon: Layers },
  { key: "alerts", label: "التنبيهات", icon: Bell },
  { key: "backup", label: "النسخ الاحتياطي", icon: Database },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export function Settings({ notify, onSaved }: { notify: (message: string, tone?: "success" | "error") => void; onSaved: (settings: ArchiveSettings) => void }) {
  const [tab, setTab] = useState<TabKey>("org");
  const [settings, setSettings] = useState<ArchiveSettings>(loadSettings);
  const [dirty, setDirty] = useState(false);
  const backups = trpc.backups.list.useQuery(undefined, { retry: false });
  const createBackup = trpc.backups.create.useMutation();
  const restoreBackup = trpc.backups.restore.useMutation();
  const fileInput = useRef<HTMLInputElement>(null);

  const update = <K extends keyof ArchiveSettings>(key: K, value: ArchiveSettings[K]) => { setSettings((prev) => ({ ...prev, [key]: value })); setDirty(true); };

  const save = () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    setDateFormat(settings.dateFormat);
    setAlertDays(Number(settings.alertDays) || 3);
    setDirty(false);
    onSaved(settings);
    notify("تم حفظ الإعدادات");
  };

  const downloadBackup = () => createBackup.mutate(undefined, {
    onSuccess: (result) => {
      const blob = new Blob([result.payload], { type: "application/json;charset=utf-8" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = result.fileName;
      link.click();
      URL.revokeObjectURL(link.href);
      backups.refetch();
      notify(`تم إنشاء نسخة تحتوي على ${result.transactionCount} معاملة وبدأ تنزيلها`);
    },
    onError: () => notify("تعذر إنشاء النسخة الاحتياطية", "error"),
  });

  const importBackup = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(String(reader.result));
        if (!Array.isArray(payload.transactions)) throw new Error("invalid");
        restoreBackup.mutate(payload, {
          onSuccess: (count) => notify(count ? `تمت استعادة ${count} معاملة لم تكن موجودة` : "كل المعاملات في هذه النسخة موجودة مسبقًا"),
          onError: () => notify("تعذر استعادة النسخة الاحتياطية", "error"),
        });
      } catch {
        notify("هذا الملف ليس نسخة احتياطية صالحة", "error");
      }
      if (fileInput.current) fileInput.current.value = "";
    };
    reader.readAsText(file);
  };

  const digits = Math.min(8, Math.max(3, Number(settings.digits) || 5));
  const numberPreview = `${settings.prefix || "بلد"}/وارد/${settings.year || new Date().getFullYear()}/${"1".padStart(digits, "0")}`;

  return (
    <>
      <PageHeader
        title="الإعدادات"
        description="اسم الجهة وطريقة ترقيم المعاملات والأقسام والتنبيهات. تُحفظ على هذا الجهاز."
        action={tab !== "backup" && <button type="button" className="btn btn-primary btn-lg" onClick={save} disabled={!dirty}><Save size={19} aria-hidden="true" /> حفظ التغييرات</button>}
      />

      <div className="settings-layout">
        <nav className="settings-nav" aria-label="أقسام الإعدادات">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} type="button" className={tab === key ? "active" : ""} aria-current={tab === key ? "page" : undefined} onClick={() => setTab(key)}>
              <Icon size={18} aria-hidden="true" />{label}
            </button>
          ))}
        </nav>

        <div className="settings-content">
          {tab === "org" && (
            <section className="card">
              <SectionHead title="بيانات الجهة" description="يظهر الاسم في أعلى النظام وفي رأس التقارير المطبوعة." />
              <div className="form-grid">
                <Field label="اسم الجهة" className="span-2">{({ id }) => <input id={id} value={settings.org} onChange={(e) => update("org", e.target.value)} />}</Field>
                <Field label="البريد الرسمي">{({ id }) => <input id={id} dir="ltr" type="email" value={settings.email} onChange={(e) => update("email", e.target.value)} placeholder="info@example.gov.sa" />}</Field>
                <Field label="رقم الهاتف">{({ id }) => <input id={id} dir="ltr" type="tel" value={settings.phone} onChange={(e) => update("phone", e.target.value)} placeholder="920000000" />}</Field>
                <Field label="عنوان رأس التقرير" className="span-2" hint="السطر الذي يُطبع أعلى كل تقرير.">{({ id, describedBy }) => <input id={id} aria-describedby={describedBy} value={settings.header} onChange={(e) => update("header", e.target.value)} />}</Field>
              </div>
            </section>
          )}

          {tab === "numbering" && (
            <section className="card">
              <SectionHead title="الترقيم والتواريخ" description="يُنشأ رقم كل معاملة جديدة تلقائيًا من هذه القيم." />
              <div className="number-preview">
                <span>شكل الرقم القادم</span>
                <strong className="ref-number ref-number-lg">{numberPreview}</strong>
              </div>
              <div className="form-grid">
                <Field label="البادئة" hint="اختصار الجهة، مثل: بلد">{({ id, describedBy }) => <input id={id} aria-describedby={describedBy} value={settings.prefix} onChange={(e) => update("prefix", e.target.value)} />}</Field>
                <Field label="السنة">{({ id }) => <input id={id} dir="ltr" inputMode="numeric" value={settings.year} onChange={(e) => update("year", e.target.value.replace(/\D/g, "").slice(0, 4))} />}</Field>
                <Field label="عدد خانات الرقم التسلسلي" hint="من 3 إلى 8 خانات">{({ id, describedBy }) => <input id={id} aria-describedby={describedBy} dir="ltr" type="number" min={3} max={8} value={settings.digits} onChange={(e) => update("digits", e.target.value)} />}</Field>
                <Field label="طريقة عرض التواريخ">
                  {({ id }) => (
                    <select id={id} value={settings.dateFormat} onChange={(e) => update("dateFormat", e.target.value as ArchiveSettings["dateFormat"])}>
                      <option value="ميلادي">ميلادي</option>
                      <option value="هجري">هجري</option>
                      <option value="هجري وميلادي">ميلادي في الجداول، وكلاهما في التفاصيل</option>
                    </select>
                  )}
                </Field>
              </div>
            </section>
          )}

          {tab === "departments" && (
            <section className="card">
              <SectionHead title="الأقسام" description="تظهر هذه القائمة عند تسجيل معاملة وفي التصفية. اكتب كل قسم في سطر مستقل." />
              <Field label="قائمة الأقسام">
                {({ id }) => <textarea id={id} rows={8} value={settings.departments} onChange={(e) => update("departments", e.target.value)} />}
              </Field>
              <p className="muted">الأقسام الحالية: {listFromText(settings.departments, DEFAULT_DEPARTMENTS).join("، ")}</p>
            </section>
          )}

          {tab === "alerts" && (
            <section className="card">
              <SectionHead title="التنبيهات" description="متى تُعدّ المعاملة «مستحقة قريبًا» وتظهر في لوحة المتابعة." />
              <Field label="التنبيه قبل موعد الاستحقاق بـ" hint="عدد الأيام. المعاملات التي يحل موعدها خلال هذه المدة تظهر باللون الكهرماني.">
                {({ id, describedBy }) => (
                  <div className="input-with-unit">
                    <input id={id} aria-describedby={describedBy} dir="ltr" type="number" min={1} max={30} value={settings.alertDays} onChange={(e) => update("alertDays", e.target.value)} />
                    <span>أيام</span>
                  </div>
                )}
              </Field>
            </section>
          )}

          {tab === "backup" && (
            <section className="card">
              <SectionHead title="النسخ الاحتياطي والاستعادة" description="احفظ نسخة من كل المعاملات على جهازك، واستعدها متى احتجت. الاستعادة تضيف المعاملات الناقصة فقط ولا تحذف شيئًا." />
              <div className="backup-actions">
                <button type="button" className="btn btn-primary" onClick={downloadBackup} disabled={createBackup.isPending}><Download size={18} aria-hidden="true" /> {createBackup.isPending ? "جارٍ إنشاء النسخة…" : "إنشاء نسخة وتنزيلها"}</button>
                <label className="btn btn-outline">
                  <Upload size={18} aria-hidden="true" /> {restoreBackup.isPending ? "جارٍ الاستعادة…" : "استعادة من ملف"}
                  <input ref={fileInput} type="file" accept="application/json,.json" className="sr-only" onChange={(e) => importBackup(e.target.files?.[0])} disabled={restoreBackup.isPending} />
                </label>
              </div>
              <div className="note">
                <ShieldCheck size={18} aria-hidden="true" />
                <span>يُفضّل الاحتفاظ بنسخة على الخادم ونسخة على جهازك ونسخة خارجية، ولا تعتمد على ملف واحد.</span>
              </div>
              <h3 className="list-title">النسخ السابقة</h3>
              {backups.isLoading ? (
                <p className="muted">جارٍ التحميل…</p>
              ) : (backups.data ?? []).length ? (
                <ul className="plain-list">
                  {(backups.data ?? []).map((backup: { id: number; fileName: string; transactionCount: number; createdAt: string | Date; status: string }) => (
                    <li key={backup.id} className="plain-row">
                      <Database size={18} aria-hidden="true" />
                      <div>
                        <strong dir="ltr">{backup.fileName}</strong>
                        <small>{backup.transactionCount} معاملة · {formatDateTime(backup.createdAt)}</small>
                      </div>
                      <span className={`badge ${backup.status === "ready" ? "badge-done" : "badge-late"}`}>{backup.status === "ready" ? "جاهزة" : "فشلت"}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">لم تُنشأ نسخ احتياطية بعد.</p>
              )}
            </section>
          )}
        </div>
      </div>
    </>
  );
}
