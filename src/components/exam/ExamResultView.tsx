import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpenCheck, CheckCircle2, Clock3, Download, FileJson, XCircle } from 'lucide-react';
import type { ExamAnswerValue, ExamResult } from '@/domain';
import { fetchExamQuestions } from '@/lib/educationApi';
import { fetchLeapCatalog } from '@/lib/adaptiveApi';
import { ACTIVE_COURSE_ID } from '@/store';
import { Button } from '@/components/ui/button';
import { GlassPanel } from '@/components/design/GlassPanel';
import {
  buildLeapRemediationTargets,
  buildResultCsv,
  formatExamScore,
  summarizeExamPointLoss,
  type LeapRemediationTarget,
} from './examPresentation';

function displayAnswer(value: ExamAnswerValue): string {
  if (value === null || value === '') return '未作答';
  if (Array.isArray(value)) return value.join('、');
  if (typeof value === 'boolean') return value ? '正确' : '错误';
  return value;
}

function downloadContent(content: string, filename: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

type LeapLookup =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; targets: LeapRemediationTarget[] };

export function ExamResultView({
  result,
  courseId = ACTIVE_COURSE_ID,
}: {
  result: ExamResult;
  courseId?: string;
}) {
  const pending = result.pendingScore > 0;
  const pointLoss = useMemo(() => summarizeExamPointLoss(result), [result]);
  const hasWrongQuestions = pointLoss.lostPoints > 0;
  const [leapLookup, setLeapLookup] = useState<LeapLookup>({ status: 'idle' });

  useEffect(() => {
    if (courseId !== 'course-ds' || !hasWrongQuestions) {
      setLeapLookup({ status: 'idle' });
      return;
    }
    setLeapLookup({ status: 'loading' });
    void Promise.all([fetchExamQuestions(courseId), fetchLeapCatalog()])
      .then(([questions, catalog]) => {
        setLeapLookup({
          status: 'ready',
          targets: buildLeapRemediationTargets(result, questions, catalog.topics),
        });
      })
      .catch(() => setLeapLookup({ status: 'error' }));
  }, [courseId, hasWrongQuestions, result]);

  return (
    <div className="space-y-5">
      <GlassPanel className="overflow-hidden p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-[var(--em-primary)]">RESULT REVIEW</p>
            <h2 className="mt-2 text-2xl font-bold">成绩复盘 · {result.examTitle}</h2>
            <p className="mt-2 text-sm text-[var(--em-muted-ink)]">
              {formatExamScore(result.awardedScore, result.maxScore, result.pendingScore)}
            </p>
            <p className="mt-2 text-xs font-medium">
              {pending
                ? '仍有人工题待批，暂不判定是否通过。'
                : result.passed
                  ? '已达到本卷及格线。'
                  : '尚未达到本卷及格线，可根据错题复盘。'}
            </p>
            <p className="mt-2 text-sm font-semibold text-[var(--em-ink)]">
              已批题目失分 {pointLoss.lostPoints} 分
              {pointLoss.pendingCount > 0 ? ` · ${pointLoss.pendingCount} 题待批，尚未计入失分` : ''}
            </p>
          </div>
          <div className="rounded-xl    px-7 py-5 text-center">
            <strong className="text-4xl text-[var(--em-primary-deep)]">{result.percentage}%</strong>
            <p className="mt-1 text-[10px] text-[var(--em-muted-ink)]">{pending ? '当前得分率' : '最终得分率'}</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" className="gap-2 rounded-xl" onClick={() => downloadContent(buildResultCsv(result), `${result.examTitle}-成绩.csv`, 'text/csv;charset=utf-8')}>
            <Download className="h-3.5 w-3.5" />导出 CSV
          </Button>
          <Button type="button" size="sm" variant="outline" className="gap-2 rounded-xl" onClick={() => downloadContent(JSON.stringify(result, null, 2), `${result.examTitle}-成绩.json`, 'application/json;charset=utf-8')}>
            <FileJson className="h-3.5 w-3.5" />导出 JSON
          </Button>
        </div>
      </GlassPanel>

      {hasWrongQuestions ? (
        <GlassPanel className="p-4 sm:p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold"><BookOpenCheck className="h-4 w-4 text-[var(--em-primary-deep)]" />按错题知识点进入 LEAP</h3>
          {courseId !== 'course-ds' ? (
            <p className="mt-2 text-xs leading-5 text-[var(--em-muted-ink)]">当前课程不在 LEAP 数据结构试点目录中，未创建跳转入口。</p>
          ) : leapLookup.status === 'loading' || leapLookup.status === 'idle' ? (
            <p className="mt-2 text-xs text-[var(--em-muted-ink)]">正在比对本课程题目知识点与受支持的 LEAP 主题…</p>
          ) : leapLookup.status === 'error' ? (
            <p className="mt-2 text-xs text-[var(--em-muted-ink)]">暂时无法读取题目与 LEAP 主题目录，因此未提供跳转。</p>
          ) : leapLookup.targets.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {leapLookup.targets.map((target) => (
                <Link
                  key={target.topicId}
                  to={`/adaptive?topic=${encodeURIComponent(target.topicId)}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--em-border)] bg-[var(--em-primary-subtle)] px-3 py-2 text-xs font-semibold text-[var(--em-primary-deep)] hover:bg-[var(--em-primary-subtle)]"
                >
                  前往 LEAP：{target.topicName}（{target.questionIds.length} 道错题）
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs leading-5 text-[var(--em-muted-ink)]">本次已批失分题目没有匹配到当前 LEAP 目录的知识点主题。</p>
          )}
          <p className="mt-3 text-[10px] text-[var(--em-muted-ink)]">入口会打开匹配主题供你继续；不会自动创建或提交 LEAP 会话。</p>
        </GlassPanel>
      ) : null}

      {result.answers.map((answer, index) => (
        <GlassPanel key={answer.answerId} className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-[var(--em-primary)]">第 {index + 1} 题 · {answer.questionTypeName}</p>
              <h3 className="mt-2 font-bold leading-7">{answer.prompt}</h3>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-[var(--em-surface)] px-3 py-1 text-xs font-semibold">
              {answer.gradingStatus === 'pending_manual' ? (
                <Clock3 className="h-3.5 w-3.5 text-amber-500" />
              ) : answer.isCorrect ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-rose-500" />
              )}
              {answer.awardedScore === null ? '待批' : `${answer.awardedScore}/${answer.points} 分`}
            </span>
            <span className="rounded-full border border-[var(--em-border)] px-3 py-1 text-xs font-semibold text-[var(--em-muted-ink)]">
              {answer.awardedScore === null
                ? '待批，失分未计入'
                : `本题失分 ${answer.points - answer.awardedScore} 分`}
            </span>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] p-4">
              <p className="text-[10px] font-bold text-[var(--em-muted-ink)]">我的答案</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{displayAnswer(answer.userAnswer)}</p>
            </div>
            <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-4">
              <p className="text-[10px] font-bold text-sky-700">参考答案</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{displayAnswer(answer.correctAnswer)}</p>
            </div>
          </div>
          <div className="mt-3 rounded-xl bg-[var(--em-primary-subtle)] p-4 text-sm leading-6">
            <strong className="text-xs">评分反馈</strong>
            <p className="mt-1 text-[var(--em-muted-ink)]">{answer.feedback || '暂无反馈'}</p>
            {answer.explanation && <p className="mt-2 border-t border-[var(--em-border)] pt-2 text-[var(--em-muted-ink)]">解析：{answer.explanation}</p>}
          </div>
        </GlassPanel>
      ))}
    </div>
  );
}

