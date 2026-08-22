import { GlassPanel } from '@/components/design/GlassPanel';
import {
  getPracticeReplanningText,
  type ReflectionResult,
} from '@/components/learning/learningLoop';
import { XiaolianCharacter } from '@/components/xiaolian/XiaolianCharacter';
import {
  DIAGNOSIS_REASON_TEXT,
  DIAGNOSIS_STATUS_LABEL,
  type KnowledgePointDiagnosis,
} from '@/domain';
import type { PracticeEvaluationResponse } from '@/lib/educationApi';

export type XiaolianFeedbackBubbleProps =
  | {
      scenario: 'practice_completed';
      evaluation: PracticeEvaluationResponse;
    }
  | { scenario: 'reflection_completed'; result: ReflectionResult }
  | {
      scenario: 'learning_completed';
      diagnosis: KnowledgePointDiagnosis;
    };

export function XiaolianFeedbackBubble(
  props: XiaolianFeedbackBubbleProps,
) {
  let content;

  if (props.scenario === 'practice_completed') {
    content = (
      <>
        <h2 className="mt-1 text-lg font-bold">练习评价已返回</h2>
        <p className="mt-2 text-sm leading-7 text-[var(--em-ink)]">
          {props.evaluation.message}
        </p>
        <p className="mt-1 text-sm leading-7 text-[var(--em-muted-ink)]">
          {getPracticeReplanningText(props.evaluation)}
        </p>
      </>
    );
  } else if (props.scenario === 'reflection_completed') {
    content = (
      <>
        <h2 className="mt-1 text-lg font-bold">
          「{props.result.knowledgePointName}」复述已完成
        </h2>
        <p className="mt-2 text-sm leading-7 text-[var(--em-muted-ink)]">
          已覆盖：
          {props.result.coveredConcepts.length > 0
            ? props.result.coveredConcepts.join('、')
            : '无'}
        </p>
        <p className="text-sm leading-7 text-[var(--em-muted-ink)]">
          待补充：
          {props.result.missingConcepts.length > 0
            ? props.result.missingConcepts.join('、')
            : '无'}
        </p>
        <p className="mt-2 text-sm leading-7 text-[var(--em-ink)]">
          {props.result.nextSuggestion}
        </p>
      </>
    );
  } else {
    content = (
      <>
        <h2 className="mt-1 text-lg font-bold">
          「{props.diagnosis.knowledgePointName}」验证结果
        </h2>
        <p className="mt-2 text-sm leading-7 text-[var(--em-ink)]">
          诊断状态：{DIAGNOSIS_STATUS_LABEL[props.diagnosis.status]} · 证据
          {props.diagnosis.evidenceCount} 条
        </p>
        {props.diagnosis.reasonCodes.map((code) => (
          <p
            key={code}
            className="text-sm leading-7 text-[var(--em-muted-ink)]"
          >
            {DIAGNOSIS_REASON_TEXT[code]}
          </p>
        ))}
      </>
    );
  }

  return (
    <GlassPanel
      className="grid items-center gap-5 p-5 sm:grid-cols-[7rem_minmax(0,1fr)] sm:p-6"
      data-scenario={props.scenario}
    >
      <XiaolianCharacter state="encourage" size="sm" />
      <div>
        <p className="text-xs font-semibold text-primary-700">小涟反馈</p>
        {content}
      </div>
    </GlassPanel>
  );
}
