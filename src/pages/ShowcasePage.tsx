import { useState } from 'react';
import { ArrowDown, ArrowRight, BookOpen, BrainCircuit, CheckCircle2, Compass, Presentation, Route, Sparkles, Stethoscope } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AgentCapabilityMap } from '@/components/showcase/AgentCapabilityMap';
import { AppShell } from '@/components/layout/AppShell';
import { GlassPanel } from '@/components/design/GlassPanel';
import { XiaolianCharacter } from '@/components/xiaolian/XiaolianCharacter';
import { XiaolianMessage } from '@/components/xiaolian/XiaolianMessage';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const LOOP = [
  { id: 'diagnosis', label: 'Diagnosis', title: '理解学习状态', detail: '从真实学习画像、掌握记录和评价证据中形成可解释诊断。', icon: Stethoscope, to: '/diagnosis' },
  { id: 'planner', label: 'Planner', title: '规划成长路径', detail: '围绕当前优先关注项组织有顺序、有类型的学习任务。', icon: Route, to: '/demo' },
  { id: 'learning', label: 'Learning', title: '进入学习空间', detail: '在当前任务中学习课程内容，并随时向小涟提问。', icon: BookOpen, to: '/space' },
  { id: 'assessment', label: 'Assessment', title: '记录真实评价', detail: '练习结果形成学习证据，并由服务端返回掌握状态与可信度。', icon: CheckCircle2, to: '/demo' },
  { id: 'replanning', label: 'Replanning', title: '动态调整计划', detail: '只有真实评价触发物质变化时才调整当前计划，否则保持原计划。', icon: BrainCircuit, to: '/demo' },
];

