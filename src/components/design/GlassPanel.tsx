import type { ReactNode } from 'react';
import { SolidPanel } from './SolidPanel';

export interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'article' | 'div';
  interactive?: boolean;
}

/** Compatibility entry while existing pages migrate to SolidPanel. */
export function GlassPanel(props: GlassPanelProps) {
  return <SolidPanel {...props} />;
}
