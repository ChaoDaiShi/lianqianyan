import analyzing from './states/analyzing.svg';
import encourage from './states/encourage.svg';
import idle from './states/idle.svg';
import success from './states/success.svg';
import thinking from './states/thinking.svg';

export const xiaolianCharacterAssets = {
  idle,
  thinking,
  analyzing,
  planning: thinking,
  teaching: encourage,
  evaluating: analyzing,
  encourage,
  success,
} as const;

export const xiaolianAssets = {
  character: xiaolianCharacterAssets,
  backgroundMotif: 'xiaolian-memory-ripple',
  decorationMotif: 'xiaolian-star-petal',
  emptyStateMotif: 'xiaolian-sleeping-star',
} as const;
