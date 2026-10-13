import { BookOpenCheck, Code2, Globe2, Wrench } from 'lucide-react';
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
import { PageIntro } from '@/components/design/PageIntro';

export function ResourcesPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-5">
        <PageIntro eyebrow="CREATION WORKSPACE" title="创作工作台" description="按输入参数、处理过程与产物预览组织资源生成、联网检索和受限编译模拟。" icon={Wrench} aside={<XiaolianCharacter state="teaching" size="sm" priority />} />

        <ol aria-label="工具处理流程" className="grid gap-2 sm:grid-cols-3">
          {['输入参数', '处理过程', '产物预览'].map((step, index) => <li key={step} className="rounded-lg border border-[var(--em-border)] bg-[var(--em-surface)] px-3 py-2 text-xs"><span className="mr-2 font-semibold text-[var(--em-primary)]">0{index + 1}</span>{step}</li>)}
        </ol>

        <Tabs defaultValue="resources" className="space-y-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><p className="flex items-center gap-2 text-xs font-semibold text-[var(--em-muted-ink)]"><Wrench className="h-3.5 w-3.5" />扩展工具</p>
            <TabsList className="h-auto w-full max-w-2xl rounded-lg border border-[var(--em-border)] bg-[var(--em-surface)] p-1">
              <TabsTrigger
                value="resources"
                className="h-10 flex-1 gap-2 rounded-md text-xs text-[var(--em-muted-ink)] data-[state=active]:bg-[var(--em-primary-subtle)] data-[state=active]:text-[var(--em-primary-deep)]"
              >
                <BookOpenCheck className="h-4 w-4" />资源生成
              </TabsTrigger>
              <TabsTrigger
                value="network"
                className="h-10 flex-1 gap-2 rounded-md text-xs text-[var(--em-muted-ink)] data-[state=active]:bg-[var(--em-primary-subtle)] data-[state=active]:text-[var(--em-primary-deep)]"
              >
                <Globe2 className="h-4 w-4" />联网检索
              </TabsTrigger>
              <TabsTrigger
                value="compiler"
                className="h-10 flex-1 gap-2 rounded-md text-xs text-[var(--em-muted-ink)] data-[state=active]:bg-[var(--em-primary-subtle)] data-[state=active]:text-[var(--em-primary-deep)]"
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
