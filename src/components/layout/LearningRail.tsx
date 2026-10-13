import { useEffect, useState } from 'react';
import {
  Archive,
  BarChart3,
  BookOpen,
  BrainCircuit,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  GraduationCap,
  Home,
  MessageCircle,
  MoreHorizontal,
  Network,
  Settings,
  Stethoscope,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

type RailGroup = 'daily' | 'explore' | 'evidence';

interface RailItem {
  label: string;
  group: RailGroup;
  to: string;
  icon: LucideIcon;
}

export const learningRailItems: RailItem[] = [
  { label: '首页', group: 'daily', to: '/', icon: Home },
  { label: '我的学习', group: 'daily', to: '/my-learning', icon: GraduationCap },
  { label: '自适应学习', group: 'daily', to: '/adaptive', icon: BrainCircuit },
  { label: '学习空间', group: 'explore', to: '/space', icon: BookOpen },
  { label: '知识空间', group: 'explore', to: '/knowledge', icon: Network },
  { label: '测评中心', group: 'explore', to: '/exams', icon: ClipboardCheck },
  { label: '研读助教', group: 'explore', to: '/xiaolian', icon: MessageCircle },
  { label: '学习工坊', group: 'explore', to: '/resources', icon: Wrench },
  { label: '成效实验室', group: 'evidence', to: '/outcome-lab', icon: BarChart3 },
  { label: '学习诊断', group: 'evidence', to: '/diagnosis', icon: Stethoscope },
  { label: '学习档案', group: 'evidence', to: '/archive', icon: Archive },
  { label: '系统设置', group: 'evidence', to: '/settings', icon: Settings },
];

const RAIL_GROUPS: Array<{ id: RailGroup; label: string }> = [
  { id: 'daily', label: '日常闭环' },
  { id: 'explore', label: '探究与实战' },
  { id: 'evidence', label: '成效与沉淀' },
];

const MOBILE_PRIMARY_PATHS = ['/', '/my-learning', '/xiaolian', '/knowledge'];

function isCurrent(item: RailItem, currentPath?: string) {
  return currentPath === item.to;
}

function RailLink({
  item,
  currentPath,
  expanded,
}: {
  item: RailItem;
  currentPath?: string;
  expanded: boolean;
}) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      aria-label={item.label}
      title={expanded ? undefined : item.label}
      className={({ isActive }) =>
        cn(
          'group relative flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-[var(--em-muted-ink)] transition-colors hover:bg-[var(--em-primary-subtle)] hover:text-[var(--em-primary-deep)]',
          isActive || isCurrent(item, currentPath)
            ? 'bg-[var(--em-primary-subtle)] text-[var(--em-primary-deep)]'
            : '',
          expanded ? 'justify-start' : 'justify-center px-0',
        )
      }
    >
      {({ isActive }) => (
        <>
          {(isActive || isCurrent(item, currentPath)) && (
            <span
              aria-hidden="true"
              className="absolute inset-y-2 left-0 w-0.5 rounded-r bg-[var(--em-action)]"
            />
          )}
          <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
          {expanded && <span className="truncate">{item.label}</span>}
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
          'relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-[11px] font-medium transition-colors',
          isActive || isCurrent(item, currentPath)
            ? 'text-[var(--em-primary-deep)]'
            : 'text-[var(--em-muted-ink)]',
          assistant && 'text-[var(--em-primary-deep)]',
        )
      }
    >
      <Icon aria-hidden="true" className="h-5 w-5" />
      <span className="truncate">{assistant ? '小涟' : item.label}</span>
    </NavLink>
  );
}

