import { ArrowLeft, Code2, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { GlassPanel } from '@/components/design/GlassPanel';
import { CapabilityCenter } from '@/components/capabilities/CapabilityCenter';
import { Button } from '@/components/ui/button';

export function CapabilityPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <Button asChild variant="ghost" className="gap-2"><Link to="/about"><ArrowLeft className="h-4 w-4" />返回更多与关于</Link></Button>
        <GlassPanel className="p-6 sm:p-8">
          <p className="flex items-center gap-2 text-xs font-bold tracking-[0.16em] text-primary-700"><Code2 className="h-4 w-4" />DEVELOPER CAPABILITIES</p>
          <h1 className="mt-3 text-3xl font-bold">开发者能力说明</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--em-muted-ink)]">这里用于解释忆涟千言—教现有 Agent 角色、真实 Tool Catalog 与课程知识检索边界，不属于学习者的日常主路径。</p>
          <div className="mt-5 flex items-start gap-3 rounded-[18px] border border-emerald-100 bg-emerald-50/55 p-4"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /><p className="text-xs leading-5 text-emerald-800">页面仅展示现有 API 返回的公开能力元数据，不展示输入 Schema、Prompt、内部日志、环境变量或密钥。</p></div>
        </GlassPanel>
        <CapabilityCenter />
      </div>
    </AppShell>
  );
}
