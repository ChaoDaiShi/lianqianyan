import { useId } from 'react';
import type { ProfileRadarAxis } from './profileVisualization';

export interface PortraitRadarProps {
  axes: ProfileRadarAxis[];
}

function directionAt(index: number, count: number) {
  const angle = -Math.PI / 2 + index * Math.PI * 2 / count;
  const x = 120 + Math.cos(angle) * 88;
  const y = 120 + Math.sin(angle) * 88;
  const labelX = 120 + Math.cos(angle) * 108;
  const labelY = 124 + Math.sin(angle) * 108;
  return { x, y, labelX, labelY, anchor: Math.cos(angle) > .25 ? 'start' : Math.cos(angle) < -.25 ? 'end' : 'middle' } as const;
}

function pointAt(value: number, index: number, count: number): string {
  const direction = directionAt(index, count);
  const ratio = Math.min(100, Math.max(0, value)) / 100;
  const x = 120 + (direction.x - 120) * ratio;
  const y = 120 + (direction.y - 120) * ratio;
  return `${x},${y}`;
}

export function PortraitRadar({ axes }: PortraitRadarProps) {
  const directions = axes.map((_, index) => directionAt(index, axes.length));
  const titleId = useId();
  const descriptionId = useId();
  const knownAxes = axes
    .map((axis, index) => ({ axis, index }))
    .filter(
      (entry): entry is { axis: ProfileRadarAxis & { value: number }; index: number } =>
        entry.axis.value !== null,
    );
  const points = knownAxes
    .map(({ axis, index }) => pointAt(axis.value, index, axes.length))
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
        <title id={titleId}>学习画像多维雷达图</title>
        <desc id={descriptionId}>
          {axes
            .map((axis) => `${axis.label}${axis.value === null ? '暂无数据' : `${axis.value}%`}`)
            .join('，')}
        </desc>
        {[0.25, 0.5, 0.75, 1].map((ratio) => (
          <polygon
            key={ratio}
            points={directions.map(
              (direction) =>
                `${120 + (direction.x - 120) * ratio},${120 + (direction.y - 120) * ratio}`,
            ).join(' ')}
            fill={ratio === 1 ? 'rgba(255,255,255,.28)' : 'none'}
            stroke="rgba(139, 92, 246, .20)"
            strokeWidth="1"
          />
        ))}
        {directions.map((direction, index) => (
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
          const [cx, cy] = pointAt(axis.value, index, axes.length).split(',');
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
          const direction = directions[index];
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
