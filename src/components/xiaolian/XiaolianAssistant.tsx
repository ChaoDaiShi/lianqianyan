import { useEffect, useRef, useState } from 'react';
import { Bot, Send, Sparkles, X } from 'lucide-react';
import { useAssistantStore } from '@/store';
import { xiaolianAssistant } from '@/mock';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

/**
 * 全局小涟 —— 右下角悬浮 AI 入口 + 右侧 Assistant 面板。
 * 本轮使用 Mock 回复，仅提供 UI，不接入完整 LLM。
 */
export function XiaolianAssistant() {
  const { open, openPanel, closePanel } = useAssistantStore();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: 'user' as const, text },
    ]);
    setInput('');
    // Mock 回复
    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant' as const,
          text: '收到！第一阶段为演示 Mock 回复，后续将接入 Education Agent 的 Tutor / Memory 能力为你解答。',
        },
      ]);
    }, 500);
  };

  return (
    <>
      {/* 悬浮入口 */}
      <button
        type="button"
        onClick={openPanel}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-blue-600 px-4 py-3 text-white shadow-lg shadow-blue-600/20 transition-transform hover:scale-105"
        aria-label="打开小涟"
      >
        <Bot className="h-5 w-5" />
        <span className="text-sm font-semibold">小涟</span>
      </button>

      {/* 右侧面板 */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-gray-100 bg-white shadow-2xl transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
        role="dialog"
        aria-label="小涟助手"
      >
        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold text-gray-900">{xiaolianAssistant.title}</p>
              <p className="text-xs text-gray-400">个性化 AI 学习伙伴</p>
            </div>
          </div>
          <button
            type="button"
            onClick={closePanel}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="关闭"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 当前学习上下文 */}
        <div className="border-b border-gray-100 px-5 py-3">
          <p className="text-xs text-gray-400">当前学习：</p>
          <p className="mt-0.5 text-sm font-medium text-gray-700">
            {xiaolianAssistant.currentLearning}
          </p>
        </div>

        {/* 消息区 */}
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {messages.length === 0 ? (
            <div>
              <p className="mb-2 text-xs font-medium text-gray-400">推荐问题</p>
              <div className="space-y-2">
                {xiaolianAssistant.recommendedQuestions.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => {
                      setInput(q);
                    }}
                    className="block w-full rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-left text-sm text-gray-600 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  'max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed',
                  m.role === 'user'
                    ? 'ml-auto bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                )}
              >
                {m.text}
              </div>
            ))
          )}
        </div>

        {/* 输入区 */}
        <div className="border-t border-gray-100 px-4 py-3">
          <div className="flex items-end gap-2 rounded-xl border border-gray-200 p-1.5 focus-within:border-blue-400">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
              placeholder={xiaolianAssistant.placeholder}
              className="max-h-24 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-gray-400"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim()}
              className="rounded-lg bg-blue-600 p-2 text-white disabled:opacity-40"
              aria-label="发送"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
