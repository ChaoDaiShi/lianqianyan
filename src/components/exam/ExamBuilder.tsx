import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ClipboardCheck, Plus, Rocket, RotateCw } from 'lucide-react';
import type { ExamDefinition, ExamQuestion, ReviewQueueItem } from '@/domain';
import {
  createExamDefinition,
  fetchExamDefinitions,
  fetchExamQuestions,
  fetchExamReviewQueue,
  publishExam,
} from '@/lib/educationApi';
import { ACTIVE_COURSE_ID } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { GlassPanel } from '@/components/design/GlassPanel';
import { LearningState } from '@/components/feedback/LearningState';
import { validateExamDraft } from './examPresentation';
import { ReviewQueue } from './ReviewQueue';

export function ExamBuilder() {
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [exams, setExams] = useState<ExamDefinition[]>([]);
  const [reviewQueue, setReviewQueue] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(30);
  const [passPercentage, setPassPercentage] = useState(60);
  const [shuffle, setShuffle] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [points, setPoints] = useState<Record<string, number>>({});
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [nextQuestions, nextExams, nextQueue] = await Promise.all([
        fetchExamQuestions(ACTIVE_COURSE_ID),
        fetchExamDefinitions(ACTIVE_COURSE_ID),
        fetchExamReviewQueue(ACTIVE_COURSE_ID),
      ]);
      setQuestions(nextQuestions);
      setExams(nextExams);
      setReviewQueue(nextQueue);
      setPoints(Object.fromEntries(nextQuestions.map((question) => [question.id, question.defaultScore])));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const questionById = useMemo(() => Object.fromEntries(questions.map((question) => [question.id, question])), [questions]);

  const move = (questionId: string, delta: number) => {
    setSelectedIds((current) => {
      const index = current.indexOf(questionId);
      const target = index + delta;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const copy = [...current];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  };
  const draft = {
    courseId: ACTIVE_COURSE_ID,
    title,
    description,
    durationMinutes: duration,
    passPercentage,
    shuffleQuestions: shuffle,
    items: selectedIds.map((questionId, index) => ({
      questionId,
      points: points[questionId] ?? questionById[questionId]?.defaultScore ?? 0,
      position: index + 1,
    })),
  };
  const saveDraft = async () => {
    const errors = validateExamDraft(draft);
    setValidationErrors(errors);
    if (errors.length || saving) return;
    setSaving(true);
    try {
      const created = await createExamDefinition(draft);
      setExams((current) => [created, ...current]);
      setTitle('');
      setDescription('');
      setSelectedIds([]);
    } catch {
      setValidationErrors(['保存失败，请检查试卷内容或服务连接']);
    } finally {
      setSaving(false);
    }
  };
  const publish = async (examId: string) => {
    setPublishing(examId);
    try {
      const published = await publishExam(examId);
      setExams((current) => current.map((exam) => exam.id === examId ? published : exam));
    } catch {
      setValidationErrors(['发布失败：请确认试卷至少包含一道有效题目']);
    } finally {
      setPublishing(null);
    }
  };

  if (loading) return <LearningState kind="loading" title="正在读取命题工作台" />;
  if (error) return <LearningState kind="error" title="命题工作台暂时无法读取" action={<Button type="button" variant="outline" onClick={() => void load()} className="gap-2"><RotateCw className="h-4 w-4" />重试</Button>} />;

  return (
    <div className="space-y-5">
      <GlassPanel className="p-5 sm:p-6">
        <div className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-primary-600" /><h3 className="text-lg font-bold">命题工作台</h3></div>
        <p className="mt-1 text-xs text-[var(--em-muted-ink)]">先保存草稿并核对，再发布；发布后试卷与题目结构锁定。</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="text-xs font-semibold">试卷标题<Input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} placeholder="例如：操作系统阶段测评" className="mt-1 rounded-xl bg-white/70" /></label>
          <label className="text-xs font-semibold">考试说明<Textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} maxLength={2_000} className="mt-1 rounded-xl bg-white/70" /></label>
          <label className="text-xs font-semibold">考试时长（分钟）<Input type="number" min={1} max={480} value={duration} onChange={(event) => setDuration(Number(event.target.value))} className="mt-1 rounded-xl bg-white/70" /></label>
          <label className="text-xs font-semibold">及格线（%）<Input type="number" min={0} max={100} value={passPercentage} onChange={(event) => setPassPercentage(Number(event.target.value))} className="mt-1 rounded-xl bg-white/70" /></label>
          <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={shuffle} onChange={(event) => setShuffle(event.target.checked)} className="accent-violet-600" />每次作答按尝试稳定随机题序</label>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <section className="rounded-[18px] border border-violet-100 bg-white/45 p-4"><h4 className="text-sm font-bold">从题库选题</h4><div className="mt-3 space-y-2">{questions.map((question) => <label key={question.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-violet-100 bg-white/55 p-3 text-sm"><input type="checkbox" checked={selectedIds.includes(question.id)} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, question.id] : current.filter((id) => id !== question.id))} className="mt-1 accent-violet-600" /><span><strong className="block leading-5">{question.prompt}</strong><span className="mt-1 block text-[10px] text-[var(--em-muted-ink)]">{question.questionTypeName} · 默认 {question.defaultScore} 分</span></span></label>)}</div>{questions.length === 0 && <p className="mt-3 text-sm text-[var(--em-muted-ink)]">题库为空，请先在“题库与题型”创建题目。</p>}</section>
          <section className="rounded-[18px] border border-violet-100 bg-white/45 p-4"><div className="flex items-center justify-between"><h4 className="text-sm font-bold">试卷题序与分值</h4><span className="text-xs text-[var(--em-muted-ink)]">{selectedIds.length} 题</span></div><div className="mt-3 space-y-2">{selectedIds.map((questionId, index) => { const question = questionById[questionId]; return <div key={questionId} className="rounded-xl border border-violet-100 bg-white/60 p-3"><div className="flex items-start gap-2"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-violet-50 text-xs font-bold text-primary-700">{index + 1}</span><p className="min-w-0 flex-1 text-xs font-semibold leading-5">{question?.prompt}</p><div className="flex"><Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={index === 0} onClick={() => move(questionId, -1)} aria-label="上移题目"><ArrowUp className="h-3.5 w-3.5" /></Button><Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={index === selectedIds.length - 1} onClick={() => move(questionId, 1)} aria-label="下移题目"><ArrowDown className="h-3.5 w-3.5" /></Button></div></div><label className="mt-2 flex items-center gap-2 text-[10px]">本卷分值<Input type="number" min={0.5} max={1_000} step={0.5} value={points[questionId] ?? question?.defaultScore ?? 0} onChange={(event) => setPoints((current) => ({ ...current, [questionId]: Number(event.target.value) }))} className="h-8 w-24 rounded-lg bg-white" /></label></div>; })}</div></section>
        </div>
        {validationErrors.length > 0 && <ul className="mt-4 rounded-xl bg-rose-50 p-3 text-xs text-rose-700" role="alert">{validationErrors.map((message) => <li key={message}>· {message}</li>)}</ul>}
        <Button type="button" className="mt-4 gap-2 rounded-xl bg-primary-500" disabled={saving} onClick={() => void saveDraft()}><Plus className="h-4 w-4" />{saving ? '保存中…' : '保存试卷草稿'}</Button>
      </GlassPanel>

      <GlassPanel className="p-5 sm:p-6"><h3 className="font-bold">试卷版本</h3><div className="mt-4 grid gap-3 lg:grid-cols-2">{exams.map((exam) => <article key={exam.id} className="rounded-[18px] border border-violet-100 bg-white/50 p-4"><div className="flex items-center justify-between gap-2"><h4 className="font-bold">{exam.title}</h4><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${exam.status === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{exam.status === 'published' ? '已发布 · 已锁定' : '草稿'}</span></div><p className="mt-2 text-xs text-[var(--em-muted-ink)]">{exam.items.length} 题 · {exam.totalPoints} 分 · {exam.durationMinutes} 分钟</p>{exam.status === 'draft' && <Button type="button" size="sm" variant="outline" className="mt-3 gap-2 rounded-xl" disabled={publishing === exam.id} onClick={() => void publish(exam.id)}><Rocket className="h-3.5 w-3.5" />{publishing === exam.id ? '发布中…' : '发布试卷'}</Button>}</article>)}</div>{exams.length === 0 && <p className="mt-4 text-sm text-[var(--em-muted-ink)]">还没有试卷草稿。</p>}</GlassPanel>

      <ReviewQueue items={reviewQueue} onGraded={(answerId) => setReviewQueue((current) => current.filter((item) => item.answerId !== answerId))} />
    </div>
  );
}

