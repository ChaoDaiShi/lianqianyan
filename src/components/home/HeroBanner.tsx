import { Bot, PlayCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface HeroBannerProps {
  courseName: string;
}

/**
 * 首页顶部 Hero —— 个性化学习驾驶舱开场。
 * 纯展示（欢迎语 + 当前课程 + CTA），不承载真实数据。
 */
export function HeroBanner({ courseName }: HeroBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/80 via-white to-white p-6 md:p-8">
      <div className="relative z-10">
        <p className="text-sm font-medium text-blue-700">忆涟千言—教 · EducationMind</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 md:text-[28px]">
          你好，欢迎回来
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-500">
          小涟已经根据你的学习记录，整理好了当前最值得关注的学习内容。
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {courseName ? (
            <span className="rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-medium text-blue-700">
              当前课程：{courseName}
            </span>
          ) : null}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/space" className="gap-1.5">
              <PlayCircle className="h-4 w-4" />
              继续学习
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-1.5">
            <Link to="/xiaolian">
              <Bot className="h-4 w-4" />
              问问小涟
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