export function LearningRail({
  currentPath,
  expanded,
  onExpandedChange,
}: {
  currentPath?: string;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}) {
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
  const ToggleIcon = expanded ? ChevronLeft : ChevronRight;

  return (
    <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
      <nav
        id="learning-rail"
        data-learning-rail="primary"
        data-learning-rail-mode={expanded ? 'expanded' : 'compact'}
        aria-label="学习主导航"
        className={cn(
          'fixed bottom-0 left-0 top-14 z-40 hidden flex-col overflow-y-auto border-r border-[var(--em-border)] bg-[var(--em-surface)] px-2 py-3 md:flex',
          'transition-[width] duration-150',
          expanded ? 'w-[200px]' : 'w-16',
        )}
      >
        <button
          type="button"
          aria-label={expanded ? '收起导航' : '展开导航'}
          aria-expanded={expanded}
          aria-controls="learning-rail-items"
          onClick={() => onExpandedChange(!expanded)}
          className={cn(
            'mb-3 inline-flex h-9 items-center rounded-md text-[var(--em-muted-ink)] hover:bg-[var(--em-primary-subtle)] hover:text-[var(--em-primary-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--em-focus-ring)]',
            expanded ? 'w-full justify-between px-3' : 'w-10 justify-center self-center',
          )}
        >
          {expanded && <span className="text-sm font-semibold">主导航</span>}
          <ToggleIcon aria-hidden="true" className="h-4 w-4" />
        </button>
        <div id="learning-rail-items" className="space-y-4">
          {RAIL_GROUPS.map((group) => {
            const items = learningRailItems.filter((item) => item.group === group.id);
            return (
              <section key={group.id} aria-label={group.label}>
                {expanded && (
                  <h2 className="mb-1 px-2 text-xs font-semibold text-[var(--em-muted-ink)]">
                    {group.label}
                  </h2>
                )}
                <div className="space-y-1">
                  {items.map((item) => (
                    <RailLink
                      key={item.to}
                      item={item}
                      currentPath={currentPath}
                      expanded={expanded}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </nav>

      <DialogContent
        id="learning-more-entries"
        showCloseButton={false}
        aria-describedby="learning-more-description"
        className="fixed inset-x-3 bottom-[calc(5.8rem+env(safe-area-inset-bottom))] left-3 top-auto z-[60] w-auto max-w-none translate-x-0 translate-y-0 gap-0 p-4 md:hidden"
      >
        <div className="flex items-center justify-between">
          <DialogTitle className="text-base font-semibold">更多学习入口</DialogTitle>
          <DialogClose asChild>
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-md text-[var(--em-muted-ink)] hover:bg-[var(--em-primary-subtle)]"
              aria-label="关闭更多入口"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </DialogClose>
        </div>
        <DialogDescription id="learning-more-description" className="sr-only">
          在这些入口之间切换当前学习工作区。
        </DialogDescription>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {moreItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  'flex min-w-0 flex-col items-center gap-2 rounded-lg border border-[var(--em-border)] bg-[var(--em-surface)] px-2 py-3 text-center text-xs font-medium text-[var(--em-muted-ink)]',
                  item.to === currentPath && 'bg-[var(--em-primary-subtle)] text-[var(--em-primary-deep)]',
                )}
              >
                <Icon aria-hidden="true" className="h-5 w-5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </DialogContent>

      <nav
        data-mobile-dock="primary"
        aria-label="移动学习导航"
        className="fixed inset-x-2 bottom-2 z-50 grid grid-cols-5 items-end rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[var(--em-shadow-md)] md:hidden"
      >
        <MobileDockLink item={home} currentPath={currentPath} />
        <MobileDockLink item={learning} currentPath={currentPath} />
        <MobileDockLink item={assistant} currentPath={currentPath} assistant />
        <MobileDockLink item={knowledge} currentPath={currentPath} />
        <DialogTrigger asChild>
          <button
            type="button"
            data-mobile-dock-item="more"
            aria-label="更多学习入口"
            aria-controls="learning-more-entries"
            className={cn(
              'flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-[11px] font-medium transition-colors',
              moreOpen || moreActive
                ? 'text-[var(--em-primary-deep)]'
                : 'text-[var(--em-muted-ink)]',
            )}
          >
            <MoreHorizontal aria-hidden="true" className="h-5 w-5" />
            <span>更多</span>
          </button>
        </DialogTrigger>
      </nav>
    </Dialog>
  );
}
