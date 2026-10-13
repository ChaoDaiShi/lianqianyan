import type { ReactNode } from 'react';
import katex from 'katex';
import hljs from 'highlight.js/lib/core';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import python from 'highlight.js/lib/languages/python';
import typescript from 'highlight.js/lib/languages/typescript';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github.css';
import './markdown.css';
import { cn } from '@/lib/utils';

interface MarkdownTextProps {
  content: string;
  className?: string;
  showLineNumbers?: boolean;
}

hljs.registerLanguage('c', c);
hljs.registerLanguage('cpp', cpp);
hljs.registerLanguage('java', java);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('python', python);
hljs.registerLanguage('typescript', typescript);

const INLINE_PATTERN =
  /(\$[^$\n]+\$|\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)]+\))/g;

function MathMarkup({ expression, display = false }: { expression: string; display?: boolean }) {
  const html = katex.renderToString(expression, {
    displayMode: display,
    throwOnError: false,
    trust: false,
  });

  if (display) {
    return <div className="overflow-x-auto py-2" dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

function inline(text: string): ReactNode[] {
  return text
    .split(INLINE_PATTERN)
    .filter(Boolean)
    .map((part, index) => {
      if (part.startsWith('$') && part.endsWith('$')) {
        return <MathMarkup key={index} expression={part.slice(1, -1)} />;
      }
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={index}
            className="rounded bg-[var(--em-surface-subtle)] px-1.5 py-0.5 font-mono text-[0.95em] text-[var(--em-ink)]"
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
            className="font-medium text-[var(--em-primary)] underline underline-offset-2 hover:text-[var(--em-primary-deep)]"
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
    line.startsWith('```') ||
    line.trimStart().startsWith('|') ||
    line.trimStart().startsWith('$$')
  );
}

function tableCells(line: string): string[] {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, '|'));
}

function renderCode(code: string, language: string) {
  if (!language || !hljs.getLanguage(language)) return code;
  return hljs.highlight(code, { language }).value;
}

/** Renders the Markdown subset used by tutor and Agent answers, plus KaTeX and labeled code. */
export function MarkdownText({ content, className, showLineNumbers = false }: MarkdownTextProps) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.includes('|') && lines[index + 1]?.includes('|') && tableCells(lines[index + 1]).every((cell) => /^:?-{3,}:?$/.test(cell))) {
      const headers = tableCells(line);
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && lines[index].trim() && lines[index].includes('|')) {
        rows.push(tableCells(lines[index]));
        index += 1;
      }
      blocks.push(
        <div key={`table-${index}`} className="max-w-full overflow-x-auto rounded-lg border border-[var(--em-border)]">
          <table className="w-full border-collapse text-left text-sm leading-6">
            <thead className="bg-[var(--em-sky-subtle)] text-[var(--em-ink)]"><tr>{headers.map((cell, i) => <th key={i} scope="col" className="min-w-24 border-b border-[var(--em-border)] px-4 py-3 font-semibold">{inline(cell)}</th>)}</tr></thead>
            <tbody>{rows.map((row, i) => <tr key={i} className="border-b border-[var(--em-border)] last:border-b-0">{headers.map((_, j) => <td key={j} className="px-4 py-3 align-top">{inline(row[j] ?? '')}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      );
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
      const source = code.join('\n');
      const highlighted = renderCode(source, language);
      blocks.push(
        <pre
          key={`code-${index}`}
          className={cn(
            'overflow-x-auto rounded-lg border border-[var(--em-border)] bg-[var(--em-surface-subtle)] p-4 text-[14px] leading-6 text-[var(--em-ink)]',
            showLineNumbers && 'markdown-code-with-lines',
          )}
          data-code-language={language || undefined}
          data-show-line-numbers={showLineNumbers ? 'true' : undefined}
        >
          {showLineNumbers && (
            <span className="markdown-code-line-numbers" aria-hidden="true">
              {source.split('\n').map((_, lineIndex) => lineIndex + 1).join('\n')}
            </span>
          )}
          {highlighted === source ? (
            <code className={showLineNumbers ? 'markdown-code-source' : undefined}>{source}</code>
          ) : (
            <code
              className={cn('hljs', showLineNumbers && 'markdown-code-source')}
              dangerouslySetInnerHTML={{ __html: highlighted }}
            />
          )}
        </pre>,
      );
      continue;
    }

    if (line.trimStart().startsWith('$$')) {
      let expression = line.trimStart().slice(2);
      const closeOnLine = expression.indexOf('$$');
      if (closeOnLine >= 0) {
        expression = expression.slice(0, closeOnLine);
        index += 1;
      } else {
        const expressionLines = [expression];
        index += 1;
        let closed = false;
        while (index < lines.length && !closed) {
          const closingIndex = lines[index].indexOf('$$');
          if (closingIndex >= 0) {
            expressionLines.push(lines[index].slice(0, closingIndex));
            index += 1;
            closed = true;
          } else {
            expressionLines.push(lines[index]);
            index += 1;
          }
        }
        expression = expressionLines.join('\n');
      }
      blocks.push(<MathMarkup key={`math-${index}`} expression={expression} display />);
      continue;
    }

    const heading = line.match(/^(#{1,3}) (.+)$/);
    if (heading) {
      const level = heading[1].length;
      const text = inline(heading[2]);
      blocks.push(
        level === 1 ? (
          <h1 key={`heading-${index}`} className="text-2xl font-bold tracking-tight text-[var(--em-ink)]">
            {text}
          </h1>
        ) : level === 2 ? (
          <h2 key={`heading-${index}`} className="text-lg font-semibold text-[var(--em-ink)]">
            {text}
          </h2>
        ) : (
          <h3 key={`heading-${index}`} className="text-sm font-semibold text-[var(--em-ink)]">
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
        <ul key={`unordered-${index}`} className="list-disc space-y-2 pl-5 marker:text-[var(--em-primary-deep)]">
          {items.map((item, itemIndex) => <li key={itemIndex}>{inline(item)}</li>)}
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
        <ol key={`ordered-${index}`} className="list-decimal space-y-2 pl-5 marker:font-semibold marker:text-[var(--em-primary-deep)]">
          {items.map((item, itemIndex) => <li key={itemIndex}>{inline(item)}</li>)}
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
        <blockquote key={`quote-${index}`} className="border-l-2 border-[var(--em-border-strong)] bg-[var(--em-surface-subtle)] px-4 py-3 text-[var(--em-muted-ink)]">
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

  return <div className={cn('space-y-4 break-words text-[15px] leading-7 sm:text-base sm:leading-7', className)}>{blocks}</div>;
}
