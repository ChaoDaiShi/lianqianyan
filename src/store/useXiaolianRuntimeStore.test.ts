import { beforeEach, describe, expect, it } from 'vitest';
import { useXiaolianRuntimeStore } from './useXiaolianRuntimeStore';

describe('useXiaolianRuntimeStore', () => {
  beforeEach(() => {
    useXiaolianRuntimeStore.setState({
      runtimeState: 'idle',
      companionState: 'companion',
    });
  });

  it('keeps runtime work separate from companion presentation tone', () => {
    const store = useXiaolianRuntimeStore.getState();

    store.setRuntimeState('loading');

    expect(useXiaolianRuntimeStore.getState()).toMatchObject({
      runtimeState: 'loading',
      companionState: 'companion',
    });

    store.setCompanionState('reminding');

    expect(useXiaolianRuntimeStore.getState()).toMatchObject({
      runtimeState: 'loading',
      companionState: 'reminding',
    });
  });

  it('resets each dimension independently', () => {
    const store = useXiaolianRuntimeStore.getState();
    store.setRuntimeState('thinking');
    store.setCompanionState('celebrating');

    store.resetRuntime();
    expect(useXiaolianRuntimeStore.getState()).toMatchObject({
      runtimeState: 'idle',
      companionState: 'celebrating',
    });

    store.resetCompanion();
    expect(useXiaolianRuntimeStore.getState()).toMatchObject({
      runtimeState: 'idle',
      companionState: 'companion',
    });
  });
});
