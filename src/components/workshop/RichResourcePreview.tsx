import type { ReactNode } from 'react';

function inline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|<span style="color:#dc2626">.*?<\/span>)/g);
  return parts.filter(Boolean).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    const red = part.match(/^<span style="color:#dc2626">(.*?)<\/span>$/);
    return red ? <strong key={index} className="text-red-600">{red[1]}</strong> : part;
  });
}

interface RichResourcePreviewProps {
  content: string;
  /** 课程配图：嵌入预览内容流末尾，而不是悬浮在预览外部顶部。 */
  imageUrl?: string;
  imageCaption?: string;
}

export function RichResourcePreview({ content, imageUrl, imageCaption }: RichResourcePreviewProps) {
  return <article className="min-h-[18rem] space-y-3 rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] p-5 leading-7">
    {content.split('\n').map((line, index) => {
      if (line.startsWith('# ')) return <h1 key={index} className="text-2xl font-black text-[var(--em-primary)]">{inline(line.slice(2))}</h1>;
      if (line.startsWith('## ')) return <h2 key={index} className="pt-2 text-lg font-extrabold text-[var(--em-primary-deep)]">{inline(line.slice(3))}</h2>;
      if (line.startsWith('### ')) return <h3 key={index} className="font-bold text-[var(--em-primary)]">{inline(line.slice(4))}</h3>;
      if (line.startsWith('> ')) return <aside key={index} className="rounded-xl border-l-4 border-[var(--em-warning)] bg-[var(--em-surface-subtle)] px-4 py-2 text-sm text-[var(--em-ink)]">{inline(line.slice(2))}</aside>;
      if (/^[-*] /.test(line)) return <p key={index} className="pl-4 text-sm before:mr-2 before:text-[var(--em-primary)] before:content-['•']">{inline(line.slice(2))}</p>;
      if (!line.trim()) return <div key={index} className="h-1" />;
      return <p key={index} className="text-sm text-[var(--em-ink)]">{inline(line)}</p>;
    })}
    {imageUrl ? (
      <figure className="overflow-hidden rounded-xl border border-[var(--em-border)] bg-[var(--em-primary-subtle)]">
        <img src={imageUrl} alt="课程信息图" className="aspect-video w-full object-cover" loading="lazy" />
        {imageCaption ? <figcaption className="flex items-center gap-2 px-4 py-2 text-[10px] text-[var(--em-muted-ink)]">{imageCaption}</figcaption> : null}
      </figure>
    ) : null}
  </article>;
}
