import {
  ArrowRight,
  Bot,
  Code2,
  Database,
  Info,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { GlassPanel } from '@/components/design/GlassPanel';
import { XiaolianCharacter } from '@/components/xiaolian/XiaolianCharacter';
import { ACTIVE_LEARNER_CONTEXT } from '@/config/learnerContext';
import { VOICE_ATTRIBUTION } from '@/components/digital-human/voiceAttribution';

export function SettingsPage() {
  const identityLabel =
    ACTIVE_LEARNER_CONTEXT.source === 'account'
      ? '已认证账号档案'
      : '未登录';

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-5">
        <GlassPanel className="p-6 sm:p-8">
          <p className="flex items-center gap-2 text-xs font-bold tracking-[0.16em] text-primary-700">
            <Settings className="h-4 w-4" />RUNTIME & PRIVACY
          </p>
          <h1 className="mt-3 text-3xl font-bold">账号与学习设置</h1>
          <p className="mt-3 text-sm leading-7 text-[var(--em-muted-ink)]">
            当前版本使用正式账号与服务端会话。学习画像、计划、练习和考试只写入当前账号，并按已选课程隔离。
          </p>
        </GlassPanel>
        <div className="grid gap-4 sm:grid-cols-2">
          <GlassPanel className="p-5">
            <Database className="h-5 w-5 text-primary-600" />
            <h2 className="mt-3 text-base font-bold">档案来源</h2>
            <p className="mt-2 text-xs leading-6 text-[var(--em-muted-ink)]">
              {identityLabel}。当前课程上下文为 {ACTIVE_LEARNER_CONTEXT.courseId}。
            </p>
          </GlassPanel>
          <GlassPanel className="p-5">
            <ShieldCheck className="h-5 w-5 text-emerald-700" />
            <h2 className="mt-3 text-base font-bold">隐私边界</h2>
            <p className="mt-2 text-xs leading-6 text-[var(--em-muted-ink)]">
                不保存姓名、手机号或邮箱。语音输入只在浏览器完成转写，确认后的文字才会发送，原始音频不会上传到 EducationMind 后端。语音输出文字会发送到部署方配置的语音服务（Genie-TTS 或 GPT-SoVITS），浏览器不会获得模型权重或参考音频路径。
            </p>
            <p className="mt-2 text-[10px] leading-5 text-[var(--em-muted-ink)]">
              语音技术来源：{VOICE_ATTRIBUTION}
            </p>
          </GlassPanel>
        </div>
        <p className="px-2 text-xs leading-6 text-amber-700">
          清除浏览器站点数据会创建新的匿名档案；没有登录系统时无法跨设备自动找回。宿主平台注入的匿名档案由宿主自行维护映射。
        </p>
      </div>
    </AppShell>
  );
}

const EXTRA_LINKS = [
  {
    to: '/agent',
    title: '跨平台智能体',
    description: '打开无完整导航的独立小涟页面，用于 iframe 或 WebView 集成。',
    icon: Bot,
    tone: 'text-fuchsia-700 bg-pink-50',
  },
  {
    to: '/about/capabilities',
    title: '开发者能力说明',
    description: '查看 Agent 角色、真实 Tool Catalog、课程检索来源与服务边界。',
    icon: Code2,
    tone: 'text-sky-700 bg-sky-50',
  },
  {
    to: '/settings',
    title: '匿名与隐私设置',
    description: '了解当前档案来源、课程上下文、语音数据和跨设备限制。',
    icon: Settings,
    tone: 'text-primary-700 bg-violet-50',
  },
] as const;

export function AboutPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <GlassPanel className="overflow-hidden p-6 sm:p-9">
          <div className="grid gap-6 md:grid-cols-[10rem_minmax(0,1fr)] md:items-center">
            <XiaolianCharacter state="idle" size="lg" />
            <div>
              <p className="flex items-center gap-2 text-xs font-bold tracking-[0.16em] text-primary-700">
                <Info className="h-4 w-4" />MORE & ABOUT
              </p>
              <h1 className="mt-3 text-3xl font-bold">关于忆涟千言—教</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--em-muted-ink)]">
                一个以真实学习证据、诊断、动态学习规划和课程知识检索为基础的 AI 学姐陪伴式学习空间。当前采用无登录匿名档案，并提供可嵌入其他平台的独立智能体入口。
              </p>
            </div>
          </div>
        </GlassPanel>
        <div className="grid gap-4 lg:grid-cols-3">
          {EXTRA_LINKS.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to} className="group">
                <GlassPanel className="h-full p-5 transition group-hover:-translate-y-0.5">
                  <span className={`grid h-11 w-11 place-items-center rounded-2xl ${item.tone}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <h2 className="mt-4 text-lg font-bold">{item.title}</h2>
                  <p className="mt-2 text-xs leading-5 text-[var(--em-muted-ink)]">{item.description}</p>
                  <span className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-primary-700">
                    打开页面<ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </GlassPanel>
              </Link>
            );
          })}
        </div>
        <p className="text-center text-xs leading-5 text-[var(--em-muted-ink)]">
          当前页面只说明已经实现并可验证的能力；未配置的外部服务会明确显示不可用或基础辅导状态。
        </p>
      </div>
    </AppShell>
  );
}
