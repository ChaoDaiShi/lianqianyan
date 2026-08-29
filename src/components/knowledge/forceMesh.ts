/**
 * 轻量力导向网状布局（参考 d3-force 的 multtidle REPULSION + SPRING 模型，零依赖）。
 * 使用确定性伪随机初始化，保证同一张图在渲染与测试中布局稳定。
 */

export interface MeshNodeInput {
  id: string;
  radius: number;
}

export interface MeshLinkInput {
  source: string;
  target: string;
}

export interface MeshLayoutOptions {
  width: number;
  height: number;
  linkLength?: number;
  iterations?: number;
}

export type MeshPositions = Map<string, { x: number; y: number }>;

function seedFromId(id: string): number {
  let hash = 2166136261;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function computeForceMesh(
  nodes: MeshNodeInput[],
  links: MeshLinkInput[],
  options: MeshLayoutOptions,
): MeshPositions {
  const { width, height } = options;
  const linkLength = options.linkLength ?? 150;
  const iterations = options.iterations ?? 320;
  const padding = 46;
  const random = mulberry32(
    nodes.reduce((seed, node) => seed ^ seedFromId(node.id), 0x9e3779b9),
  );

  const positions = new Map<string, { x: number; y: number }>();
  const velocities = new Map<string, { x: number; y: number }>();
  const centerX = width / 2;
  const centerY = height / 2;
  const initialRadius = Math.min(width, height) * 0.34;

  nodes.forEach((node, index) => {
    const angle = (2 * Math.PI * index) / Math.max(nodes.length, 1)
      + random() * 0.8;
    positions.set(node.id, {
      x: centerX + Math.cos(angle) * initialRadius * (0.7 + random() * 0.6),
      y: centerY + Math.sin(angle) * initialRadius * (0.7 + random() * 0.6),
    });
    velocities.set(node.id, { x: 0, y: 0 });
  });

  const repulsion = Math.min(width, height) ** 2 / Math.max(nodes.length, 4) * 22;

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const cooling = 1 - iteration / iterations;
    const forces = new Map<string, { x: number; y: number }>(
      nodes.map((node) => [node.id, { x: 0, y: 0 }]),
    );

    // 节点间斥力
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i];
        const b = nodes[j];
        const pa = positions.get(a.id)!;
        const pb = positions.get(b.id)!;
        let dx = pa.x - pb.x;
        let dy = pa.y - pb.y;
        let distance = Math.hypot(dx, dy);
        if (distance < 1) {
          dx = (random() - 0.5) || 0.5;
          dy = (random() - 0.5) || 0.5;
          distance = Math.hypot(dx, dy);
        }
        const minDistance = a.radius + b.radius + 26;
        const strength = repulsion / (distance * distance)
          + (distance < minDistance ? (minDistance - distance) * 0.9 : 0);
        const fx = (dx / distance) * strength;
        const fy = (dy / distance) * strength;
        forces.get(a.id)!.x += fx;
        forces.get(a.id)!.y += fy;
        forces.get(b.id)!.x -= fx;
        forces.get(b.id)!.y -= fy;
      }
    }

    // 连线弹簧引力
    for (const link of links) {
      const pa = positions.get(link.source);
      const pb = positions.get(link.target);
      if (!pa || !pb) continue;
      const dx = pb.x - pa.x;
      const dy = pb.y - pa.y;
      const distance = Math.max(Math.hypot(dx, dy), 1);
      const strength = (distance - linkLength) * 0.015;
      const fx = (dx / distance) * strength * distance * 0.02;
      const fy = (dy / distance) * strength * distance * 0.02;
      forces.get(link.source)!.x += fx;
      forces.get(link.source)!.y += fy;
      forces.get(link.target)!.x -= fx;
      forces.get(link.target)!.y -= fy;
    }

    // 向画布中心的弱重力，避免节点飘出
    for (const node of nodes) {
      const position = positions.get(node.id)!;
      const gravity = node.radius >= 26 ? 0.045 : 0.02;
      forces.get(node.id)!.x += (centerX - position.x) * gravity;
      forces.get(node.id)!.y += (centerY - position.y) * gravity;
    }

    for (const node of nodes) {
      const velocity = velocities.get(node.id)!;
      const force = forces.get(node.id)!;
      velocity.x = (velocity.x + force.x) * 0.32 * cooling;
      velocity.y = (velocity.y + force.y) * 0.32 * cooling;
      const position = positions.get(node.id)!;
      position.x += velocity.x;
      position.y += velocity.y;
    }
  }

  // 收敛后夹回画布边界，保留节点半径与呼吸空间
  for (const node of nodes) {
    const position = positions.get(node.id)!;
    position.x = Math.min(Math.max(position.x, padding + node.radius), width - padding - node.radius);
    position.y = Math.min(Math.max(position.y, padding + node.radius), height - padding - node.radius);
  }

  return positions;
}
