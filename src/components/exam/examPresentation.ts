import type {
  ExamAnswerValue,
  ExamDraftInput,
  ExamResult,
  GradingStrategy,
  QuestionResponseKind,
} from '@/domain';

const RESPONSE_KIND_LABELS: Record<QuestionResponseKind, string> = {
  single_choice: '单选',
  multiple_choice: '多选',
  boolean: '判断',
  short_text: '短文本',
  long_text: '长文本',
};

const GRADING_LABELS: Record<GradingStrategy, string> = {
  exact: '精确匹配',
  set_exact: '选项集合匹配',
  keyword: '关键词部分评分',
  manual: '人工评分',
};

export function responseKindLabel(kind: QuestionResponseKind): string {
  return RESPONSE_KIND_LABELS[kind];
}

export function gradingStrategyLabel(strategy: GradingStrategy): string {
  return GRADING_LABELS[strategy];
}

export function answerIsComplete(answer: ExamAnswerValue): boolean {
  if (answer === null) return false;
  if (typeof answer === 'string') return answer.trim().length > 0;
  if (Array.isArray(answer)) return answer.length > 0;
  return typeof answer === 'boolean';
}

/**
 * 截止前交卷先同步本地答案；截止后服务端可能已经封卷，继续写答案只会得到冲突响应。
 */
export function shouldSyncAnswersBeforeSubmit(remainingMilliseconds: number): boolean {
  return remainingMilliseconds > 0;
}

function displayNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '');
}

export function formatExamScore(
  awardedScore: number,
  maxScore: number,
  pendingScore: number,
): string {
  if (pendingScore > 0) {
    return `已得 ${displayNumber(awardedScore)} 分 · ${displayNumber(pendingScore)} 分待批`;
  }
  return `${displayNumber(awardedScore)} / ${displayNumber(maxScore)} 分`;
}

export function validateExamDraft(draft: ExamDraftInput): string[] {
  const errors: string[] = [];
  if (!draft.title.trim()) errors.push('请填写试卷标题');
  if (!Number.isInteger(draft.durationMinutes) || draft.durationMinutes < 1 || draft.durationMinutes > 480) {
    errors.push('考试时长应为 1–480 分钟');
  }
  if (draft.passPercentage < 0 || draft.passPercentage > 100) {
    errors.push('及格线应为 0–100%');
  }
  if (
    draft.items.length === 0 ||
    draft.items.some((item) => !item.questionId || item.points <= 0)
  ) {
    errors.push('至少选择一道有效题目');
  }
  if (new Set(draft.items.map((item) => item.questionId)).size !== draft.items.length) {
    errors.push('同一道题不能重复加入试卷');
  }
  return errors;
}

function answerText(value: ExamAnswerValue): string {
  if (value === null) return '';
  if (Array.isArray(value)) return value.join('；');
  if (typeof value === 'boolean') return value ? '正确' : '错误';
  return value;
}

function csvCell(value: string | number | boolean | null): string {
  let text = value === null ? '' : String(value);
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildResultCsv(result: ExamResult): string {
  const rows: Array<Array<string | number | boolean | null>> = [
    ['考试', '题号', '题型', '题目', '我的答案', '参考答案', '得分', '满分', '评分状态', '反馈'],
    ...result.answers.map((answer, index) => [
      result.examTitle,
      index + 1,
      answer.questionTypeName,
      answer.prompt,
      answerText(answer.userAnswer),
      answerText(answer.correctAnswer),
      answer.awardedScore,
      answer.points,
      answer.gradingStatus,
      answer.feedback,
    ]),
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
}
