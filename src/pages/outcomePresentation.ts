import type {
  ExperimentGroup,
  LeapExperiment,
  LeapOutcome,
  LeapSession,
} from '@/lib/adaptiveApi';

export interface OutcomeSummary {
  n: number;
  preN: number;
  preMean: number | null;
  postN: number;
  postMean: number | null;
  postSd: number | null;
  gainN: number;
  meanGain: number | null;
  retestN: number;
  retestMean: number | null;
}

export interface LeapExportPayload {
  version: string;
  exportedAt: string;
  sessions: LeapSession[];
  experiments: LeapExperiment[];
}

const GROUPS: ExperimentGroup[] = ['A', 'B', 'C', 'D'];

export function isIndependentOutcome(
  outcome: LeapOutcome | null | undefined,
): outcome is LeapOutcome {
  return outcome?.independent === true && outcome.hintUsed === false;
}

export function independentSessions(sessions: LeapSession[]): LeapSession[] {
  return sessions.filter(session => isIndependentOutcome(session.outcome));
}

export function independentOutcomes(sessions: LeapSession[]): LeapOutcome[] {
  return sessions.flatMap(session => {
    const outcome = session.outcome;
    return isIndependentOutcome(outcome) ? [outcome] : [];
  });
}

export function summarizeOutcomes(outcomes: LeapOutcome[]): OutcomeSummary {
  const n = outcomes.length;
  if (n === 0) {
    return {
      n,
      preN: 0,
      preMean: null,
      postN: 0,
      postMean: null,
      postSd: null,
      gainN: 0,
      meanGain: null,
      retestN: 0,
      retestMean: null,
    };
  }

  const preScores = outcomes.flatMap(item =>
    item.preScore === null ? [] : [item.preScore],
  );
  const postScores = outcomes.map(item => item.postScore);
  const gainOutcomes = outcomes.filter(
    item => item.scoreComparable && typeof item.observedGain === 'number',
  );
  const preMean = preScores.length
    ? preScores.reduce((sum, score) => sum + score, 0) / preScores.length
    : null;
  const postMean =
    postScores.reduce((sum, score) => sum + score, 0) / postScores.length;
  const postSd =
    postScores.length < 2
      ? null
      : Math.sqrt(
          postScores.reduce(
            (sum, score) => sum + (score - postMean) ** 2,
            0,
          ) /
            (postScores.length - 1),
        );
  const retests = outcomes.filter(
    (item): item is LeapOutcome & { retestScore: number } =>
      item.retestScore !== null,
  );

  return {
    n,
    preN: preScores.length,
    preMean,
    postN: postScores.length,
    postMean,
    postSd,
    gainN: gainOutcomes.length,
    meanGain:
      gainOutcomes.length === 0
        ? null
        : gainOutcomes.reduce(
            (sum, item) => sum + (item.observedGain ?? 0),
            0,
          ) / gainOutcomes.length,
    retestN: retests.length,
    retestMean:
      retests.length === 0
        ? null
        : retests.reduce((sum, item) => sum + item.retestScore, 0) /
          retests.length,
  };
}

export function summarizeByGroup(sessions: LeapSession[]) {
  return GROUPS.map(group => {
    const groupSessions = sessions.filter(
      session => session.experimentGroup === group,
    );
    return {
      group,
      sessions: groupSessions.length,
      summary: summarizeOutcomes(independentOutcomes(groupSessions)),
    };
  });
}

export function ablationLabel(ablation: LeapSession['ablation']): string {
  return {
    none: '无消融',
    misconception: '关闭误解匹配',
    prerequisites: '不使用前置薄弱信息',
    ranking: '关闭 LEAP 排序，回退课程固定动作',
  }[ablation];
}

function escapeCsv(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function serializeRows(rows: unknown[][]): string {
  return `\uFEFF${rows.map(row => row.map(escapeCsv).join(',')).join('\r\n')}`;
}

export function serializeOutcomeCsv(payload: LeapExportPayload): string {
  const headers = [
    '会话 ID',
    '策略组',
    '学习概念',
    '策略类型',
    '消融设置',
    '阶段',
    '创建时间',
    '更新时间',
    '前测得分',
    '无提示后测得分',
    '独立作答',
    '使用提示',
    '延迟复测得分',
    '复测到期时间',
    '前后测可比',
    '差值说明',
    '观察到的可比增益',
    '评分反馈',
    '证据记录 JSON',
  ];
  const rows = payload.sessions.map(session => [
    session.id,
    session.experimentGroup,
    session.topicName,
    session.policy,
    session.ablation,
    session.phase,
    session.createdAt,
    session.updatedAt,
    session.outcome?.preScore,
    session.outcome?.postScore,
    session.outcome?.independent,
    session.outcome?.hintUsed,
    session.outcome?.retestScore,
    session.retestDueAt,
    session.outcome
      ? session.outcome.scoreComparable
        ? '可比'
        : '不可比'
      : null,
    session.outcome
      ? session.outcome.scoreComparable
        ? session.outcome.comparisonReason ?? '后端标记为可比。'
        : session.outcome.comparisonReason ?? '后端未标记为可比，未计算差值。'
      : null,
    session.outcome?.scoreComparable
      ? session.outcome.observedGain
      : null,
    session.outcome?.feedback,
    JSON.stringify(session.evidence),
  ]);
  return serializeRows([headers, ...rows]);
}

export function serializeGroupOutcomeCsv(sessions: LeapSession[]): string {
  const headers = [
    '策略组',
    '总会话数',
    '无提示后测会话数',
    '前测均值',
    '后测均值',
    '后测样本标准差',
    '可比增益会话数',
    '可比增益均值',
    '可比性说明',
  ];
  const rows = summarizeByGroup(sessions).map(({ group, sessions: count, summary }) => [
    group,
    count,
    summary.n,
    summary.preMean,
    summary.postMean,
    summary.postSd,
    summary.gainN,
    summary.meanGain,
    summary.gainN === 0
      ? '没有后端标记为可比且含实际观察增益的会话，未计算差值。'
      : '仅汇总后端标记 scoreComparable=true 且有 observedGain 的会话。',
  ]);
  return serializeRows([headers, ...rows]);
}
