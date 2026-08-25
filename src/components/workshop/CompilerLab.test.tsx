import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CompilerLab } from './CompilerLab';

describe('CompilerLab presentation', () => {
  it('shows the constrained simulator, examples, and all five stages', () => {
    const html = renderToStaticMarkup(<CompilerLab />);

    expect(html).toContain('C 教学编译模拟');
    expect(html).toContain('教学模拟，不执行本机程序');
    expect(html).toContain('运行成功示例');
    expect(html).toContain('语义错误示例');
    expect(html).toContain('预处理');
    expect(html).toContain('语法分析');
    expect(html).toContain('语义检查');
    expect(html).toContain('链接');
    expect(html).toContain('模拟运行');
    expect(html).toContain('开始模拟编译');
  });
});
