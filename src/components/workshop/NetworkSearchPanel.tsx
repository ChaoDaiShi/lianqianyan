import { useState, type FormEvent } from 'react';
import { ExternalLink, Globe2, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassPanel } from '@/components/design/GlassPanel';
import { Input } from '@/components/ui/input';
import {
  searchNetwork,
  type NetworkSearchResponse,
} from '@/lib/educationApi';
import { resultCountLabel } from './workshopPresentation';

export function NetworkSearchPanel() {
  const [query, setQuery] = useState('死锁四个必要条件');
  const [language, setLanguage] = useState<'zh' | 'en'>('zh');
  const [response, setResponse] = useState<NetworkSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const normalizedQuery = query.trim();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (normalizedQuery.length < 2 || loading) return;
    setLoading(true);
    setError(false);
    setResponse(null);
    try {
      setResponse(
        await searchNetwork({
          query: normalizedQuery,
          language,
          limit: 4,
        }),
      );
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(18rem,0.7fr)_minmax(0,1.3fr)]">
      <GlassPanel className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sky-100 text-sky-700">
            <Globe2 className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold">联网学习检索 · Wikipedia</h2>
            <p className="mt-1 text-xs leading-5 text-[var(--em-muted-ink)]">
              用于查找补充资料；结果不会写入学习诊断、掌握度或课程证据。
            </p>
          </div>
        </div>

        <form className="mt-6 space-y-3" onSubmit={handleSubmit}>
          <label className="block text-xs font-semibold text-[var(--em-muted-ink)]">
            检索问题
            <Input
              value={query}
              disabled={loading}
              maxLength={100}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="输入至少 2 个字符，例如：银行家算法"
              className="mt-2 h-11 rounded-2xl bg-white/80"
            />
          </label>
          <label className="block text-xs font-semibold text-[var(--em-muted-ink)]">
            资料语言
            <select
              value={language}
              disabled={loading}
              onChange={(event) =>
                setLanguage(event.target.value as 'zh' | 'en')
              }
              className="mt-2 h-11 w-full rounded-2xl border border-violet-200 bg-white/80 px-3 text-sm"
            >
              <option value="zh">中文 Wikipedia</option>
              <option value="en">English Wikipedia</option>
            </select>
          </label>
          <Button
            type="submit"
            disabled={loading || normalizedQuery.length < 2}
            className="h-11 w-full gap-2 rounded-2xl bg-primary-500"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {loading ? '正在连接 Wikipedia…' : '检索联网资料'}
          </Button>
        </form>

        <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-[11px] leading-5 text-sky-800">
          课程内检索仍由 EducationMind 的本地知识库负责；这里的外部结果仅作为延伸阅读，并保留原始来源链接。
        </div>
      </GlassPanel>

      <GlassPanel className="min-h-[34rem] p-5 sm:p-6">
        {error ? (
          <div role="alert" className="grid min-h-[28rem] place-items-center text-center">
            <div className="max-w-sm">
              <h3 className="text-lg font-bold text-rose-700">联网检索暂时不可用</h3>
              <p className="mt-2 text-xs leading-6 text-[var(--em-muted-ink)]">
                没有离线结果会被伪装成网络资料。请检查网络后重新检索。
              </p>
            </div>
          </div>
        ) : response ? (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold tracking-[0.16em] text-sky-700">
                  WIKIPEDIA RESULTS
                </p>
                <h3 className="mt-1 text-lg font-bold">{resultCountLabel(response.results.length)}</h3>
              </div>
              <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-semibold text-sky-700">
                Provider：{response.provider}
              </span>
            </div>

            {response.results.length > 0 ? (
              <div className="mt-4 space-y-3">
                {response.results.map((result) => (
                  <article
                    key={result.url}
                    className="rounded-[22px] border border-violet-100 bg-white/65 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="font-bold">{result.title}</h4>
                        <p className="mt-1 text-[10px] text-sky-700">
                          {result.sourceDomain}
                        </p>
                      </div>
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-sky-100 bg-sky-50 px-2.5 py-1.5 text-[11px] font-semibold text-sky-700"
                      >
                        查看原文<ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <p className="mt-3 text-xs leading-6 text-[var(--em-muted-ink)]">
                      {result.summary || '上游没有返回可用摘要，请打开原文查看。'}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="grid min-h-[24rem] place-items-center text-center text-sm text-[var(--em-muted-ink)]">
                当前查询没有返回可用条目。可以换一个更具体的知识点名称。
              </div>
            )}
          </div>
        ) : (
          <div className="grid min-h-[28rem] place-items-center text-center">
            <div className="max-w-sm">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-[24px] bg-gradient-to-br from-sky-100 to-violet-100 text-sky-700">
                <Search className="h-7 w-7" />
              </span>
              <h3 className="mt-4 text-lg font-bold">从一个学习问题开始</h3>
              <p className="mt-2 text-xs leading-6 text-[var(--em-muted-ink)]">
                服务会实时请求 Wikipedia；尚未检索时不会展示预设的伪结果。
              </p>
            </div>
          </div>
        )}
      </GlassPanel>
    </div>
  );
}
