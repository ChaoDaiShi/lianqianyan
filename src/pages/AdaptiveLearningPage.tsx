import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileText,
  Fingerprint,
  FlaskConical,
  GitBranch,
  Layers3,
  Lightbulb,
  LockKeyhole,
  Network,
  RefreshCw,
  Sparkles,
  Target,
  Timer,
  WandSparkles,
} from 'lucide-react';
import { AxiosError } from 'axios';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { LearningDecisionCard } from '@/components/adaptive/LearningDecisionCard';
import { LeapQuestionForm } from '@/components/adaptive/LeapQuestionForm';
import { LeapTeachingView } from '@/components/adaptive/LeapTeachingView';
import { useAuth } from '@/auth/AuthProvider';
import { ACTIVE_COURSE_ID, ACTIVE_LEARNER_ID } from '@/store';
import { cn } from '@/lib/utils';
import {
  createLeapSession,
  diagnoseLeapSession,
  fetchLeapCatalog,
  fetchLeapSession,
  fetchLeapSessions,
  practiceLeapSession,
  prepareLeapProbe,
  startLeapIntervention,
  submitLeapProbe,
  submitLeapRetest,
  type ActionType,
  type ExperimentGroup,
  type LeapAblation,
  type LeapCatalog,
  type LeapSession,
  type LeapTopic,
} from '@/lib/adaptiveApi';

const PHASES = [
  { label: '发现误解', detail: '记录真实作答', icon: Fingerprint },
  { label: '教学决策', detail: '解释推荐依据', icon: BrainCircuit },
  { label: '针对性学习', detail: '选择适合的帮助', icon: Lightbulb },
  { label: '独立验证', detail: '用新题确认理解', icon: CheckCircle2 },
];
const TOPIC_ICONS = [GitBranch, Layers3, Network, WandSparkles];
const phaseIndex = (phase: LeapSession['phase']) =>
  ({ diagnostic: 0, decision: 1, teaching: 2, probe: 3, completed: 4 })[phase];
const percent = (value: number | null) =>
  value === null ? '未知' : `${Math.round(value * 100)}%`;
const evidenceNames = {
  diagnostic: '初次诊断',
  intervention: '教学干预',
  practice: '辅助练习',
  probe: '独立验证',
  retest: '延迟复测',
};

function errorMessage(cause: unknown) {
  if (cause instanceof AxiosError) {
    const detail = cause.response?.data?.detail;
    if (typeof detail === 'string') return detail;
  }
  return cause instanceof Error ? cause.message : '这次操作未能完成，请重试。';
}

