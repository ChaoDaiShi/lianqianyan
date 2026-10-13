import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Download,
  Fingerprint,
  FlaskConical,
  GitBranch,
  LockKeyhole,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { useApi } from '@/lib/services';
import {
  exportLeapExperiments,
  fetchLeapOverview,
  type LeapExperiment,
  type LeapSession,
} from '@/lib/adaptiveApi';
import { ACTIVE_COURSE_ID, ACTIVE_LEARNER_ID } from '@/store';
import { cn } from '@/lib/utils';

const percent = (score: number | null) =>
  score === null ? '待采集' : `${Math.round(score * 100)}%`;
const groupNames = {
  A: '通用固定基线',
  B: '课程固定策略',
  C: '证据动态策略',
  D: 'LEAP 完整机制',
};

export function OutcomeLabPage() {
  const overview = useApi(
    () =>
      ACTIVE_COURSE_ID === 'course-ds'
        ? fetchLeapOverview(ACTIVE_LEARNER_ID, ACTIVE_COURSE_ID)
        : Promise.resolve(null),
    []
  );
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const data = overview.data;
  const completed = data?.sessions.filter(session => session.outcome) ?? [];
  const selected =
    completed.find(session => session.id === selectedId) ?? completed[0];
  const exportData = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const payload = await exportLeapExperiments(
        ACTIVE_LEARNER_ID,
        ACTIVE_COURSE_ID
      );
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(payload, null, 2)], {
          type: 'application/json;charset=utf-8',
        })
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = `lian-leap-outcomes-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setExportError(
        cause instanceof Error ? cause.message : '导出未完成，请重试。'
      );
    } finally {
      setExporting(false);
    }
  };
  return (
    <AppShell scene='galaxy'>
      <div
        className='mx-auto max-w-[1280px] space-y-5'
        data-testid='leap-outcome-lab'
      >
        <header className='relative overflow-hidden rounded-[28px] border border-white/90 bg-gradient-to-br from-white/95 via-violet-50/80 to-sky-50/80 p-5 sm:p-7'>
          <div className='pointer-events-none absolute -right-6 -top-12 h-64 w-64 rounded-full border-[38px] border-sky-100/40' />
          <div className='relative flex flex-wrap items-start justify-between gap-4'>
            <div>
              <p className='flex items-center gap-2 text-[11px] font-semibold tracking-[.18em] text-violet-600'>
                <FlaskConical className='h-4 w-4' />
                OUTCOME LAB · 成效观察
              </p>
              <h1 className='mt-3 text-2xl font-bold tracking-tight text-slate-800 sm:text-[30px]'>
                帮助是否有效，让独立作答说话。
              </h1>
              <p className='mt-3 max-w-2xl text-sm leading-7 text-slate-500'>
                追溯每次误解、教学决策与新题验证，观察即时变化与延迟保持。
              </p>
            </div>
            <div className='flex gap-2'>
              <Button
                disabled={!data || exporting}
                onClick={() => void exportData()}
                variant='outline'
                size='sm'
              >
                <Download className='h-4 w-4' />
                {exporting ? '导出中…' : '导出记录'}
              </Button>
              <Button asChild size='sm'>
                <Link to='/adaptive'>
                  开始一次学习
                  <ArrowRight className='h-4 w-4' />
                </Link>
              </Button>
            </div>
          </div>
        </header>
        {overview.loading && (
          <p role='status' className='p-12 text-center text-sm text-violet-600'>
            正在读取真实学习结果…
          </p>
        )}
        {overview.error && (
          <div
            role='alert'
            className='flex items-center justify-between gap-3 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700'
          >
            <p>{overview.error.message}</p>
            <Button
              variant='outline'
              size='sm'
              onClick={() => void overview.refetch()}
            >
              <RefreshCw className='h-4 w-4' />
              重新加载
            </Button>
          </div>
        )}
        {exportError && (
          <p
            role='alert'
            className='rounded-xl bg-rose-50 p-3 text-xs text-rose-700'
          >
            {exportError}
          </p>
        )}
        {ACTIVE_COURSE_ID !== 'course-ds' && (
          <div className='rounded-[26px] border border-violet-100 bg-white/80 p-8 text-center'>
            <h2 className='text-lg font-bold'>当前成效观察支持数据结构课程</h2>
            <p className='mt-3 text-sm text-slate-500'>
              进入自适应学习后可切换课程，再开始采集真实结果。
            </p>
            <Button asChild className='mt-5'>
              <Link to='/adaptive'>进入自适应学习</Link>
            </Button>
          </div>
        )}
        {data && (
          <>
            <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
              <Stat
                icon={Fingerprint}
                label='真实学习会话'
                value={String(data.stats.totalSessions)}
                detail={`${data.stats.completedSessions} 次完成独立验证`}
              />
              <Stat
                icon={LockKeyhole}
                label='无提示验证通过'
                value={`${data.stats.independentCorrect} / ${data.stats.independentTotal}`}
                detail='仅统计独立新题作答'
                accent
              />
              <Stat
                icon={GitBranch}
                label='误解修复证据'
                value={String(data.stats.misconceptionsRepaired)}
                detail='依据目标误解的变式题'
              />
              <Stat
                icon={CalendarClock}
                label='到期延迟复测'
                value={String(data.stats.delayedDue)}
                detail='7 天后观察知识保持'
              />
            </div>
            <div className='grid items-stretch gap-5 xl:grid-cols-[1.18fr_1fr]'>
              <section className='rounded-[26px] border border-violet-100 bg-white/85 p-5 sm:p-6'>
                <PanelTitle
                  icon={TrendingUp}
                  title='不同策略的独立学习变化'
                  description='相同课程范围下的真实前测与无提示后测，空组保持待采集。'
                />
                <GroupComparison groups={data.experiments} />
                <div className='mt-3 flex flex-wrap gap-4 text-[10px] text-slate-400'>
                  <span className='flex items-center gap-1.5'>
                    <i className='h-2 w-2 rounded bg-violet-200' />
                    初次诊断
                  </span>
                  <span className='flex items-center gap-1.5'>
                    <i className='h-2 w-2 rounded bg-violet-500' />
                    独立新题
                  </span>
                  <span>单位：作答成绩 %</span>
                </div>
                <p className='mt-4 rounded-xl bg-slate-50 p-3 text-[10px] leading-5 text-slate-400'>
                  当前为个人会话的描述性记录。策略组之间可能存在题目难度、起点与样本差异，不据此推断因果效果。
                </p>
              </section>
              <section className='rounded-[26px] border border-violet-100 bg-white/85 p-5 sm:p-6'>
                <PanelTitle
                  icon={CalendarClock}
                  title='即时表现与延迟保持'
                  description='将当次新题表现与 7 天后复测分别记录，不预测未来成绩。'
                />
                {selected ? (
                  <RetentionChart session={selected} />
                ) : (
                  <EmptyChart label='完成一次独立验证后开始记录' />
                )}
                <p className='mt-3 text-[10px] leading-6 text-slate-400'>
                  {selected?.outcome?.retestScore !== null &&
                  selected?.outcome?.retestScore !== undefined
                    ? '延迟点来自实际复测作答。'
                    : '延迟复测尚未产生真实作答，曲线保留为空。'}
                </p>
              </section>
            </div>
            <section className='rounded-[26px] border border-violet-100 bg-white/85 p-5 sm:p-6'>
              <div className='flex flex-wrap items-start justify-between gap-3'>
                <PanelTitle
                  icon={GitBranch}
                  title='一条证据，怎样改变教学行动'
                  description='误解假设、决策依据和实际验证结果可以逐条追溯。'
                />
                {completed.length > 1 && (
                  <select
                    aria-label='选择学习过程'
                    value={selected?.id ?? ''}
                    onChange={event => setSelectedId(event.target.value)}
                    className='max-w-full rounded-xl border border-violet-200 bg-white p-2 text-xs text-slate-600'
                  >
                    {completed.map(session => (
                      <option key={session.id} value={session.id}>
                        {session.topicName} ·{' '}
                        {new Date(session.updatedAt).toLocaleString('zh-CN')}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {selected ? (
                <ProcessTrace session={selected} />
              ) : (
                <div className='mt-5 rounded-2xl border border-dashed border-violet-200 bg-violet-50/30 p-7 text-center'>
                  <Sparkles className='mx-auto h-6 w-6 text-violet-300' />
                  <p className='mt-3 text-sm text-slate-500'>
                    这里等待你的第一段学习过程。
                  </p>
                  <Button asChild variant='link' className='mt-2'>
                    <Link to='/adaptive'>
                      从一个概念开始
                      <ArrowRight className='h-4 w-4' />
                    </Link>
                  </Button>
                </div>
              )}
            </section>
            <section className='overflow-hidden rounded-[26px] border border-violet-100 bg-white/85'>
              <div className='p-5 sm:p-6'>
                <PanelTitle
                  icon={Target}
                  title='学习结果明细'
                  description='点击一条记录，可以恢复该会话并查看原始证据。'
                />
              </div>
              {data.sessions.length === 0 ? (
                <p className='px-6 pb-6 text-sm text-slate-400'>
                  还没有学习会话。
                </p>
              ) : (
                <div className='overflow-x-auto'>
                  <table className='w-full min-w-[640px] text-left text-xs'>
                    <thead className='border-y border-violet-100 bg-violet-50/50 text-[10px] text-slate-400'>
                      <tr>
                        <th className='px-6 py-3 font-medium'>
                          学习概念 / 策略
                        </th>
                        <th className='px-3 py-3 font-medium'>诊断成绩</th>
                        <th className='px-3 py-3 font-medium'>独立新题</th>
                        <th className='px-3 py-3 font-medium'>7 天保持</th>
                        <th className='px-3 py-3 font-medium'>会话状态</th>
                        <th className='px-6 py-3 font-medium'>操作</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-slate-100'>
                      {data.sessions.map(session => (
                        <tr
                          key={session.id}
                          className='transition hover:bg-violet-50/40'
                        >
                          <td className='px-6 py-4'>
                            <p className='font-semibold text-slate-700'>
                              {session.topicName}
                            </p>
                            <p className='mt-1 text-[10px] text-slate-400'>
                              {session.experimentGroup} ·{' '}
                              {session.decision?.label ??
                                groupNames[session.experimentGroup]}
                            </p>
                          </td>
                          <td className='px-3 py-4 text-slate-500'>
                            {percent(
                              session.outcome?.preScore ??
                                session.evidence.find(
                                  item => item.kind === 'diagnostic'
                                )?.score ??
                                null
                            )}
                          </td>
                          <td className='px-3 py-4 font-semibold text-violet-600'>
                            {percent(session.outcome?.postScore ?? null)}
                          </td>
                          <td className='px-3 py-4 text-slate-500'>
                            {percent(session.outcome?.retestScore ?? null)}
                          </td>
                          <td className='px-3 py-4'>
                            <span
                              className={cn(
                                'rounded-full px-2 py-1 text-[10px]',
                                session.outcome
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-violet-50 text-violet-600'
                              )}
                            >
                              {session.outcome ? '已独立验证' : '进行中'}
                            </span>
                          </td>
                          <td className='px-6 py-4'>
                            <Link
                              to={`/adaptive?session=${session.id}${session.retestDueAt && Date.parse(session.retestDueAt) <= Date.now() && session.outcome?.retestScore === null ? '&retest=1' : ''}`}
                              className='inline-flex items-center gap-1 text-violet-600'
                            >
                              {session.phase === 'completed'
                                ? '查看结果'
                                : '继续学习'}
                              <ArrowRight className='h-3 w-3' />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
            <div className='rounded-[22px] border border-violet-100 bg-white/50 px-5 py-4'>
              <p className='text-xs font-semibold text-slate-500'>
                当前证据的边界
              </p>
              <ul className='mt-2 space-y-1 text-[11px] leading-6 text-slate-400'>
                {data.limitations.map(limitation => (
                  <li key={limitation}>· {limitation}</li>
                ))}
                <li>
                  · 目录与评分规则已版本化；课程内容的正式教师审核仍待完成。
                </li>
              </ul>
            </div>
            <footer className='flex flex-wrap justify-between gap-2 px-1 text-[10px] leading-5 text-slate-400'>
              <p>Outcome Lab · 真实作答 / 可追溯决策</p>
              <p>
                {data.catalogVersion} · {data.policyVersion}
              </p>
            </footer>
          </>
        )}
      </div>
    </AppShell>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  detail,
  accent = false,
}: {
  icon: typeof Fingerprint;
  label: string;
  value: string;
  detail: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-[24px] border p-4 sm:p-5',
        accent
          ? 'border-violet-200 bg-gradient-to-br from-violet-50 to-white'
          : 'border-violet-100 bg-white/80'
      )}
    >
      <p className='flex items-center gap-2 text-[11px] text-slate-500'>
        <Icon className='h-4 w-4 text-violet-400' />
        {label}
      </p>
      <p
        className={cn(
          'mt-4 text-3xl font-bold tracking-tight',
          accent ? 'text-violet-600' : 'text-slate-700'
        )}
      >
        {value}
      </p>
      <p className='mt-2 text-[10px] leading-5 text-slate-400'>{detail}</p>
    </div>
  );
}

function PanelTitle({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Fingerprint;
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className='flex items-center gap-2 text-base font-bold text-slate-700'>
        <Icon className='h-4 w-4 text-violet-500' />
        {title}
      </h2>
      <p className='mt-2 text-[11px] leading-6 text-slate-400'>{description}</p>
    </div>
  );
}

function GroupComparison({ groups }: { groups: LeapExperiment[] }) {
  return (
    <div
      className='mt-5 space-y-4'
      role='img'
      aria-label='各策略组的真实前测和无提示后测成绩'
    >
      {groups.map(group => (
        <div
          key={group.group}
          className='grid grid-cols-[100px_1fr_45px] items-center gap-3'
        >
          <div>
            <p className='text-[11px] font-semibold text-slate-600'>
              {group.group} · {groupNames[group.group]}
            </p>
            <p className='mt-1 text-[9px] text-slate-400'>
              {group.completed} 次完成 / {group.count} 会话
            </p>
          </div>
          <div className='relative space-y-1.5 border-x border-slate-100 px-0.5'>
            {group.postMean === null ? (
              <div className='flex h-8 items-center rounded border border-dashed border-slate-200 bg-slate-50/60 px-3 text-[10px] text-slate-400'>
                等待真实作答
              </div>
            ) : (
              <>
                <div
                  className='h-3.5 min-w-[2px] rounded-r bg-violet-200'
                  style={{ width: `${(group.preMean ?? 0) * 100}%` }}
                />
                <div
                  className={cn(
                    'h-3.5 min-w-[2px] rounded-r',
                    group.group === 'D'
                      ? 'bg-gradient-to-r from-violet-500 to-sky-400'
                      : 'bg-violet-400'
                  )}
                  style={{ width: `${group.postMean * 100}%` }}
                />
              </>
            )}
          </div>
          <div className='text-right'>
            <p className='text-xs font-semibold text-violet-600'>
              {group.postMean === null ? '—' : percent(group.postMean)}
            </p>
            <p className='mt-1 text-[9px] text-slate-400'>
              {group.meanGain === null
                ? '待采集'
                : `${group.meanGain > 0 ? '+' : ''}${Math.round(group.meanGain * 100)} 分`}
            </p>
          </div>
        </div>
      ))}
      <div className='ml-[112px] mr-[57px] flex justify-between text-[9px] text-slate-300'>
        <span>0</span>
        <span>25</span>
        <span>50</span>
        <span>75</span>
        <span>100</span>
      </div>
    </div>
  );
}

function RetentionChart({ session }: { session: LeapSession }) {
  const outcome = session.outcome!;
  const points = [
    { x: 50, value: outcome.preScore, label: '初次诊断' },
    { x: 195, value: outcome.postScore, label: '独立新题' },
    { x: 340, value: outcome.retestScore, label: '7 天复测' },
  ];
  const y = (value: number) => 162 - value * 120;
  const available = points.filter(
    (point): point is typeof point & { value: number } => point.value !== null
  );
  return (
    <div className='mt-4'>
      <p className='mb-2 text-[10px] font-semibold text-violet-600'>
        {session.topicName}
      </p>
      <svg
        viewBox='0 0 390 218'
        className='w-full'
        role='img'
        aria-label='诊断、独立新题与七天复测的实际成绩曲线'
      >
        <defs>
          <linearGradient id='leap-line' x1='0' x2='1'>
            <stop offset='0%' stopColor='#a78bfa' />
            <stop offset='100%' stopColor='#38bdf8' />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map(value => (
          <g key={value}>
            <line
              x1='40'
              x2='352'
              y1={y(value)}
              y2={y(value)}
              stroke='#eef0f6'
              strokeDasharray='4 4'
            />
            <text
              x='27'
              y={y(value) + 3}
              fontSize='9'
              fill='#a1a8b7'
              textAnchor='end'
            >
              {value * 100}
            </text>
          </g>
        ))}
        <line x1='40' x2='352' y1='163' y2='163' stroke='#e5e7eb' />
        <polyline
          fill='none'
          stroke='url(#leap-line)'
          strokeWidth='3'
          strokeLinejoin='round'
          strokeLinecap='round'
          points={available
            .map(point => `${point.x},${y(point.value)}`)
            .join(' ')}
        />
        {points.map(point => (
          <g key={point.label}>
            {point.value === null ? (
              <>
                <circle
                  cx={point.x}
                  cy='103'
                  r='5'
                  fill='white'
                  stroke='#cbd5e1'
                  strokeDasharray='2 2'
                />
                <text
                  x={point.x}
                  y='87'
                  textAnchor='middle'
                  fill='#94a3b8'
                  fontSize='10'
                >
                  待采集
                </text>
              </>
            ) : (
              <>
                <circle
                  cx={point.x}
                  cy={y(point.value)}
                  r='5'
                  fill='#8b5cf6'
                  stroke='white'
                  strokeWidth='2'
                />
                <text
                  x={point.x}
                  y={y(point.value) - 14}
                  textAnchor='middle'
                  fill='#7c3aed'
                  fontWeight='600'
                  fontSize='12'
                >
                  {Math.round(point.value * 100)}%
                </text>
              </>
            )}
            <text
              x={point.x}
              y='191'
              textAnchor='middle'
              fontSize='10'
              fill='#64748b'
            >
              {point.label}
            </text>
          </g>
        ))}
      </svg>
      <div className='flex justify-between gap-2 rounded-xl bg-slate-50/70 px-3 py-2 text-[10px] text-slate-400'>
        <span>本次实际作答</span>
        <span>
          复测日期{' '}
          {session.retestDueAt
            ? new Date(session.retestDueAt).toLocaleDateString('zh-CN')
            : '待安排'}
        </span>
      </div>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className='mt-5 grid min-h-[235px] place-items-center rounded-2xl border border-dashed border-violet-200 bg-violet-50/20'>
      <div className='text-center'>
        <TrendingUp className='mx-auto h-8 w-8 text-violet-200' />
        <p className='mt-3 text-xs text-slate-400'>{label}</p>
      </div>
    </div>
  );
}

function ProcessTrace({ session }: { session: LeapSession }) {
  const diagnostic = session.evidence.find(item => item.kind === 'diagnostic');
  const items = [
    {
      title: '真实作答',
      label: diagnostic?.questionId ?? '诊断题',
      body: diagnostic?.answer ?? '原始作答已关联',
      icon: Fingerprint,
      color: 'bg-violet-50 text-violet-500',
    },
    {
      title: '误解假设',
      label: session.diagnosis?.misconceptionCode ?? '继续观察',
      body: session.diagnosis?.title ?? '未识别出明确误解',
      icon: BrainTraceIcon,
      color: 'bg-amber-50 text-amber-500',
    },
    {
      title: '教学干预',
      label: session.decision?.label ?? '教学行动',
      body: session.decision?.reason ?? '',
      icon: Sparkles,
      color: 'bg-sky-50 text-sky-500',
    },
    {
      title: '独立结果',
      label: `${percent(session.outcome?.postScore ?? null)} · 无提示`,
      body: session.outcome?.feedback ?? '',
      icon: CheckCircle2,
      color: 'bg-emerald-50 text-emerald-500',
    },
  ];
  return (
    <>
      <div className='mt-5 grid gap-3 md:grid-cols-4'>
        {items.map((item, i) => (
          <div
            key={item.title}
            className='relative rounded-2xl border border-slate-100 bg-slate-50/40 p-4'
          >
            <span
              className={cn(
                'grid h-9 w-9 place-items-center rounded-xl',
                item.color
              )}
            >
              <item.icon className='h-4 w-4' />
            </span>
            <p className='mt-3 text-[10px] text-slate-400'>
              0{i + 1} · {item.title}
            </p>
            <p className='mt-2 text-xs font-semibold leading-6 text-slate-700'>
              {item.label}
            </p>
            <p className='mt-2 line-clamp-4 whitespace-pre-line text-[11px] leading-6 text-slate-500'>
              {item.body}
            </p>
            {i < items.length - 1 && (
              <ArrowRight className='absolute -right-[15px] top-9 z-10 hidden h-4 w-4 text-violet-300 md:block' />
            )}
          </div>
        ))}
      </div>
      <div className='mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-violet-50/60 p-3'>
        <p className='flex items-center gap-2 text-xs text-violet-700'>
          <GitBranch className='h-4 w-4' />
          {session.nextStep?.title ?? '根据新证据继续规划'}
        </p>
        <Link
          to={`/adaptive?session=${session.id}`}
          className='inline-flex items-center gap-1 text-[11px] font-semibold text-violet-600'
        >
          查看完整依据
          <ArrowRight className='h-3 w-3' />
        </Link>
      </div>
    </>
  );
}

const BrainTraceIcon = Target;
