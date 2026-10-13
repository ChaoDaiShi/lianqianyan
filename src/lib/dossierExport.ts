export interface SignedDossier {
  version: 1;
  issuer: 'local-browser-self-signed';
  algorithm: 'ECDSA-P256-SHA256';
  signedData: string;
  publicKey: globalThis.JsonWebKey;
  signature: string;
}

/** A local integrity receipt. It does not attest to a school or platform identity. */
export async function createSignedDossier(payload: unknown): Promise<SignedDossier> {
  const signedData = JSON.stringify(payload);
  const keys = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify'],
  );
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, keys.privateKey,
    new TextEncoder().encode(signedData),
  );
  return {
    version: 1,
    issuer: 'local-browser-self-signed',
    algorithm: 'ECDSA-P256-SHA256',
    signedData,
    publicKey: await crypto.subtle.exportKey('jwk', keys.publicKey),
    signature: btoa(String.fromCharCode(...new Uint8Array(signature))),
  };
}
