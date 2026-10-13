import type { KnowledgePointContent } from '@/lib/educationApi';

export function MaterialProvenance({ material }: { material: Pick<KnowledgePointContent, 'version' | 'sourceRefs' | 'objectives'> }) {
  if (!material.version && !material.sourceRefs?.length && !material.objectives?.length) return null;
  return <details className="rounded-lg border border-[var(--em-border)] bg-[var(--em-surface-subtle)] p-3 text-sm">
    <summary className="cursor-pointer font-medium">学习目标与参考资料</summary>
    {!!material.objectives?.length && <ul className="mt-3 list-disc space-y-1 pl-5 text-[var(--em-ink)]">{material.objectives.map((objective) => <li key={objective.id}>{objective.text}</li>)}</ul>}
    {!!material.sourceRefs?.length && <ul className="mt-3 space-y-2 text-xs leading-6 text-[var(--em-muted-ink)]">{material.sourceRefs.map((source) => <li key={`${source.title}-${source.locator}`}>
      {source.url ? <a href={source.url} target="_blank" rel="noreferrer" className="font-medium text-[var(--em-primary-deep)] underline underline-offset-2">{source.title}</a> : source.title}
      <span className="block">{source.locator}</span>
    </li>)}</ul>}
    {material.version && <p className="mt-3 break-all text-xs text-[var(--em-muted-ink)]">教材版本：{material.version}</p>}
    {!!material.sourceRefs?.length && <p className="mt-2 text-xs leading-6 text-[var(--em-muted-ink)]">{material.sourceRefs.every((source) => source.verificationStatus === 'reference_checked') ? '参考页面与章节定位已核查；' : '参考资料供对照查阅；'}课程内容与评分规则仍待教师审核。</p>}
  </details>;
}
