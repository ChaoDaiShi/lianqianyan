import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MarkdownTextProps {
  content: string;
  className?: string;
}

const INLINE_PATTERN =
  /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)]+\))/g;

function inline(text: string): ReactNode[] {
  return text
    .split(INLINE_PATTERN)
    .filter(Boolean)
    .map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={index}
            className="rounded-md bg-violet-100/70 px-1.5 py-0.5 font-mono text-[0.9em] text-primary-800"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      const link = part.match(/^\[([^\]]+)]\((https?:\/\/[^)]+)\)$/);
      if (link) {
        return (
          <a
            key={index}
            href={link[2]}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-primary-700 underline decoration-primary-300 underline-offset-2 hover:text-primary-800"
          >
            {link[1]}
          </a>
        );
      }
      return part;
    });
}

function isBlockStart(line: string) {
  return (
    !line.trim() ||
    /^#{1,3} /.test(line) ||
    /^> /.test(line) ||
    /^[-*] /.test(line) ||
    /^\d+\. /.test(line) ||
    line.startsWith('```')
  );
}

/** A deliberately small, safe Markdown subset for tutor and Agent answers. */
export function MarkdownText({ content, className }: MarkdownTextProps) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.startsWith('```')) {
      const language = line.slice(3).trim();
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith('```')) {
        code.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push(
        <pre
          key={`code-${index}`}
          className="overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100"
          data-code-language={language || undefined}
        >
          <code>{code.join('\n')}</code>
        </pre>,
      );
      continue;
    }

    const heading = line.match(/^(#{1,3}) (.+)$/);
    if (heading) {
      const level = heading[1].length;
      const text = inline(heading[2]);
      blocks.push(
        level === 1 ? (
          <h1 key={`heading-${index}`} className="text-xl font-bold tracking-[-0.02em]">
            {text}
          </h1>
        ) : level === 2 ? (
          <h2 key={`heading-${index}`} className="text-lg font-bold tracking-[-0.015em]">
            {text}
          </h2>
        ) : (
          <h3 key={`heading-${index}`} className="font-bold text-primary-800">
            {text}
          </h3>
        ),
      );
      index += 1;
      continue;
    }

    if (/^[-*] /.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*] /.test(lines[index])) {
        items.push(lines[index].slice(2));
        index += 1;
      }
      blocks.push(
        <ul key={`unordered-${index}`} className="list-disc space-y-1.5 pl-5 marker:text-primary-500">
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{inline(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\. /.test(lines[index])) {
        items.push(lines[index].replace(/^\d+\. /, ''));
        index += 1;
      }
      blocks.push(
        <ol key={`ordered-${index}`} className="list-decimal space-y-1.5 pl-5 marker:font-semibold marker:text-primary-600">
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{inline(item)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    if (line.startsWith('> ')) {
      const quoted: string[] = [];
      while (index < lines.length && lines[index].startsWith('> ')) {
        quoted.push(lines[index].slice(2));
        index += 1;
      }
      blocks.push(
        <blockquote
          key={`quote-${index}`}
          className="rounded-r-2xl border-l-2 border-primary-300 bg-violet-50/65 px-4 py-2 text-[var(--em-muted-ink)]"
        >
          {inline(quoted.join(' '))}
        </blockquote>,
      );
      continue;
    }

    const paragraph = [line];
    index += 1;
    while (index < lines.length && !isBlockStart(lines[index])) {
      paragraph.push(lines[index]);
      index += 1;
    }
    blocks.push(
      <p key={`paragraph-${index}`} className="whitespace-pre-wrap">
        {inline(paragraph.join(' '))}
      </p>,
    );
  }

  return <div className={cn('space-y-3 break-words', className)}>{blocks}</div>;
}
