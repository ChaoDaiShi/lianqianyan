import { useCallback, useEffect, useState } from 'react';
import { Eye, RotateCw } from 'lucide-react';
import type { ExamAttemptSummary, ExamResult } from '@/domain';
import { fetchExamResult, fetchExamResults } from '@/lib/educationApi';
import { DEMO_COURSE_ID, DEMO_LEARNER_ID } from '@/store';
import { Button } from '@/components/ui/button';
import { GlassPanel } from '@/components/design/GlassPanel';
import { LearningState } from '@/components/feedback/LearningState';
import { formatExamScore } from './examPresentation';
import { ExamResultView } from './ExamResultView';

export function ExamHistory() {
  const [items, setItems] = useState<ExamAttemptSummary[]>([]);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try { setItems(await fetchExamResults(DEMO_LEARNER_ID, DEMO_COURSE_ID)); }
    catch { setError(true); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (result) {
    return <div className="space-y-4"><Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => setResult(null)}>返回结果列表</Button><ExamResultView result={result} /></div>;
  }
  return (
    <div className="space-y-4">
      {loading && <LearningState kind="loading" title="正在读取考试结果" />}
      {error && <LearningState kind="error" title="考试结果暂时无法读取" action={<Button type="button" variant="outline" onClick={() => void load()} className="gap-2"><RotateCw className="h-4 w-4" />重试</Button>} />}
      {!loading && !error && items.length === 0 && <LearningState kind="empty" title="还没有考试结果" description="提交一份试卷后，结果与复盘会出现在这里。" />}
      {items.map((item) => (
        <GlassPanel key={item.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-bold">{item.examTitle}</h3>
            <p className="mt-1 text-sm text-[var(--em-muted-ink)]">{formatExamScore(item.awardedScore, item.maxScore, item.pendingScore)} · {item.status === 'needs_review' ? '等待人工批阅' : item.passed ? '已通过' : '未通过'}</p>
            <p className="mt-1 text-[10px] text-[var(--em-muted-ink)]">提交于 {item.submittedAt ? new Date(`${item.submittedAt}Z`).toLocaleString('zh-CN') : '未知时间'}</p>
          </div>
          <Button type="button" variant="outline" className="gap-2 rounded-xl" disabled={opening === item.id} onClick={() => { setOpening(item.id); void fetchExamResult(item.id, DEMO_LEARNER_ID).then(setResult).catch(() => setError(true)).finally(() => setOpening(null)); }}><Eye className="h-4 w-4" />{opening === item.id ? '读取中…' : '查看复盘'}</Button>
        </GlassPanel>
      ))}
    </div>
  );
}

