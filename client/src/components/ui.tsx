import { useEffect, useId, useRef, type ReactNode } from "react";
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, CheckCircle2, Paperclip, X } from "lucide-react";
import { PRIORITY_SLUG, STATUS_SLUG, TYPE_SLUG, type TxPriority, type TxStatus, type TxType } from "@/lib/archive";
import { dueInfo, type DueInfo } from "@/lib/format";

/* ---------- Page scaffolding ---------- */

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="page-header-action">{action}</div>}
    </div>
  );
}

export function SectionHead({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="section-head">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

/* ---------- Small data chips ---------- */

export function StatusBadge({ status }: { status: TxStatus }) {
  return <span className={`badge badge-${STATUS_SLUG[status] ?? "new"}`}>{status}</span>;
}

export function TypeChip({ type, withIcon = true }: { type: TxType; withIcon?: boolean }) {
  const slug = TYPE_SLUG[type] ?? "incoming";
  const Icon = slug === "incoming" ? ArrowDownToLine : slug === "outgoing" ? ArrowUpFromLine : ArrowLeftRight;
  return (
    <span className={`type-chip type-${slug}`}>
      {withIcon && <Icon size={15} aria-hidden="true" />}
      {type}
    </span>
  );
}

export function PriorityTag({ priority }: { priority: TxPriority }) {
  return (
    <span className={`priority priority-${PRIORITY_SLUG[priority] ?? "medium"}`}>
      <i aria-hidden="true" />
      {priority}
    </span>
  );
}

/** The transaction reference number, set like a registry stamp. */
export function RefNumber({ value, className = "" }: { value: string; className?: string }) {
  return <span className={`ref-number ${className}`} dir="auto">{value}</span>;
}

export function DueLabel({ info }: { info: DueInfo }) {
  return <span className={`due due-${info.tone}`}>{info.label}</span>;
}

export function DueCell({ due, status }: { due: string; status: TxStatus }) {
  return <DueLabel info={dueInfo({ due, status })} />;
}

export function AttachmentName({ name }: { name: string }) {
  if (!name) return <span className="muted">لا يوجد مرفق</span>;
  return (
    <span className="attachment-name">
      <Paperclip size={15} aria-hidden="true" />
      <span dir="auto">{name}</span>
    </span>
  );
}

/* ---------- Forms ---------- */

export function Field({ label, hint, error, required, children, className = "" }: { label: string; hint?: string; error?: string; required?: boolean; children: (ids: { id: string; labelId: string; describedBy?: string; invalid: boolean }) => ReactNode; className?: string }) {
  const id = useId();
  const labelId = `${id}-label`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={`field ${error ? "field-invalid" : ""} ${className}`}>
      <label htmlFor={id} id={labelId}>
        {label}
        {required && <span className="field-required" aria-hidden="true"> *</span>}
      </label>
      {children({ id, labelId, describedBy, invalid: Boolean(error) })}
      {error ? <p className="field-error" id={errorId} role="alert">{error}</p> : hint ? <p className="field-hint" id={hintId}>{hint}</p> : null}
    </div>
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (next: boolean) => void; label: string; hint?: string }) {
  const id = useId();
  return (
    <div className="toggle-row">
      <div>
        <label htmlFor={id}><strong>{label}</strong></label>
        {hint && <small>{hint}</small>}
      </div>
      <button id={id} type="button" role="switch" aria-checked={checked} className={`switch ${checked ? "on" : ""}`} onClick={() => onChange(!checked)}>
        <i aria-hidden="true" />
      </button>
    </div>
  );
}

/* ---------- Dialogs ---------- */

type DialogProps = {
  title: string;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  role?: "dialog" | "alertdialog";
  closeLabel?: string;
  className?: string;
};

// Dialogs that are open right now, newest last. Only the newest one reacts to Escape and traps Tab.
const openDialogs: symbol[] = [];

export function Dialog({ title, subtitle, onClose, children, footer, size = "md", role = "dialog", closeLabel = "إغلاق", className = "" }: DialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const token = Symbol("dialog");
    openDialogs.push(token);
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (openDialogs.length === 1) document.body.style.overflow = "hidden";
    // Print styles use this to print only the open dialog (e.g. a transaction's details).
    document.body.classList.add("has-dialog");
    const focusTarget = panelRef.current?.querySelector<HTMLElement>("input:not([type=hidden]):not([type=radio]):not([type=file]), select, textarea, [data-autofocus], button:not(.dialog-close)");
    (focusTarget ?? panelRef.current)?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (openDialogs[openDialogs.length - 1] !== token) return;
      if (event.key === "Escape") { event.preventDefault(); onCloseRef.current(); }
      if (event.key === "Tab" && panelRef.current) {
        const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>("a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])"));
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      const index = openDialogs.indexOf(token);
      if (index >= 0) openDialogs.splice(index, 1);
      if (openDialogs.length === 0) {
        document.body.style.overflow = "";
        document.body.classList.remove("has-dialog");
      }
      // Give focus back to what opened this dialog, unless another dialog has taken over by then.
      const opener = openerRef.current;
      window.requestAnimationFrame(() => {
        if (document.querySelector(".dialog-backdrop")) return;
        const active = document.activeElement;
        if (active && active !== document.body && active !== document.documentElement) return; // another dialog already restored focus
        if (opener?.isConnected) opener.focus({ preventScroll: true });
        else document.getElementById("main")?.focus({ preventScroll: true });
      });
    };
    // Runs once per open: everything that can change (onClose) is read through the ref above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={panelRef} className={`dialog dialog-${size} ${className}`} role={role} aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <div className="dialog-head">
          <div className="dialog-titles">
            <h2 id={titleId}>{title}</h2>
            {subtitle && <div className="dialog-subtitle">{subtitle}</div>}
          </div>
          <button type="button" className="icon-btn dialog-close" onClick={onClose} aria-label={closeLabel} title={closeLabel}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="dialog-body">{children}</div>
        {footer && <div className="dialog-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, body, confirmLabel, cancelLabel = "تراجع", tone = "default", busy, onConfirm, onCancel }: { title: string; body: ReactNode; confirmLabel: string; cancelLabel?: string; tone?: "default" | "danger"; busy?: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Dialog
      title={title}
      onClose={onCancel}
      size="sm"
      role="alertdialog"
      className={`confirm confirm-${tone}`}
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onCancel} disabled={busy}>{cancelLabel}</button>
          <button type="button" className={`btn ${tone === "danger" ? "btn-danger" : "btn-primary"}`} onClick={onConfirm} disabled={busy} data-autofocus>
            {busy ? "لحظة…" : confirmLabel}
          </button>
        </>
      }
    >
      <div className="confirm-body">
        <span className={`confirm-icon confirm-icon-${tone}`} aria-hidden="true">{tone === "danger" ? <AlertTriangle size={22} /> : <CheckCircle2 size={22} />}</span>
        <div>{body}</div>
      </div>
    </Dialog>
  );
}

/* ---------- Feedback ---------- */

export function Toast({ message, tone = "success" }: { message: string; tone?: "success" | "error" }) {
  if (!message) return null;
  return (
    <div className={`toast toast-${tone}`} role="status" aria-live="polite">
      {tone === "success" ? <CheckCircle2 size={20} aria-hidden="true" /> : <AlertTriangle size={20} aria-hidden="true" />}
      <span>{message}</span>
    </div>
  );
}
