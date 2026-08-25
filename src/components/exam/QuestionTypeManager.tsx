import { useMemo, useState } from 'react';
import { Plus, ShieldCheck } from 'lucide-react';
import type {
  ExamQuestionType,
  GradingStrategy,
  QuestionResponseKind,
} from '@/domain';
import { createExamQuestionType } from '@/lib/educationApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { gradingStrategyLabel, responseKindLabel } from './examPresentation';

const STRATEGIES: Record<QuestionResponseKind, GradingStrategy[]> = {
  single_choice: ['exact'],
  multiple_choice: ['set_exact'],
  boolean: ['exact'],
  short_text: ['exact', 'keyword', 'manual'],
  long_text: ['keyword', 'manual'],
};

const RESPONSE_KINDS: QuestionResponseKind[] = [
  'single_choice',
  'multiple_choice',
  'boolean',
  'short_text',
  'long_text',
];

export function QuestionTypeManager({
  types,
  onCreated,
}: {
  types: ExamQuestionType[];
  onCreated: (created: ExamQuestionType) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [responseKind, setResponseKind] = useState<QuestionResponseKind>('short_text');
  const [gradingStrategy, setGradingStrategy] = useState<GradingStrategy>('keyword');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const allowed = useMemo(() => STRATEGIES[responseKind], [responseKind]);

  const submit = async () => {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    setError(false);
    try {
      const created = await createExamQuestionType({
        name,
        description,
        responseKind,
        gradingStrategy,
      });
      onCreated(created);
      setName('');
      setDescription('');
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-[22px] border border-violet-100 bg-white/45 p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary-600" />
        <h3 className="font-bold">自定义题型</h3>
      </div>
      <p className="mt-1 text-xs leading-5 text-[var(--em-muted-ink)]">
        名称与说明可以自定义；作答形态和评分策略来自安全白名单，不执行脚本。
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="text-xs font-semibold">题型名称<Input value={name} onChange={(event) => setName(event.target.value)} maxLength={60} placeholder="例如：口述概念题" className="mt-1 rounded-xl bg-white/70" /></label>
        <label className="text-xs font-semibold">作答形态<select value={responseKind} onChange={(event) => { const next = event.target.value as QuestionResponseKind; setResponseKind(next); setGradingStrategy(STRATEGIES[next][0]); }} className="mt-1 h-10 w-full rounded-xl border border-violet-100 bg-white/70 px-3 text-sm">{RESPONSE_KINDS.map((kind) => <option key={kind} value={kind}>{responseKindLabel(kind)}</option>)}</select></label>
        <label className="text-xs font-semibold">评分策略<select value={gradingStrategy} onChange={(event) => setGradingStrategy(event.target.value as GradingStrategy)} className="mt-1 h-10 w-full rounded-xl border border-violet-100 bg-white/70 px-3 text-sm">{allowed.map((strategy) => <option key={strategy} value={strategy}>{gradingStrategyLabel(strategy)}</option>)}</select></label>
        <label className="text-xs font-semibold">题型说明<Textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} rows={2} placeholder="说明适用场景" className="mt-1 rounded-xl bg-white/70" /></label>
      </div>
      {error && <p className="mt-3 text-xs text-rose-700" role="alert">创建失败，名称可能重复或题型组合无效。</p>}
      <Button type="button" size="sm" className="mt-3 gap-2 rounded-xl bg-primary-500" disabled={!name.trim() || submitting} onClick={() => void submit()}><Plus className="h-3.5 w-3.5" />{submitting ? '创建中…' : '创建题型'}</Button>
      <div className="mt-4 flex flex-wrap gap-2">
        {types.map((type) => <span key={type.id} className="rounded-full border border-violet-100 bg-white/65 px-3 py-1 text-[11px]"><strong>{type.name}</strong> · {responseKindLabel(type.responseKind)} · {gradingStrategyLabel(type.gradingStrategy)}{type.isBuiltin ? ' · 内置' : ' · 自定义'}</span>)}
      </div>
    </section>
  );
}

