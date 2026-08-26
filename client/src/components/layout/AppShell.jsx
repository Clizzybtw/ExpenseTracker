import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Receipt, Wallet, PieChart, Settings as SettingsIcon,
  Sun, Moon, LogOut,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useTheme } from '../../hooks/useTheme.jsx';
import { useToast } from '../../hooks/useToast.jsx';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/expenses', label: 'Expenses', icon: Receipt },
  { to: '/budgets', label: 'Budgets', icon: Wallet },
  { to: '/analytics', label: 'Analytics', icon: PieChart },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

function Toasts() {
  const { toasts, dismiss } = useToast();
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-[min(92vw,380px)]">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="flex items-center justify-between gap-3 bg-raised border border-line-strong
            rounded px-4 py-3 text-sm shadow-modal"
        >
          <span className={t.tone === 'danger' ? 'text-danger' : 'text-text'}>{t.message}</span>
          <div className="flex items-center gap-2 shrink-0">
            {t.action && (
              <button
                onClick={() => { t.action.onClick(); dismiss(t.id); }}
                className="text-accent font-semibold hover:underline"
              >
                {t.action.label}
              </button>
            )}
            <button onClick={() => dismiss(t.id)} className="text-text-faint hover:text-text">
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const { pathname } = useLocation();
  const current = NAV.find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)));

  return (
    <div className="min-h-screen bg-bg">
      {/* Sidebar — desktop only */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-56 flex-col border-r border-line bg-surface">
        <div className="px-5 py-5 border-b border-line">
          <p className="font-bold tracking-tight">Expense Tracker</p>
          <p className="text-xs text-text-faint mt-0.5 truncate">{user?.email}</p>
        </div>
        <nav className="flex-1 p-3 flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 h-9 rounded text-sm transition-colors ${
                  isActive
                    ? 'bg-accent-subtle text-accent font-semibold'
                    : 'text-text-muted hover:text-text hover:bg-raised'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-line flex flex-col gap-1">
          <button
            onClick={toggle}
            className="flex items-center gap-3 px-3 h-9 rounded text-sm text-text-muted
              hover:text-text hover:bg-raised transition-colors"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 h-9 rounded text-sm text-text-muted
              hover:text-danger hover:bg-raised transition-colors"
          >
            <LogOut size={16} />
            Log out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between
        px-4 h-14 border-b border-line bg-surface">
        <p className="font-semibold">{current?.label ?? 'Expense Tracker'}</p>
        <button onClick={toggle} aria-label="Toggle theme" className="text-text-muted p-2">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>

      <main className="md:pl-56 pb-24 md:pb-0">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8">{children}</div>
      </main>

      {/* Mobile bottom tabs */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 grid grid-cols-5
        border-t border-line bg-surface">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] ${
                isActive ? 'text-accent' : 'text-text-faint'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <Toasts />
    </div>
  );
}
