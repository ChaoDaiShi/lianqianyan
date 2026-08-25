import { motion, useReducedMotion } from 'framer-motion';
import { Live2DCharacter } from '@/components/live2d/Live2DCharacter';
import { characterMotion, type XiaolianCharacterState } from '@/design';
import { cn } from '@/lib/utils';
import type {
  XiaolianCompanionState,
  XiaolianRuntimeState,
} from '@/store/useXiaolianRuntimeStore';

const SIZE = {
  sm: 'w-16',
  md: 'w-28',
  lg: 'w-48 sm:w-56',
  hero: 'w-52 sm:w-80 lg:w-[23rem]',
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
  runtimeState?: XiaolianRuntimeState;
  companionState?: XiaolianCompanionState;
  size?: keyof typeof SIZE;
  message?: string;
  className?: string;
  priority?: boolean;
  speaking?: boolean;
}

export function resolveXiaolianCharacterState(
  runtimeState: XiaolianRuntimeState,
  companionState: XiaolianCompanionState,
): XiaolianCharacterState {
  if (runtimeState === 'thinking') return 'thinking';
  if (runtimeState === 'loading') return 'analyzing';

  switch (companionState) {
    case 'encouraging':
      return 'encourage';
    case 'reminding':
      return 'teaching';
    case 'celebrating':
      return 'success';
    case 'companion':
      return 'idle';
  }
}

export function XiaolianCharacter({
  state = 'idle',
  runtimeState,
  companionState = 'companion',
  size = 'md',
  message,
  className,
  priority = false,
  speaking = false,
}: XiaolianCharacterProps) {
  const reduceMotion = useReducedMotion();
  const displayState = runtimeState
    ? resolveXiaolianCharacterState(runtimeState, companionState)
    : state;
  return (
    <div className={cn('flex flex-col items-center', className)}>
      <motion.div
        className={cn('relative aspect-[24/31] shrink-0', SIZE[size])}
        variants={characterMotion}
        animate={reduceMotion ? undefined : displayState}
      >
        <div className="absolute inset-x-[12%] bottom-[4%] h-[22%] rounded-full bg-primary-300/25 blur-2xl" />
        <Live2DCharacter
          stateLabel={STATE_LABEL[displayState]}
          characterState={displayState}
          speaking={speaking}
          priority={priority}
          className="relative drop-shadow-[0_24px_32px_rgba(87,73,151,0.18)]"
        />
      </motion.div>
      {message && <p className="mt-2 max-w-sm text-center text-sm leading-6 text-[var(--em-muted-ink)]">{message}</p>}
    </div>
  );
}
