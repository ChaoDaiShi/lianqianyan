import { ArrowRight, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import type { LeapRecommendation } from '@/lib/leapRecommendation';

interface HomeLeapRecommendationProps {
  recommendation: LeapRecommendation;
}

export function HomeLeapRecommendation({
  recommendation,
}: HomeLeapRecommendationProps) {
  return (
    <section
      aria-label='针对性学习建议'
      className='rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] p-5 shadow-[var(--em-shadow-sm)] sm:p-6'
    >
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex min-w-0 items-start gap-3'>
          <span className='grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--em-primary-subtle)] text-[var(--em-primary)]'>
            <Target className='h-4 w-4' aria-hidden='true' />
          </span>
          <div className='min-w-0'>
            <p className='text-xs font-medium text-[var(--em-primary)]'>针对性学习建议</p>
            <h2 className='mt-1 text-base font-semibold text-[var(--em-ink)]'>
              {recommendation.title}
            </h2>
            <p className='mt-1 text-sm leading-6 text-[var(--em-muted-ink)]'>
              {recommendation.reason}
            </p>
            {recommendation.evidenceCount !== null && (
              <p className='mt-1 text-xs text-[var(--em-muted-ink)]'>
                该知识点当前有 {recommendation.evidenceCount} 条有效评价证据。
              </p>
            )}
          </div>
        </div>
        <Button asChild className='shrink-0 gap-2'>
          <Link to={recommendation.href}>
            {recommendation.actionLabel}
            <ArrowRight className='h-4 w-4' aria-hidden='true' />
          </Link>
        </Button>
      </div>
    </section>
  );
}
