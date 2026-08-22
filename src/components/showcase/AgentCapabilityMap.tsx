import { useState } from 'react';
import {
  BookOpenCheck,
  BrainCircuit,
  ClipboardCheck,
  Route,
  Search,
  type LucideIcon,
} from 'lucide-react';
import type { AgentCapability } from '@/lib/educationApi';
import { GlassPanel } from '@/components/design/GlassPanel';
import { XiaolianCharacter } from '@/components/xiaolian/XiaolianCharacter';
import { cn } from '@/lib/utils';

type CapabilityKey = AgentCapability | 'knowledge_retrieval';

interface CapabilityNode {
  id: CapabilityKey;
  label: string;
  english: string;
  icon: LucideIcon;
  input: string;
  action: string;
  output: string;
}

const CAPABILITIES: CapabilityNode[] = [
  {
    id: 'diagnosis',
    label: '学习诊断',
    english: 'Diagnosis',
    icon: BrainCircuit,
    input: '学习画像、掌握记录与评价证据',
    action: '依据可解释规则识别当前优先关注项',
    output: '诊断原因、证据数量与下一步关注',
  },
  {
    id: 'planning',
    label: '学习规划',
    english: 'Planner',
    icon: Route,
    input: '当前诊断与学习状态',
    action: '读取或按用户操作生成当前学习计划',
    output: '有顺序、类型与预计时长的真实任务',
  },
  {
    id: 'tutoring',
    label: '学习辅导',
    english: 'Tutor',
    icon: BookOpenCheck,
    input: '学习任务、学习状态与学生问题',
    action: '协调课程知识与学习上下文进行讲解',
    output: '带课程来源和执行链路的辅导回答',
  },
  {
    id: 'assessment',
    label: '学习评估',
    english: 'Assessment',
    icon: ClipboardCheck,
    input: '真实练习结果与最近学习证据',
    action: '解释评价结果和当前学习状态变化',
    output: '掌握状态、可信度与可执行反馈',
  },
  {
    id: 'knowledge_retrieval',
    label: '课程知识检索',
    english: 'Knowledge Retrieval',
    icon: Search,
    input: '课程、问题与可选知识点范围',
    action: '在当前课程内容中执行确定性检索',
    output: '可展开查看的课程来源片段',
  },
];

export function AgentCapabilityMap() {
  const [selectedId, setSelectedId] = useState<CapabilityKey>('diagnosis');
  const selected = CAPABILITIES.find((item) => item.id === selectedId) ?? CAPABILITIES[0];

  return (
    <GlassPanel className="overflow-hidden p-5 sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-primary-600">AGENT CAPABILITY MAP</p>
          <h2 className="mt-1 text-2xl font-bold">小涟如何协调学习能力</h2>
        </div>
        <p className="max-w-md text-xs leading-5 text-[var(--em-muted-ink)]">
          这是已有能力边界的交互说明，不代表这些能力此刻正在执行。
        </p>
      </div>

      <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,.8fr)]">
        <div className="relative rounded-[26px] border border-white/70 bg-white/35 p-4 sm:p-6">
          <div className="hidden min-h-[32rem] lg:grid lg:grid-cols-3 lg:grid-rows-3 lg:items-center lg:gap-4">
            {CAPABILITIES.map((item, index) => {
              const Icon = item.icon;
              const positions = [
                'col-start-1 row-start-1',
                'col-start-3 row-start-1',
                'col-start-1 row-start-3',
                'col-start-3 row-start-3',
                'col-start-2 row-start-1',
              ];
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  aria-pressed={selectedId === item.id}
                  className={cn(
                    'relative z-10 rounded-[20px] border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                    positions[index],
                    selectedId === item.id
                      ? 'border-primary-300 bg-white text-primary-800 shadow-[0_14px_35px_rgba(118,91,211,.16)]'
                      : 'border-violet-100 bg-white/65 text-[var(--em-muted-ink)] hover:border-primary-200'
                  )}
                >
                  <Icon className="h-5 w-5 text-primary-600" />
                  <strong className="mt-2 block text-sm text-[var(--em-ink)]">{item.english}</strong>
                  <span className="mt-0.5 block text-[11px]">{item.label}</span>
                </button>
              );
            })}
            <div className="col-start-2 row-start-2 z-10 flex flex-col items-center rounded-[26px] border border-violet-200 bg-gradient-to-b from-white to-violet-50/80 p-4 text-center shadow-[0_20px_50px_rgba(118,91,211,.18)]">
              <XiaolianCharacter state="encourage" size="md" />
              <strong className="text-base">小涟智能体</strong>
              <span className="mt-1 text-[10px] text-[var(--em-muted-ink)]">协调已有教育能力</span>
            </div>
            <div className="pointer-events-none absolute inset-24 rounded-full border border-dashed border-violet-200" />
          </div>

          <div className="grid grid-cols-2 gap-3 lg:hidden">
            <div className="col-span-2 flex items-center gap-3 rounded-[22px] border border-violet-200 bg-white/75 p-3">
              <XiaolianCharacter state="encourage" size="sm" />
              <div><strong>小涟智能体</strong><p className="text-[11px] text-[var(--em-muted-ink)]">协调已有教育能力</p></div>
            </div>
            {CAPABILITIES.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  aria-pressed={selectedId === item.id}
                  className={cn(
                    'rounded-[18px] border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                    selectedId === item.id ? 'border-primary-300 bg-white' : 'border-violet-100 bg-white/55'
                  )}
                >
                  <Icon className="h-4 w-4 text-primary-600" />
                  <strong className="mt-2 block text-xs">{item.english}</strong>
                  <span className="mt-0.5 block text-[10px] text-[var(--em-muted-ink)]">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-[26px] border border-violet-100 bg-white/65 p-5" aria-live="polite">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary-100 text-primary-700"><selected.icon className="h-5 w-5" /></span>
            <div><p className="text-[10px] font-bold tracking-widest text-primary-600">{selected.english}</p><h3 className="font-bold">{selected.label}</h3></div>
          </div>
          <dl className="mt-5 space-y-4">
            <div><dt className="text-[10px] font-bold tracking-wider text-[var(--em-muted-ink)]">输入事实</dt><dd className="mt-1 text-sm leading-6">{selected.input}</dd></div>
            <div><dt className="text-[10px] font-bold tracking-wider text-[var(--em-muted-ink)]">执行能力</dt><dd className="mt-1 text-sm leading-6">{selected.action}</dd></div>
            <div><dt className="text-[10px] font-bold tracking-wider text-[var(--em-muted-ink)]">可验证输出</dt><dd className="mt-1 text-sm leading-6">{selected.output}</dd></div>
          </dl>
        </div>
      </div>
    </GlassPanel>
  );
}
