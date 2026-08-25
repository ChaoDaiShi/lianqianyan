import { describe, expect, it, vi } from 'vitest';
import type { GeneratedResource } from '@/lib/educationApi';
import {
  COMPILER_EXAMPLES,
  downloadMarkdown,
  RESOURCE_TYPES,
  resultCountLabel,
  stageTone,
  WORKSHOP_KNOWLEDGE_POINTS,
} from './workshopPresentation';

describe('learning workshop presentation model', () => {
  it('uses the five backend knowledge points and five unique resource types', () => {
    expect(WORKSHOP_KNOWLEDGE_POINTS.map((item) => item.id)).toEqual([
      'kp-process-concept',
      'kp-process-sync',
      'kp-pv',
      'kp-deadlock',
      'kp-scheduling',
    ]);
    expect(new Set(RESOURCE_TYPES.map((item) => item.value)).size).toBe(5);
  });

  it('provides one successful and one intentionally broken compiler example', () => {
    expect(COMPILER_EXAMPLES).toHaveLength(2);
    expect(COMPILER_EXAMPLES[0]).toMatchObject({ id: 'success' });
    expect(COMPILER_EXAMPLES[0].code).toContain('printf("%d\\n"');
    expect(COMPILER_EXAMPLES[1]).toMatchObject({ id: 'error' });
    expect(COMPILER_EXAMPLES[1].code).toContain('missing');
  });

  it('maps stage and result states to stable student-facing labels', () => {
    expect(stageTone('passed')).toContain('emerald');
    expect(stageTone('failed')).toContain('rose');
    expect(stageTone('skipped')).toContain('slate');
    expect(resultCountLabel(0)).toBe('未找到联网资料');
    expect(resultCountLabel(1)).toBe('找到 1 条资料');
    expect(resultCountLabel(4)).toBe('找到 4 条资料');
  });

  it('downloads the exact UTF-8 Markdown response and revokes its object URL', async () => {
    const resource: GeneratedResource = {
      title: '死锁 · 学习单',
      resourceType: 'study_sheet',
      format: 'markdown',
      content: '# 死锁\n课程内容。\n',
      generationMode: 'course_template',
      sourceSections: ['定义'],
      filename: 'kp-deadlock-study_sheet.md',
    };
    const click = vi.fn();
    const remove = vi.fn();
    const appendChild = vi.fn();
    const anchor = { href: '', download: '', click, remove };
    const createdBlobs: Blob[] = [];
    const createObjectURL = vi.fn((blob: Blob) => {
      createdBlobs.push(blob);
      return 'blob:workshop';
    });
    const revokeObjectURL = vi.fn();

    downloadMarkdown(
      resource,
      { createElement: () => anchor, body: { appendChild } },
      { createObjectURL, revokeObjectURL },
    );

    expect(anchor.download).toBe('kp-deadlock-study_sheet.md');
    expect(anchor.href).toBe('blob:workshop');
    expect(appendChild).toHaveBeenCalledWith(anchor);
    expect(click).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:workshop');
    expect(createdBlobs).toHaveLength(1);
    expect(createdBlobs[0].type).toBe('text/markdown;charset=utf-8');
    await expect(createdBlobs[0].text()).resolves.toBe(resource.content);
  });
});
