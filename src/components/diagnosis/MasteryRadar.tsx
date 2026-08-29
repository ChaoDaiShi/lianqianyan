import { useId } from 'react';

export interface MasteryRadarPoint {
  label: string;
  /** 0–100；null 表示尚无真实掌握证据，不计入轮廓。 */
  value: number | null;
}

export interface MasteryRadarProps {
  points: MasteryRadarPoint[];
}

const SIZE = 280;
const CENTER = SIZE / 2;
const RADIUS = 96;

function axisPoint(value: number, index: number, total: number) {
  const angle = -Math.PI / 2 + (2 * Math.PI * index) / total;
  const ratio = Math.min(100, Math.max(0, value)) / 100;
  return {
    x: CENTER + Math.cos(angle) * RADIUS * ratio,
    y: CENTER + Math.sin(angle) * RADIUS * ratio,
  };
}

function labelAnchor(index: number, total: number) {
  const angle = -Math.PI / 2 + (2 * Math.PI * index) / total;
  const cos = Math.cos(angle);
  if (cos > 0.35) return 'start' as const;
  if (cos < -0.35) return 'end' as const;
  return 'middle' as const;
}

/** 通用 N 维掌握度雷达：仅以真实评价证据绘制，缺失维度不按 0 分计入。 */
export function MasteryRadar({ points }: MasteryRadarProps) {
  const titleId = useId();
  const descriptionId = useId();
  const total = Math.max(points.length, 3);
  const known = points
    .map((point, index) => ({ point, index }))
    .filter((entry) => entry.point.value !== null);
  const ringPoints = (ratio: number) =>
    points
      .map((_, index) => {
        const { x, y } = axisPoint(100 * ratio, index, total);
        return `${x},${y}`;
      })
      .join(' ');
  const outlinePoints = known
    .map(({ point, index }) => {
      const { x, y } = axisPoint(point.value ?? 0, index, total);
      return `${x},${y}`;
    })
    .join(' ');

  if (points.length < 3) {
    return (
      <p className="rounded-2xl bg-violet-50/70 p-4 text-sm text-[var(--em-muted-ink)]">
        当前课程知识点不足 3 个，暂不能绘制掌握度雷达。
      </p>
    );
  }

  return (
    <figure className="rounded-[22px] border border-violet-100 bg-white/55 p-4">
      <figcaption className="mb-2 text-sm font-bold">知识点掌握雷达</figcaption>
      <svg
        role="img"
        aria-labelledby={`${titleId} ${descriptionId}`}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="mx-auto h-auto w-full max-w-[300px] overflow-visible"
      >
        <title id={titleId}>按知识点的掌握度雷达图</title>
        <desc id={descriptionId}>
          {points
            .map((point) => `${point.label}${point.value === null ? '暂无证据' : `${point.value}%`}`)
            .join('，')}
        </desc>
        {[0.25, 0.5, 0.75, 1].map((ratio) => (
          <polygon
            key={ratio}
            points={ringPoints(ratio)}
            fill={ratio === 1 ? 'rgba(139,92,246,.06)' : 'none'}
            stroke="rgba(139, 92, 246, .22)"
            strokeWidth="1"
          />
        ))}
        {points.map((_, index) => {
          const { x, y } = axisPoint(100, index, total);
          return (
            <line
              key={points[index].label}
              x1={CENTER}
              y1={CENTER}
              x2={x}
              y2={y}
              stroke="rgba(139, 92, 246, .18)"
              strokeWidth="1"
            />
          );
        })}
        {known.length >= 3 && (
          <polygon
            points={outlinePoints}
            fill="rgba(124, 92, 246, .2)"
            stroke="rgb(124, 92, 246)"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        )}
        {known.map(({ point, index }) => {
          const { x, y } = axisPoint(point.value ?? 0, index, total);
          return (
            <circle
              key={point.label}
              cx={x}
              cy={y}
              r="4"
              fill="white"
              stroke="rgb(124, 92, 246)"
              strokeWidth="2.5"
            />
          );
        })}
        {points.map((point, index) => {
          const angle = -Math.PI / 2 + (2 * Math.PI * index) / total;
          const x = CENTER + Math.cos(angle) * (RADIUS + 14);
          const y = CENTER + Math.sin(angle) * (RADIUS + 14);
          return (
            <text
              key={point.label}
              x={x}
              y={y + 4}
              textAnchor={labelAnchor(index, total)}
              className="fill-violet-950 text-[11px] font-semibold"
            >
              {point.label}
              {point.value === null ? '' : ` ${point.value}%`}
            </text>
          );
        })}
      </svg>
      {known.length < points.length && (
        <p className="mt-1 text-center text-xs leading-5 text-[var(--em-muted-ink)]">
          标注缺失的维度尚无评价证据，未按 0 分计入轮廓。
        </p>
      )}
    </figure>
  );
}
