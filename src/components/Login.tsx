import { useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/auth';
import { Spade, Loader as Loader2, Mail, Lock, User, ChevronRight, CircleCheck as CheckCircle2 } from 'lucide-react';

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const switchMode = (newMode: 'signin' | 'signup') => {
    setMode(newMode);
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    if (mode === 'signin') {
      const result = await signIn(email, password);
      setSubmitting(false);
      if (result.error) setError(result.error);
    } else {
      const result = await signUp(email, password, name);
      setSubmitting(false);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess('アカウントを作成しました。自動的にログインします…');
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-navy-500 to-navy-700 shadow-lg shadow-navy-500/20 mb-4">
          <Spade className="w-11 h-11 text-white" strokeWidth={2} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          JOKERS<span className="text-navy-600 ml-1.5">出欠管理</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">チームの出欠をシンプルに</p>
      </div>

      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6">
          <button
            type="button"
            onClick={() => switchMode('signin')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              mode === 'signin' ? 'bg-navy-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            ログイン
          </button>
          <button
            type="button"
            onClick={() => switchMode('signup')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              mode === 'signup' ? 'bg-navy-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            新規登録
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">名前</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="山田太郎"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-500/30 focus:border-navy-500 transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">メールアドレス</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="team@example.com"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-500/30 focus:border-navy-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">パスワード</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6文字以上"
                required
                minLength={6}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-500/30 focus:border-navy-500 transition"
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
              {error}
            </div>
          )}

          {success && (
            <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-navy-500 to-navy-700 text-white text-sm font-bold rounded-lg shadow-md hover:shadow-lg hover:from-navy-600 hover:to-navy-800 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                {mode === 'signin' ? 'ログイン' : 'アカウント作成'}
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-4 text-center text-sm">
          {mode === 'signin' ? (
            <p className="text-slate-500">
              アカウントをお持ちでないですか？
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className="text-navy-600 font-semibold hover:text-navy-700 ml-1"
              >
                新規登録はこちら
              </button>
            </p>
          ) : (
            <p className="text-slate-500">
              既にアカウントをお持ちですか？
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="text-navy-600 font-semibold hover:text-navy-700 ml-1"
              >
                ログインはこちら
              </button>
            </p>
          )}
        </div>
      </div>

      <p className="mt-6 text-xs text-slate-400 text-center max-w-xs">
        アカウントを作成すると、チームメンバーとして出欠の記録ができるようになります。
      </p>
    </div>
  );
}
