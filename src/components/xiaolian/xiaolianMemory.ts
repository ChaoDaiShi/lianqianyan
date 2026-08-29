import type {
  DiagnosisResult,
  KnowledgePointDiagnosis,
  LearnerProfile,
  PersistedStudyPlan,
} from '@/domain';
import { ACTION_TYPE_LABEL } from '@/domain';
import {
  buildJourneyEvents,
  type LearningJourneyEvent,
  type ReflectionResult,
} from '@/components/learning/learningLoop';
import type {
  LearningEvidence,
  PracticeEvaluationResponse,
} from '@/lib/educationApi';

export type XiaolianMemorySource =
  | 'LearnerProfile'
  | 'Diagnosis'
  | 'LearningEvidence'
  | 'ReflectionResult';

export interface XiaolianMemoryObservation {
  id: string;
  text: string;
  source: XiaolianMemorySource;
}

function joinNames(values: string[]): string {
  return values.join('、');
}

function latestValidReflection(
  results: ReflectionResult[],
  knowledgePointIds: Set<string>,
  learnerId: string,
  courseId: string,
): ReflectionResult | null {
  return results.reduce<ReflectionResult | null>((latest, result) => {
    if (result.learnerId !== learnerId || result.courseId !== courseId) {
      return latest;
    }
    if (!knowledgePointIds.has(result.knowledgePointId)) return latest;

    const resultTime = Date.parse(result.submittedAt);
    if (!Number.isFinite(resultTime)) return latest;
    if (!latest) return result;

    return resultTime > Date.parse(latest.submittedAt) ? result : latest;
  }, null);
}

export function buildXiaolianMemoryObservations(input: {
  profile: LearnerProfile;
  diagnosis: DiagnosisResult;
  evidence: LearningEvidence[];
  reflectionResults: ReflectionResult[];
  learnerId: string;
  courseId: string;
}): XiaolianMemoryObservation[] {
  const observations: XiaolianMemoryObservation[] = [];
  const profileMatches =
    input.profile.learnerId === input.learnerId &&
    input.profile.courseId === input.courseId;
  const diagnosisMatches =
    input.diagnosis.learnerId === input.learnerId &&
    input.diagnosis.courseId === input.courseId;

  if (diagnosisMatches && input.diagnosis.primaryFocus) {
    observations.push({
      id: `diagnosis:${input.diagnosis.primaryFocus.knowledgePointId}`,
      text: `小涟观察到，现在最需要加强的是「${input.diagnosis.primaryFocus.knowledgePointName}」。`,
      source: 'Diagnosis',
    });
  }

  const matchingEvidence = input.evidence.filter(
    (item) =>
      item.learnerId === input.learnerId && item.courseId === input.courseId,
  );
  const learningCount = matchingEvidence.filter(
    (item) => item.evidenceType === 'learning_started',
  ).length;
  const practiceCount = matchingEvidence.filter(
    (item) => item.evidenceType === 'practice_answer_evaluated',
  ).length;

  if (learningCount > 0 || practiceCount > 0) {
    const parts: string[] = [];
    if (learningCount > 0) parts.push(`${learningCount} 次开始学习`);
    if (practiceCount > 0) parts.push(`${practiceCount} 次练习评价`);
    observations.push({
      id: 'evidence:recent-counts',
      text: `小涟发现，最近记录中有 ${joinNames(parts)}。`,
      source: 'LearningEvidence',
    });
  }

  if (profileMatches) {
    const knowledgePointIds = new Set(
      input.profile.knowledgePoints.map((point) => point.knowledgePointId),
    );
    const reflection = latestValidReflection(
      input.reflectionResults,
      knowledgePointIds,
      input.learnerId,
      input.courseId,
    );

    if (reflection) {
      const covered = joinNames(reflection.coveredConcepts);
      const missing = joinNames(reflection.missingConcepts);
      const detail =
        reflection.coveredConcepts.length > 0 &&
        reflection.missingConcepts.length > 0
          ? `覆盖了${covered}，还需要补充${missing}`
          : reflection.coveredConcepts.length > 0
            ? `覆盖了${covered}`
            : reflection.missingConcepts.length > 0
              ? `还需要补充${missing}`
              : '尚未匹配到课程章节概念';

      observations.push({
        id: `reflection:${reflection.knowledgePointId}:${reflection.submittedAt}`,
        text: `小涟观察到，最近一次「${reflection.knowledgePointName}」复述${detail}。`,
        source: 'ReflectionResult',
      });
    }

    const needsAssessment =
      input.profile.statusCounts.unassessed +
      input.profile.statusCounts.insufficient_evidence;
    if (needsAssessment > 0) {
      observations.push({
        id: 'profile:needs-assessment',
        text: `小涟发现，当前还有 ${needsAssessment} 个知识点需要更多评估记录。`,
        source: 'LearnerProfile',
      });
    }
  }

  return observations;
}

export interface XiaolianLearningPortraitModel {
  stage: string;
  masteredDirections: string[];
  strengtheningDirections: string[];
  nextSuggestion: string;
}

