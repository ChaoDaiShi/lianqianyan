import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AxiosError } from 'axios';
import { Activity, BrainCircuit, Check, ChevronRight, Copy, KeyRound, Moon, Palette, Plus, Server, ShieldCheck, Sparkles, Sun, Trash2, UserRound } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { GlassPanel } from '@/components/design/GlassPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchHealth } from '@/lib/educationApi';
import { fetchVoiceStatus } from '@/lib/voiceApi';
import {
  createMcpToken,
  createModelProfile,
  deleteModelProfile,
  fetchAccountSettings,
  listMcpTokens,
  revokeMcpToken,
  selectModelProfile,
  type AccountSettings,
  type MCPToken,
  type ModelKind,
  type ModelProvider,
} from '@/lib/settingsApi';
import { useTheme, type ThemePreference } from '@/theme/ThemeProvider';

function messageFor(error: unknown): string {
  if (error instanceof AxiosError) {
    const detail = (error.response?.data as { detail?: string } | undefined)?.detail;
    if (detail) return detail;
  }
  return error instanceof Error ? error.message : '设置保存失败。';
}

const fieldClass = 'h-11 rounded-lg border-[var(--em-border)] bg-[var(--em-surface)] text-[var(--em-ink)]';
type SettingsSection = 'appearance' | 'models' | 'services' | 'mcp' | 'account';
type ProbeState = { status: 'idle' | 'checking' | 'ready' | 'unconfigured' | 'error'; detail: string | null; elapsedMs: number | null };

const SETTINGS_SECTIONS = [
  { id: 'appearance', label: '外观与主题', description: '界面明暗与系统偏好', icon: Palette },
  { id: 'models', label: '模型与智能', description: '对话模型与外部服务', icon: BrainCircuit },
  { id: 'services', label: '云端能力', description: 'MiniMax 与 AnySearch', icon: Sparkles },
  { id: 'mcp', label: 'MCP 与服务', description: '远程连接与访问令牌', icon: Server },
  { id: 'account', label: '账号与安全', description: '数据归属与安全边界', icon: UserRound },
] as const;

