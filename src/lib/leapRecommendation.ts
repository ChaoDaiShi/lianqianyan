import type { DiagnosisResult } from '@/domain';
import type { LeapCatalog, LeapOverview, LeapSession, LeapTopic } from '@/lib/adaptiveApi';

export type LeapRecommendationKind =
  | 'retest'
  | 'resume'
  | 'repair'
  | 'diagnose'
  | 'course-entry';

export interface LeapRecommendation {
  kind: LeapRecommendationKind;
  title: string;
  reason: string;
  actionLabel: string;
  href: string;
  topicId: string | null;
  sessionId: string | null;
  evidenceCount: number | null;
}

export interface LeapRecommendationInput {
  courseId: string;
  catalog: LeapCatalog;
  overview: LeapOverview;
  diagnosis: DiagnosisResult | null;
  nowMs: number;
}

function compareSessionId(left: LeapSession, right: LeapSession) {
  return left.id.localeCompare(right.id);
}

function compareNewestSession(left: LeapSession, right: LeapSession) {
  return Date.parse(right.updatedAt) - Date.parse(left.updatedAt) ||
    compareSessionId(left, right);
}

function evidenceCountFor(
  overview: LeapOverview,
  knowledgePointId: string,
): number | null {
  return overview.states.find(
    state => state.knowledgePointId === knowledgePointId,
  )?.evidenceCount ?? null;
}

function sessionRecommendation(
  kind: 'retest' | 'resume',
  session: LeapSession,
  overview: LeapOverview,
): LeapRecommendation {
  const isRetest = kind === 'retest';
  return {
    kind,
    title: isRetest ? '这项学习已到复测时间' : '继续上次的针对性学习',
    reason: isRetest
      ? `“${session.topicName}”已到延迟复测时间。`
      : `继续“${session.topicName}”的学习会话。`,
    actionLabel: isRetest ? '开始复测' : '继续学习',
    href: `/adaptive?session=${encodeURIComponent(session.id)}${isRetest ? '&retest=1' : ''}`,
    topicId: null,
    sessionId: session.id,
    evidenceCount: evidenceCountFor(overview, session.knowledgePointId),
  };
}

export function selectLeapRecommendation({
  courseId,
  catalog,
  overview,
  diagnosis,
  nowMs,
}: LeapRecommendationInput): LeapRecommendation {
  if (courseId !== 'course-ds') {
    return {
      kind: 'course-entry',
      title: '前往数据结构诊断',
      reason: 'LEAP 当前面向数据结构课程；你可以在课程入口自行切换。',
      actionLabel: '打开课程入口',
      href: '/adaptive',
      topicId: null,
      sessionId: null,
      evidenceCount: null,
    };
  }

  const dueRetests = overview.sessions
    .filter(session =>
      session.phase === 'completed' &&
      session.outcome !== null &&
      session.outcome.retestScore === null &&
      session.retestDueAt !== null &&
      Date.parse(session.retestDueAt) <= nowMs,
    )
    .sort((left, right) =>
      Date.parse(left.retestDueAt!) - Date.parse(right.retestDueAt!) ||
      compareSessionId(left, right),
    );
  if (dueRetests[0]) {
    return sessionRecommendation('retest', dueRetests[0], overview);
  }

  const resumableSessions = overview.sessions
    .filter(session => session.phase !== 'completed')
    .sort(compareNewestSession);
  if (resumableSessions[0]) {
    return sessionRecommendation('resume', resumableSessions[0], overview);
  }

  const latestCompletedByTopic = new Map<string, LeapSession>();
  for (const session of overview.sessions
    .filter(item => item.phase === 'completed')
    .sort(compareNewestSession)) {
    if (!latestCompletedByTopic.has(session.topicId)) {
      latestCompletedByTopic.set(session.topicId, session);
    }
  }

  const repairCandidates = [...latestCompletedByTopic.values()]
    .filter(session =>
      session.outcome?.independent === true &&
      session.outcome.hintUsed === false &&
      (session.outcome.retestScore === null
        ? session.outcome.misconceptionStatus === 'persisting'
        : session.nextStep?.topicId === session.topicId),
    )
    .map(session => ({
      session,
      topic: catalog.topics.find(item => item.id === session.topicId),
    }))
    .filter(
      (candidate): candidate is { session: LeapSession; topic: LeapTopic } =>
        candidate.topic !== undefined,
    )
    .sort((left, right) => compareNewestSession(left.session, right.session));
  const repair = repairCandidates[0];
  if (repair) {
    const topicId = repair.topic.id;
    const retestNextStep = repair.session.outcome?.retestScore !== null
      ? repair.session.nextStep
      : null;
    return {
      kind: 'repair',
      title: retestNextStep ? '按复测后的建议继续巩固' : '上次独立验证仍需巩固',
      reason: retestNextStep
        ? `“${repair.topic.name}”已记录延迟复测结果。${retestNextStep.reason}`
        : `“${repair.topic.name}”最近一次无提示验证仍显示需要巩固；从新会话开始复核。`,
      actionLabel: '开始该主题的新学习',
      href: `/adaptive?topic=${encodeURIComponent(topicId)}`,
      topicId,
      sessionId: null,
      evidenceCount: evidenceCountFor(overview, repair.topic.knowledgePointId),
    };
  }

  const focus = diagnosis?.primaryFocus;
  if (focus?.status === 'weak') {
    const weakTopic = catalog.topics.find(topic => {
      if (topic.knowledgePointId !== focus.knowledgePointId) return false;
      return (evidenceCountFor(overview, topic.knowledgePointId) ?? 0) > 0;
    });
    if (weakTopic) {
      return {
        kind: 'repair',
        title: `建议核查并巩固：${weakTopic.name}`,
        reason: `当前诊断将“${focus.knowledgePointName}”列为薄弱项，可从该主题学习开始复核。`,
        actionLabel: '开始该主题的新学习',
        href: `/adaptive?topic=${encodeURIComponent(weakTopic.id)}`,
        topicId: weakTopic.id,
        sessionId: null,
        evidenceCount: evidenceCountFor(overview, weakTopic.knowledgePointId),
      };
    }
  }

  return {
    kind: 'diagnose',
    title: '做一次短诊断，确定下一步',
    reason: '可以通过新的短诊断选择下一项学习主题。',
    actionLabel: '开始短诊断',
    href: '/adaptive',
    topicId: null,
    sessionId: null,
    evidenceCount: null,
  };
}
