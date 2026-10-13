import { Link } from 'react-router-dom';
import { ArrowRight, ListChecks } from 'lucide-react';
import { useCurrentPlan, useDiagnosis } from '@/lib/hooks';
import { ACTIVE_COURSE_ID, ACTIVE_LEARNER_ID } from '@/store';
import { buildNextStepActions, type NextStepAction } from './nextStep';

/**
 * 学习闭环引导：把"下一步学什么"常驻在学习入口旁，
 * 闭环顺序 = 继续计划任务 → 弄懂薄弱点 → 留下证据。
 */

export function NextStepGuidance({
  actions,
  title = '下一步 · 学习闭环',
}: {
  actions: NextStepAction[];
  title?: string;
}) {
  if (actions.length === 0) return null;
  return (
    <div data-next-step-guidance className="rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] p-4">
      <p className="flex items-center gap-2 text-sm font-bold tracking-[0.08em] text-[var(--em-primary-deep)]"><ListChecks className="h-4 w-4" />{title}</p>
      <ul className="mt-3 space-y-3">
        {actions.map((action) => (
          <li key={`${action.key}-${action.to}`}>
            <Link to={action.to} className="group block rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] px-4 py-3 transition-colors hover:border-[var(--em-primary)]">
              <p className="text-sm font-bold leading-6 text-[var(--em-ink)] group-hover:text-[var(--em-primary-deep)]">{action.title}</p>
              <p className="mt-1 text-[13px] leading-5 text-[var(--em-muted-ink)]">{action.reason}</p>
              <span className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--em-primary)]">{action.cta}<ArrowRight className="h-3.5 w-3.5" /></span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 数据包装：从真实诊断与当前路线构建引导；读取中给骨架，读取失败时安静隐藏。 */
export function NextStepGuidanceCard() {
  const plan = useCurrentPlan(ACTIVE_LEARNER_ID, ACTIVE_COURSE_ID);
  const diagnosis = useDiagnosis(ACTIVE_LEARNER_ID, ACTIVE_COURSE_ID);
  if (plan.loading || diagnosis.loading) {
    return (
      <div data-next-step-guidance className="rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] p-4" aria-label="正在读取下一步建议">
        <div className="h-3 w-2/3 animate-pulse rounded-full bg-[var(--em-primary-subtle)]" />
        <div className="mt-2 h-12 animate-pulse rounded-xl bg-[var(--em-primary-subtle)]" />
      </div>
    );
  }
  if (plan.error && diagnosis.error) return null;
  const actions = buildNextStepActions({ plan: plan.plan, diagnosis: diagnosis.data });
  return <NextStepGuidance actions={actions} />;
}
