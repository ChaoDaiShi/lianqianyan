import { ArrowLeft, RotateCw } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { LearningState } from '@/components/feedback/LearningState';
import { ReflectionWorkspace } from '@/components/learning/ReflectionWorkspace';
import {
  buildLearningSpaceHref,
  getReflectionPageStatus,
  getReflectionTaskStatus,
} from '@/components/learning/reflectionPresentation';
import { Button } from '@/components/ui/button';
import { useCurrentPlan, useKnowledgePoint } from '@/lib/hooks';
import {
  DEMO_COURSE_ID,
  DEMO_LEARNER_ID,
  useLearningLoopStore,
} from '@/store';

export function ReflectionPage() {
  const [searchParams] = useSearchParams();
  const knowledgePointId =
    searchParams.get('knowledge_point_id')?.trim() ?? '';
  const knowledgePointName =
    searchParams.get('knowledge_point_name')?.trim() ?? '';
  const taskId = searchParams.get('task_id')?.trim() ?? '';
  const learningSpaceHref = buildLearningSpaceHref({
    taskId,
    knowledgePointId,
  });
  const knowledgeState = useKnowledgePoint(
    knowledgePointId || undefined,
    DEMO_COURSE_ID,
  );
  const planState = useCurrentPlan(DEMO_LEARNER_ID, DEMO_COURSE_ID);
  const storedResult = useLearningLoopStore((state) =>
    taskId ? state.reflectionResults[taskId] ?? null : null,
  );
  const setReflectionResult = useLearningLoopStore(
    (state) => state.setReflectionResult,
  );
  const knowledge =
    knowledgeState.data?.knowledgePointId === knowledgePointId
      ? knowledgeState.data
      : null;
  const status = getReflectionPageStatus({
    requestedKnowledgePointId: knowledgePointId,
    data: knowledgeState.data,
    loading: knowledgeState.loading,
    error: knowledgeState.error,
  });
  const taskStatus = getReflectionTaskStatus({
    taskId,
    knowledgePointId,
    plan: planState.plan,
    loading: planState.loading,
    error: planState.error,
  });

  let content;

  if (taskStatus === 'missing-task') {
    content = (
      <LearningState
        kind="empty"
        title="缺少学习任务参数"
        description="请从学习工作台的真实计划任务进入复述。"
        action={
          <Button asChild variant="outline">
            <Link to={learningSpaceHref} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              返回学习工作台
            </Link>
          </Button>
        }
      />
    );
  } else if (taskStatus === 'loading') {
    content = (
      <LearningState
        kind="loading"
        title="正在核对当前学习任务"
        description="正在从 Current Plan 读取任务与知识点归属。"
      />
    );
  } else if (taskStatus === 'error') {
    content = (
      <LearningState
        kind="error"
        title="暂时无法核对学习任务"
        description="当前计划没有加载成功，因此不会保存复述结果。"
        action={
          <Button
            variant="outline"
            onClick={() => void planState.refetch()}
            className="gap-2"
          >
            <RotateCw className="h-4 w-4" />
            重新加载
          </Button>
        }
      />
    );
  } else if (taskStatus === 'mismatch') {
    content = (
      <LearningState
        kind="empty"
        title="学习任务与知识点不匹配"
        description="当前计划中没有找到这组真实任务关系，复述提交入口保持关闭。"
        action={
          <Button asChild variant="outline">
            <Link to={learningSpaceHref} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              返回学习工作台
            </Link>
          </Button>
        }
      />
    );
  } else if (status === 'missing-id') {
    content = (
      <LearningState
        kind="empty"
        title="缺少知识点参数"
        description="请从学习工作台选择真实知识点后进入复述。"
      />
    );
  } else if (status === 'loading') {
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
  } else if (status === 'error') {
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
  } else if (status === 'empty' || !knowledge) {
    content = (
      <LearningState
        kind="empty"
        title="当前知识点没有可复述内容"
        description="接口未返回真实标题和章节目标，提交入口保持关闭。"
        action={
          <Button asChild variant="outline">
            <Link to={learningSpaceHref} className="gap-2">
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
        key={`${taskId}:${knowledge.knowledgePointId}`}
        learnerId={DEMO_LEARNER_ID}
        courseId={DEMO_COURSE_ID}
        taskId={taskId}
        knowledge={knowledge}
        initialResult={storedResult}
        onComplete={(result) => {
          if (taskId) setReflectionResult(taskId, result);
        }}
      />
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-5">
        <Button asChild variant="ghost">
          <Link to={learningSpaceHref} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            返回学习工作台
          </Link>
        </Button>
        {content}
      </div>
    </AppShell>
  );
}
