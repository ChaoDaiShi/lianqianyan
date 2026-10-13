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
  RefreshCw,
  Target,
  TrendingUp,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { useApi } from '@/lib/services';
import {
  exportLeapExperiments,
  fetchLeapOverview,
  type LeapSession,
} from '@/lib/adaptiveApi';
import { ACTIVE_COURSE_ID, ACTIVE_LEARNER_ID } from '@/store';
import { cn } from '@/lib/utils';
import {
  independentOutcomes,
  independentSessions,
  isIndependentOutcome,
  serializeGroupOutcomeCsv,
  serializeOutcomeCsv,
  summarizeByGroup,
  summarizeOutcomes,
  type LeapExportPayload,
} from './outcomePresentation';

const percent = (score: number | null | undefined) =>
  score === null || score === undefined
    ? '待采集'
    : `${Math.round(score * 100)}%`;
const isUnsetScore = (score: number | null | undefined) =>
  score === null || score === undefined;
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
  const [exportOpen, setExportOpen] = useState(false);
  const [exportPayload, setExportPayload] = useState<LeapExportPayload | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const data = overview.data;
  const completed = data ? independentSessions(data.sessions) : [];
  const outcomes = data ? independentOutcomes(data.sessions) : [];
  const summary = summarizeOutcomes(outcomes);
  const groupSummaries = data ? summarizeByGroup(data.sessions) : [];
  const selected =
    completed.find(session => session.id === selectedId) ?? completed[0];
  const openExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const payload = await exportLeapExperiments(
        ACTIVE_LEARNER_ID,
        ACTIVE_COURSE_ID
      );
      setExportPayload(payload);
      setExportOpen(true);
    } catch (cause) {
      setExportError(
        cause instanceof Error ? cause.message : '导出数据暂时无法读取。'
      );
    } finally {
      setExporting(false);
    }
  };
  const downloadExport = (format: 'json' | 'csv' | 'groups') => {
    if (!exportPayload) return;
    const stamp = new Date().toISOString().slice(0, 10);
    const content = format === 'json'
      ? JSON.stringify(exportPayload, null, 2)
      : format === 'csv'
        ? serializeOutcomeCsv(exportPayload)
        : serializeGroupOutcomeCsv(exportPayload.sessions);
    const mime = format === 'json' ? 'application/json;charset=utf-8' : 'text/csv;charset=utf-8';
    const extension = format === 'groups' ? 'groups.csv' : `${format}`;
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `lian-leap-outcomes-${stamp}.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <AppShell scene='companion'>
      <div
        className='mx-auto max-w-[1280px] space-y-5'
        data-testid='leap-outcome-lab'
      >
        <header className='rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] p-5 shadow-[var(--em-shadow-sm)] sm:p-6'>
          <div className='flex flex-wrap items-start justify-between gap-4'>
            <div>
              <p className='flex items-center gap-2 text-xs font-semibold text-[var(--em-primary)]'>
                <FlaskConical className='h-4 w-4' />
                数据结构 · 学习成效审计
              </p>
              <h1 className='mt-2 text-2xl font-semibold tracking-tight text-[var(--em-ink)]'>
                成效观察实验室
              </h1>
              <p className='mt-2 max-w-2xl text-sm leading-6 text-[var(--em-muted-ink)]'>
                仅汇总无提示独立作答；前测、即时后测与延迟复测分别呈现，只有后端标记可比的结果才计算增益。
              </p>
            </div>
            <div className='flex gap-2'>
              <Button
                disabled={!data || exporting}
                onClick={() => void openExport()}
                variant='outline'
                size='sm'
              >
                <Download className='h-4 w-4' />
                {exporting ? '读取导出数据…' : '数据审计与导出'}
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
          <p role='status' className='p-12 text-center text-sm text-[var(--em-primary)]'>
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
          <div className='rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] p-8 text-center'>
            <h2 className='text-lg font-bold'>当前成效观察支持数据结构课程</h2>
            <p className='mt-3 text-sm text-[var(--em-muted-ink)]'>
              进入自适应学习后可切换课程，再开始采集真实结果。
            </p>
            <Button asChild className='mt-5'>
              <Link to='/adaptive'>进入自适应学习</Link>
            </Button>
          </div>
        )}
        {data && (
          <>
            <div className='grid grid-cols-2 gap-3 xl:grid-cols-5'>
              <Stat
                icon={Fingerprint}
                label='独立样本 N'
                value={String(summary.n)}
                detail='仅含 independent=true 且 hintUsed=false'
              />
              <Stat
                icon={TrendingUp}
                label='前测均值 / 即时后测均值'
                value={`${summary.preMean === null ? '待采集' : percent(summary.preMean)} / ${summary.postMean === null ? '待采集' : percent(summary.postMean)}`}
                detail={`分别呈现原始均值；前测有效样本 n=${summary.preN}，后测 n=${summary.postN}`}
              />
              <Stat
                icon={Target}
                label='后测样本标准差 SD'
                value={summary.postSd === null ? '待采集' : `${(summary.postSd * 100).toFixed(1)} 分`}
                detail={summary.n < 2 ? '至少需要 2 个独立样本' : `样本标准差 · n=${summary.n}`}
              />
              <Stat
                icon={GitBranch}
                label='可比增益均值'
                value={summary.meanGain === null ? '未计算' : `${summary.meanGain > 0 ? '+' : ''}${Math.round(summary.meanGain * 100)} 个百分点`}
                detail={summary.gainN === 0 ? '当前没有后端标记为可比的前后测；保留两项原始成绩。' : `仅汇总后端标记 scoreComparable=true 的样本 · n=${summary.gainN}`}
              />
              <Stat
                icon={CalendarClock}
                label='实际延迟复测均值'
                value={summary.retestMean === null ? '待采集' : percent(summary.retestMean)}
                detail={`已有复测样本 n=${summary.retestN}`}
              />
            </div>
            <dl aria-label='服务端会话计数' className='grid grid-cols-2 gap-3 rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] px-4 py-3 text-xs sm:grid-cols-4'>
              <MetricCount label='总会话' value={data.stats.totalSessions} />
              <MetricCount label='服务端完成会话' value={data.stats.completedSessions} />
              <MetricCount label='误解修复记录' value={data.stats.misconceptionsRepaired} />
              <MetricCount label='到期复测' value={data.stats.delayedDue} />
            </dl>
            <div className='grid items-stretch gap-5 xl:grid-cols-[1.18fr_1fr]'>
              <section className='rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] p-5 shadow-[var(--em-shadow-sm)] sm:p-6'>
                <PanelTitle
                  icon={TrendingUp}
                  title='A–D 策略组描述统计'
                  description='柱条分别呈现独立、无提示会话的前测、即时后测与复测均值；未标记可比的前后测不计算差值。'
                />
                <GroupComparison groups={groupSummaries} />
                <div className='mt-3 flex flex-wrap gap-4 text-[10px] text-[var(--em-muted-ink)]'>
                  <span className='flex items-center gap-1.5'>
                    <i className='h-2 w-2 rounded bg-slate-400' />
                    前测
                  </span>
                  <span className='flex items-center gap-1.5'>
                    <i className='h-2 w-2 rounded bg-[var(--em-action)]' />
                    即时后测
                  </span>
                  <span className='flex items-center gap-1.5'><i className='h-2 w-2 rounded bg-blue-700' />延迟复测</span>
                  <span>单位：作答成绩 %</span>
                </div>
                <p className='mt-4 rounded-lg bg-[var(--em-surface-subtle)] p-3 text-xs leading-5 text-[var(--em-muted-ink)]'>
                  前测与独立后测的题型或评分标准尚未校准，当前只分别展示实际分数，不计算增益。这里是个人会话的描述性记录，不据此推断因果效果。
                </p>
              </section>
              <section className='rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] p-5 shadow-[var(--em-shadow-sm)] sm:p-6'>
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
                <p className='mt-3 text-xs leading-5 text-[var(--em-muted-ink)]'>
                  {selected?.outcome?.retestScore !== null &&
                  selected?.outcome?.retestScore !== undefined
                    ? '延迟点来自实际复测作答。'
                    : '延迟复测尚未产生真实作答，曲线保留为空。'}
                </p>
              </section>
            </div>
            <MechanismMatrix />
            <section className='rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] p-5 shadow-[var(--em-shadow-sm)] sm:p-6'>
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
                    className='max-w-full rounded-lg border border-[var(--em-border-strong)] bg-[var(--em-surface)] p-2 text-xs text-[var(--em-muted-ink)]'
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
                <div className='mt-5 rounded-xl border border-dashed border-[var(--em-border-strong)] bg-[var(--em-surface-subtle)] p-7 text-center'>
                  <p className='mt-3 text-sm text-[var(--em-muted-ink)]'>
                    尚无符合条件的无提示独立验证记录。
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
            <section className='overflow-hidden rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] shadow-[var(--em-shadow-sm)]'>
              <div className='p-5 sm:p-6'>
                <PanelTitle
                  icon={Target}
                  title='学习结果明细'
                  description='点击一条记录，可以恢复该会话并查看原始证据。'
                />
              </div>
              {data.sessions.length === 0 ? (
                <p className='px-6 pb-6 text-sm text-[var(--em-muted-ink)]'>
                  还没有学习会话。
                </p>
              ) : (
                <div className='overflow-x-auto'>
                  <table className='w-full min-w-[720px] text-left text-xs'>
                    <thead className='border-y border-[var(--em-border)] bg-[var(--em-surface-subtle)] text-xs text-[var(--em-muted-ink)]'>
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
                          className='hover:bg-[var(--em-surface-subtle)]'
                        >
                          <td className='px-6 py-4'>
                            <p className='font-semibold text-[var(--em-ink)]'>
                              {session.topicName}
                            </p>
                            <p className='mt-1 text-[10px] text-[var(--em-muted-ink)]'>
                              {session.experimentGroup} ·{' '}
                              {session.decision?.label ??
                                groupNames[session.experimentGroup]}
                            </p>
                          </td>
                          <td className='px-3 py-4 text-[var(--em-muted-ink)]'>
                            {percent(
                              session.outcome?.preScore ??
                                session.evidence.find(
                                  item => item.kind === 'diagnostic'
                                )?.score ??
                                null
                            )}
                          </td>
                          <td className='px-3 py-4 font-semibold text-[var(--em-ink)]'>
                            {isIndependentOutcome(session.outcome) ? percent(session.outcome.postScore) : session.outcome ? '非独立结果' : '待采集'}
                          </td>
                          <td className='px-3 py-4 text-[var(--em-muted-ink)]'>
                            {isIndependentOutcome(session.outcome) ? percent(session.outcome.retestScore) : session.outcome ? '未纳入' : '待采集'}
                          </td>
                          <td className='px-3 py-4'>
                            <span
                              className={cn(
                                'rounded-md px-2 py-1 text-xs',
                                isIndependentOutcome(session.outcome)
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-[var(--em-surface-subtle)] text-[var(--em-muted-ink)]'
                              )}
                            >
                              {isIndependentOutcome(session.outcome) ? '已独立验证' : session.outcome ? '非独立结果' : session.phase === 'completed' ? '待独立验证' : '进行中'}
                            </span>
                          </td>
                          <td className='px-6 py-4'>
                            <Link
                              to={`/adaptive?session=${session.id}${session.retestDueAt && Date.parse(session.retestDueAt) <= Date.now() && isUnsetScore(session.outcome?.retestScore) ? '&retest=1' : ''}`}
                              className='inline-flex items-center gap-1 font-medium text-[var(--em-primary)]'
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
            <div className='rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] px-5 py-4'>
              <p className='text-xs font-semibold text-[var(--em-muted-ink)]'>
                当前证据的边界
              </p>
              <ul className='mt-2 space-y-1 text-xs leading-5 text-[var(--em-muted-ink)]'>
                {data.limitations.map(limitation => (
                  <li key={limitation}>· {limitation}</li>
                ))}
                <li>
                  · 目录与评分规则已版本化；课程内容的正式教师审核仍待完成。
                </li>
              </ul>
            </div>
            <footer className='flex flex-wrap justify-between gap-2 px-1 text-xs leading-5 text-[var(--em-muted-ink)]'>
              <p>真实作答与可追溯决策</p>
              <p>
                {data.catalogVersion} · {data.policyVersion}
              </p>
            </footer>
          </>
        )}
      </div>
      {exportOpen && exportPayload && (
        <div className='fixed inset-0 z-50 bg-slate-950/40'>
          <section
            role='dialog'
            aria-modal='true'
            aria-labelledby='outcome-export-title'
            className='absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col border-l border-[var(--em-border)] bg-[var(--em-surface)] shadow-2xl'
          >
            <header className='flex items-start justify-between gap-4 border-b border-[var(--em-border)] px-5 py-4 sm:px-6'>
              <div>
                <p className='text-xs font-semibold text-[var(--em-primary)]'>数据审计</p>
                <h2 id='outcome-export-title' className='mt-1 text-lg font-semibold text-[var(--em-ink)]'>JSON 预览与导出</h2>
                <p className='mt-1 text-xs text-[var(--em-muted-ink)]'>版本 {exportPayload.version} · 导出时间 {new Date(exportPayload.exportedAt).toLocaleString('zh-CN')}</p>
              </div>
              <Button variant='outline' size='sm' onClick={() => setExportOpen(false)}>关闭</Button>
            </header>
            <div className='flex flex-wrap gap-2 border-b border-[var(--em-border)] px-5 py-3 sm:px-6'>
              <Button size='sm' onClick={() => downloadExport('json')}>下载完整 JSON</Button>
              <Button size='sm' variant='outline' onClick={() => downloadExport('csv')}>下载会话 CSV</Button>
              <Button size='sm' variant='outline' onClick={() => downloadExport('groups')}>下载分组汇总 CSV</Button>
            </div>
            <p className='px-5 pt-3 text-xs leading-5 text-[var(--em-muted-ink)] sm:px-6'>预览来自真实导出接口。CSV 空白字段表示后端未记录该值；可比性与说明单独导出。只有后端标记可比并提供观察增益的样本才进入可比增益均值。</p>
            <pre className='m-5 min-h-0 flex-1 overflow-auto rounded-lg border border-[var(--em-border)] bg-[var(--em-surface-subtle)] p-4 font-mono text-[11px] leading-5 text-[var(--em-ink)] sm:m-6'>
              {JSON.stringify(exportPayload, null, 2)}
            </pre>
          </section>
        </div>
      )}
    </AppShell>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Fingerprint;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className='rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] p-4 shadow-[var(--em-shadow-sm)]'>
      <p className='flex items-center gap-2 text-xs text-[var(--em-muted-ink)]'>
        <Icon className='h-4 w-4 text-[var(--em-primary)]' />
        {label}
      </p>
      <p className='mt-3 text-xl font-semibold tracking-tight tabular-nums text-[var(--em-ink)]'>
        {value}
      </p>
      <p className='mt-2 text-xs leading-5 text-[var(--em-muted-ink)]'>{detail}</p>
    </div>
  );
}

function MetricCount({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className='text-[var(--em-muted-ink)]'>{label}</dt>
      <dd className='mt-1 font-semibold tabular-nums text-[var(--em-ink)]'>{value}</dd>
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
      <h2 className='flex items-center gap-2 text-base font-semibold text-[var(--em-ink)]'>
        <Icon className='h-4 w-4 text-[var(--em-primary)]' />
        {title}
      </h2>
      <p className='mt-2 text-sm leading-6 text-[var(--em-muted-ink)]'>{description}</p>
    </div>
  );
}

function GroupComparison({ groups }: { groups: ReturnType<typeof summarizeByGroup> }) {
  return (
    <div className='mt-5 space-y-3' aria-label='各策略组前测、即时后测与延迟复测真实均值'>
      {groups.map(({ group, sessions, summary }) => (
        <section key={group} className='rounded-lg border border-[var(--em-border)] p-3'>
          <div className='flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1'>
            <h3 className='text-sm font-semibold text-[var(--em-ink)]'>{group} · {groupNames[group]}</h3>
            <p className='text-xs text-[var(--em-muted-ink)]'>{summary.n} 个独立样本 / {sessions} 个会话 · 可比增益样本 {summary.gainN}{summary.meanGain === null ? '' : ` · 均值 ${summary.meanGain > 0 ? '+' : ''}${Math.round(summary.meanGain * 100)} 个百分点`}</p>
          </div>
          <div className='mt-3 space-y-2'>
            {[
              { label: '前测', value: summary.preMean, color: 'bg-slate-400' },
              { label: '即时后测', value: summary.postMean, color: 'bg-[var(--em-action)]' },
              { label: '延迟复测', value: summary.retestMean, color: 'bg-blue-700' },
            ].map(metric => (
              <div key={metric.label} className='grid grid-cols-[72px_minmax(0,1fr)_44px] items-center gap-2 text-xs'>
                <span className='text-[var(--em-muted-ink)]'>{metric.label}</span>
                {metric.value === null ? (
                  <span className='text-[var(--em-subtle-ink)]'>待采集</span>
                ) : (
                  <div className='h-2 overflow-hidden rounded-full bg-[var(--em-surface-subtle)]'>
                    <div className={`h-full rounded-full ${metric.color}`} style={{ width: `${metric.value * 100}%` }} />
                  </div>
                )}
                <span className='text-right tabular-nums text-[var(--em-ink)]'>{metric.value === null ? '—' : percent(metric.value)}</span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function MechanismMatrix() {
  const rows = [
    { group: 'A', strategy: groupNames.A, misconception: '不匹配', ranking: '通用固定动作', probe: '无提示新题' },
    { group: 'B', strategy: groupNames.B, misconception: '不匹配', ranking: '课程固定动作', probe: '无提示新题' },
    { group: 'C', strategy: groupNames.C, misconception: '不匹配', ranking: '依据掌握证据与前置状态', probe: '无提示新题' },
    { group: 'D', strategy: groupNames.D, misconception: '按候选误解匹配', ranking: '按误解、前置、证据与时间排序', probe: '无提示新题' },
  ] as const;

  return (
    <section className='rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] p-5 shadow-[var(--em-shadow-sm)] sm:p-6'>
      <PanelTitle icon={GitBranch} title='A–D 教学机制对照' description='按服务端策略规则标注机制。D 组会话若启用消融，以该会话记录的消融设置为准。' />
      <div className='mt-4 overflow-x-auto'>
        <table className='w-full min-w-[760px] border-collapse text-left text-xs'>
          <thead className='bg-[var(--em-surface-subtle)] text-[var(--em-muted-ink)]'>
            <tr>
              <th className='border border-[var(--em-border)] px-3 py-2 font-semibold'>策略组</th>
              <th className='border border-[var(--em-border)] px-3 py-2 font-semibold'>误解匹配决策</th>
              <th className='border border-[var(--em-border)] px-3 py-2 font-semibold'>动作选择依据</th>
              <th className='border border-[var(--em-border)] px-3 py-2 font-semibold'>验证环节</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.group}>
                <th scope='row' className='border border-[var(--em-border)] px-3 py-2 font-semibold text-[var(--em-ink)]'>{row.group} · {row.strategy}</th>
                <td className='border border-[var(--em-border)] px-3 py-2 text-[var(--em-muted-ink)]'>{row.misconception}</td>
                <td className='border border-[var(--em-border)] px-3 py-2 text-[var(--em-muted-ink)]'>{row.ranking}</td>
                <td className='border border-[var(--em-border)] px-3 py-2 font-medium text-emerald-700'>{row.probe}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RetentionChart({ session }: { session: LeapSession }) {
  const outcome = session.outcome!;
  const points = [
    { x: 50, value: outcome.preScore, label: '前测' },
    { x: 195, value: outcome.postScore, label: '即时后测' },
    { x: 340, value: outcome.retestScore, label: '7 天复测' },
  ];
  const y = (value: number) => 162 - value * 120;
  return (
    <div className='mt-4'>
      <p className='mb-2 text-xs font-semibold text-[var(--em-primary)]'>
        {session.topicName}
      </p>
      <svg
        viewBox='0 0 390 218'
        className='w-full'
        role='img'
        aria-label='诊断、独立新题与七天复测分阶段实际成绩点，不连接未校准的前后测'
      >
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
        {points.map(point => (
          <g key={point.label}>
            {typeof point.value !== 'number' ? (
              <text x={point.x} y='112' textAnchor='middle' fill='#64748b' fontSize='10'>{point.label === '7 天复测' ? '待复测' : '未记录'}</text>
            ) : (
              <>
                <circle
                  cx={point.x}
                  cy={y(point.value)}
                  r='5'
                  fill={point.label === '前测' ? '#64748b' : point.label === '即时后测' ? 'var(--em-primary)' : '#1d4ed8'}
                  stroke='white'
                  strokeWidth='2'
                />
                <text
                  x={point.x}
                  y={y(point.value) - 14}
                  textAnchor='middle'
                  fill={point.label === '前测' ? '#475569' : point.label === '即时后测' ? 'var(--em-primary)' : '#1d4ed8'}
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
      <div className='flex justify-between gap-2 rounded-lg bg-[var(--em-surface-subtle)] px-3 py-2 text-xs text-[var(--em-muted-ink)]'>
        <span>仅连接已记录的实际分数</span>
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
    <div className='mt-5 grid min-h-[235px] place-items-center rounded-xl border border-dashed border-[var(--em-border-strong)] bg-[var(--em-surface-subtle)] px-4 text-center'>
      <p className='text-sm text-[var(--em-muted-ink)]'>{label}</p>
    </div>
  );
}

function ProcessTrace({ session }: { session: LeapSession }) {
  const diagnostic = session.evidence.find(item => item.kind === 'diagnostic');
  const items = [
    {
      title: '真实作答',
      label: diagnostic?.questionId ?? '诊断题',
      body: diagnostic?.answer ?? '接口未返回诊断作答文本',
      icon: Fingerprint,
      color: 'bg-[var(--em-primary-subtle)] text-[var(--em-primary)]',
    },
    {
      title: '误解假设',
      label: session.diagnosis?.misconceptionCode ?? '未识别候选',
      body: session.diagnosis?.title ?? '接口未返回误解诊断',
      icon: BrainTraceIcon,
      color: 'bg-amber-50 text-amber-500',
    },
    {
      title: '教学干预',
      label: session.decision?.label ?? '未返回决策',
      body: session.decision?.reason ?? '接口未返回教学决策依据',
      icon: Target,
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
            className='relative rounded-2xl border border-[var(--em-border)] bg-[var(--em-surface-subtle)] p-4'
          >
            <span
              className={cn(
                'grid h-9 w-9 place-items-center rounded-xl',
                item.color
              )}
            >
              <item.icon className='h-4 w-4' />
            </span>
            <p className='mt-3 text-[10px] text-[var(--em-muted-ink)]'>
              0{i + 1} · {item.title}
            </p>
            <p className='mt-2 text-xs font-semibold leading-6 text-[var(--em-ink)]'>
              {item.label}
            </p>
            <p className='mt-2 line-clamp-4 whitespace-pre-line text-[11px] leading-6 text-[var(--em-muted-ink)]'>
              {item.body}
            </p>
            {i < items.length - 1 && (
              <ArrowRight className='absolute -right-[15px] top-9 z-10 hidden h-4 w-4 text-[var(--em-primary)] md:block' />
            )}
          </div>
        ))}
      </div>
      <div className='mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[var(--em-primary-subtle)] p-3'>
        <p className='flex items-center gap-2 text-xs text-[var(--em-primary)]'>
          <GitBranch className='h-4 w-4' />
          {session.nextStep?.title ?? '根据新证据继续规划'}
        </p>
        <Link
          to={`/adaptive?session=${session.id}`}
          className='inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--em-primary)]'
        >
          查看完整依据
          <ArrowRight className='h-3 w-3' />
        </Link>
      </div>
    </>
  );
}

const BrainTraceIcon = Target;
