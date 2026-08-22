import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { NebulaBackground } from '@/components/design/NebulaBackground';
import { GlassPanel } from '@/components/design/GlassPanel';
import { XiaolianCharacter } from '@/components/xiaolian/XiaolianCharacter';

function NotFound() {
  return <div className="relative grid min-h-screen place-items-center overflow-hidden bg-[var(--em-canvas)] p-4"><NebulaBackground /><GlassPanel className="relative z-10 max-w-lg p-8 text-center sm:p-12"><XiaolianCharacter state="encourage" size="lg" /><p className="mt-5 text-xs font-semibold tracking-[0.25em] text-primary-600">LOST STAR · 404</p><h1 className="mt-2 text-3xl font-bold">这颗星点暂时不在航线上</h1><p className="mt-3 text-sm leading-7 text-[var(--em-muted-ink)]">小涟没有找到这个页面。回到学习首页，我们继续沿着真实学习路线前进。</p><Link to="/" className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-primary-500 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-primary-600"><ArrowLeft className="h-4 w-4" />返回学习首页</Link></GlassPanel></div>;
}
export default NotFound;
