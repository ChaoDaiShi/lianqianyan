export async function publicKeyFingerprint(publicKey: globalThis.JsonWebKey): Promise<string> {
  const verificationKey = await crypto.subtle.importKey(
    'jwk',
    publicKey,
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['verify'],
  );
  const spki = await crypto.subtle.exportKey('spki', verificationKey);
  const digest = await crypto.subtle.digest('SHA-256', spki);
  const fingerprint = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0').toUpperCase(),
  ).join(':');
  return `SHA-256:${fingerprint}`;
}
