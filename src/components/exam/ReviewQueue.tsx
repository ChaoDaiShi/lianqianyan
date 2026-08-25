import { useState } from 'react';
import { CheckCheck, Clock3 } from 'lucide-react';
import type { ReviewQueueItem } from '@/domain';
import { gradeExamAnswer } from '@/lib/educationApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

function ReviewItem({ item, onGraded }: { item: ReviewQueueItem; onGraded: (answerId: string) => void }) {
  const [score, setScore] = useState(item.points);
  const [feedback, setFeedback] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const submit = async () => {
    if (score < 0 || score > item.points || pending) return;
    setPending(true);
    setError(false);
    try {
      await gradeExamAnswer(item.answerId, score, feedback);
      onGraded(item.answerId);
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  };
  return (
    <article className="rounded-[18px] border border-amber-100 bg-amber-50/35 p-4">
      <p className="flex items-center gap-1 text-[10px] font-semibold text-amber-700"><Clock3 className="h-3 w-3" />{item.examTitle} · {item.learnerId}</p>
      <h4 className="mt-2 text-sm font-bold leading-6">{item.prompt}</h4>
      <div className="mt-3 rounded-xl bg-white/65 p-3 text-sm leading-6"><strong className="text-[10px] text-[var(--em-muted-ink)]">学生作答</strong><p className="whitespace-pre-wrap">{String(item.userAnswer ?? '未作答')}</p></div>
      <div className="mt-2 rounded-xl bg-sky-50/65 p-3 text-sm leading-6"><strong className="text-[10px] text-sky-700">批阅参考</strong><p className="whitespace-pre-wrap">{String(item.referenceAnswer ?? '未提供参考答案')}</p></div>
      <div className="mt-3 grid gap-3 sm:grid-cols-[8rem_1fr]">
        <label className="text-xs font-semibold">得分（满分 {item.points}）<Input type="number" min={0} max={item.points} step={0.5} value={score} onChange={(event) => setScore(Number(event.target.value))} className="mt-1 rounded-xl bg-white/75" /></label>
        <label className="text-xs font-semibold">批阅反馈<Textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} rows={2} maxLength={2_000} placeholder="指出亮点与需要补充之处" className="mt-1 rounded-xl bg-white/75" /></label>
      </div>
      {error && <p className="mt-2 text-xs text-rose-700" role="alert">批阅保存失败，请重试。</p>}
      <Button type="button" size="sm" disabled={pending || score < 0 || score > item.points} onClick={() => void submit()} className="mt-3 gap-2 rounded-xl bg-amber-600 hover:bg-amber-700"><CheckCheck className="h-3.5 w-3.5" />{pending ? '保存中…' : '完成批阅'}</Button>
    </article>
  );
}

export function ReviewQueue({ items, onGraded }: { items: ReviewQueueItem[]; onGraded: (answerId: string) => void }) {
  return (
    <section className="rounded-[22px] border border-violet-100 bg-white/45 p-5">
      <div className="flex items-center justify-between gap-3"><h3 className="font-bold">人工批阅队列</h3><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">{items.length} 待批</span></div>
      <p className="mt-1 text-xs text-[var(--em-muted-ink)]">人工题批阅完成后，成绩和对应知识点画像才会更新一次。</p>
      {items.length === 0 ? <p className="mt-4 rounded-xl bg-white/55 p-4 text-sm text-[var(--em-muted-ink)]">当前没有待批阅答案。</p> : <div className="mt-4 grid gap-3 lg:grid-cols-2">{items.map((item) => <ReviewItem key={item.answerId} item={item} onGraded={onGraded} />)}</div>}
    </section>
  );
}

