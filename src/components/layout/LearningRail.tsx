import { useEffect, useState } from 'react';
import {
  BookOpen,
  ClipboardCheck,
  FolderOpen,
  GraduationCap,
  Home,
  MessageCircleHeart,
  MoreHorizontal,
  Settings,
  Stethoscope,
  WandSparkles,
  X,
  type LucideIcon,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { LianMark } from '@/components/brand/LianMark';
import { cn } from '@/lib/utils';

interface RailItem {
  label: string;
  shortLabel?: string;
  description: string;
  group: 'start' | 'explore' | 'record';
  to: string;
  icon: LucideIcon;
}

export const learningRailItems: RailItem[] = [
  { label: '首页', description: '今日指挥台', group: 'start', to: '/', icon: Home },
  { label: '小涟', shortLabel: '小涟', description: '流式陪伴', group: 'start', to: '/xiaolian', icon: MessageCircleHeart },
  { label: '我的学习', description: '计划与任务', group: 'start', to: '/my-learning', icon: GraduationCap },
  { label: '学习诊断', description: '看见真实起点', group: 'explore', to: '/diagnosis', icon: Stethoscope },
  { label: '知识空间', description: 'GraphRAG 关系', group: 'explore', to: '/knowledge', icon: BookOpen },
  { label: '考试中心', description: '测评与复盘', group: 'explore', to: '/exams', icon: ClipboardCheck },
  { label: '学习工坊', description: '检索与创作', group: 'explore', to: '/resources', icon: WandSparkles },
  { label: '学习档案', description: '证据与成长', group: 'record', to: '/archive', icon: FolderOpen },
  { label: '设置', description: '偏好与连接', group: 'record', to: '/settings', icon: Settings },
];

const RAIL_GROUPS = [
  { id: 'start' as const, label: '开始学习' },
  { id: 'explore' as const, label: '探索与训练' },
  { id: 'record' as const, label: '记录与设置' },
];

const MOBILE_PRIMARY_PATHS = ['/', '/my-learning', '/xiaolian', '/knowledge'];

function isCurrent(item: RailItem, currentPath?: string) {
  return currentPath === item.to;
}

function CompactRailLink({
  item,
  currentPath,
}: {
  item: RailItem;
  currentPath?: string;
}) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      aria-label={item.label}
      className={({ isActive }) =>
        cn(
          'group relative flex w-full flex-col items-center gap-1.5 rounded-[18px] px-1 py-2.5 text-[11px] font-semibold transition duration-200',
          isActive || isCurrent(item, currentPath)
            ? 'bg-primary-500/10 text-primary-700 ring-1 ring-primary-300/50'
            : 'text-[var(--em-muted-ink)] hover:bg-white/60 hover:text-primary-700',
          item.to === '/xiaolian' &&
            'my-1 bg-gradient-to-b from-violet-100/80 to-pink-50/80',
        )
      }
    >
      {({ isActive }) => (
        <>
          {(isActive || isCurrent(item, currentPath)) && (
            <span
              aria-hidden="true"
              className="absolute -left-0.5 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-gradient-to-b from-primary-400 to-star"
            />
          )}
          <Icon
            className={cn(
              'h-[22px] w-[22px]',
              (isActive || isCurrent(item, currentPath)) &&
                'text-primary-500',
            )}
          />
          <span className="whitespace-nowrap">{item.shortLabel ?? item.label}</span>
        </>
      )}
    </NavLink>
  );
}

function ExpandedRailLink({
  item,
  currentPath,
}: {
  item: RailItem;
  currentPath?: string;
}) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      aria-label={item.label}
      className={({ isActive }) =>
        cn(
          'group relative flex min-h-[52px] w-full items-center gap-3 rounded-[20px] border px-3 py-1.5 transition duration-200',
          isActive || isCurrent(item, currentPath)
            ? 'border-primary-200/80 bg-primary-500/10 text-primary-800 shadow-[0_8px_22px_rgba(111,95,224,0.08)]'
            : 'border-transparent text-[var(--em-muted-ink)] hover:border-violet-100 hover:bg-white/60 hover:text-primary-700',
          item.to === '/xiaolian' &&
            'bg-gradient-to-r from-violet-100/75 to-pink-50/70',
        )
      }
    >
      {({ isActive }) => (
        <>
          {(isActive || isCurrent(item, currentPath)) && (
            <span
              aria-hidden="true"
              className="absolute -left-px top-1/2 h-8 w-1 -translate-y-1/2 rounded-full bg-gradient-to-b from-primary-400 to-star"
            />
          )}
          <span
            className={cn(
              'grid h-9 w-9 shrink-0 place-items-center rounded-[14px] bg-white/70 text-[var(--em-muted-ink)] ring-1 ring-violet-100 transition',
              (isActive || isCurrent(item, currentPath)) &&
                'bg-white text-primary-600 ring-primary-200',
            )}
          >
            <Icon className="h-[21px] w-[21px]" />
          </span>
          <span className="min-w-0 text-left">
            <strong className="block truncate text-sm font-semibold leading-5 text-[var(--em-ink)]">
              {item.label}
            </strong>
            <span className="mt-0.5 block truncate text-[11px] leading-4 text-[var(--em-muted-ink)]">
              {item.description}
            </span>
          </span>
        </>
      )}
    </NavLink>
  );
}

