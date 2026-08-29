import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface WorkbenchSidePanelProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Codex 风格的右侧滑出面板：中央对话保持聚焦，
 * 课前引导、学习产物等辅助内容按需展开，Esc 或点击遮罩关闭。
 */
export function WorkbenchSidePanel({ title, onClose, children }: WorkbenchSidePanelProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label="关闭侧栏"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/45 backdrop-blur-[2px]"
      />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-violet-100/60 bg-[var(--em-surface)] shadow-2xl">
        <header className="flex items-center justify-between border-b border-violet-100/60 px-5 py-4">
          <h2 className="text-sm font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="rounded-full p-1.5 text-[var(--em-muted-ink)] transition hover:bg-violet-50/60"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </aside>
    </div>
  );
}
