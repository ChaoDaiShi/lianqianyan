import type { DiagnosisResult, DiagnosisStatus, KnowledgePointDiagnosis } from '@/domain';
import { DIAGNOSIS_REASON_TEXT, DIAGNOSIS_STATUS_LABEL } from '@/domain';

export interface DiagnosisTone {
  label: string;
  node: string;
  glow: string;
  badge: string;
  text: string;
}

const TONES: Record<DiagnosisStatus, DiagnosisTone> = {
  unassessed: { label: DIAGNOSIS_STATUS_LABEL.unassessed, node: 'bg-slate-300', glow: 'shadow-slate-300/40', badge: 'bg-slate-100 text-slate-600', text: 'text-slate-600' },
  insufficient_evidence: { label: DIAGNOSIS_STATUS_LABEL.insufficient_evidence, node: 'bg-slate-300', glow: 'shadow-slate-300/40', badge: 'bg-slate-100 text-slate-600', text: 'text-slate-600' },
  weak: { label: DIAGNOSIS_STATUS_LABEL.weak, node: 'bg-fuchsia-500', glow: 'shadow-fuchsia-400/50', badge: 'bg-fuchsia-50 text-fuchsia-700', text: 'text-fuchsia-700' },
  developing: { label: DIAGNOSIS_STATUS_LABEL.developing, node: 'bg-sky-500', glow: 'shadow-sky-400/50', badge: 'bg-sky-50 text-sky-700', text: 'text-sky-700' },
  proficient: { label: DIAGNOSIS_STATUS_LABEL.proficient, node: 'bg-gradient-to-br from-sky-400 to-amber-300', glow: 'shadow-sky-300/50', badge: 'bg-sky-50 text-sky-700', text: 'text-sky-700' },
  mastered: { label: DIAGNOSIS_STATUS_LABEL.mastered, node: 'bg-amber-300', glow: 'shadow-amber-300/60', badge: 'bg-amber-50 text-amber-700', text: 'text-amber-700' },
};

export function isAssessedDiagnosis(status: DiagnosisStatus) {
  return status === 'weak' || status === 'developing' || status === 'proficient' || status === 'mastered';
}
export function getDiagnosisTone(status: DiagnosisStatus) { return TONES[status]; }
export function formatDiagnosisPercent(value: number | null | undefined, assessed = true) { return !assessed || value == null ? '--' : `${Math.round(value * 100)}%`; }
export function diagnosisReasons(point: KnowledgePointDiagnosis) {
  if (!point.reasonCodes.length) return [DIAGNOSIS_REASON_TEXT[point.status === 'unassessed' ? 'NO_EVIDENCE' : 'LIMITED_EVIDENCE']];
  return point.reasonCodes.map((code) => DIAGNOSIS_REASON_TEXT[code] ?? '').filter(Boolean);
}
export function buildDiagnosisAdvice(diagnosis: DiagnosisResult): string[] {
  const lines: string[] = [];
  const primary = diagnosis.primaryFocus;
  if (primary) lines.push(`目前「${primary.knowledgePointName}」是最值得优先巩固的知识点。你已经积累了足够学习证据，因此这个判断具有一定可信度。`);
  if (diagnosis.unassessedPoints.length > 0) lines.push('目前还有较多知识点尚未完成有效评估。相比直接安排大量学习，先完成一次快速测评会更合适。');
  else if (!primary && diagnosis.strengths.length > 0) lines.push('当前没有需要优先干预的薄弱点，说明整体掌握情况较好，可以继续推进新的学习内容。');
  if (!lines.length) lines.push('当前还没有足够学习证据。完成一次学习或快速练习后，小涟会逐步了解你的学习状态。');
  return lines;
}
