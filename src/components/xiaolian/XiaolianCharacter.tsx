import { motion, useReducedMotion } from 'framer-motion';
import { xiaolianCharacterAssets } from '@/assets/xiaolian/manifest';
import { characterMotion, type XiaolianCharacterState } from '@/design';
import { cn } from '@/lib/utils';

const SIZE = {
  sm: 'w-16',
  md: 'w-28',
  lg: 'w-48 sm:w-56',
  hero: 'w-64 sm:w-80 lg:w-[23rem]',
} as const;

const STATE_LABEL: Record<XiaolianCharacterState, string> = {
  idle: '小涟正在陪伴你',
  thinking: '小涟正在思考',
  analyzing: '小涟正在分析学习状态',
  planning: '小涟正在同步学习计划',
  teaching: '小涟正在陪你学习',
  evaluating: '小涟正在评估练习结果',
  encourage: '小涟正在为你加油',
  success: '小涟正在庆祝你的学习成果',
};

export interface XiaolianCharacterProps {
  state?: XiaolianCharacterState;
  size?: keyof typeof SIZE;
  message?: string;
  className?: string;
  priority?: boolean;
}

export function XiaolianCharacter({
  state = 'idle',
  size = 'md',
  message,
  className,
  priority = false,
}: XiaolianCharacterProps) {
  const reduceMotion = useReducedMotion();
  return (
    <div className={cn('flex flex-col items-center', className)}>
      <motion.div
        className={cn('relative aspect-[24/31] shrink-0', SIZE[size])}
        variants={characterMotion}
        animate={reduceMotion ? undefined : state}
      >
        <div className="absolute inset-x-[12%] bottom-[4%] h-[22%] rounded-full bg-primary-300/25 blur-2xl" />
        <img
          src={xiaolianCharacterAssets[state]}
          alt={STATE_LABEL[state]}
          width="480"
          height="620"
          loading={priority ? 'eager' : 'lazy'}
          className="relative h-full w-full object-contain drop-shadow-[0_24px_32px_rgba(87,73,151,0.18)]"
        />
      </motion.div>
      {message && <p className="mt-2 max-w-sm text-center text-sm leading-6 text-[var(--em-muted-ink)]">{message}</p>}
    </div>
  );
}
