import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AxiosError } from 'axios';
import { AudioLines, BrainCircuit, Check, ChevronRight, Copy, KeyRound, Moon, Palette, Plus, Server, ShieldCheck, Sun, Trash2, UserRound } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { GlassPanel } from '@/components/design/GlassPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

const fieldClass = 'h-11 rounded-xl border-violet-200/70 bg-white/75 dark:bg-slate-950/45';
type SettingsSection = 'appearance' | 'models' | 'voice' | 'mcp' | 'account';

const SETTINGS_SECTIONS = [
  { id: 'appearance', label: '外观与主题', description: '界面明暗与系统偏好', icon: Palette },
  { id: 'models', label: '模型与智能', description: '对话模型与外部服务', icon: BrainCircuit },
  { id: 'voice', label: '语音与小涟', description: '讲解音色与语音模型', icon: AudioLines },
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
  const [kind, setKind] = useState<ModelKind>('llm');
  const [provider, setProvider] = useState<ModelProvider>('openai_chat');
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [voice, setVoice] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [tokenName, setTokenName] = useState('我的智能体');
  const [activeSection, setActiveSection] = useState<SettingsSection>('appearance');

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
        voice: voice || undefined,
        api_key: apiKey || undefined,
      });
      setName(''); setBaseUrl(''); setModel(''); setVoice(''); setApiKey('');
      await refresh();
    });
  };

  const changeKind = (value: ModelKind) => {
    setKind(value);
    setProvider(value === 'llm' ? 'openai_chat' : 'openai_speech');
  };

  const openSection = (section: SettingsSection) => {
    setActiveSection(section);
    if (section === 'models') changeKind('llm');
    if (section === 'voice') changeKind('tts');
  };

  const modelSettings = (
    <div className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
      <GlassPanel className="p-5 sm:p-6"><h2 className="flex items-center gap-2 text-lg font-bold"><Server className="h-5 w-5 text-primary-600" />{kind === 'llm' ? '当前对话模型' : '当前语音模型'}</h2><p className="mt-2 text-xs leading-5 text-[var(--em-muted-ink)]">优先使用当前账号选择的配置；未选择时回到部署默认模型。</p><label className="mt-5 block text-sm font-medium">当前使用<select className="mt-2 h-11 w-full rounded-xl border border-violet-200 bg-white/75 px-3 dark:bg-slate-950/45" value={(kind === 'llm' ? settings?.selected_llm_profile_id : settings?.selected_tts_profile_id) ?? ''} onChange={(event) => void run(async () => { setSettings(await selectModelProfile(kind, event.target.value || null)); })}><option value="">部署默认模型</option>{profiles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><div className="mt-4 space-y-2">{profiles.length === 0 && <p className="rounded-2xl border border-dashed border-violet-200 bg-white/35 px-4 py-3 text-xs text-[var(--em-muted-ink)]">当前账号还没有添加{kind === 'llm' ? '对话' : '语音'}模型。</p>}{profiles.map((item) => <div key={item.id} className="flex items-center justify-between rounded-2xl border border-violet-100 bg-white/55 p-3 dark:bg-slate-950/30"><div className="min-w-0"><p className="text-sm font-semibold">{item.name}</p><p className="mt-1 truncate text-xs text-[var(--em-muted-ink)]">{item.provider} · {item.model || item.voice || item.base_url}</p></div><button type="button" aria-label={`删除 ${item.name}`} onClick={() => void run(async () => { await deleteModelProfile(item.id); await refresh(); })}><Trash2 className="h-4 w-4 text-rose-500" /></button></div>)}</div></GlassPanel>
      <GlassPanel className="p-5 sm:p-6"><h2 className="flex items-center gap-2 text-lg font-bold"><Plus className="h-5 w-5 text-primary-600" />添加{kind === 'llm' ? '对话' : '语音'}模型</h2><form className="mt-4 space-y-3" onSubmit={submitModel}><Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="配置名称" className={fieldClass} /><select value={provider} onChange={(e) => setProvider(e.target.value as ModelProvider)} className="h-11 w-full rounded-xl border border-violet-200 bg-white/75 px-3 dark:bg-slate-950/45">{kind === 'llm' ? <option value="openai_chat">OpenAI-compatible Chat</option> : <><option value="openai_speech">OpenAI-compatible Speech</option><option value="gpt_sovits">GPT-SoVITS HTTP</option></>}</select><Input required type="url" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://model.example.com/v1" className={fieldClass} />{provider !== 'gpt_sovits' && <Input required value={model} onChange={(e) => setModel(e.target.value)} placeholder="模型名称" className={fieldClass} />}{kind === 'tts' && <Input required={provider === 'gpt_sovits'} value={voice} onChange={(e) => setVoice(e.target.value)} placeholder={provider === 'gpt_sovits' ? '上游可访问的参考音频路径' : '音色名称（可选）'} className={fieldClass} />}<details className="rounded-2xl border border-violet-100 bg-white/45 p-3"><summary className="cursor-pointer text-xs font-semibold text-primary-700">连接凭据与部署限制</summary><div className="mt-3 space-y-3"><Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="API Key（加密保存，可选）" className={fieldClass} /><p className="text-xs leading-5 text-[var(--em-muted-ink)]">部署允许的主机：{settings?.custom_model_hosts.join('、') || '尚未配置'}。{settings?.secret_storage_configured ? '密钥加密存储已启用。' : '部署尚未配置密钥加密，带 API Key 的配置会被拒绝。'}</p></div></details><Button disabled={busy} className="w-full rounded-xl">保存模型配置</Button></form></GlassPanel>
    </div>
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="relative overflow-hidden rounded-[28px] border border-white/70 bg-violet-100/65 p-6 shadow-[0_18px_55px_rgba(87,73,151,0.13)] sm:p-8"><img src="/brand/cyrene-settings-ripple.png" alt="" className="absolute inset-0 h-full w-full object-cover opacity-55" /><div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/78 to-white/35 dark:from-[#181526]/96 dark:via-[#181526]/80 dark:to-[#181526]/45" /><div className="relative max-w-2xl"><p className="text-xs font-bold tracking-[0.18em] text-primary-700">PREFERENCES & SERVICES</p><h1 className="mt-2 text-3xl font-bold">偏好与服务</h1><p className="mt-2 text-sm leading-6 text-[var(--em-muted-ink)]">先调整日常体验；模型、语音与外部服务按需要进入对应空间。</p></div></header>

        {error && <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950/40">{error}</p>}

        <section aria-label="当前偏好摘要" className="grid gap-3 sm:grid-cols-3">
          <button type="button" onClick={() => openSection('appearance')} className="rounded-[20px] border border-violet-100 bg-white/50 p-4 text-left"><p className="text-[10px] text-[var(--em-muted-ink)]">界面主题</p><p className="mt-2 text-sm font-bold">{preference === 'system' ? '跟随系统' : preference === 'light' ? '明亮' : '黑夜'}</p></button>
          <button type="button" onClick={() => openSection('models')} className="rounded-[20px] border border-violet-100 bg-white/50 p-4 text-left"><p className="text-[10px] text-[var(--em-muted-ink)]">对话模型</p><p className="mt-2 truncate text-sm font-bold">{settings ? settings.profiles.find((item) => item.id === settings.selected_llm_profile_id)?.name ?? settings.default_llm.model ?? '部署默认模型' : '正在读取…'}</p></button>
          <button type="button" onClick={() => openSection('voice')} className="rounded-[20px] border border-violet-100 bg-white/50 p-4 text-left"><p className="text-[10px] text-[var(--em-muted-ink)]">小涟语音</p><p className="mt-2 truncate text-sm font-bold">{settings ? settings.profiles.find((item) => item.id === settings.selected_tts_profile_id)?.name ?? settings.default_tts.model ?? '部署默认语音' : '正在读取…'}</p></button>
        </section>

        <nav aria-label="设置分类" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">{SETTINGS_SECTIONS.map((section) => { const Icon = section.icon; const active = activeSection === section.id; return <button key={section.id} type="button" onClick={() => openSection(section.id)} aria-pressed={active} className={`flex items-center gap-3 rounded-[20px] border p-3 text-left transition ${active ? 'border-primary-300 bg-violet-50/80 shadow-[0_12px_30px_rgba(108,91,190,.12)]' : 'border-violet-100 bg-white/45 hover:border-primary-200'}`}><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${active ? 'bg-primary-500 text-white' : 'bg-white/70 text-primary-600'}`}><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><strong className="block text-xs">{section.label}</strong><span className="mt-0.5 block truncate text-[9px] text-[var(--em-muted-ink)]">{section.description}</span></span><ChevronRight className={`h-3.5 w-3.5 ${active ? 'text-primary-600' : 'text-slate-300'}`} /></button>; })}</nav>

        {activeSection === 'appearance' && <GlassPanel className="p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Moon className="h-5 w-5 text-primary-600" />外观与主题</h2><p className="mt-1 text-xs text-[var(--em-muted-ink)]">设置只影响当前账号的界面偏好。</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {(['system', 'light', 'dark'] as ThemePreference[]).map((item) => (
              <button key={item} type="button" onClick={() => void run(async () => setPreference(item))} className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm transition ${preference === item ? 'border-primary-400 bg-primary-50 text-primary-800 dark:bg-primary-950/40' : 'border-violet-100 bg-white/55 dark:bg-slate-950/30'}`}>
                <span className="flex items-center gap-2">{item === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}{item === 'system' ? '跟随系统' : item === 'light' ? '明亮' : '黑夜'}</span>
                {preference === item && <Check className="h-4 w-4" />}
              </button>
            ))}
          </div>
        </GlassPanel>}

        {(activeSection === 'models' || activeSection === 'voice') && modelSettings}

        {activeSection === 'mcp' && <GlassPanel className="p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold"><KeyRound className="h-5 w-5 text-primary-600" />远程 MCP 访问</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--em-muted-ink)]">这是高级服务入口。部署后连接地址为 <code className="rounded bg-violet-100/70 px-1.5 py-0.5 dark:bg-violet-950/50">https://你的域名/mcp</code>。客户端使用 Bearer 令牌，所有工具自动限定到当前账号和已选课程。</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row"><Input value={tokenName} onChange={(e) => setTokenName(e.target.value)} className={fieldClass} /><Button disabled={busy} onClick={() => void run(async () => { const created = await createMcpToken(tokenName); setRevealedToken(created.token); await refresh(); })}>创建令牌</Button></div>
          {revealedToken && <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:bg-amber-950/35"><p className="text-xs font-semibold text-amber-800 dark:text-amber-200">只显示这一次，请立即保存</p><div className="mt-2 flex items-center gap-2"><code className="min-w-0 flex-1 break-all text-xs">{revealedToken}</code><button type="button" aria-label="复制令牌" onClick={() => void navigator.clipboard.writeText(revealedToken)}><Copy className="h-4 w-4" /></button></div></div>}
          <div className="mt-4 grid gap-2 sm:grid-cols-2">{tokens.map((token) => <div key={token.id} className="flex items-center justify-between rounded-2xl border border-violet-100 bg-white/55 p-3 dark:bg-slate-950/30"><div><p className="text-sm font-semibold">{token.name}</p><p className="text-xs text-[var(--em-muted-ink)]">{token.token_prefix}…</p></div><button type="button" aria-label={`撤销 ${token.name}`} onClick={() => void run(async () => { await revokeMcpToken(token.id); await refresh(); })}><Trash2 className="h-4 w-4 text-rose-500" /></button></div>)}</div>
        </GlassPanel>}

        {activeSection === 'account' && <GlassPanel className="p-5 sm:p-6"><h2 className="flex items-center gap-2 text-lg font-bold"><ShieldCheck className="h-5 w-5 text-primary-600" />账号与安全</h2><div className="mt-4 grid gap-3 md:grid-cols-2"><div className="rounded-2xl border border-violet-100 bg-white/50 p-4"><p className="text-sm font-semibold">学习数据归属</p><p className="mt-2 text-xs leading-5 text-[var(--em-muted-ink)]">学习路线、证据、考试结果、模型选择与服务令牌均按当前账号隔离。</p></div><div className="rounded-2xl border border-violet-100 bg-white/50 p-4"><p className="text-sm font-semibold">敏感配置</p><p className="mt-2 text-xs leading-5 text-[var(--em-muted-ink)]">模型密钥仅在部署已配置加密存储时允许保存；访问令牌只在创建时完整显示一次。</p></div></div></GlassPanel>}
      </div>
    </AppShell>
  );
}
