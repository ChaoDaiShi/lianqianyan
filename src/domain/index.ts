/**
 * EducationMind 领域模型 —— 统一入口。
 * 页面组件通过本 barrel 导入全部领域类型，保持依赖方向单一：
 *   Web UI ──●──> Domain（Domain 不依赖任何具体页面）。
 */

export * from './types';
export * from './entities';
export * from './profile';
export * from './plan';
export * from './evidence';
export * from './question';
export * from './report';
export * from './diagnosis';
export * from './planApi';
