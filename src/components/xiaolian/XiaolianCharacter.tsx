import { Live2DCharacter } from '@/components/live2d/Live2DCharacter';
import { useLive2dLease } from '@/components/live2d/live2dLease';
import type { Live2dFraming } from '@/components/live2d/live2dRuntime';
import { resolvePublicAssetPath } from '@/config/deployment';
import type { XiaolianCharacterState } from '@/design';
import { cn } from '@/lib/utils';
import type {
  XiaolianCompanionState,
  XiaolianRuntimeState,
} from '@/store/useXiaolianRuntimeStore';

const SIZE = {
  sm: 'w-7',
  conversation: 'w-9',
  md: 'w-9',
  lg: 'w-9',
  hero: 'w-9',
} as const;

const CYRENE_ICON = resolvePublicAssetPath(
  'brand/cyrene-icon.jpeg',
  import.meta.env.BASE_URL,
);

const STATE_LABEL: Record<XiaolianCharacterState, string> = {
  idle: '小涟正在陪伴你',
  thinking: '小涟正在思考',
  analyzing: '小涟正在分析学习状态',
  planning: '小涟正在同步学习计划',
  teaching: '小涟正在陪你学习',
  evaluating: '小涟正在评估练习结果',
  encourage: '准备开始学习',
  success: '查看学习记录',
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
  framing?: Live2dFraming;
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
      className="relative h-full w-full overflow-hidden rounded-full border border-[var(--em-border)] bg-[var(--em-surface)] shadow-sm"
    >
      <img
        src={CYRENE_ICON}
        alt=""
        draggable={false}
        className="h-full w-full object-cover"
      />
      {speaking && (
        <span
          aria-hidden="true"
          className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--em-surface)] bg-[var(--em-action)]"
        />
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
  framing = 'full',
}: XiaolianCharacterProps) {
  const displayState = runtimeState
    ? resolveXiaolianCharacterState(runtimeState, companionState)
    : state;
  const hasLive2dLease = useLive2dLease(size === 'conversation');

  return (
    <div
      className={cn('flex flex-col items-center', className)}
      data-live2d-framing={framing}
      data-companion-size={size === 'sm' ? '28' : '36'}
    >
      <div className={cn('relative aspect-[24/31] shrink-0', SIZE[size])}>
        {hasLive2dLease ? (
          <Live2DCharacter
            stateLabel={STATE_LABEL[displayState]}
            characterState={displayState}
            speaking={speaking}
            priority={priority}
            framing={framing}
            className="relative"
          />
        ) : (
          <XiaolianAvatar
            stateLabel={STATE_LABEL[displayState]}
            characterState={displayState}
            speaking={speaking}
          />
        )}
      </div>
      {message && (
        <p className="mt-2 max-w-sm text-center text-sm leading-[1.7] text-[var(--em-muted-ink)]">
          {message}
        </p>
      )}
    </div>
  );
}
