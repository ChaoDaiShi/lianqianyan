import { Link } from 'react-router-dom';
import { ArrowRight, BrainCircuit } from 'lucide-react';
import type { DiagnosisResult, LearnerProfile, PersistedStudyPlan } from '@/domain';
import { DIAGNOSIS_REASON_TEXT } from '@/domain';
import type { LearningEvidence } from '@/lib/educationApi';
import { GlassPanel } from '@/components/design/GlassPanel';
import { XiaolianCharacter } from '@/components/xiaolian/XiaolianCharacter';
import { XiaolianMessage } from '@/components/xiaolian/XiaolianMessage';

interface XiaolianInsightCardProps {
  profile: LearnerProfile | null;
  diagnosis: DiagnosisResult | null;
  plan: PersistedStudyPlan | null;
  evidence: LearningEvidence[];
  loading: boolean;
  error: boolean;
}

export function XiaolianInsightCard({ profile, diagnosis, plan, evidence, loading, error }: XiaolianInsightCardProps) {
  const focus = diagnosis?.primaryFocus ?? null;
  const orderedTasks = [...(plan?.tasks ?? [])].sort((a, b) => a.order - b.order);
  const focusTask = focus ? orderedTasks.find((task) => task.knowledgePointId === focus.knowledgePointId) ?? null : null;
  const nextTask = focusTask ?? orderedTasks[0] ?? null;
  const reason = focus?.reasonCodes.map((code) => DIAGNOSIS_REASON_TEXT[code]).filter(Boolean).join(' ') ?? '';
  const hasLearning = evidence.some((item) => item.evidenceType === 'learning_started');
  const hasAssessment = evidence.some((item) => item.evidenceType === 'practice_answer_evaluated');

  let observation = '我正在读取你的真实学习状态。';
  let suggestion = '数据同步完成后，我会给你一个可以直接行动的下一步。';
  if (error) {
    observation = '有一部分学习状态没有成功加载，我不会用推测内容替代。';
    suggestion = '可以稍后刷新页面，再让我们一起判断下一步。';
  } else if (!loading && focus) {
    observation = `当前主要关注「${focus.knowledgePointName}」，这个判断来自 ${focus.evidenceCount} 条有效评价证据。`;
    suggestion = nextTask ? `我发现了一个小问题，我们一起从计划中的「${nextTask.knowledgePointName}」解决它。` : '当前计划还没有对应任务，可以先生成一份基于诊断的学习计划。';
  } else if (!loading && diagnosis?.unassessedPoints.length) {
    observation = `还有 ${diagnosis.unassessedPoints.length} 个知识点缺少足够评价证据，这不代表它们薄弱。`;
    suggestion = '先完成一次真实练习，会比现在直接判断掌握情况更可靠。';
  } else if (!loading && nextTask) {
    observation = `当前计划的下一项任务是「${nextTask.knowledgePointName}」。`;
    suggestion = '这一步已经准备好了，我们沿着当前计划继续往前。';
  } else if (!loading) {
    observation = profile ? `${profile.courseName}的学习画像已经读取，但当前没有可证明的优先任务。` : '目前还没有可用的学习画像。';
    suggestion = '生成学习计划或完成一次学习后，我会根据真实变化更新观察。';
  }

  return <GlassPanel className="overflow-hidden p-5 sm:p-6">
    <div className="grid gap-5 lg:grid-cols-[11rem_minmax(0,1fr)] lg:items-center">
      <div className="rounded-[22px] bg-gradient-to-b from-violet-50 to-sky-50/50 px-3 pt-2"><XiaolianCharacter state={loading ? 'analyzing' : error ? 'idle' : focus || nextTask ? 'encourage' : 'idle'} size="lg" /></div>
      <div><p className="flex items-center gap-2 text-[10px] font-bold tracking-[0.18em] text-primary-600"><BrainCircuit className="h-3.5 w-3.5" />XIAOLIAN INSIGHT</p><h2 className="mt-1 text-2xl font-bold">小涟主动观察</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2"><XiaolianMessage tone={error ? 'notice' : 'observe'} title="当前主要观察">{observation}{focus && reason && <span className="mt-1 block text-xs">原因：{reason}</span>}</XiaolianMessage><XiaolianMessage tone="suggest" title="下一步建议">{suggestion}</XiaolianMessage></div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--em-muted-ink)]"><span>真实记录：{hasLearning ? '已有学习行为' : '尚无学习行为'} · {hasAssessment ? '已有练习评价' : '尚无练习评价'}</span><Link to="/my-learning" className="inline-flex items-center gap-1 font-semibold text-primary-700">查看学习计划<ArrowRight className="h-3.5 w-3.5" /></Link></div>
      </div>
    </div>
  </GlassPanel>;
}
