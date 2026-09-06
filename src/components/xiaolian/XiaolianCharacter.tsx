import { motion, useReducedMotion } from 'framer-motion';
import { Live2DCharacter } from '@/components/live2d/Live2DCharacter';
import { useLive2dLease } from '@/components/live2d/live2dLease';
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

function XiaolianAvatar({
  stateLabel,
  characterState,
  speaking,
}: {
  stateLabel: string;
  characterState: XiaolianCharacterState;
  speaking: boolean;
}) {
  return (
    <div
      role="img"
      aria-label={stateLabel}
      data-xiaolian-avatar="true"
      data-character-state={characterState}
      data-live2d-speaking={speaking}
      className="relative h-full w-full overflow-hidden rounded-[38%] border border-white/80 shadow-[0_18px_50px_rgba(119,94,220,0.18)]"
    >
      <img
        src="/brand/cyrene-icon.jpeg"
        alt=""
        draggable={false}
        className="h-full w-full object-cover"
      />
      {speaking && (
        <span className="absolute bottom-[10%] left-1/2 h-[6%] w-[30%] -translate-x-1/2 animate-pulse rounded-full bg-white/85" />
      )}
    </div>
  );
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
  const hasLive2dLease = useLive2dLease();
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
        {hasLive2dLease ? (
          <Live2DCharacter
            stateLabel={STATE_LABEL[displayState]}
            characterState={displayState}
            speaking={speaking}
            priority={priority}
            className="relative drop-shadow-[0_24px_32px_rgba(87,73,151,0.18)]"
          />
        ) : (
          <XiaolianAvatar
            stateLabel={STATE_LABEL[displayState]}
            characterState={displayState}
            speaking={speaking}
          />
        )}
      </motion.div>
      {message && <p className="mt-2 max-w-sm text-center text-sm leading-6 text-[var(--em-muted-ink)]">{message}</p>}
    </div>
  );
}
