import { useEffect, useState, type FormEvent } from 'react';
import {
  BookOpenCheck,
  Copy,
  Download,
  FileDown,
  Loader2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassPanel } from '@/components/design/GlassPanel';
import {
  generateLearningResource,
  generateResourceImage,
  optimizeLearningResource,
  listKnowledgePoints,
  planResourceImage,
  verifyResourceText,
  type GeneratedResource,
  type GeneratedResourceImage,
  type KnowledgePointOption,
  type ResourceImagePlan,
  type ResourceTextCheck,
  type ResourceType,
} from '@/lib/educationApi';
import { ACTIVE_COURSE_ID } from '@/store';
import { downloadPresentation } from '@/lib/presentationExport';
import {
  downloadMarkdown,
  RESOURCE_TYPES,
} from './workshopPresentation';
import { RichResourcePreview } from './RichResourcePreview';
import {
  GenerationProgress,
  type ProgressStage,
  type ProgressStageStatus,
} from './GenerationProgress';
import { NextStepGuidance } from '@/components/learning/NextStepGuidance';

type CopyStatus = 'idle' | 'copied' | 'failed';

const STAGE_DEFS = [
  { key: 'text', label: '生成文字资源' },
  { key: 'plan', label: 'AI 评估配图方案' },
  { key: 'image', label: '生成课程配图' },
  { key: 'check', label: 'AI 文字质量检查' },
];

