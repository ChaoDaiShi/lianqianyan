import type { LucideIcon } from 'lucide-react';
import { Sparkles } from 'lucide-react';
import { GlassPanel } from '@/components/design/GlassPanel';
import { XiaolianCharacter } from '@/components/xiaolian/XiaolianCharacter';

interface PlaceholderPageProps { title: string; description?: string; icon?: LucideIcon; feature?: string; }

export function PlaceholderPage({ title, description, icon: Icon = Sparkles, feature }: PlaceholderPageProps) {
  return <GlassPanel className="relative flex min-h-[62vh] flex-col items-center justify-center overflow-hidden p-8 text-center"><div className="absolute left-1/4 top-1/4 h-48 w-48 rounded-full bg-violet-200/25 blur-3xl" /><div className="absolute bottom-1/4 right-1/4 h-48 w-48 rounded-full bg-sky-200/25 blur-3xl" /><div className="relative"><XiaolianCharacter state="idle" size="lg" /><span className="mx-auto mt-5 grid h-12 w-12 place-items-center rounded-2xl bg-white/70 text-primary-600 shadow-sm"><Icon className="h-6 w-6" /></span><h1 className="mt-5 text-3xl font-bold">{title}</h1>{description && <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-[var(--em-muted-ink)]">{description}</p>}{feature && <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-violet-50 px-4 py-2 text-xs font-semibold text-primary-700"><Sparkles className="h-3.5 w-3.5" />{feature}</p>}</div></GlassPanel>;
}
