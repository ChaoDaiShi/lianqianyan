import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MasteryRadar } from './MasteryRadar';

describe('MasteryRadar', () => {
  it('draws an axis for every knowledge point and excludes missing evidence', () => {
    const html = renderToStaticMarkup(
      <MasteryRadar
        points={[
          { label: '线性表', value: 62 },
          { label: '栈与队列', value: 40 },
          { label: '树与二叉树', value: null },
          { label: '图与遍历', value: null },
          { label: '排序与查找', value: 55 },
        ]}
      />,
    );

    expect(html).toContain('知识点掌握雷达');
    expect(html).toContain('线性表 62%');
    expect(html).toContain('树与二叉树');
    expect(html).not.toContain('树与二叉树 null%');
    expect(html).toContain('<polygon');
    expect(html).toContain('未按 0 分计入');
  });

  it('shows an honest empty state when there are fewer than three points', () => {
    const html = renderToStaticMarkup(
      <MasteryRadar points={[{ label: '线性表', value: 50 }, { label: '栈与队列', value: null }]} />,
    );
    expect(html).toContain('知识点不足 3 个');
    expect(html).not.toContain('<polygon');
  });
});
