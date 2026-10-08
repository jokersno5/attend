import { useAuth } from '@/lib/auth';
import { LogOut, LayoutDashboard, Settings, Spade, LogIn } from 'lucide-react';

type View = 'dashboard' | 'admin';

type Props = {
  view: View;
  onNavigate: (view: View) => void;
  isAdmin: boolean;
};

export default function Header({ view, onNavigate, isAdmin }: Props) {
  const { profile, session, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 shrink-0">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-navy-500 to-navy-700 shadow-md shrink-0">
            <Spade className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
          <span className="font-bold text-slate-900 text-sm sm:text-base hidden sm:inline tracking-wide">
            JOKERS<span className="text-navy-600 ml-1">出欠管理</span>
          </span>
        </div>

        <nav className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
          <button
            onClick={() => onNavigate('dashboard')}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              view === 'dashboard'
                ? 'bg-navy-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>ダッシュボード</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => onNavigate('admin')}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                view === 'admin'
                  ? 'bg-navy-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>管理者モード</span>
            </button>
          )}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {session && profile ? (
            <>
              <div className="hidden sm:flex items-center gap-2 px-1">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-navy-500 to-navy-700 flex items-center justify-center text-xs font-bold text-white">
                  {profile.name?.charAt(0) ?? '?'}
                </div>
                <span className="text-sm text-slate-600 max-w-20 truncate">{profile.name}</span>
              </div>
              <button
                onClick={signOut}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 transition"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">ログアウト</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => onNavigate('admin')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-navy-600 hover:bg-navy-50 transition"
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">ログイン</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