export function ResourceGenerator() {
  const [points, setPoints] = useState<KnowledgePointOption[]>([]);
  const [pointsLoading, setPointsLoading] = useState(true);
  const [pointsError, setPointsError] = useState(false);
  const [knowledgePointId, setKnowledgePointId] = useState('');
  const [resourceType, setResourceType] =
    useState<ResourceType>('study_sheet');
  const [resource, setResource] = useState<GeneratedResource | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');
  const [previewText, setPreviewText] = useState('');
  const [image, setImage] = useState<GeneratedResourceImage | null>(null);
  const [imageError, setImageError] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeError, setOptimizeError] = useState(false);
  const [stages, setStages] = useState<ProgressStage[]>(
    STAGE_DEFS.map((def) => ({ ...def, status: 'pending' as ProgressStageStatus })),
  );
  const [plan, setPlan] = useState<ResourceImagePlan | null>(null);
  const [textCheck, setTextCheck] = useState<ResourceTextCheck | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPointsLoading(true);
    setPointsError(false);
    listKnowledgePoints(ACTIVE_COURSE_ID)
      .then((options) => {
        if (cancelled) return;
        setPoints(options);
        setKnowledgePointId(options[0]?.id ?? '');
      })
      .catch(() => {
        if (cancelled) return;
        setPointsError(true);
      })
      .finally(() => {
        if (!cancelled) setPointsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setPreviewText(resource?.content ?? '');
  }, [resource]);

  const setStage = (key: string, status: ProgressStageStatus, note?: string) => {
    setStages((prev) => prev.map((stage) => (stage.key === key ? { ...stage, status, note: note ?? stage.note } : stage)));
  };

  const knowledgePointName = points.find((item) => item.id === knowledgePointId)?.name ?? '当前知识点';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(false);
    setCopyStatus('idle');
    setResource(null);
    setImage(null);
    setImageError(false);
    setPlan(null);
    setTextCheck(null);
    setStages(STAGE_DEFS.map((def, index) => ({ ...def, status: index === 0 ? 'running' as const : 'pending' as const })));
    const request = { courseId: ACTIVE_COURSE_ID, knowledgePointId };

    try {
      // 阶段 1 · 文字资源
      const textResult = await generateLearningResource({ ...request, resourceType });
      setResource(textResult);
      setStage('text', 'done');
    } catch {
      setError(true);
      setStage('text', 'failed');
      setLoading(false);
      return;
    }

    // 阶段 2 · AI 评估配图方案（是否生成 / 如何生成）
    setStage('plan', 'running');
    let imagePlan: ResourceImagePlan | null = null;
    try {
      imagePlan = await planResourceImage(request);
      setPlan(imagePlan);
      setStage('plan', 'done', imagePlan.plannedBy === 'llm' ? 'AI 方案' : '默认方案');
    } catch {
      setStage('plan', 'failed', '将使用默认方案');
    }

    // 阶段 3 · 按方案生成配图（AI 判断不配图则诚实跳过）
    setStage('image', 'running');
    if (imagePlan && !imagePlan.shouldGenerate) {
      setImage({
        provider: 'minimax', model: 'image-01', prompt: '', imageUrls: [],
        skipped: true, skipReason: imagePlan.reason || 'AI 判断该知识点更适合纯文字排版',
      });
      setStage('image', 'skipped', imagePlan.reason);
    } else {
      try {
        const imageResult = await generateResourceImage({ ...request, plan: imagePlan });
        setImage(imageResult);
        setStage('image', imageResult.skipped ? 'skipped' : 'done', imageResult.skipped ? imageResult.skipReason : undefined);
      } catch {
        setImageError(true);
        setStage('image', 'failed');
      }
    }

    // 阶段 4 · AI 文字质量检查（文字是最重要的资产）
    setStage('check', 'running');
    try {
      const check = await verifyResourceText(resource?.content ?? '');
      setTextCheck(check);
      setStage('check', check.available ? 'done' : 'skipped', check.available ? (check.passed ? '通过' : `发现 ${check.issues.length} 个问题`) : '未启用');
    } catch {
      setTextCheck({ available: false, passed: false, summary: '', issues: [] });
      setStage('check', 'failed');
    }
    setLoading(false);
  };

  const optimize = async () => {
    if (!previewText.trim() || optimizing) return;
    setOptimizing(true); setOptimizeError(false);
    try { setPreviewText((await optimizeLearningResource(previewText)).content); }
    catch { setOptimizeError(true); }
    finally { setOptimizing(false); }
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
              基于课程材料模板生成；AI 评估是否配图，最后做文字质量检查。
            </p>
          </div>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-xs font-semibold text-[var(--em-muted-ink)]">
            选择知识点
            <select
              value={knowledgePointId}
              disabled={loading || pointsLoading || points.length === 0}
              onChange={(event) => setKnowledgePointId(event.target.value)}
              className="mt-2 h-11 w-full rounded-2xl border border-violet-200 bg-white/80 px-3 text-sm text-[var(--em-ink)]"
            >
              {pointsLoading && <option value="">正在读取课程知识点…</option>}
              {!pointsLoading && points.length === 0 && <option value="">当前课程暂无知识点</option>}
              {points.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · 难度 {item.difficulty}
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
            disabled={loading || !knowledgePointId}
            className="h-11 w-full gap-2 rounded-2xl bg-primary-500"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {loading ? '正在按阶段生成…' : '03 · 开始生成'}
          </Button>
        </form>

        {(loading || stages.some((stage) => stage.status !== 'pending')) && (
          <div className="mt-4">
            <GenerationProgress stages={stages} />
          </div>
        )}

        {pointsError && (
          <div
            role="alert"
            className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800"
          >
            课程知识点暂时没有加载成功，不使用其他课程的列表代替。请稍后重试。
          </div>
        )}
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
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-violet-100 pb-4"><div><p className="text-[10px] font-semibold text-primary-700">04 · 生成与预览</p><h2 className="mt-1 text-lg font-bold">资源画布</h2></div><span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] text-primary-700">增强预览为主</span></div>
        {loading && !resource ? (
          <GenerationProgress stages={stages} />
        ) : resource ? (
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
                {resource.format === 'markdown' && <Button type="button" size="sm" variant="outline" disabled={optimizing} onClick={() => void optimize()} className="gap-1.5 rounded-xl bg-white/70"><Sparkles className="h-3.5 w-3.5" />{optimizing ? 'AI 优化中…' : 'AI 优化'}</Button>}
                {resource.format === 'markdown' && <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void copyMarkdown()}
                  className="gap-1.5 rounded-xl bg-white/70"
                >
                  <Copy className="h-3.5 w-3.5" />复制 Markdown
                </Button>}
                {resource.format === 'presentation' && <Button asChild type="button" size="sm" variant="outline" className="gap-1.5 rounded-xl bg-white/70"><a href="templates/lianqianyan-course-template.pptx" download><FileDown className="h-3.5 w-3.5" />下载 PPT 模板</a></Button>}
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

            {plan ? (
              <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50/60 px-4 py-3 text-xs leading-5 text-[var(--em-muted-ink)]">
                <span className="mr-2 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-primary-700">{plan.plannedBy === 'llm' ? 'AI 配图方案' : '默认配图方案'}</span>
                {plan.shouldGenerate
                  ? plan.centralMetaphor
                    ? `中心图标：${plan.centralMetaphor}；卡片隐喻按章节概念生成。`
                    : '按章节概念生成图标隐喻卡片。'
                  : plan.reason}
              </div>
            ) : null}

            {optimizeError ? <p className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-xs text-amber-800">AI 优化暂时不可用，原内容保持不变。</p> : null}

            <div className="mt-5">
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-[var(--em-muted-ink)]"><Sparkles className="h-3.5 w-3.5 text-primary-600" />增强预览{image?.imageUrls[0] ? '（含课程配图）' : ''}</p>
              <RichResourcePreview
                content={previewText}
                imageUrl={image?.imageUrls[0]}
                imageCaption={image?.imageUrls[0] ? `课程信息图 · MiniMax ${image.model} · 临时图片链接，随预览内嵌展示` : undefined}
              />
            </div>

            {image?.skipped ? <p className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-xs text-amber-800">AI 判断此知识点暂不配图：{image.skipReason}（文字资源不受影响）。</p> : null}
            {imageError ? <p className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-xs text-amber-800">文字已生成；MiniMax 图片暂时不可用，没有用占位图冒充结果。</p> : null}

            {textCheck ? (
              textCheck.available ? (
                textCheck.passed ? (
                  <div className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-xs text-emerald-800">
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    <span>文字质量检查通过{textCheck.summary ? `：${textCheck.summary}` : '：无乱码、截断或占位符。'}</span>
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
                    <p className="font-semibold">文字质量检查发现问题{textCheck.summary ? `：${textCheck.summary}` : ''}</p>
                    <ul className="mt-1.5 list-inside list-disc space-y-1">{textCheck.issues.map((issue, index) => <li key={index}>{issue}</li>)}</ul>
                  </div>
                )
              ) : (
                <p className="mt-4 text-[11px] text-[var(--em-muted-ink)]">AI 文字质量检查暂不可用（未配置账号模型或服务无响应），本次未做检查。</p>
              )
            ) : null}

            <details className="group mt-4 rounded-[1.5rem] border border-violet-100 bg-white/55">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-5 py-3 text-xs font-semibold text-[var(--em-muted-ink)]">
                <span className="flex items-center gap-2">编辑 Markdown 源码<span className="text-primary-600 group-open:hidden">▸ 展开</span><span className="hidden text-primary-600 group-open:inline">▾ 收起</span></span>
                <span className="text-[10px] font-normal">默认收起 · 修改仅作用于当前预览与导出</span>
              </summary>
              <div className="px-5 pb-5">
                <textarea value={previewText} readOnly={resource.format === 'presentation'} onChange={(event) => setPreviewText(event.target.value)} className="min-h-[18rem] w-full resize-y rounded-[18px] border border-violet-100 bg-white/65 p-4 text-sm font-normal leading-7 text-[var(--em-ink)] outline-none focus:border-primary-300 read-only:cursor-default read-only:bg-violet-50/35" />
              </div>
            </details>

            <p className="mt-2 text-[10px] text-[var(--em-muted-ink)]">{resource.format === 'markdown' ? '调整仅作用于当前浏览器预览与本次导出，不宣称已保存到服务端。' : 'PPT 预览为只读结构，下载文件严格使用服务端本次生成的真实 .pptx。'}</p>
            <NextStepGuidance
              title="生成完成 · 下一步"
              actions={[
                { key: 'understand', title: `理解「${knowledgePointName}」在课程里的位置`, reason: '知识图谱展示它的前置、后继与章节结构', to: '/knowledge', cta: '看知识图谱' },
                { key: 'assess', title: `做「${knowledgePointName}」相关自测`, reason: '自测结果会沉淀为诊断证据，更新学习路线', to: '/exams', cta: '去做自测' },
                { key: 'route', title: '回到学习路线安排下一步', reason: '按诊断优先级继续成长路线', to: '/my-learning', cta: '看路线' },
              ]}
            />
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
            <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-violet-100 to-sky-100 text-primary-600"><BookOpenCheck className="h-5 w-5" /></span><div><h3 className="font-bold">预览尚未生成</h3><p className="mt-1 text-xs text-[var(--em-muted-ink)]">左侧选择目标与模式后显式生成。</p></div></div><div className="mt-6 space-y-3" aria-label="预览结构说明"><div className="h-5 w-2/5 rounded-full bg-violet-100/80" /><div className="h-3 w-full rounded-full bg-slate-100" /><div className="h-3 w-5/6 rounded-full bg-slate-100" /><div className="mt-6 h-24 rounded-2xl border border-violet-100 bg-white/55" /></div><p className="mt-6 text-xs leading-6 text-[var(--em-muted-ink)]">这里只展示画布结构，不是生成结果。生成后增强预览为主显示，Markdown 源码默认收起；配图先经 AI 评估，最后做文字质量检查。</p>
          </div>
        )}
      </GlassPanel>
    </div>
  );
}
