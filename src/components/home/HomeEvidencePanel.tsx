import { ArrowRight, CalendarClock, ClipboardList, Loader2, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DiagnosisResult } from '@/domain';
import { DIAGNOSIS_STATUS_LABEL } from '@/domain';
import { Button } from '@/components/ui/button';
import type { LeapSession } from '@/lib/adaptiveApi';
import type { LearningEvidence } from '@/lib/educationApi';
import { ACTIVE_COURSE_ID } from '@/store';
import { cn } from '@/lib/utils';
import { formatRetestCountdown } from './homePresentation';
import { formatApiTime } from '@/lib/apiTime';

function evidenceLabel(evidence: LearningEvidence) {
  const kind = evidence.payload.adaptiveKind;
  if (kind === 'diagnostic') return '初次诊断';
  if (kind === 'intervention') return '针对性教学';
  if (kind === 'probe') return '独立验证';
  if (kind === 'retest') return '延迟复测';
  switch (evidence.evidenceType) {
    case 'learning_started':
      return '开始学习';
    case 'practice_answer_evaluated':
      return '练习评价';
    case 'exam_answer_evaluated':
      return '测评作答';
  }
}

function formatDate(value: string) {
  return formatApiTime(value, {
    timeZone: 'Asia/Shanghai',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export interface HomeEvidencePanelProps {
  evidence: LearningEvidence[];
  evidenceLoading: boolean;
  evidenceError: boolean;
  onRetryEvidence: () => void;
  diagnosis: DiagnosisResult | null;
  sessions: LeapSession[];
  sessionsLoading: boolean;
  sessionsError: string | null;
}

export function HomeEvidencePanel({
  evidence,
  evidenceLoading,
  evidenceError,
  onRetryEvidence,
  diagnosis,
  sessions,
  sessionsLoading,
  sessionsError,
}: HomeEvidencePanelProps) {
  const latest = evidence[0] ?? null;
  const focus = diagnosis?.primaryFocus ?? null;
  const knownPoints = diagnosis ? [...diagnosis.weakPoints, ...diagnosis.developingPoints, ...diagnosis.strengths, ...diagnosis.unassessedPoints] : [];
  const pendingRetests = sessions
    .filter(session => session.phase === 'completed' && session.outcome?.retestScore === null && session.retestDueAt !== null)
    .sort((left, right) => Date.parse(left.retestDueAt!) - Date.parse(right.retestDueAt!));

  return (
    <div className='space-y-4'>
      <section className='rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] p-5 shadow-[var(--em-shadow-sm)]'>
        <div className='flex items-center justify-between gap-3'>
          <h2 className='text-base font-semibold text-[var(--em-ink)]'>学习证据账本</h2>
          <Link to='/archive' className='inline-flex items-center gap-1 text-xs font-medium text-[var(--em-primary)]'>
            查看全部 <ArrowRight className='h-3.5 w-3.5' />
          </Link>
        </div>
        {evidenceLoading ? (
          <p role='status' className='mt-4 flex min-h-28 items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--em-border-strong)] text-sm text-[var(--em-muted-ink)]'>
            <Loader2 className='h-4 w-4 animate-spin' />正在读取学习记录…
          </p>
        ) : evidenceError ? (
          <div className='mt-4 grid min-h-28 place-items-center rounded-lg border border-amber-200 bg-amber-50 px-4 text-center'>
            <div>
              <p role='alert' className='text-sm font-medium text-amber-900'>学习记录暂时无法读取。</p>
              <Button type='button' variant='outline' size='sm' className='mt-3' onClick={onRetryEvidence}>
                重新加载学习记录
              </Button>
            </div>
          </div>
        ) : latest ? (
          <article className='mt-4 rounded-lg border border-[var(--em-border)] bg-[var(--em-surface-subtle)] p-3'>
            <p className='text-xs font-medium text-[var(--em-primary)]'>{evidenceLabel(latest)}</p>
            <p className='mt-1.5 text-sm font-semibold text-[var(--em-ink)]'>
              {knownPoints.find((point) => point.knowledgePointId === latest.knowledgePointId)?.knowledgePointName ?? latest.knowledgePointId ?? '未关联知识点'}
            </p>
            <p className='mt-1 text-xs text-[var(--em-muted-ink)]'>
              {formatDate(latest.occurredAt)} · 已保存
            </p>
            {typeof latest.payload.score === 'number' && <p className="mt-3 text-sm font-semibold text-[var(--em-primary-deep)]">本次得分 {Math.round(latest.payload.score * 100)}%{latest.payload.independent === true ? ' · 无提示作答' : ''}</p>}
            {Object.keys(latest.payload).length > 0 && (
              <details className="mt-3 text-xs text-[var(--em-muted-ink)]"><summary className="cursor-pointer">查看原始证据</summary><pre className='mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-md bg-[var(--em-surface)] p-2 font-mono text-[10px] leading-5 text-[var(--em-muted-ink)]'>
                {JSON.stringify(latest.payload, null, 2)}
              </pre></details>
            )}
          </article>
        ) : (
          <div className='mt-4 grid min-h-28 place-items-center rounded-lg border border-dashed border-[var(--em-border-strong)] px-4 text-center'>
            <div>
              <ClipboardList className='mx-auto h-5 w-5 text-[var(--em-muted-ink)]' />
              <p className='mt-2 text-sm font-medium text-[var(--em-ink)]'>尚无学习记录</p>
              <p className='mt-1 text-xs text-[var(--em-muted-ink)]'>完成诊断或练习后，真实证据会显示在这里。</p>
            </div>
          </div>
        )}
        <div className='mt-4 grid grid-cols-2 divide-x divide-[var(--em-border)] border-t border-[var(--em-border)] pt-4'>
          <div className='pr-3'>
            <p className='text-xs text-[var(--em-muted-ink)]'>当前诊断重点</p>
            <p className='mt-1 text-sm font-semibold text-[var(--em-ink)]'>
              {focus ? DIAGNOSIS_STATUS_LABEL[focus.status] : '尚无诊断'}
            </p>
            {focus && <p className='mt-1 text-xs text-[var(--em-muted-ink)]'>{focus.knowledgePointName} · {focus.evidenceCount} 条证据</p>}
          </div>
          <div className='pl-3'>
            <p className='text-xs text-[var(--em-muted-ink)]'>诊断掌握度</p>
            <p className='mt-1 text-sm font-semibold text-[var(--em-ink)]'>
              {focus ? `${Math.round(focus.masteryScore * 100)}%` : '未估计'}
            </p>
            {focus && <p className='mt-1 text-xs text-[var(--em-muted-ink)]'>诊断置信度 {Math.round(focus.confidence * 100)}%</p>}
          </div>
        </div>
      </section>

      <section className='rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] p-5 shadow-[var(--em-shadow-sm)]'>
        <div className='flex items-center justify-between gap-3'>
          <div className='flex items-center gap-2'>
            <CalendarClock className='h-4 w-4 text-[var(--em-primary)]' />
            <h2 className='text-base font-semibold text-[var(--em-ink)]'>待复测</h2>
          </div>
          <Link to='/adaptive' className='inline-flex items-center gap-1 text-xs font-medium text-[var(--em-primary)]'>
            自适应学习 <ArrowRight className='h-3.5 w-3.5' />
          </Link>
        </div>
        {sessionsLoading ? (
          <p role='status' className='mt-4 flex items-center gap-2 text-sm text-[var(--em-muted-ink)]'>
            <Loader2 className='h-4 w-4 animate-spin' />正在读取复测安排…
          </p>
        ) : sessionsError ? (
          <p role='alert' className='mt-4 text-sm text-amber-800'>复测安排暂时无法读取：{sessionsError}</p>
        ) : pendingRetests.length > 0 ? (
          <ul className='mt-3 divide-y divide-[var(--em-border)]'>
            {pendingRetests.slice(0, 3).map(session => (
              <li key={session.id} className='flex items-center justify-between gap-3 py-3 first:pt-1 last:pb-0'>
                <div className='min-w-0'>
                  <p className='truncate text-sm font-medium text-[var(--em-ink)]'>{session.topicName}</p>
                  <p className={cn('mt-1 text-xs', Date.parse(session.retestDueAt!) <= Date.now() ? 'text-amber-700' : 'text-[var(--em-muted-ink)]')}>
                    {formatRetestCountdown(session.retestDueAt!)}
                  </p>
                </div>
                <Link
                  to={`/adaptive?session=${session.id}${Date.parse(session.retestDueAt!) <= Date.now() ? '&retest=1' : ''}`}
                  className='shrink-0 text-xs font-medium text-[var(--em-primary)]'
                >
                  {Date.parse(session.retestDueAt!) <= Date.now() ? '开始复测' : '查看安排'}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className='mt-4 flex items-start gap-3 rounded-lg bg-[var(--em-surface-subtle)] p-3'>
            <Target className='mt-0.5 h-4 w-4 shrink-0 text-[var(--em-muted-ink)]' />
            <p className='text-xs leading-5 text-[var(--em-muted-ink)]'>
              {ACTIVE_COURSE_ID === 'course-ds'
                ? '暂无未完成的延迟复测记录。完成一次独立验证后，有到期安排时会显示在这里。'
                : '当前课程没有可显示的 LEAP 延迟复测记录。'}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
