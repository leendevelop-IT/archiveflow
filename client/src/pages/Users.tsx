import { useState, type FormEvent } from "react";
import { Pencil, Plus, ShieldCheck, Trash2, UserRound, UsersRound } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { initialsOf, ROLE_HINTS, ROLE_LABELS, ROLE_ORDER, type Account, type AccountRole } from "@/lib/archive";
import { ConfirmDialog, Dialog, EmptyState, Field, PageHeader } from "@/components/ui";

type Draft = { name: string; username: string; password: string; role: AccountRole; status: "active" | "suspended" };
const EMPTY_DRAFT: Draft = { name: "", username: "", password: "", role: "registration", status: "active" };

function RoleChoices({ value, onChange }: { value: AccountRole; onChange: (role: AccountRole) => void }) {
  return (
    <fieldset className="choice-group">
      <legend>الصلاحية</legend>
      <div className="choice-list">
        {ROLE_ORDER.map((role) => (
          <label key={role} className={`choice-card ${value === role ? "selected" : ""}`}>
            <input type="radio" name="role" value={role} checked={value === role} onChange={() => onChange(role)} />
            <ShieldCheck size={18} aria-hidden="true" />
            <span><strong>{ROLE_LABELS[role]}</strong><small>{ROLE_HINTS[role]}</small></span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function Users({ currentUserId, notify }: { currentUserId: number; notify: (message: string, tone?: "success" | "error") => void }) {
  const utils = trpc.useUtils();
  const accounts = trpc.auth.accounts.useQuery(undefined, { retry: false });
  const createAccount = trpc.auth.createAccount.useMutation();
  const updateAccount = trpc.auth.updateAccount.useMutation();
  const deleteAccount = trpc.auth.deleteAccount.useMutation();
  const [dialog, setDialog] = useState<"new" | Account | null>(null);
  const [removing, setRemoving] = useState<Account | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});

  const openNew = () => { setDraft(EMPTY_DRAFT); setErrors({}); setDialog("new"); };
  const openEdit = (account: Account) => { setDraft({ name: account.name, username: account.username, password: "", role: account.role, status: account.status }); setErrors({}); setDialog(account); };
  const close = () => setDialog(null);
  const refresh = () => utils.auth.accounts.invalidate();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next: typeof errors = {};
    if (draft.name.trim().length < 2) next.name = "اكتب الاسم الكامل للموظف.";
    if (dialog === "new") {
      if (!/^[a-zA-Z0-9._-]{3,}$/.test(draft.username.trim())) next.username = "اسم الدخول بأحرف إنجليزية أو أرقام، 3 أحرف على الأقل.";
      if (draft.password.length < 8) next.password = "كلمة المرور 8 أحرف على الأقل.";
    } else if (draft.password && draft.password.length < 8) {
      next.password = "كلمة المرور الجديدة 8 أحرف على الأقل.";
    }
    setErrors(next);
    if (Object.keys(next).length) return;
    try {
      if (dialog === "new") {
        await createAccount.mutateAsync({ name: draft.name.trim(), username: draft.username.trim(), password: draft.password, role: draft.role, status: draft.status });
        notify(`تمت إضافة ${draft.name.trim()} وبإمكانه الدخول الآن`);
      } else if (dialog) {
        await updateAccount.mutateAsync({ id: dialog.id, name: draft.name.trim(), role: draft.role, status: draft.status, password: draft.password || undefined });
        notify(draft.password ? "تم حفظ التغييرات وتغيير كلمة المرور" : "تم حفظ التغييرات");
      }
      await refresh();
      close();
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      notify(/duplicate/i.test(message) ? "اسم الدخول مستخدم من قبل، اختر اسمًا آخر" : message || "تعذر الحفظ، حاول مرة أخرى", "error");
    }
  };

  const confirmRemove = async () => {
    if (!removing) return;
    try {
      await deleteAccount.mutateAsync({ id: removing.id });
      notify(`تم حذف حساب ${removing.name}`);
      await refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "تعذر حذف الحساب", "error");
    } finally {
      setRemoving(null);
    }
  };

  const list = (accounts.data ?? []) as Account[];

  return (
    <>
      <PageHeader
        title="المستخدمون"
        description="من يستطيع الدخول إلى النظام، وما الذي يحق له فعله."
        action={<button type="button" className="btn btn-primary btn-lg" onClick={openNew}><Plus size={20} aria-hidden="true" /> مستخدم جديد</button>}
      />

      <section className="card">
        {accounts.isLoading ? (
          <p className="muted loading-text">جارٍ تحميل المستخدمين…</p>
        ) : accounts.isError ? (
          <EmptyState icon={<UsersRound size={26} />} title="تعذر تحميل المستخدمين" text="تأكد من اتصالك بالخادم ثم حاول مرة أخرى." action={<button type="button" className="btn btn-outline" onClick={() => accounts.refetch()}>إعادة المحاولة</button>} />
        ) : list.length === 0 ? (
          <EmptyState icon={<UsersRound size={26} />} title="لا يوجد مستخدمون بعد" text="أضف حسابًا لكل موظف يحتاج إلى الدخول." action={<button type="button" className="btn btn-primary" onClick={openNew}><Plus size={18} aria-hidden="true" /> مستخدم جديد</button>} />
        ) : (
          <div className="table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th scope="col">المستخدم</th>
                  <th scope="col">الصلاحية</th>
                  <th scope="col">الحالة</th>
                  <th scope="col"><span className="sr-only">إجراءات</span></th>
                </tr>
              </thead>
              <tbody>
                {list.map((account) => (
                  <tr key={account.id}>
                    <td data-label="المستخدم">
                      <div className="person">
                        <span className="avatar" aria-hidden="true">{initialsOf(account.name) || <UserRound size={16} />}</span>
                        <div>
                          <strong>{account.name}{account.id === currentUserId && <span className="you-tag">أنت</span>}</strong>
                          <small dir="ltr">@{account.username}</small>
                        </div>
                      </div>
                    </td>
                    <td data-label="الصلاحية">
                      <strong className="role-name">{ROLE_LABELS[account.role] ?? account.role}</strong>
                      <small>{ROLE_HINTS[account.role]}</small>
                    </td>
                    <td data-label="الحالة"><span className={`badge ${account.status === "active" ? "badge-done" : "badge-muted"}`}>{account.status === "active" ? "نشط" : "موقوف"}</span></td>
                    <td className="row-action">
                      <div className="row-actions">
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(account)}><Pencil size={16} aria-hidden="true" /> تعديل</button>
                        {account.id !== currentUserId && (
                          <button type="button" className="btn btn-ghost btn-sm btn-danger-text" onClick={() => setRemoving(account)}><Trash2 size={16} aria-hidden="true" /> حذف</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {dialog && (
        <Dialog
          title={dialog === "new" ? "مستخدم جديد" : `تعديل حساب ${dialog.name}`}
          subtitle={dialog === "new" ? "سيستخدم الموظف اسم الدخول وكلمة المرور المؤقتة للدخول أول مرة." : undefined}
          onClose={close}
          footer={
            <>
              <button type="button" className="btn btn-outline" onClick={close}>إلغاء</button>
              <button type="submit" form="user-form" className="btn btn-primary" disabled={createAccount.isPending || updateAccount.isPending}>{createAccount.isPending || updateAccount.isPending ? "جارٍ الحفظ…" : dialog === "new" ? "إضافة المستخدم" : "حفظ التغييرات"}</button>
            </>
          }
        >
          <form id="user-form" className="form" onSubmit={submit} noValidate>
            <div className="form-grid">
              <Field label="الاسم الكامل" required error={errors.name} className="span-2">
                {({ id, describedBy, invalid }) => <input id={id} aria-describedby={describedBy} aria-invalid={invalid} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} autoComplete="off" />}
              </Field>
              {dialog === "new" && (
                <>
                  <Field label="اسم الدخول" required error={errors.username} hint="بالأحرف الإنجليزية، مثل: ahmad">
                    {({ id, describedBy, invalid }) => <input id={id} aria-describedby={describedBy} aria-invalid={invalid} dir="ltr" value={draft.username} onChange={(e) => setDraft({ ...draft, username: e.target.value })} autoComplete="off" />}
                  </Field>
                  <Field label="كلمة مرور مؤقتة" required error={errors.password} hint="8 أحرف على الأقل">
                    {({ id, describedBy, invalid }) => <input id={id} aria-describedby={describedBy} aria-invalid={invalid} dir="ltr" type="password" value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} autoComplete="new-password" />}
                  </Field>
                </>
              )}
              {dialog !== "new" && (
                <Field label="كلمة مرور جديدة" error={errors.password} hint="اتركها فارغة إن لم ترغب في تغييرها. سيُطلب من الموظف الدخول من جديد." className="span-2">
                  {({ id, describedBy, invalid }) => <input id={id} aria-describedby={describedBy} aria-invalid={invalid} dir="ltr" type="password" value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} autoComplete="new-password" />}
                </Field>
              )}
            </div>
            <RoleChoices value={draft.role} onChange={(role) => setDraft({ ...draft, role })} />
            <Field label="حالة الحساب" hint="الحساب الموقوف لا يستطيع الدخول حتى تعيد تفعيله.">
              {({ id, describedBy }) => (
                <select id={id} aria-describedby={describedBy} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as Draft["status"] })} disabled={dialog !== "new" && dialog.id === currentUserId}>
                  <option value="active">نشط</option>
                  <option value="suspended">موقوف</option>
                </select>
              )}
            </Field>
          </form>
        </Dialog>
      )}

      {removing && (
        <ConfirmDialog
          title={`حذف حساب ${removing.name}؟`}
          body={<p>لن يستطيع الدخول إلى النظام بعد الآن. المعاملات التي سجّلها تبقى كما هي.</p>}
          confirmLabel="نعم، احذف الحساب"
          tone="danger"
          busy={deleteAccount.isPending}
          onConfirm={confirmRemove}
          onCancel={() => setRemoving(null)}
        />
      )}
    </>
  );
}