export function AdaptiveLearningPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [initialQuery] = useState(() => ({
    session: searchParams.get('session'),
    topic: searchParams.get('topic'),
    retest: searchParams.get('retest') === '1',
  }));
  const auth = useAuth();
  const [catalog, setCatalog] = useState<LeapCatalog | null>(null);
  const [sessions, setSessions] = useState<LeapSession[]>([]);
  const [session, setSession] = useState<LeapSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<ExperimentGroup>('D');
  const [ablation, setAblation] = useState<LeapAblation>('none');
  const [timeBudget, setTimeBudget] = useState(5);
  const [adjusting, setAdjusting] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const [showPractice, setShowPractice] = useState(false);
  const [showRetest, setShowRetest] = useState(initialQuery.retest);
  const supported = ACTIVE_COURSE_ID === 'course-ds';

  const load = useCallback(async () => {
    if (!supported) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [nextCatalog, nextSessions] = await Promise.all([
        fetchLeapCatalog(),
        fetchLeapSessions(ACTIVE_LEARNER_ID, ACTIVE_COURSE_ID),
      ]);
      setCatalog(nextCatalog);
      setSessions(nextSessions);
      const active = initialQuery.session
        ? (nextSessions.find(item => item.id === initialQuery.session) ??
          (await fetchLeapSession(initialQuery.session)))
        : initialQuery.topic
          ? null
          : (nextSessions.find(item => item.phase !== 'completed') ?? null);
      setSession(active);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [initialQuery, supported]);
  useEffect(() => {
    void load();
  }, [load]);

  const requestedSessionId = searchParams.get('session');
  const requestedRetest = searchParams.get('retest') === '1';
  useEffect(() => {
    if (!requestedSessionId || loading || !supported) return;
    const saved = sessions.find(item => item.id === requestedSessionId);
    if (saved) {
      setSession(saved);
      return;
    }
    void fetchLeapSession(requestedSessionId)
      .then(next => {
        setSession(next);
        setSessions(current => [
          next,
          ...current.filter(item => item.id !== next.id),
        ]);
      })
      .catch(cause => setError(errorMessage(cause)));
  }, [requestedSessionId, loading, sessions, supported]);
  useEffect(() => {
    setShowRetest(requestedRetest);
  }, [requestedRetest]);

  const run = async (operation: () => Promise<LeapSession>) => {
    setBusy(true);
    setError(null);
    try {
      const next = await operation();
      setSession(next);
      setSessions(current => [
        next,
        ...current.filter(item => item.id !== next.id),
      ]);
      setSearchParams({ session: next.id });
      setAdjusting(false);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };
  const startTopic = (topicId: string, fromSessionId?: string) => {
    setShowRetest(false);
    setShowPractice(false);
    setShowEvidence(false);
    void run(() =>
      createLeapSession({
        learnerId: ACTIVE_LEARNER_ID,
        courseId: ACTIVE_COURSE_ID,
        topicId,
        policy:
          selectedGroup === 'D' || selectedGroup === 'C' ? 'leap' : 'fixed',
        experimentGroup: selectedGroup,
        ablation,
        timeBudgetMinutes: timeBudget,
        ...(fromSessionId ? { fromSessionId } : {}),
      })
    );
  };
  const chooseTopic = () => {
    setSession(null);
    setSearchParams({});
    setError(null);
    setShowRetest(false);
  };
  const topic = catalog?.topics.find(item => item.id === session?.topicId);
  const completed = session?.phase === 'completed';
  const retestDue = session?.retestDueAt
    ? Date.parse(session.retestDueAt) <= Date.now()
    : false;
  const independentMode =
    session?.phase === 'probe' ||
    (showRetest &&
      completed &&
      retestDue &&
      session?.outcome?.retestScore === null);

  return (
    <AppShell scene='galaxy'>
      <div
        className='mx-auto max-w-[1280px] space-y-5'
        data-testid='leap-workbench'
      >
        <header className='relative overflow-hidden rounded-[28px] border border-white/90 bg-gradient-to-br from-white/95 via-violet-50/90 to-sky-50/80 p-5 shadow-[0_8px_36px_rgba(97,74,153,.05)] sm:p-7'>
          <div className='pointer-events-none absolute -right-12 -top-16 h-72 w-72 rounded-full border-[45px] border-violet-200/15' />
          <div className='relative flex flex-wrap items-start justify-between gap-4'>
            <div className='max-w-2xl'>
              <p className='flex items-center gap-2 text-[11px] font-semibold tracking-[.18em] text-violet-600'>
                <Sparkles className='h-4 w-4' />
                LIAN-LEAP · 自适应教学
              </p>
              <h1 className='mt-3 text-2xl font-bold leading-tight tracking-tight text-slate-800 sm:text-[30px]'>
                让每一次帮助，都有学习证据。
              </h1>
              <p className='mt-3 text-sm leading-6 text-slate-500'>
                找到理解中的卡点，选择适合你的教学方式，再用一道新题确认：你真的会了。
              </p>
            </div>
            <Button asChild variant='outline' size='sm' className='bg-white/70'>
              <Link to='/outcome-lab'>
                <FlaskConical className='h-4 w-4' />
                成效观察
              </Link>
            </Button>
          </div>
          <div className='relative mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4'>
            {PHASES.map((phase, index) => {
              const Icon = phase.icon;
              const position = session ? phaseIndex(session.phase) : 0;
              const active = session ? position === index : index === 0;
              const done = session ? position > index : false;
              return (
                <div
                  key={phase.label}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl border px-3 py-3 transition sm:px-4',
                    active
                      ? 'border-violet-200 bg-white shadow-sm'
                      : 'border-transparent bg-white/45'
                  )}
                >
                  <span
                    className={cn(
                      'grid h-9 w-9 shrink-0 place-items-center rounded-xl',
                      done
                        ? 'bg-emerald-100 text-emerald-600'
                        : active
                          ? 'bg-violet-600 text-white shadow-[0_4px_12px_rgba(124,58,237,.2)]'
                          : 'bg-violet-100/70 text-violet-400'
                    )}
                  >
                    {done ? (
                      <Check className='h-4 w-4' />
                    ) : (
                      <Icon className='h-4 w-4' />
                    )}
                  </span>
                  <div>
                    <p
                      className={cn(
                        'text-xs font-semibold',
                        active ? 'text-violet-800' : 'text-slate-600'
                      )}
                    >
                      <span className='mr-1 text-[10px] opacity-50'>
                        0{index + 1}
                      </span>
                      {phase.label}
                    </p>
                    <p className='mt-1 text-[10px] text-slate-400'>
                      {phase.detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </header>

        {!supported && (
          <section className='rounded-[26px] border border-violet-100 bg-white/80 p-8 text-center'>
            <BookOpen className='mx-auto h-10 w-10 text-violet-400' />
            <h2 className='mt-4 text-xl font-bold'>从《数据结构与算法》开始</h2>
            <p className='mx-auto mt-3 max-w-lg text-sm leading-7 text-slate-500'>
              LEAP
              本轮提供链表、栈与队列、二叉搜索树和图搜索的完整教学闭环。切换课程后，你可以开始一次真实诊断。
            </p>
            <Button
              className='mt-5'
              disabled={auth.busy}
              onClick={() => void auth.selectCourse('course-ds')}
            >
              切换至数据结构课程
              <ArrowRight className='h-4 w-4' />
            </Button>
            {auth.error && (
              <p role='alert' className='mt-3 text-sm text-rose-600'>
                {auth.error}
              </p>
            )}
          </section>
        )}
        {supported && loading && (
          <div
            role='status'
            className='rounded-[26px] border border-violet-100 bg-white/70 p-12 text-center text-sm text-violet-600'
          >
            正在恢复学习会话与课程证据…
          </div>
        )}
        {error && (
          <div
            role='alert'
            className='flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700'
          >
            <p>{error}</p>
            {!session && (
              <Button size='sm' variant='outline' onClick={() => void load()}>
                <RefreshCw className='h-4 w-4' />
                重新加载
              </Button>
            )}
          </div>
        )}

        {supported && !loading && catalog && !session && (
          <>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <div>
                <h2 className='text-lg font-bold text-slate-800'>
                  今天，我们先弄懂一个问题。
                </h2>
                <p className='mt-1 text-xs leading-6 text-slate-500'>
                  从短诊断开始。你的回答会决定接下来怎么学。
                </p>
              </div>
              <span className='rounded-full border border-violet-100 bg-white/80 px-3 py-1.5 text-[11px] text-violet-600'>
                数据结构与算法 · 4 个核心概念
              </span>
            </div>
            <div className='grid gap-4 sm:grid-cols-2'>
              {catalog.topics.map((item, index) => (
                <TopicCard
                  key={item.id}
                  topic={item}
                  index={index}
                  selected={initialQuery.topic === item.id}
                  busy={busy}
                  onStart={() => startTopic(item.id)}
                />
              ))}
            </div>
            <div className='grid gap-4 lg:grid-cols-[1fr_1fr]'>
              <section className='rounded-[24px] border border-violet-100 bg-white/75 p-5'>
                <div className='flex items-center gap-2'>
                  <Timer className='h-4 w-4 text-violet-500' />
                  <h3 className='text-sm font-semibold text-slate-700'>
                    这次留给学习的时间
                  </h3>
                </div>
                <div className='mt-4 flex gap-2'>
                  {[3, 5, 10, 15].map(minutes => (
                    <button
                      key={minutes}
                      onClick={() => setTimeBudget(minutes)}
                      className={cn(
                        'rounded-xl border px-4 py-2 text-xs font-semibold',
                        timeBudget === minutes
                          ? 'border-violet-400 bg-violet-50 text-violet-700'
                          : 'border-slate-200 bg-white text-slate-500'
                      )}
                    >
                      {minutes} 分钟
                    </button>
                  ))}
                </div>
                <p className='mt-3 text-[11px] leading-5 text-slate-400'>
                  教学行动会综合概念误解、前置关系和你的时间预算。
                </p>
              </section>
              <section className='rounded-[24px] border border-violet-100 bg-white/75 p-5'>
                <p className='flex items-center gap-2 text-sm font-semibold text-slate-700'>
                  <LockKeyhole className='h-4 w-4 text-emerald-500' />
                  以独立作答确认学习结果
                </p>
                <p className='mt-3 text-xs leading-6 text-slate-500'>
                  “听懂了”和“能独立解决”是两种证据。教学结束后会收起讲解，用另一道题验证理解；结果将直接影响下一次学习建议。
                </p>
              </section>
            </div>
            <details className='rounded-[22px] border border-violet-100 bg-white/55 px-5 py-4'>
              <summary className='cursor-pointer text-xs font-semibold text-slate-500'>
                策略对照与消融设置 · 用于比较同一课程下的教学机制
              </summary>
              <div className='mt-4 grid gap-4 sm:grid-cols-2'>
                <label className='text-xs text-slate-500'>
                  本次策略
                  <select
                    value={selectedGroup}
                    onChange={event =>
                      setSelectedGroup(event.target.value as ExperimentGroup)
                    }
                    className='mt-2 block w-full rounded-xl border border-violet-200 bg-white p-3 text-sm'
                  >
                    <option value='D'>D · LEAP 完整机制（默认）</option>
                    <option value='C'>C · 学习证据动态策略</option>
                    <option value='B'>B · 课程约束固定策略</option>
                    <option value='A'>A · 通用固定讲解基线</option>
                  </select>
                </label>
                <label className='text-xs text-slate-500'>
                  关闭单个决策要素
                  <select
                    value={ablation}
                    onChange={event =>
                      setAblation(event.target.value as LeapAblation)
                    }
                    disabled={selectedGroup !== 'D'}
                    className='mt-2 block w-full rounded-xl border border-violet-200 bg-white p-3 text-sm disabled:opacity-50'
                  >
                    <option value='none'>完整机制</option>
                    <option value='misconception'>关闭误解匹配</option>
                    <option value='prerequisites'>关闭前置关系</option>
                    <option value='ranking'>关闭候选行动排序</option>
                  </select>
                </label>
              </div>
              <p className='mt-3 text-[11px] leading-5 text-slate-400'>
                策略标签用于记录机制对照。本页不会将规则策略成绩包装为已完成的随机对照研究。
              </p>
            </details>
            {sessions.length > 0 && (
              <RecentSessions
                sessions={sessions}
                onResume={item => {
                  setSession(item);
                  setSearchParams({ session: item.id });
                  setShowRetest(false);
                }}
              />
            )}
          </>
        )}

        {supported && !loading && session && (
          <>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <div className='flex items-center gap-2 text-xs text-slate-500'>
                <span className='rounded-lg bg-violet-100/70 px-2 py-1 text-violet-600'>
                  数据结构
                </span>
                <ChevronDown className='h-3 w-3 -rotate-90' />
                <strong className='font-semibold text-slate-700'>
                  {session.topicName}
                </strong>
              </div>
              <button
                onClick={chooseTopic}
                className='flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-800'
              >
                <ArrowLeft className='h-3.5 w-3.5' />
                选择其他概念
              </button>
            </div>
            <div className='grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_290px]'>
              <div className='min-w-0 space-y-4'>
                {session.phase === 'diagnostic' && (
                  <LeapQuestionForm
                    key={session.diagnosticQuestion.id}
                    question={session.diagnosticQuestion}
                    label='01 · 微型诊断 / 从你的理解出发'
                    busy={busy}
                    submitLabel='提交并生成教学建议'
                    onSubmit={answer =>
                      void run(() => diagnoseLeapSession(session.id, answer))
                    }
                  />
                )}
                {session.phase === 'decision' && (
                  <>
                    {session.diagnosis && (
                      <MisconceptionNotice session={session} />
                    )}
                    <LearningDecisionCard
                      session={session}
                      busy={busy}
                      onStart={() =>
                        void run(() => startLeapIntervention(session.id))
                      }
                      onAdjust={() => setAdjusting(!adjusting)}
                      onEvidence={() => setShowEvidence(!showEvidence)}
                    />
                  </>
                )}
                {adjusting && topic && (
                  <StrategyPicker
                    session={session}
                    topic={topic}
                    busy={busy}
                    onChoose={action =>
                      void run(() => startLeapIntervention(session.id, action))
                    }
                  />
                )}
                {showEvidence && !independentMode && (
                  <EvidenceDetail session={session} />
                )}
                {session.phase === 'teaching' && session.teaching && (
                  <>
                    <div className='flex items-center justify-between rounded-2xl border border-violet-100 bg-white/60 px-4 py-3'>
                      <span className='flex items-center gap-2 text-xs font-semibold text-violet-700'>
                        <Sparkles className='h-4 w-4' />
                        当前方式：{session.decision?.label}
                      </span>
                      <button
                        onClick={() => setAdjusting(!adjusting)}
                        className='text-xs text-slate-500 underline decoration-violet-200 underline-offset-4'
                      >
                        换一种方式
                      </button>
                    </div>
                    <LeapTeachingView
                      teaching={session.teaching}
                      topicId={session.topicId}
                      busy={busy}
                      onProbe={() =>
                        void run(() => prepareLeapProbe(session.id))
                      }
                    />
                    {session.practiceQuestion && (
                      <>
                        <button
                          onClick={() => setShowPractice(!showPractice)}
                          className='flex items-center gap-2 px-2 text-xs font-semibold text-violet-600'
                        >
                          <BookOpen className='h-4 w-4' />
                          {showPractice
                            ? '收起辅助练习'
                            : '还想试一题？先做一次辅助练习'}
                          <ChevronDown
                            className={cn(
                              'h-3.5 w-3.5 transition',
                              showPractice && 'rotate-180'
                            )}
                          />
                        </button>
                        {showPractice && (
                          <LeapQuestionForm
                            key={session.practiceQuestion.id}
                            question={session.practiceQuestion}
                            label='辅助练习 · 可参考上方讲解'
                            busy={busy}
                            submitLabel='记录练习结果'
                            onSubmit={answer =>
                              void run(() =>
                                practiceLeapSession(session.id, {
                                  ...answer,
                                  hintUsed: true,
                                })
                              )
                            }
                          />
                        )}
                      </>
                    )}
                  </>
                )}
                {session.phase === 'probe' && session.probeQuestion && (
                  <LeapQuestionForm
                    key={session.probeQuestion.id}
                    question={session.probeQuestion}
                    label='04 · 未见新题 / 独立验证'
                    independent
                    busy={busy}
                    submitLabel='提交独立作答'
                    onSubmit={answer =>
                      void run(() => submitLeapProbe(session.id, answer))
                    }
                  />
                )}
                {completed && session.outcome && (
                  <>
                    {showRetest &&
                    retestDue &&
                    session.retestQuestion &&
                    session.outcome.retestScore === null ? (
                      <LeapQuestionForm
                        key={session.retestQuestion.id}
                        question={session.retestQuestion}
                        label='7 天延迟复测 · 确认理解的保持'
                        independent
                        busy={busy}
                        submitLabel='提交延迟复测'
                        onSubmit={answer =>
                          void run(() => submitLeapRetest(session.id, answer))
                        }
                      />
                    ) : (
                      <OutcomeCard
                        session={session}
                        busy={busy}
                        onNext={() =>
                          startTopic(
                            session.nextStep?.topicId ?? session.topicId,
                            session.id
                          )
                        }
                        onRetest={() => setShowRetest(true)}
                      />
                    )}
                    {!independentMode && (
                      <LearningDecisionCard
                        session={session}
                        compact
                        onEvidence={() => setShowEvidence(!showEvidence)}
                      />
                    )}
                  </>
                )}
              </div>
              <aside className='space-y-4 xl:sticky xl:top-24'>
                <KnowledgeStateCard session={session} />
                <EvidenceRail
                  session={session}
                  independent={Boolean(independentMode)}
                />
                <section className='rounded-[22px] border border-violet-100 bg-white/60 p-4'>
                  <p className='flex items-center gap-2 text-xs font-semibold text-slate-600'>
                    <GitBranch className='h-4 w-4 text-violet-400' />
                    课程前置关系
                  </p>
                  <div className='mt-3 space-y-2'>
                    {(
                      session.diagnosis?.prerequisites ??
                      topic?.prerequisites.map(point => ({
                        ...point,
                        status: 'unknown' as const,
                      })) ??
                      []
                    ).map(point => (
                      <div
                        key={point.id}
                        className='flex items-center justify-between gap-2 rounded-xl bg-slate-50/80 p-2.5 text-[11px]'
                      >
                        <span className='text-slate-600'>{point.name}</span>
                        <span
                          className={
                            point.status === 'gap'
                              ? 'text-amber-600'
                              : point.status === 'supported'
                                ? 'text-emerald-600'
                                : 'text-slate-400'
                          }
                        >
                          {point.status === 'gap'
                            ? '需要补强'
                            : point.status === 'supported'
                              ? '已有证据'
                              : '待观察'}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className='mt-3 text-[10px] leading-5 text-slate-400'>
                    会话自动保存 · 再次进入可继续学习
                  </p>
                </section>
              </aside>
            </div>
          </>
        )}
        {catalog && (
          <footer className='flex flex-wrap justify-between gap-2 px-1 text-[10px] leading-5 text-slate-400'>
            <p>
              Learning Evidence–Driven Adaptive Pedagogy · {catalog.version}
            </p>
            <p>课程内容已版本化 · 教师审核待完成</p>
          </footer>
        )}
      </div>
    </AppShell>
  );
}

function TopicCard({
  topic,
  index,
  busy,
  selected,
  onStart,
}: {
  topic: LeapTopic;
  index: number;
  busy: boolean;
  selected: boolean;
  onStart: () => void;
}) {
  const Icon = TOPIC_ICONS[index % TOPIC_ICONS.length];
  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-[26px] border bg-white/85 p-5 transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(105,82,185,.07)] sm:p-6',
        selected ? 'border-violet-400' : 'border-violet-100/90'
      )}
    >
      <div className='flex items-start justify-between'>
        <span
          className={cn(
            'grid h-11 w-11 place-items-center rounded-2xl',
            index % 2
              ? 'bg-sky-50 text-sky-500'
              : 'bg-violet-50 text-violet-500'
          )}
        >
          <Icon className='h-5 w-5' />
        </span>
        <span className='font-mono text-[10px] text-slate-300'>
          CONCEPT / 0{index + 1}
        </span>
      </div>
      <h3 className='mt-5 text-lg font-bold text-slate-800'>{topic.name}</h3>
      <p className='mt-2 min-h-[48px] text-xs leading-6 text-slate-500'>
        {topic.description}
      </p>
      <div className='mt-4 flex flex-wrap gap-1.5'>
        {topic.prerequisites.map(point => (
          <span
            key={point.id}
            className='rounded-full bg-slate-50 px-2.5 py-1 text-[10px] text-slate-500'
          >
            {point.name}
          </span>
        ))}
      </div>
      <div className='mt-5 flex items-center justify-between border-t border-slate-100 pt-4'>
        <p className='flex items-center gap-1.5 text-[11px] text-slate-400'>
          <Clock3 className='h-3 w-3' />
          一次诊断 → 一次独立验证
        </p>
        <Button size='sm' variant='secondary' disabled={busy} onClick={onStart}>
          开始诊断
          <ArrowRight className='h-3.5 w-3.5' />
        </Button>
      </div>
    </article>
  );
}

function MisconceptionNotice({ session }: { session: LeapSession }) {
  const diagnosis = session.diagnosis!;
  return (
    <section className='rounded-[24px] border border-amber-100 bg-amber-50/75 p-5'>
      <div className='flex items-start gap-3'>
        <span className='grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-amber-500'>
          <Lightbulb className='h-5 w-5' />
        </span>
        <div>
          <p className='text-[11px] font-semibold text-amber-600'>
            {diagnosis.misconceptionCode
              ? `发现一个可能的概念误解 · ${diagnosis.misconceptionCode}`
              : '从你的作答观察理解状态'}
          </p>
          <h2 className='mt-2 text-base font-bold text-slate-800'>
            {diagnosis.title}
          </h2>
          <p className='mt-2 text-sm leading-7 text-slate-600'>
            {diagnosis.reason}
          </p>
          <p className='mt-3 text-[10px] text-amber-700/70'>
            {diagnosis.needsProbe
              ? '这是待验证的误解假设，独立新题会提供进一步证据。'
              : '结论依据当前作答，仍会通过独立新题验证。'}
          </p>
        </div>
      </div>
    </section>
  );
}

function KnowledgeStateCard({ session }: { session: LeapSession }) {
  const state = session.state;
  return (
    <section className='rounded-[24px] border border-violet-100 bg-white/85 p-5'>
      <p className='flex items-center gap-2 text-xs font-semibold text-slate-700'>
        <BrainCircuit className='h-4 w-4 text-violet-500' />
        你的学习状态
      </p>
      <div className='mt-5 grid grid-cols-2 gap-3'>
        <div>
          <p className='text-[10px] text-slate-400'>M · 掌握度估计</p>
          <p className='mt-2 text-2xl font-bold tracking-tight text-violet-600'>
            {percent(state.mastery)}
          </p>
        </div>
        <div>
          <p className='text-[10px] text-slate-400'>U · 不确定性</p>
          <p className='mt-2 text-2xl font-bold tracking-tight text-slate-600'>
            {percent(state.uncertainty)}
          </p>
        </div>
      </div>
      <div className='mt-4 h-1.5 overflow-hidden rounded-full bg-violet-50'>
        <div
          className='h-full rounded-full bg-gradient-to-r from-violet-400 to-sky-400 transition-all'
          style={{ width: `${(state.mastery ?? 0) * 100}%` }}
        />
      </div>
      <p className='mt-3 text-[10px] leading-5 text-slate-400'>
        基于 {state.evidenceCount} 条评价证据。掌握估计与独立测评成绩分别记录。
      </p>
      {state.misconceptions.length > 0 && (
        <div className='mt-4 border-t border-slate-100 pt-4'>
          <p className='text-[10px] text-slate-400'>Q · 误解候选</p>
          {state.misconceptions.map(item => (
            <div
              key={item.code}
              className='mt-2 flex items-center justify-between rounded-lg bg-amber-50/70 px-3 py-2 text-[11px]'
            >
              <span className='font-mono text-amber-700'>{item.code}</span>
              <span className='font-semibold text-amber-600'>
                {percent(item.probability)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function EvidenceRail({
  session,
  independent = false,
}: {
  session: LeapSession;
  independent?: boolean;
}) {
  if (independent)
    return (
      <section className='rounded-[24px] border border-emerald-100 bg-white/80 p-5'>
        <p className='flex items-center gap-2 text-xs font-semibold text-emerald-700'>
          <LockKeyhole className='h-4 w-4' />
          独立验证进行中
        </p>
        <p className='mt-3 text-xs leading-6 text-slate-400'>
          已有 {session.evidence.length}{' '}
          条学习证据保存。作答结束后，可以回看原始答案、教学过程和评分依据。
        </p>
      </section>
    );
  return (
    <section className='rounded-[24px] border border-violet-100 bg-white/80 p-5'>
      <div className='flex items-center justify-between'>
        <p className='flex items-center gap-2 text-xs font-semibold text-slate-700'>
          <Fingerprint className='h-4 w-4 text-violet-500' />
          本次学习证据
        </p>
        <span className='rounded-full bg-violet-50 px-2 py-0.5 text-[10px] text-violet-500'>
          {session.evidence.length}
        </span>
      </div>
      {session.evidence.length === 0 ? (
        <p className='mt-4 text-xs leading-6 text-slate-400'>
          你的第一次回答将成为学习的起点。
        </p>
      ) : (
        <div className='mt-4 space-y-0'>
          {session.evidence.slice(-4).map((item, index) => (
            <div key={item.id} className='relative flex gap-3 pb-4 last:pb-0'>
              <div className='relative mt-1'>
                <span
                  className={cn(
                    'relative z-10 block h-2 w-2 rounded-full ring-4 ring-white',
                    item.kind === 'probe' ? 'bg-emerald-400' : 'bg-violet-300'
                  )}
                />
                {index < session.evidence.slice(-4).length - 1 && (
                  <span className='absolute left-[3px] top-3 h-[calc(100%+20px)] w-px bg-violet-100' />
                )}
              </div>
              <div className='min-w-0 flex-1'>
                <div className='flex items-center justify-between gap-2'>
                  <p className='text-[11px] font-semibold text-slate-600'>
                    {evidenceNames[item.kind]}
                  </p>
                  {item.score !== null && (
                    <p className='text-[10px] font-semibold text-violet-600'>
                      {percent(item.score)}
                    </p>
                  )}
                </div>
                <p className='mt-1 break-words text-[11px] leading-5 text-slate-400'>
                  {item.summary}
                </p>
                <p className='mt-1 font-mono text-[9px] text-slate-300'>
                  {item.questionId ?? item.id.slice(0, 8)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function StrategyPicker({
  session,
  topic,
  busy,
  onChoose,
}: {
  session: LeapSession;
  topic: LeapTopic;
  busy: boolean;
  onChoose: (action: ActionType) => void;
}) {
  return (
    <section className='rounded-[24px] border border-violet-100 bg-white/85 p-5'>
      <h3 className='text-sm font-semibold text-slate-700'>
        选择更适合你的教学方式
      </h3>
      <p className='mt-1 text-xs leading-6 text-slate-400'>
        调整会作为本次教学决策的一部分记录。
      </p>
      <div className='mt-4 grid gap-2 sm:grid-cols-2'>
        {topic.strategies.map(action => (
          <button
            key={action.type}
            disabled={busy}
            onClick={() => onChoose(action.type)}
            className={cn(
              'rounded-xl border p-3 text-left transition hover:border-violet-300 disabled:opacity-50',
              action.type === session.decision?.actionType
                ? 'border-violet-300 bg-violet-50'
                : 'border-slate-200 bg-white'
            )}
          >
            <p className='text-xs font-semibold text-slate-700'>
              {action.label}
              <span className='float-right text-[10px] font-normal text-slate-400'>
                {action.minutes} 分钟
              </span>
            </p>
            <p className='mt-1 text-[11px] leading-5 text-slate-500'>
              {action.description}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}

function EvidenceDetail({ session }: { session: LeapSession }) {
  return (
    <section className='rounded-[24px] border border-violet-100 bg-white/85 p-5'>
      <h3 className='flex items-center gap-2 text-sm font-semibold text-slate-700'>
        <FileText className='h-4 w-4 text-violet-500' />
        为什么推荐这个学习行动？
      </h3>
      <div className='mt-4 space-y-3'>
        {session.evidence.map(item => (
          <div key={item.id} className='rounded-xl bg-slate-50/80 p-3'>
            <p className='text-[11px] font-semibold text-slate-600'>
              {evidenceNames[item.kind]} · {item.questionId ?? '教学记录'}
            </p>
            <p className='mt-2 whitespace-pre-line text-xs leading-6 text-slate-500'>
              {item.answer ?? item.summary}
            </p>
          </div>
        ))}
      </div>
      {session.decision && (
        <div className='mt-5'>
          <p className='mb-3 text-xs font-semibold text-slate-600'>
            候选行动排序
          </p>
          {session.decision.candidates.map(candidate => (
            <div
              key={candidate.actionType}
              className='mt-2 rounded-xl border border-slate-100 p-3'
            >
              <div className='flex items-center justify-between text-xs'>
                <span className='font-semibold text-slate-600'>
                  {candidate.label}
                </span>
                <span className='font-mono text-violet-600'>
                  {candidate.score.toFixed(2)}
                </span>
              </div>
              <p className='mt-1 text-[11px] leading-5 text-slate-400'>
                {candidate.reason}
              </p>
              <div className='mt-2 flex flex-wrap gap-2 text-[9px] text-slate-400'>
                <span>
                  误解匹配 {candidate.factors.misconception.toFixed(2)}
                </span>
                <span>
                  前置价值 {candidate.factors.prerequisite.toFixed(2)}
                </span>
                <span>信息价值 {candidate.factors.information.toFixed(2)}</span>
                <span>时长匹配 {candidate.factors.time.toFixed(2)}</span>
                <span>成本 {candidate.factors.cost.toFixed(2)}</span>
              </div>
            </div>
          ))}
          <p className='mt-3 text-[10px] text-slate-400'>
            规则策略版本：{session.policyVersion} · 分数表示策略排序依据。
          </p>
        </div>
      )}
    </section>
  );
}

function OutcomeCard({
  session,
  busy,
  onNext,
  onRetest,
}: {
  session: LeapSession;
  busy: boolean;
  onNext: () => void;
  onRetest: () => void;
}) {
  const outcome = session.outcome!;
  const due = session.retestDueAt
    ? Date.parse(session.retestDueAt) <= Date.now()
    : false;
  return (
    <section className='overflow-hidden rounded-[26px] border border-emerald-100 bg-white/90 p-5 sm:p-7'>
      <div className='flex items-start gap-4'>
        <span
          className={cn(
            'grid h-12 w-12 shrink-0 place-items-center rounded-2xl',
            outcome.correct
              ? 'bg-emerald-50 text-emerald-500'
              : 'bg-amber-50 text-amber-500'
          )}
        >
          <CheckCircle2 className='h-6 w-6' />
        </span>
        <div>
          <p className='text-[11px] font-semibold text-emerald-600'>
            本次独立验证已记录
          </p>
          <h2 className='mt-2 text-xl font-bold text-slate-800'>
            {outcome.correct
              ? '这次，你能独立解决了。'
              : '找到还需要再练的地方。'}
          </h2>
          <p className='mt-2 text-sm leading-7 text-slate-500'>
            {outcome.feedback}
          </p>
        </div>
      </div>
      <div className='mt-6 grid grid-cols-3 gap-3'>
        <ScoreTile label='初次诊断' value={percent(outcome.preScore)} />
        <ScoreTile label='独立新题' value={percent(outcome.postScore)} accent />
        <ScoreTile
          label='观察到的变化'
          value={`${outcome.observedGain > 0 ? '+' : ''}${Math.round(outcome.observedGain * 100)} 分`}
        />
      </div>
      <p className='mt-3 text-[10px] leading-5 text-slate-400'>
        以上是本次实际作答成绩，单次前后变化不能用于证明教学的因果效果。
      </p>
      <div className='mt-5 flex flex-wrap gap-2'>
        <span className='rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] text-emerald-700'>
          无提示 · {outcome.durationSeconds} 秒
        </span>
        <span className='rounded-full bg-violet-50 px-3 py-1.5 text-[11px] text-violet-700'>
          {outcome.misconceptionStatus === 'repaired'
            ? '目标误解在新题中得到修复证据'
            : outcome.misconceptionStatus === 'persisting'
              ? '误解仍待修复'
              : '误解假设继续观察'}
        </span>
      </div>
      <div className='mt-5 rounded-2xl border border-violet-100 bg-violet-50/50 p-4'>
        <p className='flex items-center gap-2 text-xs font-semibold text-violet-700'>
          <GitBranch className='h-4 w-4' />
          学习路线已更新
        </p>
        <h3 className='mt-2 text-sm font-semibold text-slate-700'>
          {session.nextStep?.title}
        </h3>
        <p className='mt-2 text-xs leading-6 text-slate-500'>
          {session.nextStep?.reason}
        </p>
      </div>
      {session.retestDueAt && (
        <div className='mt-4 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-6 text-slate-500'>
          <Clock3 className='mt-1 h-4 w-4 shrink-0 text-slate-400' />
          <p>
            {outcome.retestScore === null
              ? `延迟复测安排在 ${new Date(session.retestDueAt).toLocaleDateString('zh-CN')}，到期后用另一道题观察保持情况。`
              : `延迟复测已完成，独立成绩 ${percent(outcome.retestScore)}。`}
          </p>
        </div>
      )}
      <div className='mt-5 flex flex-wrap gap-2'>
        <Button onClick={onNext} disabled={busy}>
          开始下一步
          <ArrowRight className='h-4 w-4' />
        </Button>
        {due && outcome.retestScore === null && (
          <Button onClick={onRetest} variant='outline'>
            开始延迟复测
          </Button>
        )}
        <Button asChild variant='ghost'>
          <Link to='/outcome-lab'>查看成效记录</Link>
        </Button>
      </div>
    </section>
  );
}

function ScoreTile({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border p-3 sm:p-4',
        accent
          ? 'border-emerald-100 bg-emerald-50/70'
          : 'border-slate-100 bg-slate-50/70'
      )}
    >
      <p className='text-[10px] text-slate-500'>{label}</p>
      <p
        className={cn(
          'mt-2 text-xl font-bold tracking-tight sm:text-2xl',
          accent ? 'text-emerald-600' : 'text-slate-700'
        )}
      >
        {value}
      </p>
    </div>
  );
}

function RecentSessions({
  sessions,
  onResume,
}: {
  sessions: LeapSession[];
  onResume: (session: LeapSession) => void;
}) {
  return (
    <section className='rounded-[24px] border border-violet-100 bg-white/75 p-5'>
      <h3 className='flex items-center gap-2 text-sm font-semibold text-slate-700'>
        <Target className='h-4 w-4 text-violet-500' />
        最近的学习会话
      </h3>
      <div className='mt-3 divide-y divide-slate-100'>
        {sessions.slice(0, 5).map(item => (
          <button
            onClick={() => onResume(item)}
            key={item.id}
            className='flex w-full items-center justify-between gap-3 py-3 text-left'
          >
            <div>
              <p className='text-xs font-semibold text-slate-700'>
                {item.topicName}
              </p>
              <p className='mt-1 text-[10px] text-slate-400'>
                {new Date(item.updatedAt).toLocaleString('zh-CN', {
                  month: 'numeric',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                · {item.phase === 'completed' ? '已完成独立验证' : '可以继续'}
              </p>
            </div>
            <span className='flex items-center gap-1 text-xs text-violet-600'>
              {item.phase === 'completed' ? '查看结果' : '继续学习'}
              <ArrowRight className='h-3 w-3' />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
