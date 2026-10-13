import { WorkbenchBackground } from './WorkbenchBackground';

export type NebulaScene = 'default' | 'companion' | 'galaxy' | 'storybook';

/** Existing page callers now share the static workbench canvas. */
export function NebulaBackground(props: { scene?: NebulaScene }) {
  void props.scene;
  return <WorkbenchBackground />;
}
