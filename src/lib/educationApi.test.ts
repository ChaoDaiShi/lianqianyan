import { describe, expect, it } from 'vitest';
import * as educationApi from './educationApi';

function accepts(status: number): boolean {
  const candidate = (educationApi as Record<string, unknown>)[
    'isCurrentPlanResponseStatus'
  ];
  return typeof candidate === 'function'
    ? (candidate as (value: number) => boolean)(status)
    : false;
}

describe('isCurrentPlanResponseStatus', () => {
  it.each([200, 204, 299, 404])('accepts the handled status %s', (status) => {
    expect(accepts(status)).toBe(true);
  });

  it.each([0, 199, 300, 400, 401, 500])(
    'rejects the unhandled status %s',
    (status) => {
      expect(accepts(status)).toBe(false);
    },
  );
});

describe('learning workshop API mappings', () => {
  it('maps Wikipedia results and defaults a missing result list to empty', () => {
    expect(
      educationApi.mapNetworkSearch({
        provider: 'wikipedia',
        query: '死锁',
        results: [
          {
            title: '死锁',
            summary: '摘要',
            url: 'https://zh.wikipedia.org/wiki/Deadlock',
            source_domain: 'zh.wikipedia.org',
          },
        ],
      }),
    ).toEqual({
      provider: 'wikipedia',
      query: '死锁',
      results: [
        {
          title: '死锁',
          summary: '摘要',
          url: 'https://zh.wikipedia.org/wiki/Deadlock',
          sourceDomain: 'zh.wikipedia.org',
        },
      ],
    });
    expect(
      educationApi.mapNetworkSearch({
        provider: 'wikipedia',
        query: 'none',
      }),
    ).toMatchObject({ results: [] });
  });

  it('maps compiler stages, diagnostics, output, and the safety notice', () => {
    expect(
      educationApi.mapCompileSimulation({
        success: false,
        language: 'c-edu',
        mode: 'simulation',
        stages: [
          { name: 'syntax', label: '语法分析', status: 'failed' },
        ],
        diagnostics: [
          {
            stage: 'syntax',
            severity: 'error',
            line: 2,
            code: 'C1002',
            message: '不支持的语句',
          },
        ],
        stdout: '',
        safety_notice: '教学模拟，不执行本机程序。',
      }),
    ).toEqual({
      success: false,
      language: 'c-edu',
      mode: 'simulation',
      stages: [{ name: 'syntax', label: '语法分析', status: 'failed' }],
      diagnostics: [
        {
          stage: 'syntax',
          severity: 'error',
          line: 2,
          code: 'C1002',
          message: '不支持的语句',
        },
      ],
      stdout: '',
      safetyNotice: '教学模拟，不执行本机程序。',
    });
  });

  it('maps generated resource provenance and defaults source sections', () => {
    expect(
      educationApi.mapGeneratedResource({
        title: '死锁 · 学习单',
        resource_type: 'study_sheet',
        format: 'markdown',
        content: '# 死锁',
        generation_mode: 'course_template',
        source_sections: ['定义', '条件'],
        filename: 'kp-deadlock-study_sheet.md',
      }),
    ).toEqual({
      title: '死锁 · 学习单',
      resourceType: 'study_sheet',
      format: 'markdown',
      content: '# 死锁',
      generationMode: 'course_template',
      sourceSections: ['定义', '条件'],
      filename: 'kp-deadlock-study_sheet.md',
    });
  });
});
