import { BookOpen } from 'lucide-react';
import type { KnowledgeSource } from '@/lib/educationApi';
import { MaterialProvenance } from '@/components/knowledge/MaterialProvenance';

interface SourceReferencesProps {
  sources: KnowledgeSource[];
}

export function SourceReferences({ sources }: SourceReferencesProps) {
  if (sources.length === 0) return null;

  return (
    <section data-source-references="true" className="border-t border-[var(--em-border)] py-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-[var(--em-ink)]">
        <BookOpen className="h-4 w-4 text-[var(--em-primary-deep)]" />
        参考课程知识
      </div>
      <ul className="mt-3 space-y-2">
        {sources.map((source) => (
          <li key={source.id}>
            <details className="rounded-lg border border-[var(--em-border)] bg-[var(--em-surface)] px-3 py-2.5">
              <summary className="cursor-pointer text-sm font-medium text-[var(--em-ink)]">
                {source.title}
                <span className="ml-2 text-xs font-normal text-[var(--em-muted-ink)]">{source.section}</span>
              </summary>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--em-ink)]">
                {source.excerpt}
              </p>
              <div className="mt-2"><MaterialProvenance material={source} /></div>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
