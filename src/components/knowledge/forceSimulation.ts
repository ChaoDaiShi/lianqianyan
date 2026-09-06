/**
 * 可动画的力导向模拟（零依赖，forceMesh 的增量版）。
 *
 * 与一次性 computeForceMesh 不同，本模块维护一份可持续 step() 的模拟状态，
 * 支撑知识图谱的拖拽固定（pin）、重新加热（reheat）与逐帧渲染。
 * 沿用 forceMesh 的安全约定：力/速度限幅、坐标非有限时回退到安全位置，
 * 确定性伪随机初始化保证同一张图布局稳定。
 */

import { boundedVector, mulberry32, seedFromId } from './forceMesh';

export interface SimulationNodeInput {
  id: string;
  radius: number;
}

export interface SimulationLinkInput {
  source: string;
  target: string;
}

export interface SimulationOptions {
  width: number;
  height: number;
  linkLength?: number;
}

export interface SimulationPoint {
  x: number;
  y: number;
}

interface SimNode {
  id: string;
  radius: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  safeX: number;
  safeY: number;
  pinned: boolean;
}

const FORCE_CLAMP = 56;
const SPEED_CLAMP = 22;
const VELOCITY_DAMPING = 0.62;
const ACTIVE_SPEED_EPSILON = 0.08;
const BOUNDS_PADDING = 40;
/** 斥力系数与向心重力：数值越大节点越靠拢（与半径增长配套调小斥力）。 */
const REPULSION_COEFFICIENT = 12;
const GRAVITY = 0.02;
const COLLISION_GAP = 18;
const SPRING_STIFFNESS = 0.0009;

export class ForceSimulation {
  private readonly nodeById = new Map<string, SimNode>();
  private readonly nodes: SimNode[] = [];
  private readonly links: Array<{ source: SimNode; target: SimNode }>;
  private readonly centerX: number;
  private readonly centerY: number;
  private readonly repulsion: number;
  private readonly linkLength: number;
  private readonly width: number;
  private readonly height: number;
  private readonly random: () => number;
  private settledFrames = 0;

  constructor(nodes: SimulationNodeInput[], links: SimulationLinkInput[], options: SimulationOptions) {
    this.width = options.width;
    this.height = options.height;
    this.linkLength = options.linkLength ?? 150;
    this.centerX = options.width / 2;
    this.centerY = options.height / 2;
    this.repulsion = (Math.min(options.width, options.height) ** 2) / Math.max(nodes.length, 4) * REPULSION_COEFFICIENT;
    this.random = mulberry32(
      nodes.reduce((seed, node) => seed ^ seedFromId(node.id), 0x9e3779b9),
    );

    const initialRadius = Math.min(options.width, options.height) * 0.34;
    nodes.forEach((node, index) => {
      const angle = (2 * Math.PI * index) / Math.max(nodes.length, 1) + this.random() * 0.8;
      const distance = initialRadius * (0.7 + this.random() * 0.6);
      const simNode: SimNode = {
        id: node.id,
        radius: node.radius,
        x: this.centerX + Math.cos(angle) * distance,
        y: this.centerY + Math.sin(angle) * distance,
        vx: 0,
        vy: 0,
        safeX: 0,
        safeY: 0,
        pinned: false,
      };
      simNode.safeX = simNode.x;
      simNode.safeY = simNode.y;
      this.nodes.push(simNode);
      this.nodeById.set(node.id, simNode);
    });

    this.links = links
      .map((link) => {
        const source = this.nodeById.get(link.source);
        const target = this.nodeById.get(link.target);
        return source && target ? { source, target } : null;
      })
      .filter((link): link is { source: SimNode; target: SimNode } => link !== null);
  }

  positionOf(id: string): SimulationPoint | null {
    const node = this.nodeById.get(id);
    return node ? { x: node.x, y: node.y } : null;
  }

  radiusOf(id: string): number | null {
    return this.nodeById.get(id)?.radius ?? null;
  }

