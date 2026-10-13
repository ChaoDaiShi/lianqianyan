import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Fingerprint,
  Layers3,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { LeapSession } from '@/lib/adaptiveApi';

interface LearningDecisionCardProps {
  session: LeapSession;
  onStart?: () => void;
  onAdjust?: () => void;
  onEvidence?: () => void;
  busy?: boolean;
  compact?: boolean;
}

export function LearningDecisionCard({
  session,
  onStart,
  onAdjust,
  onEvidence,
  busy = false,
  compact = false,
}: LearningDecisionCardProps) {
  const decision = session.decision;
  if (!decision) return null;
  const finished = session.phase === 'completed';
  const diagnosis = session.diagnosis;
  const explanation = decision.actionType === 'contrastive_teaching' && diagnosis?.misconceptionCode
    ? `当前作答提示你可能「${diagnosis.title}」。先把不同条件并排比较，再用一道新题确认你能否独立区分它们。`
    : {
        diagnostic_probe: '先用一个聚焦问题核对判断依据，再根据新的作答选择适合的帮助。',
        contrastive_teaching: '把相近概念放在同一情境中比较，找出结论成立的条件，再用新题验证。',
        prerequisite_repair: '先回到当前推理用到的前置概念，补齐后再重新解决这个问题。',
        guided_practice: '把操作拆成几个步骤，逐步说明每一步的依据，再尝试独立完成新题。',
        transfer_challenge: '换一个输入条件或应用情境，检查你是否能把规则迁移到新的问题中。',
        retrieval_practice: '先凭记忆回想关键规则，再用另一道题检查理解是否仍然稳定。',
      }[decision.actionType];
  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-[26px] border border-violet-200/80 bg-gradient-to-br from-white via-violet-50/80 to-indigo-50/80 shadow-[0_14px_44px_rgba(105,82,185,.08)]',
        compact ? 'p-4' : 'p-6 sm:p-7'
      )}
      data-testid='learning-decision-card'
    >
      <div className='pointer-events-none absolute -right-10 -top-12 h-48 w-48 rounded-full border-[28px] border-violet-200/20' />
      <div className='relative'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <span className='inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-violet-700'>
            <Sparkles className='h-4 w-4' />
            你的下一步学习
          </span>
          <span className='rounded-full border border-violet-200 bg-white/80 px-3 py-1 text-[10px] font-semibold text-violet-600'>
            {session.policy === 'leap' ? 'LEAP · 证据驱动' : '固定策略 · 对照'}
          </span>
        </div>
        <h2
          className={cn(
            'mt-4 font-bold leading-snug tracking-tight text-slate-800',
            compact ? 'text-lg' : 'text-2xl'
          )}
        >
          {finished
            ? (session.nextStep?.title ?? '安排一次无提示巩固')
            : decision.title}
        </h2>
        <p className='mt-2 text-sm font-medium text-violet-700'>
          建议方式：{decision.label} + 独立验证
        </p>
        <p className='mt-3 text-sm leading-6 text-slate-600'>
          {finished ? session.nextStep?.reason : explanation}
        </p>
        <dl
          className={cn(
            'mt-5 grid gap-3',
            compact ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'
          )}
        >
          <DecisionDetail
            icon={Fingerprint}
            label='推荐依据'
            value={session.evidence.some(item => item.kind === 'diagnostic' && item.questionId?.includes('q07')) ? '测评 Q07 + 推导过程' : `${decision.evidenceIds.length} 条学习证据`}
          />
          <DecisionDetail
            icon={Layers3}
            label='关联知识'
            value={session.topicName}
          />
          <DecisionDetail
            icon={Clock3}
            label='预估时间'
            value={`${decision.estimatedMinutes} 分钟`}
          />
          <DecisionDetail
            icon={CheckCircle2}
            label='完成依据'
            value='新题独立作答'
          />
        </dl>
        <div className='mt-5 flex flex-wrap items-center gap-2 border-t border-violet-200/60 pt-4'>
          {onStart ? (
            <Button onClick={onStart} disabled={busy} size='sm'>
              {finished ? '开始下一步' : '开始这次学习'}
              <ArrowRight className='h-4 w-4' />
            </Button>
          ) : (
            <Button asChild size='sm'>
              <Link to={`/adaptive?session=${session.id}`}>
                {finished ? '查看学习结果' : '继续学习'}
                <ArrowRight className='h-4 w-4' />
              </Link>
            </Button>
          )}
          {onAdjust && !finished && (
            <Button
              onClick={onAdjust}
              disabled={busy}
              variant='outline'
              size='sm'
            >
              <SlidersHorizontal className='h-3.5 w-3.5' />
              调整方式
            </Button>
          )}
          {onEvidence && (
            <Button onClick={onEvidence} variant='ghost' size='sm'>
              查看依据
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

function DecisionDetail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock3;
  label: string;
  value: string;
}) {
  return (
    <div className='min-w-0'>
      <dt className='flex items-center gap-1.5 text-[11px] text-slate-500'>
        <Icon className='h-3.5 w-3.5 text-violet-400' />
        {label}
      </dt>
      <dd className='mt-1.5 text-xs font-semibold leading-5 text-slate-700'>
        {value}
      </dd>
    </div>
  );
}
