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
  type CompileStage,
} from '@/lib/educationApi';
import { cn } from '@/lib/utils';
import { COMPILER_EXAMPLES, stageTone } from './workshopPresentation';

const INITIAL_STAGES: CompileStage[] = [
  { name: 'preprocess', label: '预处理', status: 'skipped' },
  { name: 'syntax', label: '语法分析', status: 'skipped' },
  { name: 'semantic', label: '语义检查', status: 'skipped' },
  { name: 'link', label: '链接', status: 'skipped' },
  { name: 'run', label: '模拟运行', status: 'skipped' },
];

export function CompilerLab() {
  const [code, setCode] = useState<string>(COMPILER_EXAMPLES[0].code);
  const [response, setResponse] =
    useState<CompileSimulationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const stages = response?.stages ?? INITIAL_STAGES;

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
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)]">
      <GlassPanel className="overflow-hidden p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-900 text-violet-200">
              <Code2 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold">C 教学编译模拟</h2>
              <p className="mt-1 text-xs leading-5 text-[var(--em-muted-ink)]">
                观察预处理、语法、语义、链接与运行阶段；教学模拟，不执行本机程序。
              </p>
            </div>
          </div>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-semibold text-amber-700">
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
              className="rounded-xl border border-violet-200 bg-white/70 px-3 py-1.5 text-xs font-semibold text-primary-700 transition hover:bg-violet-50 disabled:opacity-50"
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
            className="mt-2 min-h-[25rem] w-full resize-y rounded-[22px] border border-slate-700 bg-slate-950 p-4 font-mono text-[13px] leading-6 text-slate-100 shadow-inner"
          />
        </label>

        <Button
          type="button"
          disabled={loading || !code.trim()}
          onClick={() => void runSimulation()}
          className="mt-4 h-11 w-full gap-2 rounded-2xl bg-primary-500"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {loading ? '正在模拟五个阶段…' : '开始模拟编译'}
        </Button>
      </GlassPanel>

      <div className="space-y-5">
        <GlassPanel className="p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <TerminalSquare className="h-5 w-5 text-primary-600" />
            <h3 className="font-bold">编译阶段</h3>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5 xl:grid-cols-2">
            {stages.map((stage) => (
              <div
                key={stage.name}
                className={cn(
                  'rounded-2xl border px-3 py-3 text-xs font-semibold',
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
          </div>

          {response?.diagnostics.length ? (
            <div className="mt-4 space-y-2">
              {response.diagnostics.map((diagnostic, index) => (
                <div
                  key={`${diagnostic.code}-${diagnostic.line ?? 'global'}-${index}`}
                  className={cn(
                    'rounded-2xl border px-3 py-2.5 text-xs leading-5',
                    diagnostic.severity === 'error'
                      ? 'border-rose-200 bg-rose-50 text-rose-700'
                      : 'border-amber-200 bg-amber-50 text-amber-700',
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
            <div role="alert" className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
              编译模拟服务暂时不可用；没有在本机尝试执行代码。
            </div>
          )}
        </GlassPanel>

        <GlassPanel className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3 text-slate-100">
            <span className="text-xs font-semibold">标准输出</span>
            {response && (
              <span className={cn('text-[10px] font-semibold', response.success ? 'text-emerald-300' : 'text-rose-300')}>
                {response.success ? '模拟完成' : '模拟失败'}
              </span>
            )}
          </div>
          <pre className="min-h-[10rem] overflow-auto whitespace-pre-wrap bg-slate-950 p-4 font-mono text-xs leading-6 text-emerald-200">
            {response
              ? response.stdout || '(程序没有标准输出)'
              : '等待开始模拟编译…'}
          </pre>
          <div className="border-t border-amber-100 bg-amber-50 px-4 py-3 text-[11px] leading-5 text-amber-800">
            {response?.safetyNotice ??
              '教学模拟，不执行本机程序或任意系统命令。支持整数、赋值、算术表达式与受限 printf。'}
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
