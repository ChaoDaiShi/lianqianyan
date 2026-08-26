import type {
  CompileStage,
  GeneratedResource,
  ResourceType,
} from '@/lib/educationApi';

export const WORKSHOP_KNOWLEDGE_POINTS = [
  { id: 'kp-process-concept', label: '进程基础' },
  { id: 'kp-process-sync', label: '进程同步' },
  { id: 'kp-pv', label: 'PV 操作' },
  { id: 'kp-deadlock', label: '死锁' },
  { id: 'kp-scheduling', label: '进程调度' },
] as const;

export const RESOURCE_TYPES: ReadonlyArray<{
  value: ResourceType;
  label: string;
  description: string;
}> = [
  { value: 'study_sheet', label: '学习单', description: '章节讲解与自检清单' },
  { value: 'flashcards', label: '复习闪卡', description: '逐章节问答卡片' },
  { value: 'quiz', label: '章节自测', description: '开放题与来源要点' },
  { value: 'mind_map', label: '思维导图', description: '课程章节层级梳理' },
  { value: 'study_plan', label: '学习计划', description: '按章节推进的任务表' },
  { value: 'presentation', label: '课堂 PPT', description: '生成结构化预览与真实 .pptx' },
];

export const COMPILER_EXAMPLES = [
  {
    id: 'success',
    label: '运行成功示例',
    code: `#include <stdio.h>
int main(void) {
  int x = 2;
  int y = 3;
  printf("%d\\n", x + y);
  return 0;
}`,
  },
  {
    id: 'error',
    label: '语义错误示例',
    code: `int main() {
  missing = 3;
  printf("%d\\n", missing);
  return 0;
}`,
  },
] as const;

export function stageTone(status: CompileStage['status']): string {
  switch (status) {
    case 'passed':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'failed':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    case 'skipped':
      return 'border-slate-200 bg-slate-50 text-slate-500';
  }
}

export function resultCountLabel(count: number): string {
  return count === 0 ? '未找到联网资料' : `找到 ${count} 条资料`;
}

export interface DownloadAnchor {
  href: string;
  download: string;
  click: () => void;
  remove: () => void;
}

export interface DownloadDocument {
  createElement: (tagName: 'a') => DownloadAnchor;
  body: { appendChild: (node: DownloadAnchor) => unknown };
}

export interface DownloadUrlApi {
  createObjectURL: (blob: Blob) => string;
  revokeObjectURL: (url: string) => void;
}

export function downloadMarkdown(
  resource: GeneratedResource,
  documentRef: DownloadDocument = document as unknown as DownloadDocument,
  urlApi: DownloadUrlApi = URL,
): void {
  const blob = new Blob([resource.content], {
    type: 'text/markdown;charset=utf-8',
  });
  const objectUrl = urlApi.createObjectURL(blob);
  const anchor = documentRef.createElement('a');
  anchor.href = objectUrl;
  anchor.download = resource.filename;
  documentRef.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  urlApi.revokeObjectURL(objectUrl);
}
