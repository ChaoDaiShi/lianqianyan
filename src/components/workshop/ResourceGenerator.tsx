import { useEffect, useState, type FormEvent } from 'react';
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
import { ACTIVE_COURSE_ID } from '@/store';
import { downloadPresentation } from '@/lib/presentationExport';
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
  const [previewText, setPreviewText] = useState('');

  useEffect(() => {
    setPreviewText(resource?.content ?? '');
  }, [resource]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(false);
    setCopyStatus('idle');
    setResource(null);
    try {
      const generated = await generateLearningResource({
        courseId: ACTIVE_COURSE_ID,
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
      await navigator.clipboard.writeText(previewText);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
  };

  const downloadResource = async () => {
    if (!resource) return;
    if (resource.format === 'presentation') {
      try {
        await downloadPresentation(resource);
      } catch {
        setCopyStatus('failed');
      }
      return;
    }
    downloadMarkdown({ ...resource, content: previewText });
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(18rem,0.72fr)_minmax(0,1.28fr)]">
      <GlassPanel className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet-100 text-primary-700">
            <BookOpenCheck className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[10px] font-semibold text-primary-700">01 · 选择目标</p>
            <h2 className="mt-1 text-lg font-bold">课程资源生成</h2>
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
            02 · 选择生成模式
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
            {loading ? '正在整理课程材料…' : '03 · 生成学习资源'}
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

      <GlassPanel className="min-h-[30rem] overflow-hidden p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-violet-100 pb-4"><div><p className="text-[10px] font-semibold text-primary-700">04 · 生成与预览</p><h2 className="mt-1 text-lg font-bold">资源画布</h2></div><span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] text-primary-700">本地预览修改</span></div>
        {resource ? (
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                    基于课程材料模板生成
                  </span>
                  <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-primary-700">
                    {resource.format === 'presentation' ? 'PPTX' : 'Markdown'}
                  </span>
                </div>
                <h3 className="mt-3 text-xl font-bold">{resource.title}</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {resource.format === 'markdown' && <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void copyMarkdown()}
                  className="gap-1.5 rounded-xl bg-white/70"
                >
                  <Copy className="h-3.5 w-3.5" />复制 Markdown
                </Button>}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void downloadResource()}
                  className="gap-1.5 rounded-xl bg-white/70"
                >
                  <Download className="h-3.5 w-3.5" />{resource.format === 'presentation' ? '下载真实 .pptx' : '下载 .md'}
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

            <label className="mt-5 block text-xs font-semibold text-[var(--em-muted-ink)]">05 · {resource.format === 'markdown' ? '预览与调整' : '结构化预览'}<textarea value={previewText} readOnly={resource.format === 'presentation'} onChange={(event) => setPreviewText(event.target.value)} className="mt-2 min-h-[22rem] w-full resize-y rounded-[22px] border border-violet-100 bg-white/65 p-4 text-sm font-normal leading-7 text-[var(--em-ink)] outline-none focus:border-primary-300 read-only:cursor-default read-only:bg-violet-50/35" /></label>
            <p className="mt-2 text-[10px] text-[var(--em-muted-ink)]">{resource.format === 'markdown' ? '调整仅作用于当前浏览器预览与本次导出，不宣称已保存到服务端。' : 'PPT 预览为只读结构，下载文件严格使用服务端本次生成的真实 .pptx。'}</p>
            <p aria-live="polite" className="mt-2 text-xs text-[var(--em-muted-ink)]">
              {copyStatus === 'copied'
                ? 'Markdown 已复制。'
                : copyStatus === 'failed'
                  ? '无法写入剪贴板，请使用下载功能。'
                  : ''}
            </p>
          </div>
        ) : (
          <div className="min-h-[24rem] rounded-[22px] border border-dashed border-violet-200 bg-white/35 p-5">
            <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-violet-100 to-sky-100 text-primary-600"><BookOpenCheck className="h-5 w-5" /></span><div><h3 className="font-bold">预览尚未生成</h3><p className="mt-1 text-xs text-[var(--em-muted-ink)]">左侧选择目标与模式后显式生成。</p></div></div><div className="mt-6 space-y-3" aria-label="预览结构说明"><div className="h-5 w-2/5 rounded-full bg-violet-100/80" /><div className="h-3 w-full rounded-full bg-slate-100" /><div className="h-3 w-5/6 rounded-full bg-slate-100" /><div className="mt-6 h-24 rounded-2xl border border-violet-100 bg-white/55" /></div><p className="mt-6 text-xs leading-6 text-[var(--em-muted-ink)]">这里只展示画布结构，不是生成结果。资源仍只整理真实课程章节并附带来源，接口失败时不会补造内容。</p>
          </div>
        )}
      </GlassPanel>
    </div>
  );
}
