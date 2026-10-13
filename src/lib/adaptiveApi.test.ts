import { beforeEach, describe, expect, it, vi } from 'vitest';

const post = vi.hoisted(() => vi.fn());

vi.mock('./api', () => ({ api: { post } }));

import { prepareLeapRetest } from './adaptiveApi';

describe('adaptive API', () => {
  beforeEach(() => post.mockReset());

  it('explicitly assigns an eligible delayed retest before the answer step', async () => {
    const session = { id: 'session-1', retestQuestion: { id: 'retest-1' } };
    post.mockResolvedValue({ data: session });

    await expect(prepareLeapRetest('session-1')).resolves.toEqual(session);
    expect(post).toHaveBeenCalledWith(
      '/api/adaptive/sessions/session-1/ready-retest',
      {},
    );
  });
});
