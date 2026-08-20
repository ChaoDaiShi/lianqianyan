import { BookOpen } from 'lucide-react';
import type { KnowledgeSource } from '@/lib/educationApi';

interface SourceReferencesProps {
  sources: KnowledgeSource[];
}

export function SourceReferences({ sources }: SourceReferencesProps) {
  if (sources.length === 0) return null;

  return (
    <div className="mt-2 border-t border-gray-100 pt-2">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
        <BookOpen className="h-3 w-3 text-blue-500" />
        参考课程知识
      </div>
      <div className="mt-1.5 space-y-1.5">
        {sources.map((source) => (
          <details key={source.id} className="rounded-lg bg-blue-50/60 px-2.5 py-1.5">
            <summary className="cursor-pointer text-[11px] font-medium text-blue-700">
              {source.title}
            </summary>
            <p className="mt-1 text-[11px] leading-relaxed text-gray-600">{source.excerpt}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
