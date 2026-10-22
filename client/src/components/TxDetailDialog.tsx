import { Archive, Pencil, Printer, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import type { Tx } from "@/lib/archive";
import { dueInfo, formatDateLong, formatDateTime } from "@/lib/format";
import { AttachmentName, Dialog, DueLabel, PriorityTag, RefNumber, StatusBadge, TypeChip } from "./ui";

const EVENT_LABELS: Record<string, string> = { created: "تم تسجيل المعاملة", updated: "تم تحديث البيانات", archived: "تمت الأرشفة", deleted: "نُقلت إلى سلة المحذوفات", restored: "تمت الاستعادة" };

export function TxDetailDialog({ tx, canEdit, canDelete, onClose, onEdit, onArchive, onDelete }: {
  tx: Tx;
  canEdit: boolean;
  canDelete: boolean;
  onClose: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const info = dueInfo(tx);
  const history = trpc.transactions.history.useQuery({ id: tx.id }, { retry: false });

  return (
    <Dialog
      title={tx.subject}
      subtitle={
        <div className="detail-meta">
          <RefNumber value={tx.number} />
          <TypeChip type={tx.type} />
          <StatusBadge status={tx.status} />
          <PriorityTag priority={tx.priority} />
        </div>
      }
      onClose={onClose}
      size="lg"
      className="detail-dialog"
      footer={
        <>
          {canEdit && !tx.archived && (
            <button type="button" className="btn btn-outline" onClick={onArchive}><Archive size={17} aria-hidden="true" /> أرشفة</button>
          )}
          <button type="button" className="btn btn-outline" onClick={() => window.print()}><Printer size={17} aria-hidden="true" /> طباعة</button>
          {canDelete && (
            <button type="button" className="btn btn-outline btn-danger-text" onClick={onDelete}><Trash2 size={17} aria-hidden="true" /> حذف</button>
          )}
          {canEdit && (
            <button type="button" className="btn btn-primary" onClick={onEdit} data-autofocus><Pencil size={17} aria-hidden="true" /> تعديل</button>
          )}
        </>
      }
    >
      <div className={`due-banner due-banner-${info.tone}`}>
        <DueLabel info={info} />
        <span className="muted">موعد الاستحقاق {formatDateLong(tx.due)}</span>
      </div>

      <dl className="detail-grid">
        <div><dt>{tx.type === "واردة" ? "الجهة المرسلة" : tx.type === "صادرة" ? "الجهة المستقبلة" : "الإدارة المعنية"}</dt><dd>{tx.party}</dd></div>
        <div><dt>القسم المسؤول</dt><dd>{tx.department}</dd></div>
        <div><dt>الموظف المسؤول</dt><dd>{tx.assignee}</dd></div>
        <div><dt>تاريخ الورود</dt><dd>{formatDateLong(tx.received)}</dd></div>
        <div><dt>المرفق</dt><dd><AttachmentName name={tx.attachment} /></dd></div>
        <div><dt>الأرشفة</dt><dd>{tx.archived ? "مؤرشفة" : "نشطة"}</dd></div>
      </dl>

      <section className="detail-section">
        <h3>الملاحظات</h3>
        <p className={tx.notes ? "" : "muted"}>{tx.notes || "لا توجد ملاحظات."}</p>
      </section>

      <section className="detail-section">
        <h3>سجل الإجراءات</h3>
        {history.isLoading ? (
          <p className="muted">جارٍ التحميل…</p>
        ) : history.data && history.data.length ? (
          <ol className="timeline">
            {history.data.map((event) => (
              <li key={event.id}>
                <i aria-hidden="true" />
                <div>
                  <strong>{EVENT_LABELS[event.action] ?? event.details ?? event.action}</strong>
                  <small>{event.actorName ? `${event.actorName} · ` : ""}{formatDateTime(event.createdAt)}</small>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="muted">لم تُسجَّل إجراءات بعد. سيظهر هنا كل تحديث على المعاملة.</p>
        )}
      </section>
    </Dialog>
  );
}
