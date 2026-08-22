import { GlassPanel } from '@/components/design/GlassPanel';
import type { ReflectionResult } from '@/components/learning/learningLoop';
import { XiaolianCharacter } from '@/components/xiaolian/XiaolianCharacter';

export type XiaolianFeedbackBubbleProps = {
  scenario: 'reflection_completed';
  result: ReflectionResult;
};

export function XiaolianFeedbackBubble({
  scenario,
  result,
}: XiaolianFeedbackBubbleProps) {
  return (
    <GlassPanel
      className="grid items-center gap-5 p-5 sm:grid-cols-[7rem_minmax(0,1fr)] sm:p-6"
      data-scenario={scenario}
    >
      <XiaolianCharacter state="encourage" size="sm" />
      <div>
        <p className="text-xs font-semibold text-primary-700">小涟反馈</p>
        <h2 className="mt-1 text-lg font-bold">
          「{result.knowledgePointName}」复述已完成
        </h2>
        {result.coveredConcepts.length > 0 && (
          <p className="mt-2 text-sm leading-7 text-[var(--em-muted-ink)]">
            已覆盖：{result.coveredConcepts.join('、')}
          </p>
        )}
        {result.missingConcepts.length > 0 && (
          <p className="text-sm leading-7 text-[var(--em-muted-ink)]">
            待补充：{result.missingConcepts.join('、')}
          </p>
        )}
        <p className="mt-2 text-sm leading-7 text-[var(--em-ink)]">
          {result.nextSuggestion}
        </p>
      </div>
    </GlassPanel>
  );
}
