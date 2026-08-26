import { Component } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/layout/AppShell.jsx';
import { Card, ErrorState } from './components/ui/index.jsx';
import { useAuth } from './hooks/useAuth.jsx';

import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Expenses from './pages/Expenses.jsx';
import Budgets from './pages/Budgets.jsx';
import BudgetDetail from './pages/BudgetDetail.jsx';
import Analytics from './pages/Analytics.jsx';
import Settings from './pages/Settings.jsx';

/** Stops one bad render from blanking the whole app. */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Render error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <ErrorState
              message="Something broke while rendering this page"
              onRetry={() => window.location.reload()}
            />
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}

function FullPageLoader({ slow }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-4 text-center">
      <div className="w-8 h-8 rounded-full border-2 border-line border-t-accent animate-spin" />
      {/* WHY: the free API sleeps after 15 min idle and takes ~1 min to wake.
          Saying so turns "this app is broken" into "this app is on a free tier". */}
      {slow && (
        <div>
          <p className="text-sm font-medium">Waking up the server…</p>
          <p className="text-xs text-text-faint mt-1 max-w-xs">
            The free API sleeps after 15 minutes idle. First load takes about a minute.
          </p>
        </div>
      )}
    </div>
  );
}

function Protected({ children }) {
  const { user, loading, slow } = useAuth();
  // Rendering Login while /me is still in flight causes a login-page flash
  // before the redirect. Hold the loader until we actually know.
  if (loading) return <FullPageLoader slow={slow} />;
  if (!user) return <Navigate to="/login" replace />;
  return <AppShell>{children}</AppShell>;
}

function PublicOnly({ children }) {
  const { loading, slow } = useAuth();
  if (loading) return <FullPageLoader slow={slow} />;
  return children;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
        <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
        <Route path="/" element={<Protected><Dashboard /></Protected>} />
        <Route path="/expenses" element={<Protected><Expenses /></Protected>} />
        <Route path="/budgets" element={<Protected><Budgets /></Protected>} />
        <Route path="/budgets/:id" element={<Protected><BudgetDetail /></Protected>} />
        <Route path="/analytics" element={<Protected><Analytics /></Protected>} />
        <Route path="/settings" element={<Protected><Settings /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}
