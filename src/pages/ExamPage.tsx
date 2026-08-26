import { BarChart3, Bot, ClipboardCheck, FileQuestion, LockKeyhole, ShieldCheck, TimerReset } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { GlassPanel } from '@/components/design/GlassPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExamCatalog } from '@/components/exam/ExamCatalog';
import { ExamHistory } from '@/components/exam/ExamHistory';
import { QuestionBank } from '@/components/exam/QuestionBank';
import { ExamBuilder } from '@/components/exam/ExamBuilder';
import { ExamGenerator } from '@/components/exam/ExamGenerator';

const BOUNDARIES = [
  { icon: TimerReset, title: '服务端计时', detail: '刷新后继续，过期自动结卷' },
  { icon: LockKeyhole, title: '发布后锁定', detail: '题目与分值不再漂移' },
  { icon: ShieldCheck, title: '答案按阶段隔离', detail: '交卷前不返回答案与解析' },
] as const;

export function ExamPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <GlassPanel className="relative overflow-hidden p-6 sm:p-8">
          <div className="absolute -right-10 -top-16 h-64 w-64 rounded-full bg-fuchsia-200/25 blur-3xl" />
          <div className="relative">
            <p className="flex items-center gap-2 text-xs font-bold tracking-[0.16em] text-primary-700"><ClipboardCheck className="h-4 w-4" />ASSESSMENT CENTER</p>
            <h1 className="mt-3 text-3xl font-bold sm:text-4xl">考试中心</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--em-muted-ink)]">
              从自定义题型和题库开始，完成组卷、发布、断点续答、自动评分、人工批阅与成绩复盘。考试结果会作为真实学习证据进入成长画像。
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-3">{BOUNDARIES.map((item) => { const Icon = item.icon; return <div key={item.title} className="rounded-[18px] border border-white/70 bg-white/55 p-3"><Icon className="h-4 w-4 text-primary-600" /><p className="mt-2 text-xs font-bold">{item.title}</p><p className="mt-1 text-[10px] text-[var(--em-muted-ink)]">{item.detail}</p></div>; })}</div>
            <p className="mt-4 text-[10px] leading-5 text-amber-700">当前数据按匿名学习档案区分；该标识不构成账号权限或监考保证。无登录版本请勿录入敏感个人信息，公开部署时应由宿主平台限制命题与批阅入口。</p>
          </div>
        </GlassPanel>

        <Tabs defaultValue="catalog" className="space-y-5">
          <div className="overflow-x-auto pb-1">
            <TabsList className="h-auto min-w-[820px] rounded-[20px] border border-violet-100 bg-white/70 p-1.5 shadow-sm">
              <TabsTrigger value="catalog" className="h-11 flex-1 gap-2 rounded-[15px] data-[state=active]:bg-violet-50 data-[state=active]:text-primary-700"><ClipboardCheck className="h-4 w-4" />考试中心</TabsTrigger>
              <TabsTrigger value="results" className="h-11 flex-1 gap-2 rounded-[15px] data-[state=active]:bg-sky-50 data-[state=active]:text-sky-700"><BarChart3 className="h-4 w-4" />我的结果</TabsTrigger>
              <TabsTrigger value="questions" className="h-11 flex-1 gap-2 rounded-[15px] data-[state=active]:bg-fuchsia-50 data-[state=active]:text-fuchsia-700"><FileQuestion className="h-4 w-4" />题库与题型</TabsTrigger>
              <TabsTrigger value="builder" className="h-11 flex-1 gap-2 rounded-[15px] data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700"><LockKeyhole className="h-4 w-4" />命题与批阅</TabsTrigger>
              <TabsTrigger value="generator" className="h-11 flex-1 gap-2 rounded-[15px] data-[state=active]:bg-violet-50 data-[state=active]:text-primary-700"><Bot className="h-4 w-4" />AI 智能组卷</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="catalog" forceMount className="mt-0 data-[state=inactive]:hidden"><ExamCatalog /></TabsContent>
          <TabsContent value="results" forceMount className="mt-0 data-[state=inactive]:hidden"><ExamHistory /></TabsContent>
          <TabsContent value="questions" forceMount className="mt-0 data-[state=inactive]:hidden"><QuestionBank /></TabsContent>
          <TabsContent value="builder" forceMount className="mt-0 data-[state=inactive]:hidden"><ExamBuilder /></TabsContent>
          <TabsContent value="generator" forceMount className="mt-0 data-[state=inactive]:hidden"><ExamGenerator /></TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
