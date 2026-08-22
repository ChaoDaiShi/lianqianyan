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
    primary: '#8B7CF6',
    secondary: '#6CA8FF',
    accent: '#FF9FCB',
    ink: '#29234A',
    mutedInk: '#6F6A8A',
    canvas: '#F7F4FF',
  },
  radius: { panel: 28, surface: 20, control: 14 },
  duration: { quick: 180, standard: 280, ambient: 420 },
  shadow: {
    glass: '0 24px 70px rgba(87, 73, 151, 0.12)',
    glow: '0 16px 42px rgba(139, 124, 246, 0.24)',
  },
} as const;