export function buildXiaolianLearningPortrait(input: {
  profile: LearnerProfile;
  diagnosis: DiagnosisResult;
}): XiaolianLearningPortraitModel {
  const masteredDirections = input.profile.knowledgePoints
    .filter((point) => point.status === 'mastered')
    .map((point) => point.knowledgePointName);
  const strengtheningDirections = [
    input.diagnosis.primaryFocus,
    ...input.diagnosis.priorityInterventions,
  ]
    .filter(
      (point): point is KnowledgePointDiagnosis => point !== null,
    )
    .filter(
      (point, index, all) =>
        all.findIndex(
          (candidate) =>
            candidate.knowledgePointId === point.knowledgePointId,
        ) === index,
    )
    .map((point) => point.knowledgePointName);
  const needsAssessment =
    input.profile.statusCounts.unassessed +
    input.profile.statusCounts.insufficient_evidence;

  let stage = '巩固保持';
  if (input.profile.insufficientData || input.profile.assessedCount === 0) {
    stage = '建立学习画像';
  } else if (input.diagnosis.primaryFocus) {
    stage = '聚焦提升';
  } else if (needsAssessment > 0) {
    stage = '扩展评估';
  }

  let nextSuggestion =
    masteredDirections.length > 0
      ? `继续巩固「${joinNames(masteredDirections)}」等已掌握方向。`
      : '当前诊断未给出下一步优先方向。';
  if (input.diagnosis.primaryFocus) {
    nextSuggestion = `下一步先围绕「${input.diagnosis.primaryFocus.knowledgePointName}」继续学习与验证。`;
  } else if (needsAssessment > 0) {
    nextSuggestion = '下一步通过真实学习与练习记录补充尚未评估的方向。';
  }

  return {
    stage,
    masteredDirections,
    strengtheningDirections,
    nextSuggestion,
  };
}

export interface ReflectionGrowthFeedback {
  title: string;
  observation: string;
  nextStep: string;
}

export function buildReflectionGrowthFeedback(
  result: ReflectionResult,
): ReflectionGrowthFeedback {
  const covered = joinNames(result.coveredConcepts);
  const missing = joinNames(result.missingConcepts);
  const observation =
    result.coveredConcepts.length > 0 && result.missingConcepts.length > 0
      ? `这次复述已经覆盖${covered}，还可以补充${missing}。`
      : result.coveredConcepts.length > 0
        ? `这次复述已经覆盖${covered}。`
        : result.missingConcepts.length > 0
          ? `这次复述还需要补充${missing}。`
          : '这次复述没有可对照的课程章节概念。';

  return {
    title: `小涟观察到「${result.knowledgePointName}」的复述进展`,
    observation,
    nextStep: result.nextSuggestion,
  };
}

export interface LearningStoryItem {
  id: string;
  occurredAt: string;
  kind: LearningJourneyEvent['kind'] | 'reflection';
  headline: string;
  body: string;
  sourceLabel: string;
  planContextOnly: boolean;
}

const STORY_HEADLINE: Record<LearningJourneyEvent['kind'], string> = {
  plan: '新的学习方向被整理出来',
  plan_task: '学习计划安排了下一站',
  learning: '一次学习行动开始了',
  practice: '一次练习得到反馈',
};

const PLAN_STRATEGY_LABEL: Record<PersistedStudyPlan['strategy'], string> = {
  diagnosis_driven: '诊断驱动',
};

export function buildLearningStories(input: {
  evidence: LearningEvidence[];
  plan: PersistedStudyPlan | null;
  practiceEvaluations: PracticeEvaluationResponse[];
  reflectionResults?: ReflectionResult[];
  knowledgeNames: Record<string, string>;
  learnerId: string;
  courseId: string;
}): LearningStoryItem[] {
  const planTasks = new Map(
    (input.plan?.tasks ?? []).map((task) => [`plan-task:${task.id}`, task]),
  );

  const eventStories = buildJourneyEvents(input).map((event) => {
    let body = event.detail ? `${event.title}。${event.detail}` : event.title;

    if (event.kind === 'plan' && input.plan) {
      body = `当前学习计划已生成，路线策略：${PLAN_STRATEGY_LABEL[input.plan.strategy]}。`;
    } else if (event.kind === 'plan_task') {
      const task = planTasks.get(event.id);
      if (task) {
        body = `学习计划将「${task.knowledgePointName}」安排为${ACTION_TYPE_LABEL[task.actionType]}任务，预计 ${task.estimatedMinutes} 分钟。`;
      }
    }

    return {
      id: event.id,
      occurredAt: event.occurredAt,
      kind: event.kind,
      headline: STORY_HEADLINE[event.kind],
      body,
      sourceLabel: event.sourceLabel,
      planContextOnly: event.kind === 'plan_task',
    };
  });

  const reflectionStories: LearningStoryItem[] = (input.reflectionResults ?? [])
    .filter(
      (result) =>
        result.learnerId === input.learnerId &&
        result.courseId === input.courseId &&
        Object.prototype.hasOwnProperty.call(
          input.knowledgeNames,
          result.knowledgePointId,
        ) &&
        Number.isFinite(Date.parse(result.submittedAt)),
    )
    .map((result) => {
      const covered = joinNames(result.coveredConcepts);
      const missing = joinNames(result.missingConcepts);
      const detail = covered && missing
        ? `这次复述覆盖了${covered}，仍需补充${missing}。`
        : covered
          ? `这次复述覆盖了${covered}。`
          : missing
            ? `这次复述仍需补充${missing}。`
            : '这次复述尚未匹配到课程章节概念。';
      return {
        id: `reflection:${result.taskId}:${result.submittedAt}`,
        occurredAt: result.submittedAt,
        kind: 'reflection',
        headline: '一次复述留下了新的理解',
        body: `围绕「${result.knowledgePointName}」，${detail}`,
        sourceLabel: '本地复述记录',
        planContextOnly: false,
      };
    });

  return [...eventStories, ...reflectionStories].sort(
    (left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt),
  );
}
