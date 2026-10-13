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
  return (
    <svg
      viewBox="0 0 72 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      data-lian-mark="constellation"
      data-mark-size={size}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : '涟千言标志'}
      className={cn('shrink-0 overflow-visible', SIZE_CLASS[size], className)}
    >
      <circle
        cx="36"
        cy="36"
        r="31"
        fill="var(--em-surface)"
        stroke="var(--em-border)"
        strokeWidth="1.5"
      />
      <path
        d="M14 38C21 25 31 21 39 29C47 37 55 34 60 23"
        stroke="var(--em-primary)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M12 48C22 37 31 37 39 45C47 53 57 49 62 40"
        stroke="var(--em-sky)"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.82"
      />
      <circle cx="20" cy="25" r="3.5" fill="var(--em-primary-subtle)" />
      <circle cx="52" cy="48" r="4" fill="var(--em-primary)" />
      <circle cx="56" cy="18" r="2" fill="var(--em-gold)" />
      <circle cx="14" cy="48" r="1.75" fill="var(--em-primary)" opacity="0.7" />
    </svg>
  );
}
