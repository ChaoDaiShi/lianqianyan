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
  const [query, setQuery] = useState('操作系统 死锁');
  const [language, setLanguage] = useState<'zh' | 'en'>('zh');
  const [response, setResponse] = useState<NetworkSearchResponse | null>(null);
  const [requestedAt, setRequestedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const normalizedQuery = query.trim();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (normalizedQuery.length < 2 || loading) return;
    setLoading(true);
    setError(false);
    setResponse(null);
    setRequestedAt(null);
    try {
      const result = await searchNetwork({
        query: normalizedQuery,
        language,
        limit: 4,
      });
      setResponse(result);
      setRequestedAt(new Date());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(15rem,1fr)_minmax(15rem,1fr)_minmax(0,2fr)]">
      <GlassPanel className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--em-primary-subtle)] text-[var(--em-primary)]">
            <Globe2 className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold">联网学习检索 · AnySearch</h2>
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
              className="mt-2 h-11 rounded-lg bg-[var(--em-surface)]"
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
              className="mt-2 h-11 w-full rounded-lg border border-[var(--em-border)] bg-[var(--em-surface)] px-3 text-sm"
            >
              <option value="zh">中文资料</option>
              <option value="en">English sources</option>
            </select>
          </label>
          <Button
            type="submit"
            disabled={loading || normalizedQuery.length < 2}
            className="h-11 w-full gap-2 rounded-lg bg-[var(--em-action)]"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {loading ? '正在连接 AnySearch…' : '检索联网资料'}
          </Button>
        </form>

        <div className="mt-4 rounded-xl border border-[var(--em-border)] bg-[var(--em-surface-subtle)] px-4 py-3 text-[11px] leading-5 text-[var(--em-muted-ink)]">
          课程内检索仍由涟千言的本地知识库负责；这里的外部结果仅作为延伸阅读，并保留原始来源链接。
        </div>
      </GlassPanel>

      <GlassPanel className="p-5 sm:p-6">
        <p className="text-[10px] font-semibold text-[var(--em-primary-deep)]">02 · 处理过程</p>
        <h2 className="mt-1 text-lg font-bold">检索状态</h2>
        <dl className="mt-5 space-y-4 text-xs">
          <div><dt className="text-[var(--em-muted-ink)]">本次查询</dt><dd className="mt-1 break-words font-medium">{response?.query ?? normalizedQuery}</dd></div>
          <div><dt className="text-[var(--em-muted-ink)]">处理状态</dt><dd className="mt-1 font-medium">{loading ? '正在等待检索响应' : error ? '请求失败' : response ? '已收到检索响应' : '尚未提交检索'}</dd></div>
          {response && <div><dt className="text-[var(--em-muted-ink)]">实际 Provider</dt><dd className="mt-1 font-medium">{response.provider}</dd></div>}
          {requestedAt && <div><dt className="text-[var(--em-muted-ink)]">响应接收时间（本机）</dt><dd className="mt-1 font-medium">{requestedAt.toLocaleString('zh-CN')}</dd></div>}
          {response && <div><dt className="text-[var(--em-muted-ink)]">返回条目</dt><dd className="mt-1 font-medium">{response.results.length} 条</dd></div>}
        </dl>
        <p className="mt-5 rounded-lg border border-[var(--em-border)] bg-[var(--em-surface-subtle)] p-3 text-[11px] leading-5 text-[var(--em-muted-ink)]">响应没有可信度等级字段，因此不评级。外部网页只作为延伸阅读，不并入课程内部证据。</p>
      </GlassPanel>

      <GlassPanel className="min-h-[34rem] p-5 sm:p-6">
        {error ? (
          <div role="alert" className="grid min-h-[28rem] place-items-center text-center">
            <div className="max-w-sm">
              <h3 className="text-lg font-bold text-[var(--em-danger)]">联网检索暂时不可用</h3>
              <p className="mt-2 text-xs leading-6 text-[var(--em-muted-ink)]">
                没有离线结果会被伪装成网络资料。请检查网络后重新检索。
              </p>
            </div>
          </div>
        ) : response ? (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
            <p className="text-[10px] font-bold tracking-[0.16em] text-[var(--em-primary-deep)]">
                  03 · 产物预览
                </p>
                <h3 className="mt-1 text-lg font-bold">{resultCountLabel(response.results.length)}</h3>
              </div>
            </div>

            {response.results.length > 0 ? (
              <div className="mt-4 space-y-3">
                {response.results.map((result) => (
                  <article
                    key={result.url}
                    className="rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="font-bold">{result.title}</h4>
                        <p className="mt-1 break-all text-[10px] text-[var(--em-muted-ink)]">
                          {result.sourceDomain} · {result.url}
                        </p>
                      </div>
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[var(--em-border)] bg-[var(--em-primary-subtle)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--em-primary)]"
                      >
                        查看原文<ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <p className="mt-2 text-[10px] text-[var(--em-muted-ink)]">可信度等级：未提供（检索响应没有该字段）</p>
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
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-xl text-[var(--em-primary)]">
                <Search className="h-7 w-7" />
              </span>
              <h3 className="mt-4 text-lg font-bold">从一个学习问题开始</h3>
              <p className="mt-2 text-xs leading-6 text-[var(--em-muted-ink)]">
                服务会实时请求 AnySearch；尚未检索时不会展示预设的伪结果。
              </p>
            </div>
          </div>
        )}
      </GlassPanel>
    </div>
  );
}
