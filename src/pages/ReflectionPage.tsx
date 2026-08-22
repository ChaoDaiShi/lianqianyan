import { ArrowLeft, RotateCw } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { LearningState } from '@/components/feedback/LearningState';
import { ReflectionWorkspace } from '@/components/learning/ReflectionWorkspace';
import { Button } from '@/components/ui/button';
import { useKnowledgePoint } from '@/lib/hooks';
import { DEMO_COURSE_ID, useLearningLoopStore } from '@/store';

export function ReflectionPage() {
  const [searchParams] = useSearchParams();
  const knowledgePointId =
    searchParams.get('knowledge_point_id')?.trim() ?? '';
  const knowledgePointName =
    searchParams.get('knowledge_point_name')?.trim() ?? '';
  const knowledgeState = useKnowledgePoint(
    knowledgePointId || undefined,
    DEMO_COURSE_ID,
  );
  const storedResult = useLearningLoopStore((state) =>
    knowledgePointId
      ? state.reflectionResults[knowledgePointId] ?? null
      : null,
  );
  const setReflectionResult = useLearningLoopStore(
    (state) => state.setReflectionResult,
  );
  const knowledge =
    knowledgeState.data?.knowledgePointId === knowledgePointId
      ? knowledgeState.data
      : null;
  const hasUsableContent =
    Boolean(knowledge?.title.trim()) &&
    Boolean(
      knowledge?.sections.some((section) => section.title.trim().length > 0),
    );

  let content;

  if (!knowledgePointId) {
    content = (
      <LearningState
        kind="empty"
        title="缺少知识点参数"
        description="请从学习工作台选择真实知识点后进入复述。"
        action={
          <Button asChild variant="outline">
            <Link to="/space" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              返回学习工作台
            </Link>
          </Button>
        }
      />
    );
  } else if (knowledgeState.loading && !knowledge) {
    content = (
      <LearningState
        kind="loading"
        title="正在读取复述内容"
        description={
          knowledgePointName
            ? `正在加载「${knowledgePointName}」的真实课程章节。`
            : '正在加载当前知识点的真实课程章节。'
        }
      />
    );
  } else if (knowledgeState.error && !knowledge) {
    content = (
      <LearningState
        kind="error"
        title="暂时无法读取知识点"
        description="真实课程内容没有加载成功，因此不会生成模拟复述目标。"
        action={
          <Button
            variant="outline"
            onClick={() => void knowledgeState.refetch()}
            className="gap-2"
          >
            <RotateCw className="h-4 w-4" />
            重新加载
          </Button>
        }
      />
    );
  } else if (!knowledge || !hasUsableContent) {
    content = (
      <LearningState
        kind="empty"
        title="当前知识点没有可复述内容"
        description="接口未返回真实标题和章节目标，提交入口保持关闭。"
        action={
          <Button asChild variant="outline">
            <Link to="/space" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              返回学习工作台
            </Link>
          </Button>
        }
      />
    );
  } else {
    content = (
      <ReflectionWorkspace
        key={knowledge.knowledgePointId}
        knowledge={knowledge}
        initialResult={storedResult}
        onComplete={setReflectionResult}
      />
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-5">
        <Button asChild variant="ghost">
          <Link to="/space" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            返回学习工作台
          </Link>
        </Button>
        {content}
      </div>
    </AppShell>
  );
}
