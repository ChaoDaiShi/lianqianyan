import { ArrowRight, Sparkles, Timer } from 'lucide-react';
import { learningPath } from '@/mock';
import { Button } from '@/components/ui/button';
import { useStartLearning } from '@/components/learning/useStartLearning';
import { useMasteryState } from '@/components/learning/useMasteryState';

/**
 * 个性化学习路径 —— 首页最重要的比赛展示卡片。
 * 展示七阶段学习路线：学 → 问 → 探 → 练 → 诊 → 述 → 测。
 */
export function LearningPathCard() {
  const { starting, start } = useStartLearning();
  const mastery = useMasteryState('kp-pv', learningPath.currentMastery);
  const currentMastery = mastery.masteryScore;
  const handleStart = () => {
    void start({
      source: 'recommended_path',
      courseId: 'course-os',
      knowledgePointId: 'kp-pv',
      topic: `${learningPath.course} · ${learningPath.topic}`,
    });
  };
  return (
    <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="p-6">
        <div className="flex items-center gap-2 text-blue-700">
          <Sparkles className="h-4 w-4" />
          <h2 className="text-lg font-bold text-gray-900">{learningPath.title}</h2>
        </div>

        {/* 目标信息 */}
        <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-3">
          <div>
            <p className="text-sm text-gray-400">学习内容</p>
            <p className="text-base font-semibold text-gray-900">
              {learningPath.course} · {learningPath.topic}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400">当前掌握度</p>
            <p className="text-base font-semibold text-gray-900">
              {Math.round(currentMastery * 100)}%
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Timer className="h-4 w-4 text-gray-400" />
            <p className="text-sm font-semibold text-gray-900">
              预计学习 {learningPath.estimatedMinutes} min
            </p>
          </div>
        </div>

        {/* 掌握度进度 */}
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-blue-600"
            style={{ width: `${currentMastery * 100}%` }}
          />
        </div>

        {/* 七阶段学习路线 */}
        <div className="mt-6">
          <div className="flex items-center">
            {learningPath.stages.map((stage, index) => (
              <div key={stage.key} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-sm font-bold text-blue-600">
                    {stage.title}
                  </div>
                </div>
                {index < learningPath.stages.length - 1 && (
                  <div className="mx-1 mb-6 h-px flex-1 bg-blue-100" />
                )}
              </div>
            ))}
          </div>
          {/* 阶段说明 */}

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
            {learningPath.stages.map((stage) => (
              <div
                key={stage.key}
                className="rounded-xl bg-blue-50/60 px-2 py-2.5 text-center"
              >
                <p className="text-sm font-semibold text-blue-700">{stage.title}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-gray-500">
                  {stage.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 开始按钮 */}
        <div className="mt-6 flex justify-end">
          <Button className="gap-1.5" onClick={handleStart} disabled={starting}>
            {starting ? '小涟正在记录…' : '开始这段学习'}
            {!starting && <ArrowRight className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** 阶段含义图例（学 → 问 → 探 → 练 → 诊 → 述 → 测） */
export function LearningPathLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
      {learningPath.stages.map((stage, index) => (
        <span key={stage.key} className="flex items-center gap-1.5">
          <span className="font-semibold text-blue-700">{stage.title}</span>
          <span>{stage.description}</span>
          {index < learningPath.stages.length - 1 && (
            <ArrowRight className="mx-1 h-3.5 w-3.5 text-gray-300" />
          )}
        </span>
      ))}
    </div>
  );
}
