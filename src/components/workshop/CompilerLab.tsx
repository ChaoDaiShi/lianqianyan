import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Code2,
  Loader2,
  Play,
  TerminalSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassPanel } from '@/components/design/GlassPanel';
import {
  simulateCompile,
  type CompileSimulationResponse,
} from '@/lib/educationApi';
import { cn } from '@/lib/utils';
import { COMPILER_EXAMPLES, stageTone } from './workshopPresentation';

export function CompilerLab() {
  const [code, setCode] = useState<string>(COMPILER_EXAMPLES[0].code);
  const [response, setResponse] =
    useState<CompileSimulationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const stages = response?.stages ?? [];

  const runSimulation = async () => {
    if (!code.trim() || loading) return;
    setLoading(true);
    setError(false);
    setResponse(null);
    try {
      setResponse(await simulateCompile(code));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(15rem,1fr)_minmax(15rem,1fr)_minmax(0,2fr)]">
      <GlassPanel className="overflow-hidden p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--em-surface-subtle)] text-[var(--em-primary)]">
              <Code2 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold">C 教学编译模拟</h2>
              <p className="mt-1 text-xs leading-5 text-[var(--em-muted-ink)]">
                受约束的语义模拟执行器；阶段结果来自服务端响应，不执行本机程序。
              </p>
            </div>
          </div>
          <span className="rounded-full border border-[var(--em-warning)] bg-[var(--em-surface-subtle)] px-3 py-1 text-[10px] font-semibold text-[var(--em-warning)]">
            c-edu 受限子集
          </span>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {COMPILER_EXAMPLES.map((example) => (
            <button
              key={example.id}
              type="button"
              disabled={loading}
              onClick={() => {
                setCode(example.code);
                setResponse(null);
                setError(false);
              }}
              className="rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--em-primary-deep)] transition hover:bg-[var(--em-primary-subtle)] disabled:opacity-50"
            >
              {example.label}
            </button>
          ))}
        </div>

        <label className="mt-4 block text-xs font-semibold text-[var(--em-muted-ink)]">
          C 教学代码
          <textarea
            value={code}
            disabled={loading}
            maxLength={4_000}
            spellCheck={false}
            onChange={(event) => setCode(event.target.value)}
            className="mt-2 min-h-[25rem] w-full resize-y rounded-xl border border-[var(--em-border-strong)] bg-slate-950 p-4 font-mono text-[13px] leading-6 text-[var(--em-subtle-ink)] shadow-inner"
          />
        </label>

        <Button
          type="button"
          disabled={loading || !code.trim()}
          onClick={() => void runSimulation()}
          className="mt-4 h-11 w-full gap-2 rounded-lg bg-[var(--em-action)]"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {loading ? '正在模拟五个阶段…' : '开始模拟编译'}
        </Button>
      </GlassPanel>

      <GlassPanel className="p-5 sm:p-6">
          <p className="text-[10px] font-semibold text-[var(--em-primary-deep)]">02 · 处理过程</p>
          <div className="flex items-center gap-2">
            <TerminalSquare className="h-5 w-5 text-[var(--em-primary)]" />
            <h3 className="font-bold">语义模拟阶段</h3>
          </div>
          {loading && <p role="status" className="mt-3 text-xs text-[var(--em-muted-ink)]">正在等待服务端模拟阶段结果…</p>}
          {!loading && !response && !error && <p className="mt-3 rounded-lg border border-dashed border-[var(--em-border)] px-3 py-4 text-xs leading-5 text-[var(--em-muted-ink)]">提交代码后，显示服务端返回的阶段与诊断信息。</p>}
          {response && <div className="mt-4 space-y-2">
            {stages.map((stage) => (
              <div
                key={stage.name}
                className={cn(
                  'rounded-lg border px-3 py-3 text-xs font-semibold',
                  stageTone(stage.status),
                )}
              >
                <div className="flex items-center gap-1.5">
                  {stage.status === 'passed' ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : stage.status === 'failed' ? (
                    <AlertTriangle className="h-3.5 w-3.5" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-current opacity-40" />
                  )}
                  {stage.label}
                </div>
                <span className="mt-1 block text-[9px] uppercase opacity-70">
                  {stage.status}
                </span>
              </div>
            ))}
          </div>}
          <p className="mt-3 text-[11px] leading-5 text-[var(--em-muted-ink)]">响应提供阶段、诊断和标准输出；当前没有栈帧或指针快照字段，因此不展示内存动画。</p>

          {response?.diagnostics.length ? (
            <div className="mt-4 space-y-2">
              {response.diagnostics.map((diagnostic, index) => (
                <div
                  key={`${diagnostic.code}-${diagnostic.line ?? 'global'}-${index}`}
                  className={cn(
                  'rounded-lg border px-3 py-2.5 text-xs leading-5',
                    diagnostic.severity === 'error'
                      ? 'border-[var(--em-danger)] bg-[var(--em-surface-subtle)] text-[var(--em-danger)]'
                      : 'border-[var(--em-warning)] bg-[var(--em-surface-subtle)] text-[var(--em-warning)]',
                  )}
                >
                  <strong>{diagnostic.code}</strong>
                  {diagnostic.line ? ` · 第 ${diagnostic.line} 行` : ''}
                  <span className="block">{diagnostic.message}</span>
                </div>
              ))}
            </div>
          ) : null}

          {error && (
            <div role="alert" className="mt-4 rounded-lg border border-[var(--em-danger)] bg-[var(--em-surface-subtle)] px-3 py-2.5 text-xs text-[var(--em-danger)]">
              编译模拟服务暂时不可用；没有在本机尝试执行代码。
            </div>
          )}
      </GlassPanel>

      <GlassPanel className="overflow-hidden p-0">
          <div className="border-b border-[var(--em-border)] bg-[var(--em-surface)] px-4 py-3"><p className="text-[10px] font-semibold text-[var(--em-primary-deep)]">03 · 产物预览</p></div>
          <div className="flex items-center justify-between border-b border-[var(--em-border-strong)] bg-slate-900 px-4 py-3 text-[var(--em-subtle-ink)]">
            <span className="text-xs font-semibold">标准输出</span>
            {response && (
              <span className={cn('text-[10px] font-semibold', response.success ? 'text-[var(--em-success)]' : 'text-[var(--em-danger)]')}>
                {response.success ? '模拟完成' : '模拟失败'}
              </span>
            )}
          </div>
          <pre className="min-h-[10rem] overflow-auto whitespace-pre-wrap bg-slate-950 p-4 font-mono text-xs leading-6 text-emerald-200">
            {response
              ? response.stdout || '(程序没有标准输出)'
              : '等待开始模拟编译…'}
          </pre>
          <div className="border-t border-[var(--em-border)] bg-[var(--em-surface-subtle)] px-4 py-3 text-[11px] leading-5 text-[var(--em-muted-ink)]">
            {response?.safetyNotice ??
              '教学模拟，不执行本机程序或任意系统命令。支持整数、赋值、算术表达式与受限 printf。'}
          </div>
      </GlassPanel>
    </div>
  );
}
