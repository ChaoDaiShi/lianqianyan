import type { Variants } from 'framer-motion';

export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: 'easeOut' },
  },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

export const cardReveal: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: 'easeOut' },
  },
};

export const gentleHover = {
  y: -3,
  transition: { duration: 0.18 },
} as const;

export const characterMotion: Variants = {
  idle: {
    y: [0, -4, 0],
    transition: { duration: 4, repeat: Infinity },
  },
  thinking: {
    scale: [1, 1.02, 1],
    transition: { duration: 1.6, repeat: Infinity },
  },
  analyzing: {
    y: [0, -3, 0],
    transition: { duration: 1.4, repeat: Infinity },
  },
  planning: {
    scale: [1, 1.02, 1],
    transition: { duration: 1.6, repeat: Infinity },
  },
  teaching: {
    scale: [1, 1.025, 1],
    transition: { duration: 1.1 },
  },
  evaluating: {
    y: [0, -3, 0],
    transition: { duration: 1.4, repeat: Infinity },
  },
  encourage: {
    scale: [1, 1.025, 1],
    transition: { duration: 1.1 },
  },
  success: {
    y: [0, -6, 0],
    transition: { duration: 0.7 },
  },
};
