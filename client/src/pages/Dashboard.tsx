import { useMemo, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, ChevronLeft, Clock3, FolderOpen, Inbox, PartyPopper, Plus, Search } from "lucide-react";
import type { Tx, TxStatus } from "@/lib/archive";
import { dueInfo, txCount } from "@/lib/format";
import { TxTable } from "@/components/TxTable";
import { DueLabel, PageHeader, SectionHead, TypeChip } from "@/components/ui";

export type QuickFilter = { status?: TxStatus; due?: "late" | "soon" };

export function Dashboard({ txs, canEdit, onNew, onOpen, onSearch, onQuickFilter, onShowAll }: {
  txs: Tx[];
  canEdit: boolean;
  onNew: () => void;
  onOpen: (tx: Tx) => void;
  onSearch: (query: string) => void;
  onQuickFilter: (filter: QuickFilter) => void;
  onShowAll: () => void;
}) {
  const [query, setQuery] = useState("");
  const active = useMemo(() => txs.filter((t) => !t.archived), [txs]);
  const withDue = useMemo(() => active.map((t) => ({ tx: t, info: dueInfo(t) })), [active]);
  const late = withDue.filter((x) => x.info.tone === "late");
  const soon = withDue.filter((x) => x.info.tone === "soon");
  const fresh = active.filter((t) => t.status === "جديدة");
  const done = txs.filter((t) => t.status === "مكتملة");
  const attention = [...late, ...soon].sort((a, b) => a.info.daysLeft - b.info.daysLeft).slice(0, 5);
  const recent = [...txs].sort((a, b) => b.received.localeCompare(a.received) || b.id - a.id).slice(0, 5);

  const submitSearch = (event: FormEvent) => { event.preventDefault(); onSearch(query.trim()); };

  return (
    <>
      <PageHeader
        title="لوحة المتابعة"
        description="ما يحتاج إجراءً اليوم، وآخر ما سُجِّل في الأرشيف."
        action={canEdit && <button type="button" className="btn btn-primary btn-lg" onClick={onNew}><Plus size={20} aria-hidden="true" /> معاملة جديدة</button>}
      />

      <form className="search-bar" onSubmit={submitSearch} role="search">
        <Search size={20} aria-hidden="true" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث برقم المعاملة أو الموضوع أو الجهة" aria-label="ابحث في المعاملات" />
        <button type="submit" className="btn btn-outline">بحث</button>
      </form>

      <div className="today-strip" aria-label="ملخص اليوم">
        <button type="button" className="today-cell tone-late" onClick={() => onQuickFilter({ due: "late" })}>
          <span className="today-icon"><AlertCircle size={22} aria-hidden="true" /></span>
          <strong>{late.length}</strong>
          <span>متأخرة عن موعدها</span>
        </button>
        <button type="button" className="today-cell tone-soon" onClick={() => onQuickFilter({ due: "soon" })}>
          <span className="today-icon"><Clock3 size={22} aria-hidden="true" /></span>
          <strong>{soon.length}</strong>
          <span>تستحق خلال أيام</span>
        </button>
        <button type="button" className="today-cell tone-new" onClick={() => onQuickFilter({ status: "جديدة" })}>
          <span className="today-icon"><Inbox size={22} aria-hidden="true" /></span>
          <strong>{fresh.length}</strong>
          <span>جديدة لم تبدأ بعد</span>
        </button>
        <button type="button" className="today-cell tone-done" onClick={() => onQuickFilter({ status: "مكتملة" })}>
          <span className="today-icon"><CheckCircle2 size={22} aria-hidden="true" /></span>
          <strong>{done.length}</strong>
          <span>مكتملة</span>
        </button>
      </div>

      <section className="card">
        <SectionHead title="تحتاج انتباهك" description="المعاملات المتأخرة أو التي يقترب موعدها، الأقرب أولًا." />
        {attention.length ? (
          <ul className="attention-list">
            {attention.map(({ tx, info }) => (
              <li key={tx.id} className={`attention-item row-type-${tx.type === "واردة" ? "incoming" : tx.type === "صادرة" ? "outgoing" : "internal"}`}>
                <div className="attention-main">
                  <strong>{tx.subject}</strong>
                  <small>{tx.party} · {tx.department}</small>
                </div>
                <div className="attention-side">
                  <TypeChip type={tx.type} withIcon={false} />
                  <DueLabel info={info} />
                </div>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => onOpen(tx)} aria-label={`فتح المعاملة ${tx.number}`}>
                  <FolderOpen size={17} aria-hidden="true" /> فتح
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="all-clear">
            <PartyPopper size={22} aria-hidden="true" />
            <span>لا توجد معاملات متأخرة أو مستحقة قريبًا. كل شيء تحت السيطرة.</span>
          </div>
        )}
      </section>

      <section className="card">
        <SectionHead
          title="آخر المعاملات"
          description={`${txCount(txs.length)} في الأرشيف`}
          action={<button type="button" className="btn btn-link" onClick={onShowAll}>عرض الكل <ChevronLeft size={17} aria-hidden="true" /></button>}
        />
        <TxTable
          data={recent}
          onOpen={onOpen}
          emptyTitle="الأرشيف فارغ"
          emptyText="ابدأ بتسجيل أول معاملة، وستظهر هنا مع رقمها وموعدها."
          emptyAction={canEdit && <button type="button" className="btn btn-primary" onClick={onNew}><Plus size={18} aria-hidden="true" /> معاملة جديدة</button>}
        />
      </section>
    </>
  );
}
