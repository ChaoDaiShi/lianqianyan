import { webcrypto } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { publicKeyFingerprint } from './dossierPresentation';

afterEach(() => vi.unstubAllGlobals());

describe('archive dossier presentation', () => {
  it('derives a SHA-256 fingerprint from the public verification key', async () => {
    vi.stubGlobal('crypto', webcrypto);
    const pair = await webcrypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign', 'verify'],
    );
    const publicKey = await webcrypto.subtle.exportKey('jwk', pair.publicKey);

    const fingerprint = await publicKeyFingerprint(publicKey);

    expect(fingerprint).toMatch(/^SHA-256:([A-F0-9]{2}:){31}[A-F0-9]{2}$/);
  });
});
