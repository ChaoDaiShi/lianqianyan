import { BarChart3, Bot, ChevronRight, ClipboardCheck, FileQuestion, LockKeyhole } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExamCatalog } from '@/components/exam/ExamCatalog';
import { ExamHistory } from '@/components/exam/ExamHistory';
import { QuestionBank } from '@/components/exam/QuestionBank';
import { ExamBuilder } from '@/components/exam/ExamBuilder';
import { ExamGenerator } from '@/components/exam/ExamGenerator';

export function ExamPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-col justify-between gap-4 rounded-[28px] border border-white/70 bg-white/55 p-5 shadow-[0_18px_55px_rgba(97,78,170,0.11)] backdrop-blur-xl sm:flex-row sm:items-end sm:p-7">
          <div><p className="flex items-center gap-2 text-xs font-bold tracking-[0.16em] text-primary-700"><ClipboardCheck className="h-4 w-4" />ASSESSMENT WORKSPACE</p><h1 className="mt-2 text-3xl font-bold">测评工作台</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--em-muted-ink)]">先完成当前测评，再查看结果；需要命题时进入二级工作区。</p></div>
          <p className="max-w-xs rounded-2xl bg-violet-50/70 px-4 py-3 text-xs leading-5 text-[var(--em-muted-ink)]">试卷、作答和成绩均归属当前账号与所选课程；计时、锁定和评分仍由现有服务端规则执行。</p>
        </header>

        <Tabs defaultValue="catalog" className="space-y-5">
          <div className="space-y-2"><div className="flex flex-wrap items-center justify-between gap-2 px-1"><p className="text-xs font-semibold text-[var(--em-muted-ink)]">考试与成绩</p><p className="flex items-center gap-1 text-[10px] text-[var(--em-muted-ink)]">出题与组卷 <ChevronRight className="h-3 w-3" /></p></div><div className="overflow-x-auto pb-1">
            <TabsList className="h-auto min-w-[720px] rounded-[20px] border border-violet-100 bg-white/70 p-1.5 shadow-sm">
              <TabsTrigger value="catalog" className="h-11 flex-1 gap-2 rounded-[15px] data-[state=active]:bg-violet-50 data-[state=active]:text-primary-700"><ClipboardCheck className="h-4 w-4" />当前测评</TabsTrigger>
              <TabsTrigger value="results" className="h-11 flex-1 gap-2 rounded-[15px] data-[state=active]:bg-sky-50 data-[state=active]:text-sky-700"><BarChart3 className="h-4 w-4" />我的结果</TabsTrigger>
              <TabsTrigger value="questions" className="h-11 flex-1 gap-2 rounded-[15px] data-[state=active]:bg-fuchsia-50 data-[state=active]:text-fuchsia-700"><FileQuestion className="h-4 w-4" />题库与题型</TabsTrigger>
              <TabsTrigger value="builder" className="h-11 flex-1 gap-2 rounded-[15px] data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700"><LockKeyhole className="h-4 w-4" />试卷与批阅</TabsTrigger>
              <TabsTrigger value="generator" className="h-11 flex-1 gap-2 rounded-[15px] data-[state=active]:bg-violet-50 data-[state=active]:text-primary-700"><Bot className="h-4 w-4" />AI 智能组卷</TabsTrigger>
            </TabsList>
          </div></div>
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
