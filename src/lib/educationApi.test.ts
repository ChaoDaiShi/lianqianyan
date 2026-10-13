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
      slides: [],
    });
  });
});

describe('practice and curriculum API mappings', () => {
  it('maps learner-safe practice questions and recorded result metadata', () => {
    expect(
      educationApi.mapPracticeQuestionCatalog({
        version: 'ds-bank-v2',
        questions: [
          {
            id: 'q-1',
            version: 'ds-bank-v2',
            knowledgePointId: 'kp-stack-queue',
            objectiveId: 'stack-queue-order',
            prompt: '栈顶是什么？',
            options: [{ id: 'b', label: 'B' }],
            recordedResult: {
              optionId: 'b',
              isCorrect: false,
              score: 0,
              feedback: '正确答案是 A。',
            },
          },
        ],
      }),
    ).toEqual({
      version: 'ds-bank-v2',
      questions: [
        {
          id: 'q-1',
          version: 'ds-bank-v2',
          knowledgePointId: 'kp-stack-queue',
          objectiveId: 'stack-queue-order',
          prompt: '栈顶是什么？',
          options: [{ id: 'b', label: 'B' }],
          recordedResult: {
            optionId: 'b',
            isCorrect: false,
            score: 0,
            feedback: '正确答案是 A。',
          },
        },
      ],
    });
  });

  it('maps server-only practice grading and comparison metadata', () => {
    expect(
      educationApi.mapPracticeEvaluationResponse({
        evidence: { id: 'e-1', payload: {} },
        mastery_before: 0.3,
        mastery_after: 0.4,
        confidence: 0.5,
        evidence_count: 2,
        message: '已记录',
        replanning: { status: 'not_needed', performed: false },
        is_correct: true,
        score: 1,
        feedback: '正确。',
        grading_version: 'server-objective-choice-v1',
        already_recorded: false,
      }),
    ).toMatchObject({
      masteryBefore: 0.3,
      masteryAfter: 0.4,
      confidence: 0.5,
      evidenceCount: 2,
      isCorrect: true,
      score: 1,
      feedback: '正确。',
      gradingVersion: 'server-objective-choice-v1',
      alreadyRecorded: false,
    });
  });

  it('preserves knowledge provenance and maps the versioned curriculum', () => {
    expect(
      educationApi.mapKnowledgePointContent({
        knowledge_point_id: 'kp-linear-list',
        title: '线性表',
        version: 'course-ds-v2',
        material_path: 'course-ds/linear-list.md',
        source_refs: [{ title: 'OpenDSA', url: 'https://example.org', locator: '5.1', verificationStatus: 'reference_checked' }],
        objectives: [{ id: 'linear-insertion-cost', text: '拆分定位与修改成本' }],
        prerequisite_ids: ['kp-ds-complexity'],
        sections: [{ title: '插入', content: '内容' }],
      }),
    ).toMatchObject({
      knowledgePointId: 'kp-linear-list',
      version: 'course-ds-v2',
      materialPath: 'course-ds/linear-list.md',
      sourceRefs: [{ title: 'OpenDSA', locator: '5.1', verificationStatus: 'reference_checked' }],
      objectives: [{ id: 'linear-insertion-cost', text: '拆分定位与修改成本' }],
      prerequisiteIds: ['kp-ds-complexity'],
    });
    expect(
      educationApi.mapCurriculum({
        courseId: 'course-ds',
        version: 'ds-v2',
        reviewStatus: 'pending_human_review',
        knowledgePoints: [{
          id: 'kp-linear-list',
          name: '线性表',
          order: 2,
          difficulty: 2,
          material: 'linear-list.md',
          prerequisiteIds: ['kp-ds-complexity'],
          aliases: ['链表'],
          objectives: [{ id: 'linear-insertion-cost', text: '拆分成本' }],
          sourceRefs: [{ title: 'OpenDSA', url: null, locator: '5.1', verificationStatus: 'reference_checked' }],
        }],
      }),
    ).toMatchObject({
      courseId: 'course-ds',
      version: 'ds-v2',
      reviewStatus: 'pending_human_review',
      knowledgePoints: [{ id: 'kp-linear-list', prerequisiteIds: ['kp-ds-complexity'] }],
    });
  });
});
