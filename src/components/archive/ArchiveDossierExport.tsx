import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createSignedDossier, type SignedDossier } from '@/lib/dossierExport';
import type { EvidenceLedgerRow } from './ledgerPresentation';
import { publicKeyFingerprint } from './dossierPresentation';
import './archivePrint.css';
import { formatApiTime } from '@/lib/apiTime';

export interface ArchiveDossierSnapshot {
  learnerId: string;
  courseId: string;
  courseName?: string;
  overview: {
    answeredQuestionCount?: number;
    submittedExamCount?: number;
    overallMastery?: number;
    assessedKnowledgePoints?: number;
  };
  evidence: EvidenceLedgerRow[];
}

interface SignedSnapshot {
  payload: ArchiveDossierSnapshot & { generatedAt: string };
  receipt: SignedDossier;
  fingerprint: string;
}

async function signSnapshot(snapshot: ArchiveDossierSnapshot): Promise<SignedSnapshot> {
  const payload = { ...snapshot, generatedAt: new Date().toISOString() };
  const receipt = await createSignedDossier(payload);
  const fingerprint = await publicKeyFingerprint(receipt.publicKey);
  return { payload, receipt, fingerprint };
}

function downloadReceipt(signed: SignedSnapshot, courseName: string | undefined): void {
  const filenameCourse = courseName?.replace(/[\\/:*?"<>|]/g, '-') || '课程档案';
  const content = JSON.stringify({ ...signed.receipt, publicKeyFingerprint: signed.fingerprint }, null, 2);
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  const generatedAt = signed.payload.generatedAt.replace(/[:.]/g, '-');
  const filenameFingerprint = signed.fingerprint.replace(/:/g, '-');
  anchor.download = `学习档案-${filenameCourse}-${generatedAt}-${filenameFingerprint}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatMastery(value: number | undefined): string {
  return value === undefined ? '未提供' : `${Math.round(value * 100)}%`;
}

function formatTimestamp(value: string): string {
  return formatApiTime(value, { timeZone: 'Asia/Shanghai', hour12: false });
}

export function ArchiveDossierExport({ snapshot }: { snapshot: ArchiveDossierSnapshot }) {
  const [signed, setSigned] = useState<SignedSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [printRequested, setPrintRequested] = useState(false);

  useEffect(() => {
    if (!printRequested || !signed) return;
    setPrintRequested(false);
    window.print();
  }, [printRequested, signed]);

  const handleDownload = async () => {
    setBusy(true);
    setError(false);
    try {
      const next = await signSnapshot(snapshot);
      setSigned(next);
      downloadReceipt(next, snapshot.courseName);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const handlePrint = async () => {
    setPrintRequested(true);
    setSigned(null);
    setBusy(true);
    setError(false);
    try {
      const next = await signSnapshot(snapshot);
      downloadReceipt(next, snapshot.courseName);
      setSigned(next);
    } catch {
      setPrintRequested(false);
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <section className="rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] p-4 shadow-[var(--em-shadow-sm)] sm:p-5" aria-labelledby="archive-export-title">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.16em] text-[var(--em-primary-deep)]">FORMAL DOSSIER</p>
            <h2 id="archive-export-title" className="mt-1 text-lg font-bold">导出学习档案</h2>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-[var(--em-muted-ink)]">下载的 JSON 收据使用浏览器生成的 ECDSA-P256-SHA256 自签名，只用于核验这份摘要内容；它不证明学校、iCAN 或平台身份。私钥不会导出。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={() => void handleDownload()} className="gap-2">
              <Download className="h-4 w-4" />下载已签名 JSON 摘要
            </Button>
            <Button type="button" disabled={busy} onClick={() => void handlePrint()} className="gap-2">
              <Printer className="h-4 w-4" />打印 / 保存 PDF
            </Button>
          </div>
        </div>
        {busy ? <p role="status" className="mt-3 text-xs text-[var(--em-muted-ink)]">正在生成本地签名摘要…</p> : null}
        {error ? <p role="alert" className="mt-3 text-xs text-amber-800">浏览器无法生成签名收据，当前未启动打印或下载。</p> : null}
        {signed ? (
          <div className="mt-4 grid gap-3 rounded-lg border border-[var(--em-border)] bg-[var(--em-surface-subtle)] p-3 text-xs sm:grid-cols-2">
            <p><strong>算法：</strong><span>{signed.receipt.algorithm}</span></p>
            <p><strong>公钥指纹：</strong><code className="break-all">{signed.fingerprint}</code></p>
            <p className="sm:col-span-2"><strong>完整签名：</strong><code className="mt-1 block break-all font-mono">{signed.receipt.signature}</code></p>
            <p className="sm:col-span-2"><strong>公钥：</strong><code className="mt-1 block break-all font-mono">{JSON.stringify(signed.receipt.publicKey)}</code></p>
            <p className="sm:col-span-2 leading-5 text-[var(--em-muted-ink)]">签名对应 JSON 摘要中的 signedData，不能证明签发机构身份，也不直接签署 PDF 文件。</p>
          </div>
        ) : null}
      </section>

      {signed ? createPortal(
        <article id="archive-print-report" className="archive-print-report" aria-label="打印版学习档案">
          <header className="archive-print-header">
            <p>涟千言 · 学习档案报告</p>
            <h1>{signed.payload.courseName ?? '课程名称未提供'}</h1>
            <p>当前学习者 ID：{signed.payload.learnerId} · 课程 ID：{signed.payload.courseId}</p>
            <p>报告生成时间：{formatTimestamp(signed.payload.generatedAt)}</p>
            <p>收据标识：<span data-testid="archive-print-receipt-id">{signed.fingerprint} · {signed.payload.generatedAt}</span></p>
          </header>
          <section>
            <h2>学习概览</h2>
            <dl className="archive-print-overview">
              <div><dt>已作答题目数</dt><dd>{signed.payload.overview.answeredQuestionCount ?? '未提供'}</dd></div>
              <div><dt>已提交测评数</dt><dd>{signed.payload.overview.submittedExamCount ?? '未提供'}</dd></div>
              <div><dt>当前整体掌握度</dt><dd>{formatMastery(signed.payload.overview.overallMastery)}</dd></div>
              <div><dt>已评估知识点</dt><dd>{signed.payload.overview.assessedKnowledgePoints ?? '未提供'}</dd></div>
            </dl>
          </section>
          <section>
            <h2>学习证据账本 · {signed.payload.evidence.length} 条</h2>
            <table>
              <thead><tr><th>时间（UTC+8）</th><th>来源 / 事件</th><th>结果</th><th>关联 ID</th><th>M 变化</th></tr></thead>
              <tbody>{signed.payload.evidence.map((row) => <tr key={row.id}>
                <td>{formatTimestamp(row.occurredAt)}</td>
                <td>{row.source}<br />{row.event}</td>
                <td>{row.result}</td>
                <td>{row.actualIds.join(' · ')}</td>
                <td>{row.masteryChange ?? '—'}</td>
              </tr>)}</tbody>
            </table>
          </section>
          <section className="archive-print-signature">
            <h2>数据摘要签名</h2>
            <p>算法：<span data-testid="archive-print-algorithm">{signed.receipt.algorithm}</span></p>
            <p>签发标记：{signed.receipt.issuer}（本地浏览器自签）</p>
            <p>公钥指纹：<span data-testid="archive-print-fingerprint">{signed.fingerprint}</span></p>
            <p>公钥 JWK：<span data-testid="archive-print-public-key">{JSON.stringify(signed.receipt.publicKey)}</span></p>
            <p>完整签名：<span data-testid="archive-print-signature">{signed.receipt.signature}</span></p>
            <p>核验对象：随报告下载的 JSON 收据中的 signedData。以下内容是签名时的完整原文：</p>
            <pre data-testid="archive-print-signed-data">{signed.receipt.signedData}</pre>
            <p>该签名仅校验摘要内容完整性，不构成机构身份认证，也不直接签署本 PDF。</p>
          </section>
        </article>,
        document.body,
      ) : null}
    </>
  );
}