  /** 推进一帧物理，并返回本帧后是否仍在运动。 */
  step(): boolean {
    const nodes = this.nodes;
    const forces = new Map<SimNode, { x: number; y: number }>(nodes.map((node) => [node, { x: 0, y: 0 }]));

    for (let i = 0; i < nodes.length; i += 1) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j += 1) {
        const b = nodes[j];
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let distance = Math.hypot(dx, dy);
        if (distance < 1) {
          // 完全重叠时用确定性随机方向破对称，避免整团节点同向漂移
          dx = this.random() - 0.5 || 0.5;
          dy = this.random() - 0.5 || 0.5;
          distance = Math.hypot(dx, dy);
        }
        const minDistance = a.radius + b.radius + COLLISION_GAP;
        const strength = this.repulsion / (distance * distance)
          + (distance < minDistance ? (minDistance - distance) * 0.6 : 0);
        const fx = (dx / distance) * strength;
        const fy = (dy / distance) * strength;
        forces.get(a)!.x += fx;
        forces.get(a)!.y += fy;
        forces.get(b)!.x -= fx;
        forces.get(b)!.y -= fy;
      }
    }

    for (const link of this.links) {
      const dx = link.target.x - link.source.x;
      const dy = link.target.y - link.source.y;
      const distance = Math.max(Math.hypot(dx, dy), 1);
      const strength = (distance - this.linkLength) * SPRING_STIFFNESS * distance;
      const fx = (dx / distance) * strength;
      const fy = (dy / distance) * strength;
      forces.get(link.source)!.x += fx;
      forces.get(link.source)!.y += fy;
      forces.get(link.target)!.x -= fx;
      forces.get(link.target)!.y -= fy;
    }

    for (const node of nodes) {
      if (node.pinned) continue;
      const force = forces.get(node)!;
      force.x += (this.centerX - node.x) * GRAVITY;
      force.y += (this.centerY - node.y) * GRAVITY;
    }

    let maxDisplacement = 0;
    for (const node of nodes) {
      if (node.pinned) {
        node.vx = 0;
        node.vy = 0;
        continue;
      }
      const bounded = boundedVector(forces.get(node)!.x, forces.get(node)!.y, FORCE_CLAMP);
      node.vx = boundedVector((node.vx + bounded.x) * VELOCITY_DAMPING, 0, SPEED_CLAMP).x;
      node.vy = boundedVector(0, (node.vy + bounded.y) * VELOCITY_DAMPING, SPEED_CLAMP).y;
      const previousX = node.x;
      const previousY = node.y;
      node.x += node.vx;
      node.y += node.vy;
      if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) {
        node.x = node.safeX;
        node.y = node.safeY;
        node.vx = 0;
        node.vy = 0;
        continue;
      }
      const minX = BOUNDS_PADDING + node.radius;
      const minY = BOUNDS_PADDING + node.radius;
      const clampedX = Math.min(Math.max(node.x, minX), this.width - BOUNDS_PADDING - node.radius);
      const clampedY = Math.min(Math.max(node.y, minY), this.height - BOUNDS_PADDING - node.radius);
      // 边界是非弹性墙：被夹住的轴速度吸收掉，避免“贴墙抖动”让模拟永不收敛
      if (clampedX !== node.x) node.vx = 0;
      if (clampedY !== node.y) node.vy = 0;
      node.x = clampedX;
      node.y = clampedY;
      node.safeX = node.x;
      node.safeY = node.y;
      maxDisplacement = Math.max(maxDisplacement, Math.hypot(node.x - previousX, node.y - previousY));
    }

    this.settledFrames = maxDisplacement <= ACTIVE_SPEED_EPSILON ? this.settledFrames + 1 : 0;
    return this.settledFrames < 12;
  }

  isActive(): boolean {
    return this.settledFrames < 12;
  }

  /** 重新加热：清零静止帧计数，让 rAF 循环恢复推进（不直接注入速度，避免视觉抖动）。 */
  reheat(): void {
    this.settledFrames = 0;
  }

  pin(id: string): void {
    const node = this.nodeById.get(id);
    if (node) node.pinned = true;
  }

  unpin(id: string): void {
    const node = this.nodeById.get(id);
    if (node) node.pinned = false;
  }

  isPinned(id: string): boolean {
    return this.nodeById.get(id)?.pinned ?? false;
  }

  movePinned(id: string, x: number, y: number): void {
    const node = this.nodeById.get(id);
    if (!node || !node.pinned || !Number.isFinite(x) || !Number.isFinite(y)) return;
    node.x = x;
    node.y = y;
    node.safeX = x;
    node.safeY = y;
    node.vx = 0;
    node.vy = 0;
    this.reheat();
  }
}

/** 同步预热：让首帧就是一份组织好的布局（SSR 标记同样使用这份坐标）。 */
export function precomputeLayout(simulation: ForceSimulation, iterations = 170): void {
  for (let index = 0; index < iterations; index += 1) {
    const stillActive = simulation.step();
    if (!stillActive && index > 24) break;
  }
}
