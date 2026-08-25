import { useState, type FormEvent } from 'react';
import {
  BookOpenCheck,
  Copy,
  Download,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassPanel } from '@/components/design/GlassPanel';
import {
  generateLearningResource,
  type GeneratedResource,
  type ResourceType,
} from '@/lib/educationApi';
import { DEMO_COURSE_ID } from '@/store';
import {
  downloadMarkdown,
  RESOURCE_TYPES,
  WORKSHOP_KNOWLEDGE_POINTS,
} from './workshopPresentation';

type CopyStatus = 'idle' | 'copied' | 'failed';

export function ResourceGenerator() {
  const [knowledgePointId, setKnowledgePointId] = useState('kp-deadlock');
  const [resourceType, setResourceType] =
    useState<ResourceType>('study_sheet');
  const [resource, setResource] = useState<GeneratedResource | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(false);
    setCopyStatus('idle');
    setResource(null);
    try {
      const generated = await generateLearningResource({
        courseId: DEMO_COURSE_ID,
        knowledgePointId,
        resourceType,
      });
      setResource(generated);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const copyMarkdown = async () => {
    if (!resource || !navigator.clipboard) {
      setCopyStatus('failed');
      return;
    }
    try {
      await navigator.clipboard.writeText(resource.content);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(18rem,0.72fr)_minmax(0,1.28fr)]">
      <GlassPanel className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet-100 text-primary-700">
            <BookOpenCheck className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold">课程资源生成</h2>
            <p className="mt-1 text-xs leading-5 text-[var(--em-muted-ink)]">
              基于课程材料模板生成，不把模板输出冒充大模型创作。
            </p>
          </div>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-xs font-semibold text-[var(--em-muted-ink)]">
            选择知识点
            <select
              value={knowledgePointId}
              disabled={loading}
              onChange={(event) => setKnowledgePointId(event.target.value)}
              className="mt-2 h-11 w-full rounded-2xl border border-violet-200 bg-white/80 px-3 text-sm text-[var(--em-ink)]"
            >
              {WORKSHOP_KNOWLEDGE_POINTS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-semibold text-[var(--em-muted-ink)]">
            选择资源类型
            <select
              value={resourceType}
              disabled={loading}
              onChange={(event) =>
                setResourceType(event.target.value as ResourceType)
              }
              className="mt-2 h-11 w-full rounded-2xl border border-violet-200 bg-white/80 px-3 text-sm text-[var(--em-ink)]"
            >
              {RESOURCE_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label} · {item.description}
                </option>
              ))}
            </select>
          </label>

          <Button
            type="submit"
            disabled={loading}
            className="h-11 w-full gap-2 rounded-2xl bg-primary-500"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {loading ? '正在整理课程材料…' : '生成学习资源'}
          </Button>
        </form>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs leading-5 text-rose-700"
          >
            资源生成暂时不可用。没有生成结果被保留，请稍后重试。
          </div>
        )}
      </GlassPanel>

      <GlassPanel className="min-h-[34rem] overflow-hidden p-5 sm:p-6">
        {resource ? (
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                    基于课程材料模板生成
                  </span>
                  <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-primary-700">
                    Markdown
                  </span>
                </div>
                <h3 className="mt-3 text-xl font-bold">{resource.title}</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void copyMarkdown()}
                  className="gap-1.5 rounded-xl bg-white/70"
                >
                  <Copy className="h-3.5 w-3.5" />复制 Markdown
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => downloadMarkdown(resource)}
                  className="gap-1.5 rounded-xl bg-white/70"
                >
                  <Download className="h-3.5 w-3.5" />下载 .md
                </Button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              <span className="text-[11px] text-[var(--em-muted-ink)]">
                来源章节：
              </span>
              {resource.sourceSections.map((section) => (
                <span
                  key={section}
                  className="rounded-full border border-violet-100 bg-white/70 px-2 py-0.5 text-[11px] text-primary-700"
                >
                  {section}
                </span>
              ))}
            </div>

            <pre className="mt-5 max-h-[30rem] overflow-auto whitespace-pre-wrap rounded-[22px] border border-violet-100 bg-white/65 p-4 font-sans text-sm leading-7 text-[var(--em-ink)]">
              {resource.content}
            </pre>
            <p aria-live="polite" className="mt-2 text-xs text-[var(--em-muted-ink)]">
              {copyStatus === 'copied'
                ? 'Markdown 已复制。'
                : copyStatus === 'failed'
                  ? '无法写入剪贴板，请使用下载功能。'
                  : ''}
            </p>
          </div>
        ) : (
          <div className="grid min-h-[30rem] place-items-center text-center">
            <div className="max-w-sm">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-[24px] bg-gradient-to-br from-violet-100 to-sky-100 text-primary-600">
                <BookOpenCheck className="h-7 w-7" />
              </span>
              <h3 className="mt-4 text-lg font-bold">生成结果会出现在这里</h3>
              <p className="mt-2 text-xs leading-6 text-[var(--em-muted-ink)]">
                内容只整理真实课程章节，并附带来源；接口失败时不会补造资源。
              </p>
            </div>
          </div>
        )}
      </GlassPanel>
    </div>
  );
}
