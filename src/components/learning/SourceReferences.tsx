import { BookOpen } from 'lucide-react';
import type { KnowledgeSource } from '@/lib/educationApi';

interface SourceReferencesProps {
  sources: KnowledgeSource[];
}

export function SourceReferences({ sources }: SourceReferencesProps) {
  if (sources.length === 0) return null;

  return (
    <div className="mt-3 border-t border-violet-100 pt-3">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--em-muted-ink)]">
        <BookOpen className="h-3 w-3 text-star" />
        参考课程知识
      </div>
      <div className="mt-1.5 space-y-1.5">
        {sources.map((source) => (
          <details key={source.id} className="rounded-[14px] border border-sky-100 bg-sky-50/55 px-3 py-2">
            <summary className="cursor-pointer text-[11px] font-medium text-sky-700">
              {source.title}
            </summary>
            <p className="mt-1 text-[11px] leading-relaxed text-gray-600">{source.excerpt}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
