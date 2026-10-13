import { useId } from 'react';
import type {
  DiagnosisResult,
  PersistedStudyPlan,
  PersistedStudyTask,
} from '@/domain';
import type { LearningEvidence } from '@/lib/educationApi';
import { buildHomeJourney, type HomeJourneyNode } from './homePresentation';

export interface EvidenceOrbitModel {
  nodes: HomeJourneyNode[];
  focusTitle: string;
  currentLabel: string;
  evidenceCount: number;
  taskCount: number;
  completedCount: number;
  progress: number;
}

interface EvidenceOrbitInput {
  diagnosis: DiagnosisResult | null;
  plan: PersistedStudyPlan | null;
  task: PersistedStudyTask | null;
  evidence: LearningEvidence[];
}

export function buildEvidenceOrbit({
  diagnosis,
  plan,
  task,
  evidence,
}: EvidenceOrbitInput): EvidenceOrbitModel {
  const nodes = buildHomeJourney({ diagnosis, plan, task, evidence });
  const completedCount = nodes.filter(
    (node) => node.state === 'completed',
  ).length;
  return {
    nodes,
    focusTitle:
      task?.knowledgePointName ??
      diagnosis?.primaryFocus?.knowledgePointName ??
      '等待首次诊断',
    currentLabel:
      nodes.find((node) => node.state === 'current')?.label ?? '闭环完成',
    evidenceCount: evidence.length,
    taskCount: plan?.tasks.length ?? 0,
    completedCount,
    progress: completedCount / nodes.length,
  };
}

const POSITION = {
  diagnosis: { x: 180, y: 36 },
  plan: { x: 324, y: 180 },
  learning: { x: 180, y: 324 },
  validation: { x: 36, y: 180 },
} as const;

const STATE_COLOR = {
  completed: '#15803d',
  current: 'var(--em-primary)',
  waiting: 'var(--em-border-strong)',
} as const;

export function EvidenceOrbit({ model }: { model: EvidenceOrbitModel }) {
  const reactId = useId().replace(/:/g, '');
  const titleId = `evidence-orbit-title-${reactId}`;
  const descriptionId = `evidence-orbit-description-${reactId}`;
  const gradientId = `evidence-orbit-gradient-${reactId}`;
  const progress = Math.round(model.progress * 100);
  const focusText =
    model.focusTitle.length > 12
      ? `${model.focusTitle.slice(0, 11)}…`
      : model.focusTitle;

  return (
    <svg
      viewBox="0 0 360 360"
      role="img"
      aria-labelledby={`${titleId} ${descriptionId}`}
      data-evidence-orbit="true"
      className="mx-auto h-auto w-full max-w-[18rem] overflow-visible sm:max-w-[25rem]"
    >
      <title id={titleId}>学习四阶段进度</title>
      <desc id={descriptionId}>
        诊断、计划、学习和验证四个真实阶段，当前位于{model.currentLabel}。
      </desc>
      <defs>
        <linearGradient
          id={gradientId}
          x1="70"
          y1="52"
          x2="302"
          y2="314"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--em-primary)" />
          <stop offset="0.48" stopColor="var(--em-sky)" />
          <stop offset="1" stopColor="#475569" />
        </linearGradient>
      </defs>

      <circle
        cx="180"
        cy="180"
        r="122"
        fill="none"
        stroke="var(--em-border)"
        strokeWidth="2"
        strokeDasharray="3 9"
      />
      <circle
        cx="180"
        cy="180"
        r="122"
        pathLength="100"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${progress} ${100 - progress}`}
        transform="rotate(-90 180 180)"
        opacity={progress > 0 ? 0.9 : 0}
      />
      <circle
        cx="180"
        cy="180"
        r="78"
        fill="var(--em-surface)"
        stroke="var(--em-border)"
        strokeWidth="1.5"
      />
      <circle
        cx="180"
        cy="180"
        r="66"
        fill="none"
        stroke="var(--em-primary)"
        strokeWidth="1.5"
        opacity="0.3"
      />

      <text
        x="180"
        y="156"
        textAnchor="middle"
        fill="var(--em-muted-ink)"
        fontFamily="Inter, PingFang SC, Microsoft YaHei, sans-serif"
        fontSize="11"
        fontWeight="600"
        letterSpacing="1.5"
      >
        当前重点
      </text>
      <text
        x="180"
        y="184"
        textAnchor="middle"
        fill="var(--em-ink)"
        fontFamily="Inter, PingFang SC, Microsoft YaHei, sans-serif"
        fontSize="19"
        fontWeight="700"
      >
        {focusText}
      </text>
      <text
        x="180"
        y="208"
        textAnchor="middle"
        fill="var(--em-primary)"
        fontFamily="Inter, PingFang SC, Microsoft YaHei, sans-serif"
        fontSize="12"
        fontWeight="600"
      >
        {model.completedCount}/4 · {model.currentLabel}
      </text>

      {model.nodes.map((node) => {
        const position = POSITION[node.id];
        const color = STATE_COLOR[node.state];
        return (
          <g
            key={node.id}
            transform={`translate(${position.x} ${position.y})`}
            data-orbit-node={node.id}
            data-orbit-state={node.state}
          >
            <circle
              r="19"
              fill="var(--em-surface-subtle)"
              stroke={color}
              strokeWidth={node.state === 'current' ? 3 : 2}
            />
            <circle
              r={node.state === 'current' ? 7 : 5}
              fill={
                node.state === 'waiting'
                  ? 'var(--em-border-strong)'
                  : color
              }
            />
            <text
              x="0"
              y="39"
              textAnchor="middle"
              fill={
                node.state === 'waiting'
                  ? 'var(--em-muted-ink)'
                  : 'var(--em-ink)'
              }
              fontFamily="Inter, PingFang SC, Microsoft YaHei, sans-serif"
              fontSize="12"
              fontWeight={node.state === 'current' ? 700 : 600}
            >
              {node.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
