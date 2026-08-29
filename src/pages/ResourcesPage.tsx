import { BookOpenCheck, Code2, Globe2, Sparkles, Wrench } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { XiaolianCharacter } from '@/components/xiaolian/XiaolianCharacter';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { ResourceGenerator } from '@/components/workshop/ResourceGenerator';
import { NetworkSearchPanel } from '@/components/workshop/NetworkSearchPanel';
import { CompilerLab } from '@/components/workshop/CompilerLab';

export function ResourcesPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex items-center justify-between gap-4 rounded-[28px] border border-white/70 bg-white/55 p-5 shadow-[0_18px_55px_rgba(97,78,170,0.11)] backdrop-blur-xl sm:p-7"><div><p className="flex items-center gap-2 text-xs font-bold tracking-[0.16em] text-primary-700"><Sparkles className="h-4 w-4" />CREATION WORKSPACE</p><h1 className="mt-2 text-3xl font-bold">创作工作台</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--em-muted-ink)]">选择课程知识点与产物形式，生成后直接预览、调整并导出。</p><div className="mt-4 flex flex-wrap gap-2 text-[10px] text-[var(--em-muted-ink)]"><span className="rounded-full bg-violet-50 px-2.5 py-1">01 选择目标</span><span className="rounded-full bg-violet-50 px-2.5 py-1">02 选择模式</span><span className="rounded-full bg-violet-50 px-2.5 py-1">03 生成与预览</span><span className="rounded-full bg-violet-50 px-2.5 py-1">课程来源可追溯</span></div></div><XiaolianCharacter state="teaching" size="sm" priority /></header>

        <Tabs defaultValue="resources" className="space-y-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><p className="flex items-center gap-2 text-xs font-semibold text-[var(--em-muted-ink)]"><Wrench className="h-3.5 w-3.5" />扩展工具</p>
            <TabsList className="h-auto w-full max-w-2xl rounded-[20px] border border-violet-100 bg-white/70 p-1.5 shadow-sm backdrop-blur-xl">
              <TabsTrigger
                value="resources"
                className="h-11 flex-1 gap-2 rounded-[15px] text-xs text-[var(--em-muted-ink)] data-[state=active]:bg-violet-50 data-[state=active]:text-primary-700"
              >
                <BookOpenCheck className="h-4 w-4" />资源生成
              </TabsTrigger>
              <TabsTrigger
                value="network"
                className="h-11 flex-1 gap-2 rounded-[15px] text-xs text-[var(--em-muted-ink)] data-[state=active]:bg-sky-50 data-[state=active]:text-sky-700"
              >
                <Globe2 className="h-4 w-4" />联网检索
              </TabsTrigger>
              <TabsTrigger
                value="compiler"
                className="h-11 flex-1 gap-2 rounded-[15px] text-xs text-[var(--em-muted-ink)] data-[state=active]:bg-slate-100 data-[state=active]:text-slate-800"
              >
                <Code2 className="h-4 w-4" />编译实验
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="resources" forceMount className="mt-0 data-[state=inactive]:hidden">
            <ResourceGenerator />
          </TabsContent>
          <TabsContent value="network" forceMount className="mt-0 data-[state=inactive]:hidden">
            <NetworkSearchPanel />
          </TabsContent>
          <TabsContent value="compiler" forceMount className="mt-0 data-[state=inactive]:hidden">
            <CompilerLab />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
