import { useMemo } from "react";
import { FileDown, Printer } from "lucide-react";
import { STATUS_SLUG, TX_STATUSES, TX_TYPES, TYPE_SLUG, type Tx } from "@/lib/archive";
import { isOverdue, txCount } from "@/lib/format";
import { PageHeader, SectionHead } from "@/components/ui";

function Bars({ rows, tone }: { rows: { label: string; value: number; slug?: string }[]; tone?: "status" | "type" }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="bars">
      {rows.map((row) => (
        <li key={row.label} className="bar-row">
          <span className="bar-label">{row.label}</span>
          <span className="bar-track"><i className={tone && row.slug ? `${tone}-${row.slug}` : ""} style={{ width: `${Math.max(3, (row.value / max) * 100)}%` }} /></span>
          <strong className="bar-value">{row.value}</strong>
        </li>
      ))}
    </ul>
  );
}

export function Reports({ txs, departments, onExport, orgName }: { txs: Tx[]; departments: string[]; onExport: () => void; orgName: string }) {
  const stats = useMemo(() => {
    const total = txs.length;
    const done = txs.filter((t) => t.status === "مكتملة").length;
    const late = txs.filter((t) => !t.archived && isOverdue(t)).length;
    const monthKey = new Date().toISOString().slice(0, 7);
    const thisMonth = txs.filter((t) => t.received.startsWith(monthKey)).length;
    const byDept = [...new Set([...departments, ...txs.map((t) => t.department)])].map((d) => ({ label: d, value: txs.filter((t) => t.department === d).length })).filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
    const byStatus = TX_STATUSES.map((s) => ({ label: s, value: txs.filter((t) => t.status === s).length, slug: STATUS_SLUG[s] }));
    const byType = TX_TYPES.map((t) => ({ label: t, value: txs.filter((x) => x.type === t).length, slug: TYPE_SLUG[t] }));
    return { total, done, late, thisMonth, byDept, byStatus, byType, completion: total ? Math.round((done / total) * 100) : 0 };
  }, [txs, departments]);

  const monthName = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { month: "long", year: "numeric" }).format(new Date());

  return (
    <>
      <PageHeader
        title="التقارير"
        description="أرقام الأرشيف كما هي الآن. اطبع التقرير أو صدّره إلى Excel لمشاركته."
        action={
          <div className="actions">
            <button type="button" className="btn btn-outline" onClick={() => window.print()}><Printer size={18} aria-hidden="true" /> طباعة</button>
            <button type="button" className="btn btn-primary" onClick={onExport}><FileDown size={18} aria-hidden="true" /> تصدير إلى Excel</button>
          </div>
        }
      />

      <div className="print-only print-header">
        <strong>{orgName}</strong>
        <span>تقرير المعاملات · {monthName}</span>
      </div>

      <div className="figures">
        <div className="figure">
          <span>إجمالي المعاملات</span>
          <strong>{stats.total}</strong>
          <small>{txCount(stats.thisMonth)} وردت في {monthName}</small>
        </div>
        <div className="figure">
          <span>نسبة الإنجاز</span>
          <strong>{stats.completion}%</strong>
          <small>{stats.done} مكتملة من {stats.total}</small>
        </div>
        <div className={`figure ${stats.late ? "figure-late" : ""}`}>
          <span>متأخرة عن موعدها</span>
          <strong>{stats.late}</strong>
          <small>{stats.late ? "تحتاج متابعة عاجلة" : "لا توجد معاملات متأخرة"}</small>
        </div>
      </div>

      <div className="report-grid">
        <section className="card">
          <SectionHead title="حسب القسم" description="عدد المعاملات المسندة لكل قسم" />
          {stats.byDept.length ? <Bars rows={stats.byDept} /> : <p className="muted">لا توجد بيانات بعد.</p>}
        </section>
        <section className="card">
          <SectionHead title="حسب الحالة" description="أين تقف المعاملات الآن" />
          <Bars rows={stats.byStatus} tone="status" />
        </section>
        <section className="card">
          <SectionHead title="حسب النوع" description="واردة، صادرة، داخلية" />
          <Bars rows={stats.byType} tone="type" />
        </section>
      </div>
    </>
  );
}
