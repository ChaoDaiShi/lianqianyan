import { AppShell } from '@/components/layout/AppShell';
import { HeroBanner } from '@/components/home/HeroBanner';
import { HomeProfileCard } from '@/components/home/HomeProfileCard';
import { HomeDiagnosisCard } from '@/components/home/HomeDiagnosisCard';
import { TodayPlanCard } from '@/components/home/TodayPlanCard';
import { CapabilitiesCard } from '@/components/home/CapabilitiesCard';

/**
 * 学习首页 —— 忆涟千言—教 的默认首页（/#/）。
 *
 * 本轮正式从「普通卡片首页」升级为「个性化学习驾驶舱」：
 * - 顶部 Hero：欢迎语 + 当前课程 + 继续学习 / 问问小涟
 * - 今日学习计划（真实 Latest Plan + Tasks）
 * - 学习画像（真实 LearnerProfile）
 * - 当前最值得关注（真实 Diagnosis primary_focus）
 * - 小涟如何帮助你（能力展示）
 *
 * 所有学习者状态数据（Profile / Diagnosis / StudyPlan）全部来自真实 Education API，
 * API 失败展示错误态，绝不回退 Mock 冒充真实数据。
 */
function Home() {
  return (
    <AppShell>
      <HeroBanner courseName="操作系统" />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 左列（2/3）：计划 + 能力 */}
        <div className="space-y-6 lg:col-span-2">
          <TodayPlanCard />
          <CapabilitiesCard />
        </div>

        {/* 右列（1/3）：画像 + 诊断 */}
        <div className="space-y-6">
          <HomeProfileCard />
          <HomeDiagnosisCard />
        </div>
      </div>
    </AppShell>
  );
}

export default Home;
