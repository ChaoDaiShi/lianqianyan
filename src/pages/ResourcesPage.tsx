import { BookOpenCheck, Code2, Globe2, ShieldCheck, Sparkles } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { GlassPanel } from '@/components/design/GlassPanel';
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

const BOUNDARIES = [
  {
    icon: BookOpenCheck,
    title: '课程来源可追溯',
    description: '资源只整理内置课程章节',
    tone: 'bg-violet-50 text-primary-700',
  },
  {
    icon: Globe2,
    title: 'Wikipedia 补充资料',
    description: '外部结果保留原文链接',
    tone: 'bg-sky-50 text-sky-700',
  },
  {
    icon: ShieldCheck,
    title: '不执行本机代码',
    description: '编译过程是受限教学模拟',
    tone: 'bg-emerald-50 text-emerald-700',
  },
] as const;

export function ResourcesPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <GlassPanel className="relative overflow-hidden p-5 sm:p-8">
          <div className="absolute -left-16 top-12 h-52 w-52 rounded-full bg-violet-200/25 blur-3xl" />
          <div className="absolute -right-10 -top-16 h-64 w-64 rounded-full bg-sky-200/25 blur-3xl" />
          <div className="relative grid gap-5 lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-center">
            <XiaolianCharacter state="teaching" size="lg" priority />
            <div>
              <p className="flex items-center justify-center gap-2 text-xs font-bold tracking-[0.16em] text-primary-700 lg:justify-start">
                <Sparkles className="h-4 w-4" />LEARNING WORKSHOP
              </p>
              <h1 className="mt-3 text-center text-3xl font-bold sm:text-4xl lg:text-left">
                学习工坊
              </h1>
              <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-7 text-[var(--em-muted-ink)] lg:mx-0 lg:text-left">
                把课程材料变成可复习的资源，查找有出处的延伸资料，再用安全的编译阶段模拟理解代码错误。
              </p>
              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                {BOUNDARIES.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="rounded-[18px] border border-white/70 bg-white/55 p-3 backdrop-blur-xl"
                    >
                      <span className={`grid h-8 w-8 place-items-center rounded-xl ${item.tone}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <p className="mt-2 text-xs font-bold">{item.title}</p>
                      <p className="mt-1 text-[10px] leading-4 text-[var(--em-muted-ink)]">
                        {item.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </GlassPanel>

        <Tabs defaultValue="resources" className="space-y-5">
          <div className="flex justify-center">
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
