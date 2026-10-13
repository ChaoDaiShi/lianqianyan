import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CompilerLab } from './CompilerLab';

describe('CompilerLab presentation', () => {
  it('shows the constrained simulator and does not invent stage results before a response', () => {
    const html = renderToStaticMarkup(<CompilerLab />);

    expect(html).toContain('C 教学编译模拟');
    expect(html).toContain('教学模拟，不执行本机程序');
    expect(html).toContain('运行成功示例');
    expect(html).toContain('语义错误示例');
    expect(html).toContain('02 · 处理过程');
    expect(html).toContain('提交代码后，显示服务端返回的阶段与诊断信息。');
    expect(html).not.toContain('预处理');
    expect(html).toContain('开始模拟编译');
  });
});
