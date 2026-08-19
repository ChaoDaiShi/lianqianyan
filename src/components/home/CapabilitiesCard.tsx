import { Stethoscope, Route, MessagesSquare } from 'lucide-react';

const CAPABILITIES = [
  {
    icon: Stethoscope,
    title: '学习诊断',
    desc: '根据真实学习证据，判断当前掌握情况与薄弱点。',
  },
  {
    icon: Route,
    title: '学习规划',
    desc: '依据诊断结果生成下一步学习路线与任务。',
  },
  {
    icon: MessagesSquare,
    title: 'AI 辅导',
    desc: '结合学习画像，针对你的问题个性化答疑。',
  },
];

/**
 * 「小涟如何帮助你」—— 首页克制的能力展示。
 *
 * 语义准确：这是小涟的三类智能能力模块（非 Multi-Agent 协作）。
 * 当前尚未实现 Multi-Agent Runtime，因此不写作「多个 Agent 协作」。
 */
export function CapabilitiesCard() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <h2 className="text-lg font-bold text-gray-900">小涟如何帮助你</h2>
      <p className="mt-1 text-xs text-gray-400">小涟的三类智能能力</p>
      <div className="mt-4 space-y-3">
        {CAPABILITIES.map((cap) => {
          const Icon = cap.icon;
          return (
            <div
              key={cap.title}
              className="flex gap-3 rounded-xl border border-gray-100 bg-gray-50/40 p-3"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{cap.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-gray-500">
                  {cap.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
