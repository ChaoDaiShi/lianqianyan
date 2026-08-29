import { Eye, Sparkles } from 'lucide-react';
import type { DiagnosisResult, LearnerProfile } from '@/domain';
import type { LearningEvidence } from '@/lib/educationApi';
import type { ReflectionResult } from '@/components/learning/learningLoop';
import { buildXiaolianMemoryObservations } from './xiaolianMemory';

export interface XiaolianMemoryCardProps {
  profile: LearnerProfile;
  diagnosis: DiagnosisResult;
  evidence: LearningEvidence[];
  reflectionResults: ReflectionResult[];
  learnerId: string;
  courseId: string;
}

export function XiaolianMemoryCard({
  profile,
  diagnosis,
  evidence,
  reflectionResults,
  learnerId,
  courseId,
}: XiaolianMemoryCardProps) {
  const observations = buildXiaolianMemoryObservations({
    profile,
    diagnosis,
    evidence,
    reflectionResults,
    learnerId,
    courseId,
  });

  return (
    <section className="p-1">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4 text-primary-600" />
        <p className="text-[10px] font-bold text-primary-600">
          XIAOLIAN OBSERVATIONS
        </p>
      </div>
      <h2 className="mt-1 text-xl font-bold">小涟观察到的学习特点</h2>

      {observations.length > 0 ? (
        <ul className="mt-5 space-y-3">
          {observations.map((observation) => (
            <li
              key={observation.id}
              className="border-l-2 border-violet-200 py-1 pl-4"
            >
              <p className="text-sm leading-6 text-[var(--em-ink)]">
                {observation.text}
              </p>
              <p className="mt-1 text-[10px] font-semibold text-primary-700">
                来源：{observation.source}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-5 flex gap-3 rounded-lg border border-violet-100 bg-white/50 p-4">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
          <p className="text-sm leading-6 text-[var(--em-muted-ink)]">
            当前可用数据尚未形成可展示的学习观察。
          </p>
        </div>
      )}
    </section>
  );
}
