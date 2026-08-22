import { ArrowRight, Code2, Hammer, Info, Presentation, Settings, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { GlassPanel } from '@/components/design/GlassPanel';
import { PlaceholderPage } from '@/components/PlaceholderPage';
import { XiaolianCharacter } from '@/components/xiaolian/XiaolianCharacter';

export function ResourcesPage() { return <AppShell><PlaceholderPage title="资源工坊" description="这个学习空间仍在准备中。当前练习资源请从具体学习任务进入。" icon={Hammer} feature="资源空间仍在汇聚中" /></AppShell>; }
export function SettingsPage() { return <AppShell><PlaceholderPage title="设置" description="偏好设置界面仍在整理中；当前不会展示或保存尚未实现的配置项。" icon={Settings} feature="设置空间仍在汇聚中" /></AppShell>; }

const EXTRA_LINKS = [
  { to: '/showcase', title: '比赛展示', description: '用三分钟理解诊断、规划、学习、评估与动态调整闭环。', icon: Presentation, tone: 'text-primary-700 bg-violet-50' },
  { to: '/demo', title: '真实演示', description: '按故事顺序体验现有 API 支撑的完整学习流程。', icon: Sparkles, tone: 'text-fuchsia-700 bg-pink-50' },
  { to: '/about/capabilities', title: '开发者能力说明', description: '查看 Agent 角色、真实 Tool Catalog 与知识检索边界。', icon: Code2, tone: 'text-sky-700 bg-sky-50' },
];

export function AboutPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <GlassPanel className="overflow-hidden p-6 sm:p-9">
          <div className="grid gap-6 md:grid-cols-[10rem_minmax(0,1fr)] md:items-center">
            <XiaolianCharacter state="idle" size="lg" />
            <div><p className="flex items-center gap-2 text-xs font-bold tracking-[0.16em] text-primary-700"><Info className="h-4 w-4" />MORE & ABOUT</p><h1 className="mt-3 text-3xl font-bold">关于忆涟千言—教</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--em-muted-ink)]">一个以真实学习证据、诊断与动态学习规划为基础的 AI 学姐陪伴式学习空间。日常学习主路径保持简单；比赛展示和技术能力说明集中在这里。</p></div>
          </div>
        </GlassPanel>
        <div className="grid gap-4 lg:grid-cols-3">
          {EXTRA_LINKS.map((item) => { const Icon = item.icon; return <Link key={item.to} to={item.to} className="group"><GlassPanel className="h-full p-5 transition group-hover:-translate-y-0.5"><span className={`grid h-11 w-11 place-items-center rounded-2xl ${item.tone}`}><Icon className="h-5 w-5" /></span><h2 className="mt-4 text-lg font-bold">{item.title}</h2><p className="mt-2 text-xs leading-5 text-[var(--em-muted-ink)]">{item.description}</p><span className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-primary-700">打开页面<ArrowRight className="h-3.5 w-3.5" /></span></GlassPanel></Link>; })}
        </div>
        <p className="text-center text-xs leading-5 text-[var(--em-muted-ink)]">以上页面用于产品介绍、比赛演示与开发者说明，不属于日常学习星轨。</p>
      </div>
    </AppShell>
  );
}
