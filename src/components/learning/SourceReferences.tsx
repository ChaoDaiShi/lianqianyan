import { BookOpen } from 'lucide-react';
import type { KnowledgeSource } from '@/lib/educationApi';

interface SourceReferencesProps {
  sources: KnowledgeSource[];
}

export function SourceReferences({ sources }: SourceReferencesProps) {
  if (sources.length === 0) return null;

  return (
    <div data-source-references="true" className="mt-4 border-t border-violet-100 pt-4">
      <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--em-muted-ink)]">
        <BookOpen className="h-4 w-4 text-star" />
        参考课程知识
      </div>
      <div className="mt-2.5 space-y-2">
        {sources.map((source) => (
          <details key={source.id} className="rounded-2xl border border-sky-100 bg-sky-50/55 px-4 py-3">
            <summary className="cursor-pointer text-[13px] font-semibold text-sky-700">
              {source.title}
            </summary>
            <p className="mt-2 text-[13px] leading-[1.65] text-gray-600">{source.excerpt}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
