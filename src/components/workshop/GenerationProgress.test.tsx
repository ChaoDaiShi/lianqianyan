import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { GenerationProgress, type ProgressStage } from './GenerationProgress';

const stages: ProgressStage[] = [
  { key: 'text', label: '生成文字资源', status: 'done' },
  { key: 'plan', label: 'AI 评估配图方案', status: 'running' },
  { key: 'image', label: '生成课程配图', status: 'pending' },
  { key: 'check', label: 'AI 文字质量检查', status: 'pending' },
];

describe('GenerationProgress', () => {
  it('computes percent from finished stages only and marks the running stage', () => {
    const html = renderToStaticMarkup(<GenerationProgress stages={stages} />);
    expect(html).toContain('25%');
    expect(html).toContain('正在生成…');
    expect(html).toContain('aria-valuenow="25"');
    expect(html).toContain('生成文字资源');
    expect(html).toContain('AI 文字质量检查');
  });

  it('counts skipped stages as finished and reports failures', () => {
    const finished: ProgressStage[] = [
      { key: 'text', label: '生成文字资源', status: 'done' },
      { key: 'plan', label: 'AI 评估配图方案', status: 'skipped', note: '默认方案' },
      { key: 'image', label: '生成课程配图', status: 'skipped', note: 'AI 判断不配图' },
      { key: 'check', label: 'AI 文字质量检查', status: 'failed' },
    ];
    const html = renderToStaticMarkup(<GenerationProgress stages={finished} />);
    expect(html).toContain('75%');
    expect(html).toContain('生成中断');
  });

  it('reports completion when every stage finished', () => {
    const allDone: ProgressStage[] = stages.map((stage) => ({ ...stage, status: 'done' }));
    const html = renderToStaticMarkup(<GenerationProgress stages={allDone} />);
    expect(html).toContain('100%');
    expect(html).toContain('生成完成');
  });
});
