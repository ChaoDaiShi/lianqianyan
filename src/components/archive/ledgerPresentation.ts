import type { ReflectionResult } from '@/components/learning/learningLoop';
import type { LearningEvidence, PracticeEvaluationResponse } from '@/lib/educationApi';
import { parseApiInstant } from '@/lib/apiTime';

export interface EvidenceLedgerRow {
  id: string;
  occurredAt: string;
  event: string;
  source: string;
  result: string;
  actualIds: string[];
  masteryChange: string | null;
}

interface EvidenceLedgerInput {
  evidence: LearningEvidence[];
  practiceEvaluations: PracticeEvaluationResponse[];
  reflectionResults: ReflectionResult[];
  knowledgeNames: Record<string, string>;
  learnerId: string;
  courseId: string;
}

const EVIDENCE_EVENTS: Record<LearningEvidence['evidenceType'], string> = {
  learning_started: '开始学习',
  practice_answer_evaluated: '练习评价',
  exam_answer_evaluated: '测评作答评价',
};

const EVIDENCE_SOURCES: Record<LearningEvidence['source'], string> = {
  current_study_plan: '当前学习计划',
  recommended_path: '推荐学习路径',
  learning_space: '学习空间',
  exam_system: '考试系统',
};

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatMasteryDelta(value: number): string {
  const delta = Math.round(value * 100);
  return `${delta > 0 ? '+' : ''}${delta} 个百分点`;
}

function evidenceResult(
  evidence: LearningEvidence,
  evaluation: PracticeEvaluationResponse | undefined,
): string {
  if (evaluation) return evaluation.message;

  const { payload } = evidence;
  const awardedScore = payload['awarded_score'];
  const maxScore = payload['max_score'];
  if (typeof awardedScore === 'number' && typeof maxScore === 'number') {
    const correctness = payload['is_correct'] === true
      ? ' · 正确'
      : payload['is_correct'] === false
        ? ' · 未完全正确'
        : '';
    return `${awardedScore}/${maxScore} 分${correctness}`;
  }
  if (typeof payload['is_correct'] === 'boolean') {
    return payload['is_correct'] ? '正确' : '未完全正确';
  }
  if (typeof payload['score'] === 'number') return `评价得分 ${formatPercent(payload['score'])}`;
  if (typeof payload['message'] === 'string') return payload['message'];
  return '未提供评价结果';
}

function masteryChange(
  evidence: LearningEvidence,
  evaluation: PracticeEvaluationResponse | undefined,
): string | null {
  if (evaluation) {
    const change = evaluation.masteryAfter - evaluation.masteryBefore;
    return `M ${formatPercent(evaluation.masteryBefore)} → ${formatPercent(evaluation.masteryAfter)}（${formatMasteryDelta(change)}）`;
  }

  const before = evidence.payload['mastery_before'];
  const after = evidence.payload['mastery_after'];
  if (typeof before === 'number' && typeof after === 'number') {
    const change = after - before;
    return `M ${formatPercent(before)} → ${formatPercent(after)}（${formatMasteryDelta(change)}）`;
  }
  if (typeof evidence.masteryDelta === 'number') {
    const change = evidence.masteryDelta;
    return `ΔM ${formatMasteryDelta(change)}`;
  }
  return null;
}

function evidenceIds(evidence: LearningEvidence): string[] {
  return [
    evidence.id,
    evidence.questionId,
    evidence.sessionId,
    evidence.knowledgePointId,
  ].filter((value): value is string => Boolean(value));
}

function reflectionResult(result: ReflectionResult): string {
  const covered = result.coveredConcepts.length > 0
    ? `已覆盖：${result.coveredConcepts.join('、')}`
    : '';
  const missing = result.missingConcepts.length > 0
    ? `待补充：${result.missingConcepts.join('、')}`
    : '';
  return [covered, missing].filter(Boolean).join('；') || '暂无课程章节概念匹配';
}

export function buildEvidenceLedger(input: EvidenceLedgerInput): EvidenceLedgerRow[] {
  const evaluations = new Map(
    input.practiceEvaluations
      .filter(({ evidence }) => evidence.learnerId === input.learnerId && evidence.courseId === input.courseId)
      .map((evaluation) => [evaluation.evidence.id, evaluation]),
  );
  const scopedEvidence = input.evidence.filter(
    (item) => item.learnerId === input.learnerId && item.courseId === input.courseId,
  );
  const evidenceIdsInList = new Set(scopedEvidence.map((item) => item.id));
  const rows: EvidenceLedgerRow[] = scopedEvidence.map((evidence) => {
    const evaluation = evaluations.get(evidence.id);
    const pointName = evidence.knowledgePointId
      ? input.knowledgeNames[evidence.knowledgePointId]
      : undefined;
    return {
      id: evidence.id,
      occurredAt: evidence.occurredAt,
      event: pointName ? `${EVIDENCE_EVENTS[evidence.evidenceType]} · ${pointName}` : EVIDENCE_EVENTS[evidence.evidenceType],
      source: EVIDENCE_SOURCES[evidence.source],
      result: evidenceResult(evidence, evaluation),
      actualIds: evidenceIds(evidence),
      masteryChange: masteryChange(evidence, evaluation),
    };
  });

  for (const evaluation of evaluations.values()) {
    if (evidenceIdsInList.has(evaluation.evidence.id)) continue;
    const evidence = evaluation.evidence;
    const pointName = evidence.knowledgePointId
      ? input.knowledgeNames[evidence.knowledgePointId]
      : undefined;
    rows.push({
      id: evidence.id,
      occurredAt: evidence.occurredAt,
      event: pointName ? `练习评价 · ${pointName}` : '练习评价',
      source: '练习评价服务',
      result: evaluation.message,
      actualIds: evidenceIds(evidence),
      masteryChange: masteryChange(evidence, evaluation),
    });
  }

  for (const result of input.reflectionResults) {
    if (
      result.learnerId !== input.learnerId ||
      result.courseId !== input.courseId ||
      !Object.prototype.hasOwnProperty.call(input.knowledgeNames, result.knowledgePointId)
    ) continue;
    rows.push({
      id: `local-reflection:${result.taskId}:${result.submittedAt}`,
      occurredAt: result.submittedAt,
      event: `复述反馈 · ${result.knowledgePointName}`,
      source: '当前学习流程状态（本地）',
      result: reflectionResult(result),
      actualIds: [result.taskId, result.knowledgePointId],
      masteryChange: null,
    });
  }

  return rows.sort((left, right) => {
    const timeDifference = parseApiInstant(right.occurredAt).getTime() - parseApiInstant(left.occurredAt).getTime();
    if (Number.isFinite(timeDifference) && timeDifference !== 0) return timeDifference;
    const timestampOrder = right.occurredAt.localeCompare(left.occurredAt);
    return timestampOrder !== 0 ? timestampOrder : left.id.localeCompare(right.id);
  });
}
