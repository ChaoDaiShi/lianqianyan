import { describe, expect, it } from 'vitest';
import {
  mapExam,
  mapExamAnalytics,
  mapExamAttempt,
  mapExamResult,
  mapExamGenerationResult,
  mapQuestion,
  mapQuestionType,
} from './educationApi';

describe('exam API mappings', () => {
  it('maps generated exam provenance and warnings', () => {
    const result = mapExamGenerationResult({
      exam: {
        id: 'exam-generated', course_id: 'course-os', title: '死锁专项练习',
        description: '', duration_minutes: 20, pass_percentage: 60,
        shuffle_questions: true, status: 'published', items: [], total_points: 0,
        created_at: '2026-08-26T08:00:00', updated_at: '2026-08-26T08:00:00',
        published_at: '2026-08-26T08:00:00',
      },
      generation_mode: 'course_grounded', provider: null, model: null,
      source_sections: ['死锁 · 必要条件'], warnings: ['课程材料降级'],
    });

    expect(result.exam.title).toBe('死锁专项练习');
    expect(result.generationMode).toBe('course_grounded');
    expect(result.sourceSections).toEqual(['死锁 · 必要条件']);
    expect(result.warnings).toEqual(['课程材料降级']);
  });

  it('maps a custom question type and authoring question', () => {
    expect(
      mapQuestionType({
        id: 'type-1',
        name: '口述题',
        description: '语音转写后人工评分',
        response_kind: 'short_text',
        grading_strategy: 'manual',
        is_builtin: false,
        is_archived: false,
        created_at: '2026-08-25T08:00:00',
        updated_at: '2026-08-25T08:00:00',
      }),
    ).toMatchObject({
      id: 'type-1',
      responseKind: 'short_text',
      gradingStrategy: 'manual',
      isBuiltin: false,
    });

    expect(
      mapQuestion({
        id: 'question-1',
        course_id: 'course-os',
        knowledge_point_id: 'kp-deadlock',
        question_type_id: 'type-1',
        question_type_name: '口述题',
        response_kind: 'short_text',
        grading_strategy: 'manual',
        prompt: '解释死锁避免。',
        options: [],
        correct_answer: '参考答案',
        keywords: [],
        explanation: '评分说明',
        difficulty: 0.8,
        default_score: 10,
        is_archived: false,
        created_at: '2026-08-25T08:00:00',
        updated_at: '2026-08-25T08:00:00',
      }),
    ).toMatchObject({
      courseId: 'course-os',
      knowledgePointId: 'kp-deadlock',
      questionTypeId: 'type-1',
      correctAnswer: '参考答案',
      defaultScore: 10,
    });
  });

  it('maps exam items and safe attempt questions independently', () => {
    const rawQuestion = {
      id: 'question-1',
      course_id: 'course-os',
      knowledge_point_id: 'kp-deadlock',
      question_type_id: 'type-single-choice',
      question_type_name: '单选题',
      response_kind: 'single_choice',
      grading_strategy: 'exact',
      prompt: '必要条件？',
      options: ['互斥', '可抢占'],
      correct_answer: '互斥',
      keywords: [],
      explanation: '解析',
      difficulty: 0.6,
      default_score: 10,
      is_archived: false,
      created_at: '2026-08-25T08:00:00',
      updated_at: '2026-08-25T08:00:00',
    };
    const exam = mapExam({
      id: 'exam-1',
      course_id: 'course-os',
      title: '阶段测评',
      description: '',
      duration_minutes: 30,
      pass_percentage: 60,
      shuffle_questions: false,
      status: 'published',
      total_points: 10,
      items: [
        {
          id: 'item-1',
          question_id: 'question-1',
          points: 10,
          position: 1,
          question: rawQuestion,
        },
      ],
      created_at: '2026-08-25T08:00:00',
      updated_at: '2026-08-25T08:00:00',
      published_at: '2026-08-25T08:01:00',
    });
    const attempt = mapExamAttempt({
      id: 'attempt-1',
      exam_id: 'exam-1',
      learner_id: 'learner-1',
      exam_title: '阶段测评',
      status: 'in_progress',
      started_at: '2026-08-25T08:02:00',
      expires_at: '2026-08-25T08:32:00',
      submitted_at: null,
      questions: [
        {
          question_id: 'question-1',
          question_type_name: '单选题',
          response_kind: 'single_choice',
          prompt: '必要条件？',
          options: ['互斥', '可抢占'],
          points: 10,
          position: 1,
          user_answer: null,
          saved_at: null,
        },
      ],
    });

    expect(exam.items[0].question.correctAnswer).toBe('互斥');
    expect(attempt.questions[0]).toEqual({
      questionId: 'question-1',
      questionTypeName: '单选题',
      responseKind: 'single_choice',
      prompt: '必要条件？',
      options: ['互斥', '可抢占'],
      points: 10,
      position: 1,
      userAnswer: null,
      savedAt: null,
    });
    expect(attempt.questions[0]).not.toHaveProperty('correctAnswer');
  });

  it('maps result grading details and honest nullable analytics', () => {
    const result = mapExamResult({
      id: 'attempt-1',
      exam_id: 'exam-1',
      learner_id: 'learner-1',
      exam_title: '阶段测评',
      status: 'graded',
      started_at: '2026-08-25T08:00:00',
      expires_at: '2026-08-25T08:30:00',
      submitted_at: '2026-08-25T08:10:00',
      awarded_score: 8,
      max_score: 10,
      pending_score: 0,
      percentage: 80,
      passed: true,
      answers: [
        {
          answer_id: 'answer-1',
          question_id: 'question-1',
          question_type_name: '人工论述题',
          response_kind: 'long_text',
          grading_strategy: 'manual',
          prompt: '解释。',
          options: [],
          user_answer: '作答',
          correct_answer: '参考',
          keywords: [],
          explanation: '解析',
          points: 10,
          awarded_score: 8,
          is_correct: false,
          grading_status: 'manual',
          feedback: '基本正确',
        },
      ],
    });
    const analytics = mapExamAnalytics({
      learner_id: 'learner-1',
      course_id: 'course-os',
      submitted_count: 0,
      graded_count: 0,
      average_percentage: null,
      best_percentage: null,
      pass_rate: null,
      objective_accuracy: null,
      pending_review_count: 0,
      knowledge_points: [],
    });

    expect(result.answers[0]).toMatchObject({
      awardedScore: 8,
      gradingStatus: 'manual',
      correctAnswer: '参考',
    });
    expect(analytics.averagePercentage).toBeNull();
    expect(analytics.objectiveAccuracy).toBeNull();
  });
});
