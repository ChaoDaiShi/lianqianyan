import { useState, type FormEvent } from 'react';
import { Bot, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import type { ExamGenerationPurpose, ExamGenerationResult } from '@/domain';
import { generateExam } from '@/lib/educationApi';
import { ACTIVE_COURSE_ID } from '@/store';
import { WORKSHOP_KNOWLEDGE_POINTS } from '@/components/workshop/workshopPresentation';
import { GlassPanel } from '@/components/design/GlassPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function ExamGenerator() {
  const [purpose, setPurpose] = useState<ExamGenerationPurpose>('exam');
  const [title, setTitle] = useState('');
  const [selectedPoints, setSelectedPoints] = useState<string[]>(['kp-deadlock']);
  const [questionCount, setQuestionCount] = useState(8);
  const [difficulty, setDifficulty] = useState(0.6);
  const [duration, setDuration] = useState(30);
  const [includeAi, setIncludeAi] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ExamGenerationResult | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading || !title.trim() || selectedPoints.length === 0) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      setResult(await generateExam({
        courseId: ACTIVE_COURSE_ID,
        knowledgePointIds: selectedPoints,
        purpose,
        title: title.trim(),
        questionCount,
        difficulty,
        durationMinutes: duration,
        publishImmediately: purpose === 'practice',
        includeAiReviewQuestion: includeAi,
      }));
    } catch {
      setError('生成失败：请检查课程材料、模型服务或参数后重试。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(20rem,.8fr)_minmax(0,1.2fr)]">
      <GlassPanel className="p-5 sm:p-6">
        <p className="flex items-center gap-2 text-xs font-bold tracking-[.14em] text-primary-700"><Bot className="h-4 w-4" />AI 组卷中心</p>
        <h2 className="mt-2 text-2xl font-bold">昔涟教官生成正式题目</h2>
        <p className="mt-2 text-xs leading-5 text-[var(--em-muted-ink)]">题目进入正式题库，整卷复用发布、作答、自动判卷、成绩与画像证据链。</p>
        <form className="mt-5 space-y-4" onSubmit={submit}>
          <div className="grid grid-cols-2 gap-2">
            {([['exam', '生成整张试卷'], ['practice', '生成专项练习']] as const).map(([value, label]) => (
              <button key={value} type="button" onClick={() => setPurpose(value)} className={`rounded-2xl border p-3 text-left text-xs font-bold ${purpose === value ? 'border-primary-300 bg-violet-50 text-primary-700' : 'border-violet-100 bg-white/60'}`}>{label}</button>
            ))}
          </div>
          <label className="block text-xs font-semibold">标题<Input className="mt-1 rounded-xl bg-white/70" maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder={purpose === 'exam' ? '例如：进程管理阶段考试' : '例如：死锁专项练习'} /></label>
          <fieldset>
            <legend className="text-xs font-semibold">知识点（可多选）</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {WORKSHOP_KNOWLEDGE_POINTS.map((point) => <label key={point.id} className="flex items-center gap-2 rounded-xl border border-violet-100 bg-white/55 px-3 py-2 text-xs"><input type="checkbox" checked={selectedPoints.includes(point.id)} onChange={(event) => setSelectedPoints((current) => event.target.checked ? [...current, point.id] : current.filter((id) => id !== point.id))} />{point.label}</label>)}
            </div>
          </fieldset>
          <div className="grid grid-cols-3 gap-3">
            <label className="text-xs font-semibold">题数<Input className="mt-1" type="number" min={3} max={30} value={questionCount} onChange={(event) => setQuestionCount(Number(event.target.value))} /></label>
            <label className="text-xs font-semibold">难度<Input className="mt-1" type="number" min={0} max={1} step={0.1} value={difficulty} onChange={(event) => setDifficulty(Number(event.target.value))} /></label>
            <label className="text-xs font-semibold">时长<Input className="mt-1" type="number" min={1} max={480} value={duration} onChange={(event) => setDuration(Number(event.target.value))} /></label>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={includeAi} onChange={(event) => setIncludeAi(event.target.checked)} />加入 AI 语义自动判卷题</label>
          <Button type="submit" disabled={loading || !title.trim() || selectedPoints.length === 0} className="w-full gap-2 rounded-xl bg-primary-500">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{loading ? '昔涟教官正在组卷…' : purpose === 'exam' ? '生成试卷草稿' : '生成并发布练习'}</Button>
        </form>
        {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{error}</p>}
      </GlassPanel>

      <GlassPanel className="p-5 sm:p-6">
        <h3 className="font-bold">生成结果与来源</h3>
        <p className="mt-1 text-xs text-[var(--em-muted-ink)]">生成模式会明确区分外部模型与课程材料降级，不把模板冒充 AI。</p>
        {result ? <div className="mt-5 space-y-4">
          <div className="rounded-[20px] border border-emerald-100 bg-emerald-50/60 p-4"><p className="flex items-center gap-2 text-sm font-bold text-emerald-800"><CheckCircle2 className="h-4 w-4" />{result.exam.title}</p><p className="mt-2 text-xs text-emerald-700">{result.exam.items.length} 题 · {result.exam.totalPoints} 分 · {result.exam.status === 'published' ? '已发布' : '草稿待核对'}</p></div>
          <div><p className="text-xs font-bold">生成模式</p><span className="mt-2 inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs text-primary-700">{result.generationMode === 'llm' ? `LLM · ${result.provider ?? 'provider'}` : '课程材料降级 · 可追溯'}</span></div>
          <div><p className="text-xs font-bold">课程来源</p><div className="mt-2 flex flex-wrap gap-1.5">{result.sourceSections.map((source) => <span key={source} className="rounded-full border border-violet-100 bg-white/70 px-2 py-1 text-[10px]">{source}</span>)}</div></div>
          {result.warnings.map((warning) => <p key={warning} className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">{warning}</p>)}
        </div> : <div className="grid min-h-[24rem] place-items-center text-center text-sm text-[var(--em-muted-ink)]"><div><Sparkles className="mx-auto h-8 w-8 text-primary-300" /><p className="mt-3">生成后的正式试卷与来源会显示在这里。</p></div></div>}
      </GlassPanel>
    </div>
  );
}
