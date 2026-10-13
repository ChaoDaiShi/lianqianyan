import { webcrypto } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSignedDossier } from './dossierExport';

afterEach(() => vi.unstubAllGlobals());

describe('local signed dossier', () => {
  it('produces a verifiable signature over the exact exported content without exporting a private key', async () => {
    vi.stubGlobal('crypto', webcrypto);
    const payload = { learnerId: 'learner-1', courseId: 'course-ds', evidence: [{ score: 0.5 }] };
    const receipt = await createSignedDossier(payload);
    const publicKey = await webcrypto.subtle.importKey(
      'jwk', receipt.publicKey, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'],
    );
    const signature = Uint8Array.from(atob(receipt.signature), char => char.charCodeAt(0));
    const data = new TextEncoder().encode(receipt.signedData);
    expect(await webcrypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, publicKey, signature, data)).toBe(true);
    expect(JSON.parse(receipt.signedData)).toEqual(payload);
    expect(receipt.publicKey).not.toHaveProperty('d');
    expect(receipt.issuer).toBe('local-browser-self-signed');
    expect(await webcrypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' }, publicKey, signature,
      new TextEncoder().encode(receipt.signedData.replace('0.5', '1')),
    )).toBe(false);
  });
});