function MobileDockLink({
  item,
  currentPath,
  assistant = false,
}: {
  item: RailItem;
  currentPath?: string;
  assistant?: boolean;
}) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      aria-label={assistant ? '和小涟聊聊' : item.label}
      data-mobile-dock-item={assistant ? 'xiaolian' : item.to}
      className={({ isActive }) =>
        cn(
          'relative flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 text-[9px] font-semibold transition',
          isActive || isCurrent(item, currentPath)
            ? 'text-primary-700'
            : 'text-[var(--em-muted-ink)]',
          assistant && '-mt-7',
        )
      }
    >
      {assistant ? (
        <span className="grid h-14 w-14 place-items-center rounded-[22px] border border-white/90 bg-[var(--em-surface-raised)] shadow-[0_12px_30px_rgba(111,95,224,0.26)] ring-1 ring-primary-200/80">
          <LianMark decorative size="md" />
        </span>
      ) : (
        <Icon className="h-5 w-5" />
      )}
      <span className={cn(assistant && 'mt-0.5')}>
        {item.shortLabel ?? item.label}
      </span>
    </NavLink>
  );
}

export function LearningRail({ currentPath }: { currentPath?: string }) {
  const [moreOpen, setMoreOpen] = useState(false);
  useEffect(() => setMoreOpen(false), [currentPath]);

  const mobileItems = MOBILE_PRIMARY_PATHS.map((path) =>
    learningRailItems.find((item) => item.to === path),
  ).filter((item): item is RailItem => Boolean(item));
  const home = mobileItems.find((item) => item.to === '/')!;
  const learning = mobileItems.find((item) => item.to === '/my-learning')!;
  const assistant = mobileItems.find((item) => item.to === '/xiaolian')!;
  const knowledge = mobileItems.find((item) => item.to === '/knowledge')!;
  const moreItems = learningRailItems.filter(
    (item) => !MOBILE_PRIMARY_PATHS.includes(item.to),
  );
  const moreActive = moreItems.some((item) => item.to === currentPath);

  return (
    <>
      <div data-learning-rail="desktop" className="hidden md:block">
        <nav
          data-learning-rail="primary"
          data-learning-rail-mode="compact"
          aria-label="学习星轨"
          className="em-glass fixed left-4 top-1/2 z-40 hidden w-[84px] -translate-y-1/2 flex-col rounded-[28px] px-2 py-3 md:flex xl:hidden"
        >
          {learningRailItems.map((item) => (
            <CompactRailLink
              key={item.to}
              item={item}
              currentPath={currentPath}
            />
          ))}
        </nav>

        <nav
          data-learning-rail="primary"
          data-learning-rail-mode="expanded"
          aria-label="学习星轨"
          className="em-glass fixed bottom-5 left-4 top-[4.75rem] z-40 hidden w-0 flex-col overflow-y-auto rounded-[30px] p-3 xl:flex xl:w-[248px]"
        >
          <div className="px-2 pb-2 pt-1">
            <p className="text-sm font-bold text-[var(--em-ink)]">学习工作区</p>
            <p className="mt-1 text-[11px] leading-4 text-[var(--em-muted-ink)]">
              沿真实证据完成今天的学习闭环
            </p>
          </div>
          <div className="space-y-2">
            {RAIL_GROUPS.map((group) => (
              <section key={group.id} aria-labelledby={`rail-group-${group.id}`}>
                <p
                  id={`rail-group-${group.id}`}
                  className="mb-1 px-2 text-[10px] font-bold tracking-[0.16em] text-primary-600/80"
                >
                  {group.label}
                </p>
                <div className="space-y-1">
                  {learningRailItems
                    .filter((item) => item.group === group.id)
                    .map((item) => (
                      <ExpandedRailLink
                        key={item.to}
                        item={item}
                        currentPath={currentPath}
                      />
                    ))}
                </div>
              </section>
            ))}
          </div>
        </nav>
      </div>

      {moreOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="关闭更多入口"
            className="absolute inset-0 bg-[rgba(41,35,74,0.2)] backdrop-blur-[2px]"
            onClick={() => setMoreOpen(false)}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-label="更多学习入口"
            className="em-glass absolute inset-x-3 bottom-[calc(5.8rem+env(safe-area-inset-bottom))] rounded-[28px] p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold tracking-[0.16em] text-primary-600">LEARNING MAP</p>
                <h2 className="mt-1 text-lg font-bold">更多学习入口</h2>
              </div>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-2xl bg-violet-100/70 text-primary-700"
                aria-label="关闭更多入口"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {moreItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      'flex min-w-0 flex-col items-center gap-2 rounded-[18px] border border-violet-100 bg-white/60 px-2 py-3 text-center text-[11px] font-semibold text-[var(--em-muted-ink)]',
                      item.to === currentPath &&
                        'border-primary-200 bg-violet-100/70 text-primary-700',
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </section>
        </div>
      )}

      <nav
        data-mobile-dock="primary"
        aria-label="移动学习导航"
        className="em-glass fixed inset-x-2 bottom-2 z-50 grid grid-cols-5 items-end rounded-[26px] px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1.5 md:hidden"
      >
        <MobileDockLink item={home} currentPath={currentPath} />
        <MobileDockLink item={learning} currentPath={currentPath} />
        <MobileDockLink item={assistant} currentPath={currentPath} assistant />
        <MobileDockLink item={knowledge} currentPath={currentPath} />
        <button
          type="button"
          data-mobile-dock-item="more"
          aria-label="更多学习入口"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen((open) => !open)}
          className={cn(
            'flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 text-[9px] font-semibold transition',
            moreOpen || moreActive
              ? 'text-primary-700'
              : 'text-[var(--em-muted-ink)]',
          )}
        >
          <MoreHorizontal className="h-5 w-5" />
          <span>更多</span>
        </button>
      </nav>
    </>
  );
}
