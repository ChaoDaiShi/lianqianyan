import { BadgeCheck, Compass, Sparkles } from 'lucide-react';
import type { DiagnosisResult, LearnerProfile } from '@/domain';
import { DIAGNOSIS_STATUS_LABEL } from '@/domain';
import { GlassPanel } from '@/components/design/GlassPanel';

interface LearningIdentityCardProps {
  profile: LearnerProfile;
  diagnosis: DiagnosisResult;
}

const STATUS_ITEMS: Array<{ key: keyof LearnerProfile['statusCounts']; label: string }> = [
  { key: 'mastered', label: '掌握' },
  { key: 'proficient', label: '熟练' },
  { key: 'developing', label: '发展中' },
  { key: 'weak', label: '薄弱' },
  { key: 'insufficient_evidence', label: '证据不足' },
  { key: 'unassessed', label: '尚未评估' },
];

function deriveStage(profile: LearnerProfile, diagnosis: DiagnosisResult) {
  if (profile.insufficientData || profile.assessedCount === 0) return '建立学习画像';
  if (diagnosis.primaryFocus) return '聚焦提升';
  if (profile.statusCounts.unassessed > 0 || profile.statusCounts.insufficient_evidence > 0) return '扩展评估';
  return '巩固保持';
}

function buildObservation(profile: LearnerProfile, diagnosis: DiagnosisResult) {
  const focus = diagnosis.primaryFocus;
  if (focus) return `当前「${focus.knowledgePointName}」是诊断中的主要关注项，状态为${DIAGNOSIS_STATUS_LABEL[focus.status]}，已有 ${focus.evidenceCount} 条评价证据。`;
  const unknownCount = profile.statusCounts.unassessed + profile.statusCounts.insufficient_evidence;
  if (unknownCount > 0) return `当前有 ${unknownCount} 个知识点尚未完成可靠评估，可以继续通过学习和练习积累证据。`;
  return '当前诊断没有返回可证明的优先薄弱项，可以继续巩固现有学习状态。';
}

export function LearningIdentityCard({ profile, diagnosis }: LearningIdentityCardProps) {
  const stage = deriveStage(profile, diagnosis);

  return (
    <GlassPanel className="p-5 sm:p-7">
      <div className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-primary-600" /><p className="text-xs font-bold tracking-[0.14em] text-primary-700">LEARNING IDENTITY</p></div>
      <div className="mt-4 grid gap-5 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <section className="rounded-[22px] border border-violet-100 bg-white/55 p-5">
          <p className="flex items-center gap-2 text-xs font-semibold text-primary-700"><Compass className="h-4 w-4" />当前学习阶段</p>
          <h2 className="mt-3 text-2xl font-bold">{stage}</h2>
          <p className="mt-2 text-[10px] leading-4 text-[var(--em-muted-ink)]">根据当前 LearnerProfile 与 Diagnosis 确定性归纳，不是后端阶段字段。</p>
        </section>
        <section className="rounded-[22px] border border-sky-100 bg-white/55 p-5">
          <p className="text-xs font-semibold text-sky-700">当前课程知识状态</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{STATUS_ITEMS.map((item) => <div key={item.key} className="rounded-xl bg-white/70 px-3 py-2"><strong className="block text-lg">{profile.statusCounts[item.key]}</strong><span className="text-[10px] text-[var(--em-muted-ink)]">{item.label}</span></div>)}</div>
        </section>
      </div>
      <section className="mt-4 rounded-[20px] border border-pink-100 bg-gradient-to-r from-pink-50/70 to-violet-50/70 p-4">
        <p className="flex items-center gap-2 text-xs font-semibold text-fuchsia-700"><Sparkles className="h-4 w-4" />小涟观察</p>
        <p className="mt-2 text-sm leading-6 text-[var(--em-muted-ink)]">{buildObservation(profile, diagnosis)}</p>
      </section>
      <p className="mt-3 text-[10px] leading-4 text-[var(--em-muted-ink)]">知识状态按当前课程中的真实知识点统计；系统没有返回独立“知识领域”分类，因此这里不创建虚构领域。</p>
    </GlassPanel>
  );
}
