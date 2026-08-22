import { Archive, CheckCircle2 } from 'lucide-react';
import { GlassPanel } from '@/components/design/GlassPanel';

export interface MemoryCapsuleProps {
  confirmedPreferences: string[];
}

export function MemoryCapsule({
  confirmedPreferences,
}: MemoryCapsuleProps) {
  return (
    <GlassPanel className="p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <Archive className="h-4 w-4 text-primary-600" />
        <p className="text-[10px] font-bold text-primary-600">MEMORY CAPSULE</p>
      </div>
      <h2 className="mt-1 text-xl font-bold">学习偏好记忆胶囊</h2>

      {confirmedPreferences.length > 0 ? (
        <ul className="mt-5 space-y-3">
          {confirmedPreferences.map((preference, index) => (
            <li
              key={`${preference}-${index}`}
              className="flex gap-3 rounded-lg border border-violet-100 bg-white/60 p-3"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span className="text-sm leading-6">{preference}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-5 rounded-lg border border-dashed border-violet-200 p-4">
          <p className="text-sm font-semibold">暂无已确认的学习偏好</p>
          <p className="mt-2 text-xs leading-5 text-[var(--em-muted-ink)]">
            这里只展示由你明确确认的偏好，不会自动生成长期记忆。
          </p>
        </div>
      )}
    </GlassPanel>
  );
}
