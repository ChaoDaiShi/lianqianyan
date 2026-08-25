import type { LearnerProfile } from '@/domain';

export function EvidenceCoverageRing({ profile }: { profile: LearnerProfile }) {
  const coverage = Math.round(Math.min(1, Math.max(0, profile.coverage)) * 100);
  const confidence =
    profile.overallConfidence === null
      ? null
      : Math.round(Math.min(1, Math.max(0, profile.overallConfidence)) * 100);

  return (
    <section className="rounded-[22px] border border-violet-100 bg-white/55 p-4">
      <h3 className="text-sm font-bold">证据覆盖</h3>
      <div className="mt-4 flex items-center gap-5">
        <div
          role="img"
          aria-label={`已评估 ${profile.assessedCount} 个，共 ${profile.totalKnowledgePoints} 个知识点，覆盖率 ${coverage}%`}
          className="relative grid h-28 w-28 shrink-0 place-items-center rounded-full"
          style={{
            background: `conic-gradient(rgb(124 92 246) 0 ${coverage}%, rgb(237 233 254) ${coverage}% 100%)`,
          }}
        >
          <div className="grid h-20 w-20 place-items-center rounded-full bg-white/95 text-center shadow-inner">
            <div>
              <strong className="text-xl text-violet-700">{coverage}%</strong>
              <p className="text-[10px] text-[var(--em-muted-ink)]">已覆盖</p>
            </div>
          </div>
        </div>
        <dl className="min-w-0 space-y-3 text-sm">
          <div>
            <dt className="text-xs text-[var(--em-muted-ink)]">有效评估</dt>
            <dd className="mt-0.5 font-bold">
              {profile.assessedCount}/{profile.totalKnowledgePoints} 个知识点
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--em-muted-ink)]">画像可信度</dt>
            <dd className="mt-0.5 font-bold">
              {confidence === null ? '证据不足' : `${confidence}%`}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--em-muted-ink)]">仍待补充</dt>
            <dd className="mt-0.5 font-bold">{profile.unassessedCount} 个知识点</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
