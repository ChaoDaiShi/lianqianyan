import { CheckCircle2, Clock3, Download, FileJson, XCircle } from 'lucide-react';
import type { ExamAnswerValue, ExamResult } from '@/domain';
import { Button } from '@/components/ui/button';
import { GlassPanel } from '@/components/design/GlassPanel';
import { buildResultCsv, formatExamScore } from './examPresentation';

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

export function ExamResultView({ result }: { result: ExamResult }) {
  const pending = result.pendingScore > 0;
  return (
    <div className="space-y-5">
      <GlassPanel className="overflow-hidden p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-primary-600">RESULT REVIEW</p>
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
          </div>
          <div className="rounded-[24px] bg-gradient-to-br from-violet-100 to-sky-100 px-7 py-5 text-center">
            <strong className="text-4xl text-primary-700">{result.percentage}%</strong>
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

      {result.answers.map((answer, index) => (
        <GlassPanel key={answer.answerId} className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-primary-600">第 {index + 1} 题 · {answer.questionTypeName}</p>
              <h3 className="mt-2 font-bold leading-7">{answer.prompt}</h3>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold">
              {answer.gradingStatus === 'pending_manual' ? (
                <Clock3 className="h-3.5 w-3.5 text-amber-500" />
              ) : answer.isCorrect ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-rose-500" />
              )}
              {answer.awardedScore === null ? '待批' : `${answer.awardedScore}/${answer.points} 分`}
            </span>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-[16px] border border-violet-100 bg-white/50 p-4">
              <p className="text-[10px] font-bold text-[var(--em-muted-ink)]">我的答案</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{displayAnswer(answer.userAnswer)}</p>
            </div>
            <div className="rounded-[16px] border border-sky-100 bg-sky-50/50 p-4">
              <p className="text-[10px] font-bold text-sky-700">参考答案</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{displayAnswer(answer.correctAnswer)}</p>
            </div>
          </div>
          <div className="mt-3 rounded-[16px] bg-violet-50/55 p-4 text-sm leading-6">
            <strong className="text-xs">评分反馈</strong>
            <p className="mt-1 text-[var(--em-muted-ink)]">{answer.feedback || '暂无反馈'}</p>
            {answer.explanation && <p className="mt-2 border-t border-violet-100 pt-2 text-[var(--em-muted-ink)]">解析：{answer.explanation}</p>}
          </div>
        </GlassPanel>
      ))}
    </div>
  );
}

