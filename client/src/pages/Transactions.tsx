import { FileDown, Plus, Search, X } from "lucide-react";
import { TX_PRIORITIES, TX_STATUSES, TX_TYPES, type Tx } from "@/lib/archive";
import { txCount } from "@/lib/format";
import { TxTable } from "@/components/TxTable";
import { PageHeader } from "@/components/ui";

export type TxFilters = { query: string; type: string; status: string; priority: string; department: string; due: "" | "late" | "soon" };
export const EMPTY_FILTERS: TxFilters = { query: "", type: "", status: "", priority: "", department: "", due: "" };

export function Transactions({ data, total, filters, setFilters, departments, canCreate, onNew, onOpen, onExport }: {
  data: Tx[];
  total: number;
  filters: TxFilters;
  setFilters: (next: TxFilters) => void;
  departments: string[];
  canCreate: boolean;
  onNew: () => void;
  onOpen: (tx: Tx) => void;
  onExport: () => void;
}) {
  const set = <K extends keyof TxFilters>(key: K, value: TxFilters[K]) => setFilters({ ...filters, [key]: value });
  const activeCount = [filters.query, filters.type, filters.status, filters.priority, filters.department, filters.due].filter(Boolean).length;
  const dueLabel = filters.due === "late" ? "المتأخرة فقط" : filters.due === "soon" ? "المستحقة قريبًا فقط" : "";

  return (
    <>
      <PageHeader
        title="المعاملات"
        description="ابحث في كل المعاملات المسجلة، وافتح أي معاملة لرؤية تفاصيلها."
        action={canCreate && <button type="button" className="btn btn-primary btn-lg" onClick={onNew}><Plus size={20} aria-hidden="true" /> معاملة جديدة</button>}
      />

      <div className="card filter-card">
        <div className="search-bar search-bar-inline">
          <Search size={20} aria-hidden="true" />
          <input value={filters.query} onChange={(e) => set("query", e.target.value)} placeholder="ابحث برقم المعاملة أو الموضوع أو الجهة" aria-label="بحث" />
          {filters.query && <button type="button" className="icon-btn icon-btn-plain" aria-label="مسح البحث" onClick={() => set("query", "")}><X size={18} aria-hidden="true" /></button>}
        </div>
        <div className="filter-row">
          <label className="filter-select"><span>النوع</span>
            <select value={filters.type} onChange={(e) => set("type", e.target.value)}>
              <option value="">الكل</option>
              {TX_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
          <label className="filter-select"><span>الحالة</span>
            <select value={filters.status} onChange={(e) => set("status", e.target.value)}>
              <option value="">الكل</option>
              {TX_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label className="filter-select"><span>الأولوية</span>
            <select value={filters.priority} onChange={(e) => set("priority", e.target.value)}>
              <option value="">الكل</option>
              {TX_PRIORITIES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </label>
          <label className="filter-select"><span>القسم</span>
            <select value={filters.department} onChange={(e) => set("department", e.target.value)}>
              <option value="">الكل</option>
              {departments.map((d) => <option key={d}>{d}</option>)}
            </select>
          </label>
          <label className="filter-select"><span>الموعد</span>
            <select value={filters.due} onChange={(e) => set("due", e.target.value as TxFilters["due"])}>
              <option value="">الكل</option>
              <option value="late">المتأخرة فقط</option>
              <option value="soon">المستحقة قريبًا</option>
            </select>
          </label>
          {activeCount > 0 && (
            <button type="button" className="btn btn-link" onClick={() => setFilters(EMPTY_FILTERS)}><X size={16} aria-hidden="true" /> مسح التصفية</button>
          )}
        </div>
      </div>

      <section className="card">
        <div className="table-toolbar">
          <div>
            <strong>{txCount(data.length)}</strong>
            {activeCount > 0 && <span className="muted"> من أصل {total}{dueLabel ? ` · ${dueLabel}` : ""}</span>}
          </div>
          <button type="button" className="btn btn-outline" onClick={onExport} disabled={data.length === 0}><FileDown size={18} aria-hidden="true" /> تصدير إلى Excel</button>
        </div>
        <TxTable
          data={data}
          onOpen={onOpen}
          emptyTitle={total === 0 ? "لا توجد معاملات بعد" : "لا توجد نتائج مطابقة"}
          emptyText={total === 0 ? "سجّل أول معاملة لتظهر هنا." : "جرّب كلمة بحث أخرى أو امسح التصفية."}
          emptyAction={total === 0 ? (canCreate && <button type="button" className="btn btn-primary" onClick={onNew}><Plus size={18} aria-hidden="true" /> معاملة جديدة</button>) : <button type="button" className="btn btn-outline" onClick={() => setFilters(EMPTY_FILTERS)}>مسح التصفية</button>}
        />
      </section>
    </>
  );
}