export function ShowcasePage() {
  const [activeLoop, setActiveLoop] = useState(LOOP[0].id);
  const activeStage = LOOP.find((stage) => stage.id === activeLoop) ?? LOOP[0];

  return (
    <AppShell>
      <div className="space-y-7 lg:space-y-10">
        <GlassPanel className="relative min-h-[640px] overflow-hidden p-6 sm:p-9 lg:p-12">
          <div className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-companion/20 blur-3xl" />
          <div className="absolute -right-16 -top-20 h-96 w-96 rounded-full bg-star/20 blur-3xl" />
          <div className="relative grid min-h-[550px] items-center gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(19rem,.92fr)]">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white/65 px-3 py-1.5 text-xs font-bold tracking-[0.12em] text-primary-700"><Presentation className="h-3.5 w-3.5" />COMPETITION SHOWCASE</p>
              <h1 className="mt-6 text-4xl font-bold leading-tight sm:text-6xl">忆涟千言—教</h1>
              <p className="mt-3 text-2xl font-semibold text-primary-700 sm:text-3xl">AI 学习伙伴</p>
              <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--em-muted-ink)] sm:text-lg">理解你的学习状态，规划你的成长路径，陪你一步步掌握知识。</p>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--em-muted-ink)]">一个围绕真实学习证据，具备诊断、规划、辅导、评估与动态调整能力的教育 Agent 系统。</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild className="h-11 gap-2 rounded-2xl bg-primary-500 px-5"><Link to="/demo"><Sparkles className="h-4 w-4" />开始真实演示</Link></Button>
                <Button asChild variant="outline" className="h-11 gap-2 rounded-2xl border-violet-200 bg-white/70 px-5"><Link to="/xiaolian">和小涟对话<ArrowRight className="h-4 w-4" /></Link></Button>
              </div>
            </div>
            <div className="relative"><XiaolianCharacter state="encourage" size="hero" priority /><div className="mx-auto -mt-5 max-w-sm"><XiaolianMessage tone="encourage" compact>我不只回答问题，也会结合真实学习状态，陪你完成下一步。</XiaolianMessage></div></div>
          </div>
          <button type="button" onClick={() => document.getElementById('learning-loop')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="absolute bottom-5 left-1/2 grid h-10 w-10 -translate-x-1/2 place-items-center rounded-full border border-violet-100 bg-white/70 text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400" aria-label="查看学习闭环"><ArrowDown className="h-4 w-4" /></button>
        </GlassPanel>

        <GlassPanel className="p-5 sm:p-7">
          <div className="grid gap-6 lg:grid-cols-[12rem_minmax(0,1fr)] lg:items-center">
            <XiaolianCharacter state="analyzing" size="lg" />
            <div><p className="text-[10px] font-bold tracking-[0.2em] text-primary-600">XIAOLIAN · AI COMPANION</p><h2 className="mt-2 text-2xl font-bold">小涟是面向学习者的能力协调入口</h2><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-[18px] border border-violet-100 bg-white/55 p-4"><strong className="text-sm">先观察</strong><p className="mt-1 text-xs leading-5 text-[var(--em-muted-ink)]">读取真实画像、诊断、计划和学习记录。</p></div><div className="rounded-[18px] border border-violet-100 bg-white/55 p-4"><strong className="text-sm">再协调</strong><p className="mt-1 text-xs leading-5 text-[var(--em-muted-ink)]">按问题选择已有 Agent 与 Tool 能力。</p></div><div className="rounded-[18px] border border-violet-100 bg-white/55 p-4"><strong className="text-sm">给下一步</strong><p className="mt-1 text-xs leading-5 text-[var(--em-muted-ink)]">保留执行链路、课程来源与可操作建议。</p></div></div></div>
          </div>
        </GlassPanel>

        <section id="learning-loop" className="scroll-mt-24">
          <GlassPanel className="p-5 sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-bold tracking-[0.2em] text-primary-600">LEARNING LOOP</p><h2 className="mt-1 text-2xl font-bold">从学习困难到持续成长</h2></div><p className="max-w-md text-xs leading-5 text-[var(--em-muted-ink)]">点击阶段，查看每一步如何对应现有真实能力。</p></div>
            <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{LOOP.map((stage, index) => { const Icon = stage.icon; return <button key={stage.id} type="button" onClick={() => setActiveLoop(stage.id)} aria-pressed={activeLoop === stage.id} className={cn('relative rounded-[20px] border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400', activeLoop === stage.id ? 'border-primary-300 bg-white shadow-[0_12px_30px_rgba(118,91,211,.14)]' : 'border-violet-100 bg-white/45 hover:border-primary-200')}><span className="text-[10px] font-bold tracking-widest text-primary-600">0{index + 1}</span><Icon className="mt-4 h-5 w-5 text-primary-600" /><strong className="mt-2 block text-sm">{stage.label}</strong><span className="mt-1 block text-[11px] text-[var(--em-muted-ink)]">{stage.title}</span>{index < LOOP.length - 1 && <ArrowRight className="absolute -right-2.5 top-1/2 z-10 hidden h-4 w-4 text-violet-300 xl:block" />}</button>; })}</div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-[22px] border border-violet-100 bg-white/60 p-5" aria-live="polite"><div><p className="text-[10px] font-bold tracking-widest text-primary-600">{activeStage.label}</p><h3 className="mt-1 font-bold">{activeStage.title}</h3><p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--em-muted-ink)]">{activeStage.detail}</p></div><Link to={activeStage.to} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700">查看对应体验<ArrowRight className="h-4 w-4" /></Link></div>
          </GlassPanel>
        </section>

        <AgentCapabilityMap />

        <GlassPanel className="overflow-hidden bg-gradient-to-br from-primary-500/95 to-[#6975d9] p-7 text-white sm:p-10">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"><div><p className="text-xs font-bold tracking-[0.18em] text-white/70">THREE-MINUTE LIVE DEMO</p><h2 className="mt-2 text-3xl font-bold">现在，走一遍真实学习闭环</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-white/80">从用户提出困难开始，查看小涟如何连接学习画像、诊断、计划、学习空间、练习评价和动态调整。</p></div><Button asChild variant="secondary" className="h-12 gap-2 rounded-2xl px-6"><Link to="/demo"><Compass className="h-4 w-4" />进入故事化演示</Link></Button></div>
        </GlassPanel>
      </div>
    </AppShell>
  );
}
