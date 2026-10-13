export type XiaolianCharacterState =
  | 'idle'
  | 'thinking'
  | 'analyzing'
  | 'planning'
  | 'teaching'
  | 'evaluating'
  | 'encourage'
  | 'success';

export const designTokens = {
  color: {
    primary: '#9B4F6B',
    primaryDeep: '#7D3C57',
    active: '#FBEEF3',
    sky: '#477795',
    gold: '#9A793B',
    ink: '#302733',
    mutedInk: '#6E5D6B',
    canvas: '#FBF8FA',
    surface: '#FFFFFF',
    border: '#E8DCE2',
    borderStrong: '#D1BDC7',
    success: '#15803D',
    warning: '#D97706',
    danger: '#DC2626',
    unknown: '#64748B',
    decision: '#1D4ED8',
  },
  radius: { panel: 16, surface: 12, control: 8 },
  duration: { quick: 120, standard: 180 },
  shadow: {
    panel: '0 1px 2px rgba(15, 23, 42, 0.05)',
    raised: '0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.04)',
  },
} as const;
