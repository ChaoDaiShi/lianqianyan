import { useState, type FormEvent } from 'react';
import { ArrowRight, BookOpenCheck, LockKeyhole, Sparkles } from 'lucide-react';

interface AuthScreenProps {
  onLogin(username: string, password: string): Promise<void> | void;
  onRegister(payload: { username: string; displayName: string; password: string }): Promise<void> | void;
  busy: boolean;
  error: string | null;
}

export function AuthScreen({ onLogin, onRegister, busy, error }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (mode === 'login') void onLogin(username, password);
    else void onRegister({ username, displayName, password });
  };

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[radial-gradient(circle_at_15%_10%,#fce7f3_0,transparent_35%),radial-gradient(circle_at_85%_15%,#e0e7ff_0,transparent_32%),linear-gradient(145deg,#fff_0%,#faf7ff_100%)] px-5 py-10 text-slate-800">
      <div className="absolute left-[-8rem] top-1/3 h-80 w-80 rounded-full bg-pink-200/30 blur-3xl" />
      <section className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/80 bg-white/75 shadow-[0_28px_90px_rgba(91,74,140,.18)] backdrop-blur-xl lg:grid-cols-[1.05fr_.95fr]">
        <div className="hidden min-h-[620px] flex-col justify-between bg-gradient-to-br from-violet-700 via-fuchsia-600 to-pink-500 p-12 text-white lg:flex">
          <div><img src="/brand/cyrene-icon.jpeg" alt="小涟" className="h-20 w-20 rounded-3xl border-2 border-white/70 object-cover object-top shadow-xl" /><p className="mt-8 text-sm tracking-[.24em] text-white/75">忆涟千言—教</p><h1 className="mt-3 text-4xl font-semibold leading-tight">让每一次学习，<br />都从真实的你开始。</h1></div>
          <div className="space-y-4 text-sm text-white/85"><p className="flex gap-3"><BookOpenCheck className="h-5 w-5" />新账号没有预设计划，由你选择课程。</p><p className="flex gap-3"><LockKeyhole className="h-5 w-5" />学习记录与账号隔离，安全保存在服务端。</p><p className="flex gap-3"><Sparkles className="h-5 w-5" />小涟会根据真实证据持续调整辅导。</p></div>
        </div>
        <div className="flex min-h-[620px] flex-col justify-center p-7 sm:p-12">
          <div className="mb-8 flex rounded-2xl bg-violet-50 p-1">
            <button type="button" onClick={() => setMode('login')} className={`flex-1 rounded-xl px-4 py-3 text-sm font-medium ${mode === 'login' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500'}`}>登录学习空间</button>
            <button type="button" onClick={() => setMode('register')} className={`flex-1 rounded-xl px-4 py-3 text-sm font-medium ${mode === 'register' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500'}`}>创建账号</button>
          </div>
          <h2 className="text-2xl font-semibold">{mode === 'login' ? '欢迎回来' : '建立你的学习档案'}</h2>
          <p className="mt-2 text-sm text-slate-500">登录后才会加载你的学习数据，不再创建匿名学习记录。</p>
          <form className="mt-8 space-y-5" onSubmit={submit}>
            {mode === 'register' && <label className="block text-sm font-medium">显示名称<input required maxLength={60} value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="mt-2 w-full rounded-2xl border border-violet-100 bg-white px-4 py-3 outline-none ring-violet-300 focus:ring-2" placeholder="小涟怎么称呼你" /></label>}
            <label className="block text-sm font-medium">用户名<input required minLength={3} maxLength={32} autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} className="mt-2 w-full rounded-2xl border border-violet-100 bg-white px-4 py-3 outline-none ring-violet-300 focus:ring-2" placeholder="字母、数字、_ - ." /></label>
            <label className="block text-sm font-medium">密码<input required minLength={8} maxLength={128} type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-2xl border border-violet-100 bg-white px-4 py-3 outline-none ring-violet-300 focus:ring-2" placeholder="至少 8 位，包含字母和数字" /></label>
            {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
            <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-5 py-3.5 font-medium text-white shadow-lg shadow-violet-200 disabled:opacity-60">{busy ? '正在连接…' : mode === 'login' ? '登录' : '注册并继续'}<ArrowRight className="h-4 w-4" /></button>
          </form>
        </div>
      </section>
    </main>
  );
}
