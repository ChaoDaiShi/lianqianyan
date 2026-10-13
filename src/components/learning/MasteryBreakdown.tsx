import { useState } from 'react';

export interface MasteryBreakdownPoint {
  label: string;
  value: number | null;
  evidenceCount: number;
}

export function MasteryBreakdown({ points }: { points: MasteryBreakdownPoint[] }) {
  const [sort, setSort] = useState('weak');
  const rows = sort === 'weak'
    ? [...points].sort((a, b) => (a.value ?? Infinity) - (b.value ?? Infinity))
    : points;
  return (
    <section aria-label="条形能力对照" className="min-w-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">课程能力对照</h2>
        <select aria-label="能力对照排序" value={sort} onChange={event => setSort(event.target.value)} className="h-10 rounded-lg border border-[var(--em-border)] bg-[var(--em-surface)] px-3 text-sm">
          <option value="weak">按掌握度升序</option>
          <option value="course">按课程顺序</option>
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--em-surface-subtle)] text-[var(--em-muted-ink)]"><tr><th className="p-3 font-semibold">知识点</th><th className="p-3 font-semibold">掌握估计</th><th className="p-3 font-semibold">评价证据</th></tr></thead>
          <tbody>{rows.map(point => (
            <tr key={point.label} className="border-b border-[var(--em-border)]">
              <th className="p-3 font-medium">{point.label}</th>
              <td className="min-w-[9rem] p-3">{point.value === null ? <span className="text-[var(--em-muted-ink)]">未评估</span> : <div className="flex items-center gap-3"><div className="h-1.5 flex-1 rounded-full bg-[var(--em-surface-subtle)]"><div className="h-full rounded-full bg-[var(--em-action)]" style={{ width: `${point.value}%` }} /></div><span className="w-10 text-right tabular-nums">{point.value}%</span></div>}</td>
              <td className="p-3 tabular-nums">{point.evidenceCount} 条</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <p className="mt-3 text-xs leading-5 text-[var(--em-muted-ink)]">无作答证据的知识点保持未评估；未知不等于薄弱。</p>
    </section>
  );
}