export function SettingsPage() {
  const { preference, setPreference } = useTheme();
  const [settings, setSettings] = useState<AccountSettings | null>(null);
  const [tokens, setTokens] = useState<MCPToken[]>([]);
  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [kind] = useState<ModelKind>('llm');
  const [provider, setProvider] = useState<ModelProvider>('openai_chat');
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [tokenName, setTokenName] = useState('我的智能体');
  const [activeSection, setActiveSection] = useState<SettingsSection>('appearance');
  const [healthProbe, setHealthProbe] = useState<ProbeState>({ status: 'idle', detail: null, elapsedMs: null });
  const [voiceProbe, setVoiceProbe] = useState<ProbeState>({ status: 'idle', detail: null, elapsedMs: null });

  const refresh = async () => {
    const [nextSettings, nextTokens] = await Promise.all([
      fetchAccountSettings(),
      listMcpTokens(),
    ]);
    setSettings(nextSettings);
    setTokens(nextTokens);
  };

  useEffect(() => {
    void refresh().catch((cause) => setError(messageFor(cause)));
  }, []);

  const profiles = useMemo(
    () => settings?.profiles.filter((item) => item.kind === kind) ?? [],
    [kind, settings],
  );

  const run = async (operation: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try { await operation(); }
    catch (cause) { setError(messageFor(cause)); }
    finally { setBusy(false); }
  };

  const submitModel = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      await createModelProfile({
        name,
        kind,
        provider,
        base_url: baseUrl,
        model: model || undefined,
        api_key: apiKey || undefined,
      });
      setName(''); setBaseUrl(''); setModel(''); setApiKey('');
      await refresh();
    });
  };

  const openSection = (section: SettingsSection) => {
    setActiveSection(section);
  };

  const checkServices = async () => {
    setHealthProbe({ status: 'checking', detail: null, elapsedMs: null });
    setVoiceProbe({ status: 'checking', detail: null, elapsedMs: null });
    const healthStarted = performance.now();
    const healthRequest = fetchHealth().then((result) => {
      setHealthProbe({ status: 'ready', detail: `服务端状态：${result.status}`, elapsedMs: Math.round(performance.now() - healthStarted) });
    }).catch(() => {
      setHealthProbe({ status: 'error', detail: '状态检查请求失败', elapsedMs: Math.round(performance.now() - healthStarted) });
    });
    const voiceStarted = performance.now();
    const voiceRequest = fetchVoiceStatus().then((result) => {
      setVoiceProbe({
        status: result.configured ? 'ready' : 'unconfigured',
        detail: result.configured ? `${result.provider} 已配置` : '语音服务未配置',
        elapsedMs: Math.round(performance.now() - voiceStarted),
      });
    }).catch(() => {
      setVoiceProbe({ status: 'error', detail: '状态检查请求失败', elapsedMs: Math.round(performance.now() - voiceStarted) });
    });
    await Promise.all([healthRequest, voiceRequest]);
  };

  const modelSettings = (
    <div className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
      <GlassPanel className="p-5 sm:p-6"><h2 className="flex items-center gap-2 text-lg font-bold"><Server className="h-5 w-5 text-[var(--em-primary)]" />当前对话模型</h2><p className="mt-2 text-xs leading-5 text-[var(--em-muted-ink)]">优先使用当前账号选择的配置；未选择时回到部署默认模型。</p><label className="mt-5 block text-sm font-medium">当前使用<select className="mt-2 h-11 w-full rounded-lg border border-[var(--em-border)] bg-[var(--em-surface)] px-3 text-[var(--em-ink)]" value={settings?.selected_llm_profile_id ?? ''} onChange={(event) => void run(async () => { setSettings(await selectModelProfile('llm', event.target.value || null)); })}><option value="">部署默认模型</option>{profiles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><div className="mt-4 space-y-2">{profiles.length === 0 && <p className="rounded-xl border border-dashed border-[var(--em-border)] bg-[var(--em-surface)] px-4 py-3 text-xs text-[var(--em-muted-ink)]">当前账号还没有添加对话模型。</p>}{profiles.map((item) => <div key={item.id} className="flex items-center justify-between rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] p-3"><div className="min-w-0"><p className="text-sm font-semibold">{item.name}</p><p className="mt-1 truncate text-xs text-[var(--em-muted-ink)]">{item.provider} · {item.model || item.base_url}</p></div><button type="button" aria-label={`删除 ${item.name}`} onClick={() => void run(async () => { await deleteModelProfile(item.id); await refresh(); })}><Trash2 className="h-4 w-4 text-[var(--em-danger)]" /></button></div>)}</div></GlassPanel>
      <GlassPanel className="p-5 sm:p-6"><h2 className="flex items-center gap-2 text-lg font-bold"><Plus className="h-5 w-5 text-[var(--em-primary)]" />添加对话模型</h2><form className="mt-4 space-y-3" onSubmit={submitModel}><Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="配置名称" className={fieldClass} /><select value={provider} onChange={(e) => setProvider(e.target.value as ModelProvider)} className="h-11 w-full rounded-lg border border-[var(--em-border)] bg-[var(--em-surface)] px-3 text-[var(--em-ink)]"><option value="openai_chat">OpenAI-compatible Chat</option></select><Input required type="url" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://model.example.com/v1" className={fieldClass} /><Input required value={model} onChange={(e) => setModel(e.target.value)} placeholder="模型名称" className={fieldClass} /><details className="rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] p-3"><summary className="cursor-pointer text-xs font-semibold text-[var(--em-primary-deep)]">连接凭据与部署限制</summary><div className="mt-3 space-y-3"><Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="API Key（加密保存，可选）" className={fieldClass} /><p className="text-xs leading-5 text-[var(--em-muted-ink)]">部署允许的主机：{settings?.custom_model_hosts.join('、') || '尚未配置'}。{settings?.secret_storage_configured ? '密钥加密存储已启用。' : '部署尚未配置密钥加密，带 API Key 的配置会被拒绝。'}</p></div></details><Button disabled={busy} className="w-full rounded-lg">保存模型配置</Button></form></GlassPanel>
    </div>
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] p-5 shadow-[var(--em-shadow-sm)] sm:p-6"><p className="text-[10px] font-semibold text-[var(--em-primary-deep)]">PREFERENCES & SERVICES</p><h1 className="mt-1 text-2xl font-bold">偏好与服务</h1><p className="mt-1 text-sm leading-6 text-[var(--em-muted-ink)]">管理界面主题、模型配置、语音服务与远程访问令牌。</p></header>

        {error && <p role="alert" className="rounded-lg border border-[var(--em-danger)] bg-[var(--em-surface-subtle)] px-4 py-3 text-sm text-[var(--em-danger)]">{error}</p>}

        <section aria-label="当前偏好摘要" className="grid gap-3 sm:grid-cols-3">
          <button type="button" onClick={() => openSection('appearance')} className="rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] p-4 text-left"><p className="text-[10px] text-[var(--em-muted-ink)]">界面主题</p><p className="mt-2 text-sm font-bold">{preference === 'system' ? '跟随系统' : preference === 'light' ? '明亮' : '黑夜'}</p></button>
          <button type="button" onClick={() => openSection('models')} className="rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] p-4 text-left"><p className="text-[10px] text-[var(--em-muted-ink)]">对话模型</p><p className="mt-2 truncate text-sm font-bold">{settings ? settings.profiles.find((item) => item.id === settings.selected_llm_profile_id)?.name ?? settings.default_llm.model ?? '部署默认模型' : '正在读取…'}</p></button>
          <button type="button" onClick={() => openSection('services')} className="rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] p-4 text-left"><p className="text-[10px] text-[var(--em-muted-ink)]">云端能力</p><p className="mt-2 truncate text-sm font-bold">MiniMax · AnySearch</p></button>
        </section>

        <div className="grid items-start gap-4 xl:grid-cols-[15rem_minmax(0,1fr)]">
        <nav aria-label="设置分类" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">{SETTINGS_SECTIONS.map((section) => { const Icon = section.icon; const active = activeSection === section.id; return <button key={section.id} type="button" onClick={() => openSection(section.id)} aria-pressed={active} className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${active ? 'border-[var(--em-primary)] bg-[var(--em-primary-subtle)] shadow-[var(--em-shadow-sm)]' : 'border-[var(--em-border)] bg-[var(--em-surface)] hover:border-[var(--em-border)]'}`}><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${active ? 'bg-[var(--em-action)] text-[var(--em-surface)]' : 'bg-[var(--em-surface-subtle)] text-[var(--em-primary)]'}`}><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><strong className="block text-xs">{section.label}</strong><span className="mt-0.5 block truncate text-[10px] text-[var(--em-muted-ink)]">{section.description}</span></span><ChevronRight className={`h-3.5 w-3.5 ${active ? 'text-[var(--em-primary)]' : 'text-[var(--em-subtle-ink)]'}`} /></button>; })}</nav>
        <div className="min-w-0 space-y-4">

        {activeSection === 'appearance' && <GlassPanel className="p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Moon className="h-5 w-5 text-[var(--em-primary)]" />外观与主题</h2><p className="mt-1 text-xs text-[var(--em-muted-ink)]">设置只影响当前账号的界面偏好。</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {(['system', 'light', 'dark'] as ThemePreference[]).map((item) => (
              <button key={item} type="button" onClick={() => void run(async () => setPreference(item))} className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm transition ${preference === item ? 'border-[var(--em-primary)] bg-[var(--em-primary-subtle)] text-[var(--em-primary)]' : 'border-[var(--em-border)] bg-[var(--em-surface)]'}`}>
                <span className="flex items-center gap-2">{item === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}{item === 'system' ? '跟随系统' : item === 'light' ? '明亮' : '黑夜'}</span>
                {preference === item && <Check className="h-4 w-4" />}
              </button>
            ))}
          </div>
        </GlassPanel>}

        {activeSection === 'models' && modelSettings}

        {activeSection === 'services' && <GlassPanel className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 text-lg font-bold"><Activity className="h-5 w-5 text-[var(--em-primary)]" />服务配置状态</h2><p className="mt-2 text-xs leading-5 text-[var(--em-muted-ink)]">只请求已有的 API 健康状态与语音配置状态接口，不触发生成或计费操作。</p></div><Button type="button" variant="outline" className="gap-2 rounded-lg" disabled={healthProbe.status === 'checking' || voiceProbe.status === 'checking'} onClick={() => void checkServices()}><Activity className="h-4 w-4" />{healthProbe.status === 'checking' || voiceProbe.status === 'checking' ? '正在检查…' : '检查服务状态'}</Button></div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-[var(--em-border)] bg-[var(--em-surface-subtle)] p-4"><p className="font-semibold">API 健康状态</p><p role="status" className="mt-2 text-sm">{healthProbe.status === 'checking' ? '正在读取 /api/health' : healthProbe.detail ?? '尚未检查'}</p>{healthProbe.elapsedMs !== null && <p className="mt-1 text-xs text-[var(--em-muted-ink)]">状态检查请求耗时：{healthProbe.elapsedMs} ms</p>}</div>
            <div className="rounded-xl border border-[var(--em-border)] bg-[var(--em-surface-subtle)] p-4"><p className="font-semibold">MiniMax 语音配置</p><p role="status" className="mt-2 text-sm">{voiceProbe.status === 'checking' ? '正在读取 /api/voice/status' : voiceProbe.detail ?? '尚未检查'}</p>{voiceProbe.elapsedMs !== null && <p className="mt-1 text-xs text-[var(--em-muted-ink)]">状态检查请求耗时：{voiceProbe.elapsedMs} ms</p>}<p className="mt-2 text-[11px] leading-5 text-[var(--em-muted-ink)]">此接口只返回服务配置状态，不代表已完成上游语音调用。</p></div>
          </div>
          <div className="mt-4 rounded-lg border border-[var(--em-border)] bg-[var(--em-surface)] p-4"><p className="font-semibold">AnySearch</p><p className="mt-1 text-xs leading-5 text-[var(--em-muted-ink)]">没有独立的非计费状态接口。实际检索时会在创作工作台显示本次 Provider、原始来源与响应接收时间。</p></div>
          <p className="mt-4 text-[11px] leading-5 text-[var(--em-muted-ink)]">密钥由部署环境管理，当前 API 不会返回运行时密钥。</p>
        </GlassPanel>}

        {activeSection === 'mcp' && <GlassPanel className="p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold"><KeyRound className="h-5 w-5 text-[var(--em-primary)]" />远程 MCP 访问</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--em-muted-ink)]">这是高级服务入口。部署后连接地址为 <code className="rounded bg-[var(--em-primary-subtle)] px-1.5 py-0.5">https://你的域名/mcp</code>。客户端使用 Bearer 令牌，所有工具自动限定到当前账号和已选课程。</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row"><Input value={tokenName} onChange={(e) => setTokenName(e.target.value)} className={fieldClass} /><Button disabled={busy} onClick={() => void run(async () => { const created = await createMcpToken(tokenName); setRevealedToken(created.token); await refresh(); })}>创建令牌</Button></div>
          {revealedToken && <div className="mt-4 rounded-xl border border-[var(--em-warning)] bg-[var(--em-surface-subtle)] p-4"><p className="text-xs font-semibold text-[var(--em-warning)]">只显示这一次，请立即保存</p><div className="mt-2 flex items-center gap-2"><code className="min-w-0 flex-1 break-all text-xs">{revealedToken}</code><button type="button" aria-label="复制令牌" onClick={() => void navigator.clipboard.writeText(revealedToken)}><Copy className="h-4 w-4" /></button></div></div>}
          <div className="mt-4 grid gap-2 sm:grid-cols-2">{tokens.map((token) => <div key={token.id} className="flex items-center justify-between rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] p-3"><div><p className="text-sm font-semibold">{token.name}</p><p className="text-xs text-[var(--em-muted-ink)]">{token.token_prefix}…</p></div><button type="button" aria-label={`撤销 ${token.name}`} onClick={() => void run(async () => { await revokeMcpToken(token.id); await refresh(); })}><Trash2 className="h-4 w-4 text-[var(--em-danger)]" /></button></div>)}</div>
        </GlassPanel>}

        {activeSection === 'account' && <GlassPanel className="p-5 sm:p-6"><h2 className="flex items-center gap-2 text-lg font-bold"><ShieldCheck className="h-5 w-5 text-[var(--em-primary)]" />账号与安全</h2><div className="mt-4 grid gap-3 md:grid-cols-2"><div className="rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] p-4"><p className="text-sm font-semibold">学习数据归属</p><p className="mt-2 text-xs leading-5 text-[var(--em-muted-ink)]">学习路线、证据、考试结果、模型选择与服务令牌均按当前账号隔离。</p></div><div className="rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] p-4"><p className="text-sm font-semibold">敏感配置</p><p className="mt-2 text-xs leading-5 text-[var(--em-muted-ink)]">模型密钥仅在部署已配置加密存储时允许保存；访问令牌只在创建时完整显示一次。</p></div></div></GlassPanel>}
        </div>
        </div>
      </div>
    </AppShell>
  );
}
