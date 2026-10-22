import { useMemo, useState, type FormEvent } from "react";
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, Paperclip, Trash2, Upload } from "lucide-react";
import { TX_PRIORITIES, TX_STATUSES, TX_TYPES, TYPE_HINTS, type Tx, type TxForm, type TxPriority, type TxStatus, type TxType } from "@/lib/archive";
import { addDaysIso, todayIso } from "@/lib/format";
import { Dialog, Field } from "./ui";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const TYPE_ICONS: Record<TxType, typeof ArrowDownToLine> = { "واردة": ArrowDownToLine, "صادرة": ArrowUpFromLine, "داخلية": ArrowLeftRight };

type Errors = Partial<Record<"subject" | "party" | "received" | "due" | "attachment", string>>;

export function TxFormDialog({ initial, departments, currentUserName, saving, onClose, onSave }: {
  initial?: Tx;
  departments: string[];
  currentUserName: string;
  saving: boolean;
  onClose: () => void;
  onSave: (form: TxForm) => void;
}) {
  const editing = Boolean(initial);
  const [form, setForm] = useState<TxForm>(() => initial
    ? { ...initial }
    : { type: "واردة", subject: "", party: "", received: todayIso(), due: addDaysIso(todayIso(), 7), priority: "متوسطة", status: "جديدة", department: departments[0] ?? "الإدارة العامة", assignee: currentUserName, notes: "", attachment: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [fileLabel, setFileLabel] = useState(initial?.attachment ?? "");

  const update = <K extends keyof TxForm>(key: K, value: TxForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key in errors) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const partyLabel = form.type === "واردة" ? "الجهة المرسلة" : form.type === "صادرة" ? "الجهة المستقبلة" : "الإدارة المعنية";
  const departmentOptions = useMemo(() => (form.department && !departments.includes(form.department) ? [form.department, ...departments] : departments), [departments, form.department]);

  const handleFile = (file?: File) => {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) { setErrors((prev) => ({ ...prev, attachment: "حجم الملف أكبر من 10 ميجابايت. اختر ملفًا أصغر." })); return; }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, attachment: file.name, attachmentBase64: String(reader.result).split(",")[1] || "", attachmentMime: file.type || "application/octet-stream", attachmentSize: file.size }));
      setFileLabel(file.name);
      setErrors((prev) => ({ ...prev, attachment: undefined }));
    };
    reader.readAsDataURL(file);
  };
  const clearFile = () => { setForm((prev) => ({ ...prev, attachment: "", attachmentBase64: undefined, attachmentMime: undefined, attachmentSize: undefined })); setFileLabel(""); };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next: Errors = {};
    if (!form.subject.trim()) next.subject = "اكتب موضوع المعاملة.";
    if (!form.party.trim()) next.party = `اكتب اسم ${partyLabel === "الإدارة المعنية" ? "الإدارة" : "الجهة"}.`;
    if (!form.received) next.received = "اختر تاريخ الورود.";
    if (!form.due) next.due = "اختر موعد الاستحقاق.";
    else if (form.received && form.due < form.received) next.due = "موعد الاستحقاق يجب أن يكون بعد تاريخ الورود.";
    setErrors(next);
    if (Object.keys(next).length) {
      const firstInvalid = (event.currentTarget as HTMLFormElement).querySelector<HTMLElement>("[aria-invalid='true']");
      firstInvalid?.focus();
      return;
    }
    onSave({ ...form, subject: form.subject.trim(), party: form.party.trim(), assignee: form.assignee.trim() || currentUserName });
  };

  return (
    <Dialog
      title={editing ? "تعديل المعاملة" : "معاملة جديدة"}
      subtitle={editing ? <span className="ref-number">{initial?.number}</span> : "املأ البيانات الأساسية، ويُنشأ رقم المعاملة تلقائيًا عند الحفظ."}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>إلغاء</button>
          <button type="submit" form="tx-form" className="btn btn-primary" disabled={saving}>{saving ? "جارٍ الحفظ…" : editing ? "حفظ التعديلات" : "حفظ المعاملة"}</button>
        </>
      }
    >
      <form id="tx-form" className="form" onSubmit={submit} noValidate>
        <fieldset className="choice-group">
          <legend>نوع المعاملة</legend>
          <div className="choice-cards">
            {TX_TYPES.map((type) => {
              const Icon = TYPE_ICONS[type];
              return (
                <label key={type} className={`choice-card type-${type === "واردة" ? "incoming" : type === "صادرة" ? "outgoing" : "internal"} ${form.type === type ? "selected" : ""}`}>
                  <input type="radio" name="type" value={type} checked={form.type === type} onChange={() => update("type", type)} />
                  <Icon size={20} aria-hidden="true" />
                  <span><strong>{type}</strong><small>{TYPE_HINTS[type]}</small></span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="form-grid">
          <Field label="الموضوع" required error={errors.subject} className="span-2">
            {({ id, describedBy, invalid }) => <input id={id} aria-describedby={describedBy} aria-invalid={invalid} value={form.subject} onChange={(e) => update("subject", e.target.value)} placeholder="مثال: طلب اعتماد مخطط الحديقة العامة" autoComplete="off" />}
          </Field>
          <Field label={partyLabel} required error={errors.party}>
            {({ id, describedBy, invalid }) => <input id={id} aria-describedby={describedBy} aria-invalid={invalid} value={form.party} onChange={(e) => update("party", e.target.value)} placeholder="اسم الجهة" autoComplete="off" />}
          </Field>
          <Field label="القسم المسؤول">
            {({ id }) => (
              <select id={id} value={form.department} onChange={(e) => update("department", e.target.value)}>
                {departmentOptions.map((d) => <option key={d}>{d}</option>)}
              </select>
            )}
          </Field>
          <Field label="تاريخ الورود" required error={errors.received}>
            {({ id, describedBy, invalid }) => <input id={id} aria-describedby={describedBy} aria-invalid={invalid} type="date" value={form.received} onChange={(e) => update("received", e.target.value)} />}
          </Field>
          <Field label="موعد الاستحقاق" required error={errors.due} hint="آخر موعد يجب إنهاء المعاملة قبله.">
            {({ id, describedBy, invalid }) => <input id={id} aria-describedby={describedBy} aria-invalid={invalid} type="date" value={form.due} min={form.received || undefined} onChange={(e) => update("due", e.target.value)} />}
          </Field>
          <Field label="الأولوية">
            {({ id, labelId }) => (
              <div id={id} className="segmented" role="radiogroup" aria-labelledby={labelId}>
                {TX_PRIORITIES.map((p) => (
                  <button key={p} type="button" role="radio" aria-checked={form.priority === p} className={`priority-${p === "عالية" ? "high" : p === "متوسطة" ? "medium" : "low"} ${form.priority === p ? "selected" : ""}`} onClick={() => update("priority", p as TxPriority)}>
                    <i aria-hidden="true" />{p}
                  </button>
                ))}
              </div>
            )}
          </Field>
          {editing ? (
            <Field label="الحالة">
              {({ id }) => (
                <select id={id} value={form.status} onChange={(e) => update("status", e.target.value as TxStatus)}>
                  {TX_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              )}
            </Field>
          ) : (
            <Field label="الموظف المسؤول" hint="تُسجَّل المعاملة باسمك، ويمكنك كتابة اسم زميل بدلًا منك.">
              {({ id, describedBy }) => <input id={id} aria-describedby={describedBy} value={form.assignee} onChange={(e) => update("assignee", e.target.value)} />}
            </Field>
          )}
          {editing && (
            <Field label="الموظف المسؤول">
              {({ id }) => <input id={id} value={form.assignee} onChange={(e) => update("assignee", e.target.value)} />}
            </Field>
          )}
          <Field label="ملاحظات" className="span-2" hint="اختياري — أي تعليمات أو تفاصيل تساعد على المتابعة.">
            {({ id, describedBy }) => <textarea id={id} aria-describedby={describedBy} rows={3} value={form.notes} onChange={(e) => update("notes", e.target.value)} />}
          </Field>
        </div>

        <div className={`field span-2 ${errors.attachment ? "field-invalid" : ""}`}>
          <span className="field-label-text" id="attachment-label">المرفق</span>
          {fileLabel ? (
            <div className="file-chosen">
              <Paperclip size={18} aria-hidden="true" />
              <span dir="auto">{fileLabel}</span>
              <label className="btn btn-ghost btn-sm">
                <Upload size={16} aria-hidden="true" /> استبدال
                <input type="file" className="sr-only" onChange={(e) => handleFile(e.target.files?.[0])} />
              </label>
              <button type="button" className="btn btn-ghost btn-sm btn-danger-text" onClick={clearFile}><Trash2 size={16} aria-hidden="true" /> إزالة</button>
            </div>
          ) : (
            <label className="file-drop">
              <input type="file" className="sr-only" aria-labelledby="attachment-label" onChange={(e) => handleFile(e.target.files?.[0])} />
              <Upload size={22} aria-hidden="true" />
              <strong>اختر ملفًا من جهازك</strong>
              <small>PDF أو Word أو صورة — بحد أقصى 10 ميجابايت</small>
            </label>
          )}
          {errors.attachment && <p className="field-error" role="alert">{errors.attachment}</p>}
        </div>
      </form>
    </Dialog>
  );
}
