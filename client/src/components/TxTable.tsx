import { FolderOpen, SearchX } from "lucide-react";
import type { Tx } from "@/lib/archive";
import { formatDate } from "@/lib/format";
import { DueCell, EmptyState, RefNumber, StatusBadge, TypeChip } from "./ui";

export function TxTable({ data, onOpen, emptyTitle = "لا توجد معاملات مطابقة", emptyText = "جرّب كلمة بحث أخرى أو غيّر عوامل التصفية.", emptyAction }: { data: Tx[]; onOpen: (tx: Tx) => void; emptyTitle?: string; emptyText?: string; emptyAction?: React.ReactNode }) {
  if (data.length === 0) return <EmptyState icon={<SearchX size={26} />} title={emptyTitle} text={emptyText} action={emptyAction} />;
  return (
    <div className="table-wrap">
      <table className="tx-table">
        <thead>
          <tr>
            <th scope="col">الموضوع والجهة</th>
            <th scope="col">رقم المعاملة</th>
            <th scope="col">النوع</th>
            <th scope="col">موعد الاستحقاق</th>
            <th scope="col">الحالة</th>
            <th scope="col"><span className="sr-only">فتح</span></th>
          </tr>
        </thead>
        <tbody>
          {data.map((tx) => (
            <tr key={tx.id} className={`row-type-${tx.type === "واردة" ? "incoming" : tx.type === "صادرة" ? "outgoing" : "internal"}`} onClick={() => onOpen(tx)}>
              <td data-label="الموضوع">
                <strong className="tx-subject">{tx.subject}</strong>
                <small>{tx.party}</small>
              </td>
              <td data-label="رقم المعاملة">
                <RefNumber value={tx.number} />
                <small>{tx.department}</small>
              </td>
              <td data-label="النوع"><TypeChip type={tx.type} /></td>
              <td data-label="موعد الاستحقاق">
                <span className="date-text">{formatDate(tx.due)}</span>
                <small><DueCell due={tx.due} status={tx.status} /></small>
              </td>
              <td data-label="الحالة"><StatusBadge status={tx.status} /></td>
              <td className="row-action">
                <button type="button" className="btn btn-ghost btn-sm" onClick={(event) => { event.stopPropagation(); onOpen(tx); }} aria-label={`فتح المعاملة ${tx.number}`}>
                  <FolderOpen size={17} aria-hidden="true" />
                  فتح
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
