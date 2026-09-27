import { useState } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import Login from '@/components/Login';
import Header from '@/components/Header';
import Dashboard from '@/components/Dashboard';
import AdminPanel from '@/components/AdminPanel';
import { Loader as Loader2 } from 'lucide-react';

type View = 'dashboard' | 'admin';

function AppContent() {
  const { session, profile, loading } = useAuth();
  const [view, setView] = useState<View>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-navy-600 animate-spin" />
      </div>
    );
  }

  // No session = show login screen, nothing else
  if (!session) {
    return <Login />;
  }

  const isAdmin = profile?.is_admin === true;

  // If non-admin tries to access admin view, redirect to dashboard
  const effectiveView = view === 'admin' && !isAdmin ? 'dashboard' : view;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header view={effectiveView} onNavigate={setView} isAdmin={isAdmin} />
      <main>
        {effectiveView === 'admin'
          ? (isAdmin ? <AdminPanel /> : <Dashboard />)
          : <Dashboard />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
