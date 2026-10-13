import { RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { EvidenceLedgerRow } from './ledgerPresentation';
import { formatApiTime } from '@/lib/apiTime';

export interface EvidenceLedgerProps {
  rows: EvidenceLedgerRow[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}

function formatTimestamp(value: string): string {
  return formatApiTime(value, {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Shanghai',
  });
}

export function EvidenceLedger({ rows, loading, error, onRetry }: EvidenceLedgerProps) {
  return (
    <section className="rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] p-4 shadow-[var(--em-shadow-sm)] sm:p-5" aria-labelledby="evidence-ledger-title">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-[0.16em] text-[var(--em-primary-deep)]">EVIDENCE LEDGER</p>
          <h2 id="evidence-ledger-title" className="mt-1 text-lg font-bold">学习证据账本</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--em-muted-ink)]">按时间倒序展示当前学习者与课程的真实服务端证据，以及单独标明的本地复述反馈。</p>
        </div>
        <p className="text-xs text-[var(--em-muted-ink)]">{rows.length} 条记录</p>
      </header>

      {loading && rows.length === 0 ? <p className="mt-4 text-sm text-[var(--em-muted-ink)]">正在读取学习证据…</p> : null}
      {error ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
          <p className="text-sm text-amber-900">服务端学习证据暂时无法读取；当前展示的本地复述记录仍按独立来源标注。</p>
          <Button type="button" variant="outline" size="sm" onClick={onRetry} className="gap-2"><RotateCw className="h-3.5 w-3.5" />重新加载</Button>
        </div>
      ) : null}
      {!loading && rows.length === 0 ? <p className="mt-4 rounded-lg border border-dashed border-[var(--em-border)] p-4 text-sm text-[var(--em-muted-ink)]">当前范围还没有可展示的学习记录。</p> : null}

      {rows.length > 0 ? (
        <div className="mt-4 overflow-x-auto rounded-lg border border-[var(--em-border)]">
          <table className="w-full min-w-[760px] border-collapse text-left text-xs">
            <thead className="bg-[var(--em-surface-subtle)] text-[var(--em-muted-ink)]">
              <tr>
                <th scope="col" className="px-3 py-2.5 font-semibold">时间（UTC+8）</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">来源 / 事件</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">结果</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">关联 ID</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">掌握变化</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-[var(--em-border)] align-top">
                  <td className="whitespace-nowrap px-3 py-3 text-[var(--em-muted-ink)]"><time dateTime={row.occurredAt}>{formatTimestamp(row.occurredAt)}</time></td>
                  <td className="px-3 py-3"><p className="font-semibold text-[var(--em-ink)]">{row.event}</p><p className="mt-1 text-[var(--em-muted-ink)]">{row.source}</p></td>
                  <td className="max-w-sm whitespace-pre-wrap px-3 py-3 leading-5">{row.result}</td>
                  <td className="max-w-xs break-all px-3 py-3 font-mono text-[10px] leading-5 text-[var(--em-muted-ink)]">{row.actualIds.map((id) => <span key={id} className="mr-2 inline-block">{id}</span>)}</td>
                  <td className="whitespace-nowrap px-3 py-3">{row.masteryChange ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
