import { useId } from 'react';
import type { ProfileRadarAxis } from './profileVisualization';

export interface PortraitRadarProps {
  axes: ProfileRadarAxis[];
}

const DIRECTIONS = [
  { x: 120, y: 24, labelX: 120, labelY: 13, anchor: 'middle' },
  { x: 216, y: 120, labelX: 225, labelY: 124, anchor: 'start' },
  { x: 120, y: 216, labelX: 120, labelY: 235, anchor: 'middle' },
  { x: 24, y: 120, labelX: 15, labelY: 124, anchor: 'end' },
] as const;

function pointAt(value: number, index: number): string {
  const direction = DIRECTIONS[index];
  const ratio = Math.min(100, Math.max(0, value)) / 100;
  const x = 120 + (direction.x - 120) * ratio;
  const y = 120 + (direction.y - 120) * ratio;
  return `${x},${y}`;
}

export function PortraitRadar({ axes }: PortraitRadarProps) {
  const titleId = useId();
  const descriptionId = useId();
  const knownAxes = axes
    .map((axis, index) => ({ axis, index }))
    .filter(
      (entry): entry is { axis: ProfileRadarAxis & { value: number }; index: number } =>
        entry.axis.value !== null,
    );
  const points = knownAxes
    .map(({ axis, index }) => pointAt(axis.value, index))
    .join(' ');
  const allKnown = knownAxes.length === axes.length;

  return (
    <figure className="rounded-[22px] border border-violet-100 bg-white/55 p-4">
      <figcaption className="mb-2 text-sm font-bold">成长维度雷达</figcaption>
      <svg
        role="img"
        aria-labelledby={`${titleId} ${descriptionId}`}
        viewBox="-30 -4 300 260"
        className="mx-auto h-auto w-full max-w-[320px] overflow-visible"
      >
        <title id={titleId}>学习画像四维雷达图</title>
        <desc id={descriptionId}>
          {axes
            .map((axis) => `${axis.label}${axis.value === null ? '暂无数据' : `${axis.value}%`}`)
            .join('，')}
        </desc>
        {[0.25, 0.5, 0.75, 1].map((ratio) => (
          <polygon
            key={ratio}
            points={DIRECTIONS.map(
              (direction) =>
                `${120 + (direction.x - 120) * ratio},${120 + (direction.y - 120) * ratio}`,
            ).join(' ')}
            fill={ratio === 1 ? 'rgba(255,255,255,.28)' : 'none'}
            stroke="rgba(139, 92, 246, .20)"
            strokeWidth="1"
          />
        ))}
        {DIRECTIONS.map((direction, index) => (
          <line
            key={axes[index]?.key ?? index}
            x1="120"
            y1="120"
            x2={direction.x}
            y2={direction.y}
            stroke="rgba(139, 92, 246, .20)"
            strokeWidth="1"
          />
        ))}
        {knownAxes.length >= 2 &&
          (allKnown ? (
            <polygon
              points={points}
              fill="rgba(124, 92, 246, .22)"
              stroke="rgb(124, 92, 246)"
              strokeWidth="2.5"
            />
          ) : (
            <polyline
              points={points}
              fill="none"
              stroke="rgb(124, 92, 246)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        {knownAxes.map(({ axis, index }) => {
          const [cx, cy] = pointAt(axis.value, index).split(',');
          return (
            <circle
              key={axis.key}
              cx={cx}
              cy={cy}
              r="4"
              fill="white"
              stroke="rgb(124, 92, 246)"
              strokeWidth="2.5"
            />
          );
        })}
        {axes.map((axis, index) => {
          const direction = DIRECTIONS[index];
          return (
            <text
              key={axis.key}
              x={direction.labelX}
              y={direction.labelY}
              textAnchor={direction.anchor}
              className="fill-violet-950 text-[11px] font-semibold"
            >
              {axis.label} {axis.value === null ? '暂无' : `${axis.value}%`}
            </text>
          );
        })}
      </svg>
      {!allKnown && (
        <p className="mt-1 text-center text-xs leading-5 text-[var(--em-muted-ink)]">
          虚缺维度尚无证据，未按 0 分计入轮廓。
        </p>
      )}
    </figure>
  );
}
