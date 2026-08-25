const VENDOR_CHUNKS: ReadonlyArray<readonly [string, string]> = [
  ['/node_modules/pixi-live2d-display/', 'vendor-live2d'],
  ['/node_modules/pixi.js/', 'vendor-pixi'],
  ['/node_modules/@pixi/', 'vendor-pixi'],
  ['/node_modules/framer-motion/', 'vendor-motion'],
  ['/node_modules/lucide-react/', 'vendor-icons'],
  ['/node_modules/axios/', 'vendor-http'],
  ['/node_modules/zustand/', 'vendor-state'],
  ['/node_modules/@radix-ui/', 'vendor-ui'],
  ['/node_modules/react', 'vendor-react'],
];

export function resolveManualChunk(id: string): string | undefined {
  const normalizedId = id.replace(/\\/g, '/');
  return VENDOR_CHUNKS.find(([dependency]) =>
    normalizedId.includes(dependency),
  )?.[1];
}
