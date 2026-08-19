import type { LucideIcon } from 'lucide-react';
import { Sparkles } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  feature?: string;
}

/**
 * 漂亮的占位页面 —— 第一阶段仅「学习首页」完整实现，
 * 其余导航项使用本组件占位，后续再逐个开发。
 */
export function PlaceholderPage({
  title,
  description,
  icon: Icon = Sparkles,
  feature,
}: PlaceholderPageProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
        <Icon className="h-8 w-8" />
      </div>
      <h1 className="mt-6 text-2xl font-bold text-gray-900">{title}</h1>
      {description && (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-gray-500">
          {description}
        </p>
      )}
      {feature && (
        <div className="mt-6 flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-sm text-blue-700">
          <Sparkles className="h-4 w-4" />
          {feature}
        </div>
      )}
    </div>
  );
}
