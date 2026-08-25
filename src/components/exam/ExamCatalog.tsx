import { useCallback, useEffect, useState } from 'react';
import { BookOpenCheck, Clock3, FileCheck2, Play, RotateCw } from 'lucide-react';
import type { ExamAttempt, ExamCatalogItem, ExamResult } from '@/domain';
import {
  fetchExamCatalog,
  fetchExamResult,
  startExamAttempt,
} from '@/lib/educationApi';
import { ACTIVE_COURSE_ID, ACTIVE_LEARNER_ID } from '@/store';
import { Button } from '@/components/ui/button';
import { GlassPanel } from '@/components/design/GlassPanel';
import { LearningState } from '@/components/feedback/LearningState';
import { ExamRunner } from './ExamRunner';
import { ExamResultView } from './ExamResultView';

export function ExamCatalog() {
  const [catalog, setCatalog] = useState<ExamCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [pendingExamId, setPendingExamId] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [result, setResult] = useState<ExamResult | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setCatalog(await fetchExamCatalog(ACTIVE_LEARNER_ID, ACTIVE_COURSE_ID));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openExam = async (exam: ExamCatalogItem) => {
    setPendingExamId(exam.id);
    setError(false);
    try {
      if (exam.latestAttempt && exam.latestAttempt.status !== 'in_progress') {
        setResult(await fetchExamResult(exam.latestAttempt.id, ACTIVE_LEARNER_ID));
        return;
      }
      setAttempt(await startExamAttempt(exam.id, ACTIVE_LEARNER_ID));
    } catch {
      setError(true);
    } finally {
      setPendingExamId(null);
    }
  };

  if (attempt) {
    return (
      <ExamRunner
        attempt={attempt}
        onExit={() => { setAttempt(null); void load(); }}
        onSubmitted={(summary) => {
          void fetchExamResult(summary.id, ACTIVE_LEARNER_ID)
            .then((nextResult) => { setAttempt(null); setResult(nextResult); })
            .catch(() => setError(true));
        }}
      />
    );
  }
  if (result) {
    return (
      <div className="space-y-4">
        <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => { setResult(null); void load(); }}>
          返回考试列表
        </Button>
        <ExamResultView result={result} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {loading && <LearningState kind="loading" title="正在读取可参加的考试" />}
      {error && (
        <LearningState
          kind="error"
          title="考试服务暂时无法读取"
          description="不会显示模拟试卷或虚假成绩。"
          action={<Button type="button" variant="outline" onClick={() => void load()} className="gap-2"><RotateCw className="h-4 w-4" />重试</Button>}
        />
      )}
      {!loading && !error && catalog.length === 0 && (
        <LearningState kind="empty" title="还没有已发布的考试" description="可在“命题与批阅”中创建草稿并发布。" />
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {catalog.map((exam) => {
          const latest = exam.latestAttempt;
          const actionLabel = latest?.status === 'in_progress'
            ? '继续作答'
            : latest
              ? '查看结果'
              : '开始考试';
          return (
            <GlassPanel key={exam.id} className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-xs font-semibold text-primary-600"><BookOpenCheck className="h-4 w-4" />已发布</p>
                  <h3 className="mt-2 text-lg font-bold">{exam.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--em-muted-ink)]">{exam.description || '暂无考试说明'}</p>
                </div>
                {latest && <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-primary-700">{latest.status === 'in_progress' ? '作答中' : latest.status === 'needs_review' ? '待批阅' : `${latest.percentage}%`}</span>}
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--em-muted-ink)]">
                <span className="flex items-center gap-1 rounded-full bg-white/60 px-2.5 py-1"><FileCheck2 className="h-3.5 w-3.5" />{exam.questionCount} 题 · {exam.totalPoints} 分</span>
                <span className="flex items-center gap-1 rounded-full bg-white/60 px-2.5 py-1"><Clock3 className="h-3.5 w-3.5" />{exam.durationMinutes} 分钟</span>
                <span className="rounded-full bg-white/60 px-2.5 py-1">及格线 {exam.passPercentage}%</span>
              </div>
              <Button type="button" className="mt-5 w-full gap-2 rounded-2xl bg-primary-500" disabled={pendingExamId === exam.id} onClick={() => void openExam(exam)}>
                <Play className="h-4 w-4" />{pendingExamId === exam.id ? '正在进入…' : actionLabel}
              </Button>
            </GlassPanel>
          );
        })}
      </div>
    </div>
  );
}

