import { useId } from 'react';
import { cn } from '@/lib/utils';

export interface LianMarkProps {
  size?: 'sm' | 'md' | 'lg';
  decorative?: boolean;
  className?: string;
}

const SIZE_CLASS = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
} as const;

/** 涟千言品牌标记：两道水纹连接四个学习证据节点。 */
export function LianMark({
  size = 'md',
  decorative = false,
  className,
}: LianMarkProps) {
  const reactId = useId().replace(/:/g, '');
  const gradientId = `lian-mark-gradient-${reactId}`;
  const titleId = `lian-mark-title-${reactId}`;

  return (
    <svg
      viewBox="0 0 72 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      data-lian-mark="constellation"
      data-mark-size={size}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? true : undefined}
      aria-labelledby={decorative ? undefined : titleId}
      className={cn('shrink-0 overflow-visible', SIZE_CLASS[size], className)}
    >
      {!decorative && <title id={titleId}>涟千言标志</title>}
      <defs>
        <linearGradient
          id={gradientId}
          x1="8"
          y1="12"
          x2="64"
          y2="60"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--em-accent)" />
          <stop offset="0.52" stopColor="var(--em-primary)" />
          <stop offset="1" stopColor="var(--em-secondary)" />
        </linearGradient>
        <filter id={`${gradientId}-glow`} x="-45%" y="-45%" width="190%" height="190%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle
        cx="36"
        cy="36"
        r="31"
        fill="var(--em-glass-bg)"
        stroke="var(--em-glass-border)"
        strokeWidth="1.5"
      />
      <path
        d="M14 38C21 25 31 21 39 29C47 37 55 34 60 23"
        stroke={`url(#${gradientId})`}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M12 48C22 37 31 37 39 45C47 53 57 49 62 40"
        stroke={`url(#${gradientId})`}
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.82"
      />
      <circle cx="20" cy="25" r="3.5" fill="var(--em-accent)" />
      <circle
        cx="52"
        cy="48"
        r="4"
        fill="var(--em-secondary)"
        filter={`url(#${gradientId}-glow)`}
      />
      <circle cx="56" cy="18" r="2" fill="var(--em-primary)" />
      <circle cx="14" cy="48" r="1.75" fill="var(--em-primary)" opacity="0.7" />
    </svg>
  );
}
