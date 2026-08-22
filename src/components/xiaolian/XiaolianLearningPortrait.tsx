import { Compass, Focus, GraduationCap, Star } from 'lucide-react';
import type { DiagnosisResult, LearnerProfile } from '@/domain';
import { GlassPanel } from '@/components/design/GlassPanel';
import { buildXiaolianLearningPortrait } from './xiaolianMemory';

export interface XiaolianLearningPortraitProps {
  profile: LearnerProfile;
  diagnosis: DiagnosisResult;
}

function DirectionList({
  values,
  emptyText,
}: {
  values: string[];
  emptyText: string;
}) {
  if (values.length === 0) {
    return (
      <p className="mt-2 text-sm leading-6 text-[var(--em-muted-ink)]">
        {emptyText}
      </p>
    );
  }

  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {values.map((value) => (
        <li
          key={value}
          className="rounded-lg border border-violet-100 bg-white/60 px-3 py-1.5 text-sm font-medium"
        >
          {value}
        </li>
      ))}
    </ul>
  );
}

export function XiaolianLearningPortrait({
  profile,
  diagnosis,
}: XiaolianLearningPortraitProps) {
  const portrait = buildXiaolianLearningPortrait({ profile, diagnosis });

  return (
    <GlassPanel className="p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <GraduationCap className="h-4 w-4 text-primary-600" />
        <p className="text-[10px] font-bold text-primary-600">
          LEARNING PORTRAIT
        </p>
      </div>
      <h2 className="mt-1 text-xl font-bold">小涟陪伴式学习画像</h2>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <section>
          <p className="flex items-center gap-2 text-xs font-semibold text-[var(--em-muted-ink)]">
            <Compass className="h-4 w-4 text-primary-500" />
            当前学习阶段
          </p>
          <p className="mt-2 text-base font-bold">{portrait.stage}</p>
        </section>
        <section>
          <p className="flex items-center gap-2 text-xs font-semibold text-[var(--em-muted-ink)]">
            <Star className="h-4 w-4 text-amber-500" />
            已掌握方向
          </p>
          <DirectionList
            values={portrait.masteredDirections}
            emptyText="当前还没有达到掌握状态的方向。"
          />
        </section>
        <section className="sm:col-span-2">
          <p className="flex items-center gap-2 text-xs font-semibold text-[var(--em-muted-ink)]">
            <Focus className="h-4 w-4 text-fuchsia-500" />
            正在加强方向
          </p>
          <DirectionList
            values={portrait.strengtheningDirections}
            emptyText="当前诊断没有给出需要优先加强的方向。"
          />
        </section>
      </div>

      <div className="mt-5 border-t border-violet-100 pt-4">
        <p className="text-xs font-semibold text-[var(--em-muted-ink)]">
          下一步建议
        </p>
        <p className="mt-2 text-sm leading-6">{portrait.nextSuggestion}</p>
      </div>
    </GlassPanel>
  );
}
