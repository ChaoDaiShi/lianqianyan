import { Activity, Focus, GraduationCap, Sparkles } from 'lucide-react';
import type { DiagnosisResult, ExamAnalytics, LearnerProfile } from '@/domain';
import { GlassPanel } from '@/components/design/GlassPanel';
import { AssessmentSnapshot } from './AssessmentSnapshot';
import { EvidenceCoverageRing } from './EvidenceCoverageRing';
import { KnowledgePerformanceBars } from './KnowledgePerformanceBars';
import { PortraitRadar } from './PortraitRadar';
import { buildProfileVisualization } from './profileVisualization';

export interface LearnerPortraitDashboardProps {
  profile: LearnerProfile;
  diagnosis: DiagnosisResult;
  analytics: ExamAnalytics | null;
  analyticsLoading: boolean;
  analyticsError: boolean;
  onRetryAnalytics: () => void;
}

function percentage(value: number | null): string {
  if (value === null) return '暂无';
  return `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`;
}

export function LearnerPortraitDashboard({
  profile,
  diagnosis,
  analytics,
  analyticsLoading,
  analyticsError,
  onRetryAnalytics,
}: LearnerPortraitDashboardProps) {
  const view = buildProfileVisualization(profile, analytics);
  const focus = diagnosis.primaryFocus;

  return (
    <GlassPanel className="overflow-hidden p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-bold tracking-[0.16em] text-primary-600">
            <GraduationCap className="h-4 w-4" />
            EVIDENCE-DRIVEN PORTRAIT
          </p>
          <h2 className="mt-1 text-xl font-bold">证据驱动成长画像</h2>
          <p className="mt-1 text-xs font-semibold text-violet-700">{profile.courseName}</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--em-muted-ink)]">
            将学习行为、诊断可信度与已评分考试分开呈现，缺失证据不会被误判为低分。
          </p>
        </div>
        <div className="rounded-[18px] bg-gradient-to-br from-violet-100 to-sky-50 px-4 py-3 sm:text-right">
          <p className="text-[10px] font-semibold text-[var(--em-muted-ink)]">综合掌握</p>
          <p className="mt-0.5 text-2xl font-bold text-violet-700">
            {percentage(profile.overallMastery)}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.05fr_.95fr_.95fr]">
        <PortraitRadar axes={view.radar} />
        <EvidenceCoverageRing profile={profile} />
        <AssessmentSnapshot
          analytics={view.assessment}
          loading={analyticsLoading}
          error={analyticsError}
          onRetry={onRetryAnalytics}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.45fr_.55fr]">
        <KnowledgePerformanceBars rows={view.knowledge} />
        <aside className="rounded-[22px] border border-violet-100 bg-gradient-to-b from-violet-50/80 to-white/55 p-4 sm:p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <Focus className="h-4 w-4 text-fuchsia-500" />
            当前成长焦点
          </h3>
          {focus ? (
            <>
              <p className="mt-4 text-lg font-bold">{focus.knowledgePointName}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--em-muted-ink)]">
                当前掌握 {percentage(focus.masteryScore)}，已有 {focus.evidenceCount} 条学习证据。
              </p>
              <p className="mt-3 flex items-start gap-2 rounded-2xl bg-white/70 p-3 text-xs leading-5 text-violet-800">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                下一步优先围绕这一知识点继续学习、练习并用考试结果复核。
              </p>
            </>
          ) : (
            <p className="mt-4 text-sm leading-6 text-[var(--em-muted-ink)]">
              当前诊断没有需要优先干预的知识点，继续积累真实学习证据。
            </p>
          )}
          <div className="mt-5 border-t border-violet-100 pt-4">
            <p className="flex items-center gap-2 text-xs font-semibold text-[var(--em-muted-ink)]">
              <Activity className="h-3.5 w-3.5" />
              状态口径
            </p>
            <p className="mt-2 text-xs leading-5 text-[var(--em-muted-ink)]">
              共 {view.statusTotal} 个知识点；画像与考试分别计算，避免少量题目覆盖全部学习结论。
            </p>
          </div>
        </aside>
      </div>
    </GlassPanel>
  );
}
