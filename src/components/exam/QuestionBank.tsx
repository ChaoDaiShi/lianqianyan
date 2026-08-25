import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpenCheck, Plus, RotateCw } from 'lucide-react';
import type { ExamAnswerValue, ExamQuestion, ExamQuestionType } from '@/domain';
import { createExamQuestion, fetchExamQuestions, fetchExamQuestionTypes } from '@/lib/educationApi';
import { DEMO_COURSE_ID } from '@/store';
import { WORKSHOP_KNOWLEDGE_POINTS } from '@/components/workshop/workshopPresentation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { GlassPanel } from '@/components/design/GlassPanel';
import { LearningState } from '@/components/feedback/LearningState';
import { gradingStrategyLabel, responseKindLabel } from './examPresentation';
import { QuestionTypeManager } from './QuestionTypeManager';

function lines(value: string): string[] {
  return value.split(/\r?\n|，|,/).map((item) => item.trim()).filter(Boolean);
}

export function QuestionBank() {
  const [types, setTypes] = useState<ExamQuestionType[]>([]);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(false);
  const [questionTypeId, setQuestionTypeId] = useState('');
  const [knowledgePointId, setKnowledgePointId] = useState('kp-deadlock');
  const [prompt, setPrompt] = useState('');
  const [optionsText, setOptionsText] = useState('');
  const [answerText, setAnswerText] = useState('');
  const [booleanAnswer, setBooleanAnswer] = useState(true);
  const [keywordsText, setKeywordsText] = useState('');
  const [explanation, setExplanation] = useState('');
  const [difficulty, setDifficulty] = useState(0.5);
  const [defaultScore, setDefaultScore] = useState(10);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [nextTypes, nextQuestions] = await Promise.all([
        fetchExamQuestionTypes(),
        fetchExamQuestions(DEMO_COURSE_ID),
      ]);
      setTypes(nextTypes);
      setQuestions(nextQuestions);
      setQuestionTypeId((current) => current || nextTypes[0]?.id || '');
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const selectedType = useMemo(
    () => types.find((type) => type.id === questionTypeId) ?? null,
    [questionTypeId, types],
  );

  const submit = async () => {
    if (!selectedType || !prompt.trim() || submitting) return;
    const options = lines(optionsText);
    let correctAnswer: ExamAnswerValue = answerText.trim();
    if (selectedType.responseKind === 'multiple_choice') correctAnswer = lines(answerText);
    if (selectedType.responseKind === 'boolean') correctAnswer = booleanAnswer;
    setSubmitting(true);
    setFormError(false);
    try {
      const created = await createExamQuestion({
        courseId: DEMO_COURSE_ID,
        knowledgePointId,
        questionTypeId: selectedType.id,
        prompt,
        options,
        correctAnswer,
        keywords: lines(keywordsText),
        explanation,
        difficulty,
        defaultScore,
      });
      setQuestions((current) => [created, ...current]);
      setPrompt('');
      setOptionsText('');
      setAnswerText('');
      setKeywordsText('');
      setExplanation('');
    } catch {
      setFormError(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LearningState kind="loading" title="正在读取题库与题型" />;
  if (error) return <LearningState kind="error" title="题库暂时无法读取" action={<Button type="button" variant="outline" onClick={() => void load()} className="gap-2"><RotateCw className="h-4 w-4" />重试</Button>} />;

  const choice = selectedType?.responseKind === 'single_choice' || selectedType?.responseKind === 'multiple_choice';
  return (
    <div className="space-y-5">
      <QuestionTypeManager types={types} onCreated={(created) => { setTypes((current) => [...current, created]); setQuestionTypeId(created.id); }} />
      <GlassPanel className="p-5 sm:p-6">
        <div className="flex items-center gap-2"><Plus className="h-4 w-4 text-primary-600" /><h3 className="text-lg font-bold">创建自定义题目</h3></div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="text-xs font-semibold">题型<select value={questionTypeId} onChange={(event) => setQuestionTypeId(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-violet-100 bg-white/70 px-3 text-sm">{types.map((type) => <option key={type.id} value={type.id}>{type.name} · {responseKindLabel(type.responseKind)}</option>)}</select></label>
          <label className="text-xs font-semibold">关联知识点<select value={knowledgePointId} onChange={(event) => setKnowledgePointId(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-violet-100 bg-white/70 px-3 text-sm">{WORKSHOP_KNOWLEDGE_POINTS.map((point) => <option key={point.id} value={point.id}>{point.label}</option>)}</select></label>
          <label className="text-xs font-semibold lg:col-span-2">题干<Textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={4_000} rows={3} placeholder="输入清晰、可独立理解的题干" className="mt-1 rounded-xl bg-white/70" /></label>
          {choice && <label className="text-xs font-semibold">选项（每行一个）<Textarea value={optionsText} onChange={(event) => setOptionsText(event.target.value)} rows={5} placeholder={'互斥\n请求并保持\n不可抢占\n循环等待'} className="mt-1 rounded-xl bg-white/70" /></label>}
          {selectedType?.responseKind === 'boolean' ? (
            <label className="text-xs font-semibold">标准答案<select value={String(booleanAnswer)} onChange={(event) => setBooleanAnswer(event.target.value === 'true')} className="mt-1 h-10 w-full rounded-xl border border-violet-100 bg-white/70 px-3 text-sm"><option value="true">正确</option><option value="false">错误</option></select></label>
          ) : (
            <label className="text-xs font-semibold">{selectedType?.responseKind === 'multiple_choice' ? '标准答案（每行一个）' : selectedType?.gradingStrategy === 'manual' ? '参考答案' : '标准答案'}<Textarea value={answerText} onChange={(event) => setAnswerText(event.target.value)} rows={choice ? 5 : 3} placeholder="输入答案或人工批阅参考" className="mt-1 rounded-xl bg-white/70" /></label>
          )}
          {selectedType?.gradingStrategy === 'keyword' && <label className="text-xs font-semibold">评分关键词（逗号或换行分隔）<Textarea value={keywordsText} onChange={(event) => setKeywordsText(event.target.value)} rows={3} placeholder="互斥，循环等待，不可抢占" className="mt-1 rounded-xl bg-white/70" /></label>}
          <label className="text-xs font-semibold">题目解析<Textarea value={explanation} onChange={(event) => setExplanation(event.target.value)} rows={3} placeholder="交卷后展示的解析" className="mt-1 rounded-xl bg-white/70" /></label>
          <label className="text-xs font-semibold">难度（0–1）<Input type="number" min={0} max={1} step={0.1} value={difficulty} onChange={(event) => setDifficulty(Number(event.target.value))} className="mt-1 rounded-xl bg-white/70" /></label>
          <label className="text-xs font-semibold">默认分值<Input type="number" min={0.5} max={1_000} step={0.5} value={defaultScore} onChange={(event) => setDefaultScore(Number(event.target.value))} className="mt-1 rounded-xl bg-white/70" /></label>
        </div>
        <p className="mt-3 text-[10px] text-[var(--em-muted-ink)]">当前评分：{selectedType ? gradingStrategyLabel(selectedType.gradingStrategy) : '未选择题型'}。发布后的关联题目将被锁定。</p>
        {formError && <p className="mt-2 text-xs text-rose-700" role="alert">题目结构无效或服务暂时不可用，请检查选项、答案和关键词。</p>}
        <Button type="button" className="mt-4 gap-2 rounded-xl bg-primary-500" disabled={!selectedType || !prompt.trim() || submitting} onClick={() => void submit()}><Plus className="h-4 w-4" />{submitting ? '创建中…' : '加入题库'}</Button>
      </GlassPanel>

      <GlassPanel className="p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><BookOpenCheck className="h-4 w-4 text-primary-600" /><h3 className="text-lg font-bold">当前题库</h3></div><span className="text-xs text-[var(--em-muted-ink)]">{questions.length} 题</span></div>
        {questions.length === 0 ? <p className="mt-4 text-sm text-[var(--em-muted-ink)]">题库为空，请先创建题目。</p> : <div className="mt-4 grid gap-3 lg:grid-cols-2">{questions.map((question) => <article key={question.id} className="rounded-[18px] border border-violet-100 bg-white/50 p-4"><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-semibold text-primary-600">{question.questionTypeName} · {question.defaultScore} 分</span><span className="text-[10px] text-[var(--em-muted-ink)]">难度 {Math.round(question.difficulty * 100)}%</span></div><h4 className="mt-2 text-sm font-bold leading-6">{question.prompt}</h4><p className="mt-2 text-xs leading-5 text-[var(--em-muted-ink)]">标准答案：{Array.isArray(question.correctAnswer) ? question.correctAnswer.join('、') : typeof question.correctAnswer === 'boolean' ? question.correctAnswer ? '正确' : '错误' : question.correctAnswer || '人工参考'}</p></article>)}</div>}
      </GlassPanel>
    </div>
  );
}

