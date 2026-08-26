import { useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Card, Skeleton, ErrorState, ProgressBar, statusClass } from '../components/ui/index.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useFetch } from '../hooks/useFetch';
import { budgetsApi } from '../api/resources';
import { formatMoney, formatDate } from '../lib';

const LABEL = { ok: 'On track', warning: 'Close to limit', over: 'Over budget' };

export default function BudgetDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const currency = user?.currency || 'INR';

  const progress = useFetch(useCallback(() => budgetsApi.progress(id), [id]), [id]);

  if (progress.loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-28" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (progress.error) {
    return <Card><ErrorState message={progress.error} onRetry={progress.refetch} /></Card>;
  }

  const p = progress.data;

  return (
    <div className="flex flex-col gap-5">
      <Link to="/budgets" className="flex items-center gap-2 text-sm text-text-muted hover:text-text w-fit">
        <ArrowLeft size={14} /> All budgets
      </Link>

      <div>
        <h1 className="text-lg font-bold tracking-tight">{p.budget.name}</h1>
        <p className="num text-sm text-text-muted">
          {formatDate(p.budget.startDate, 'long')} — {formatDate(p.budget.endDate, 'long')}
          {p.daysRemaining != null && ` · ${p.daysRemaining} days left`}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-text-faint font-semibold">Spent</p>
          <p className={`num text-xl font-semibold ${statusClass(p.status || 'ok')}`}>
            {formatMoney(p.totalSpent, currency, { compact: true })}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-text-faint font-semibold">Overall limit</p>
          <p className="num text-xl font-semibold">
            {p.budget.totalLimit != null ? formatMoney(p.budget.totalLimit, currency, { compact: true }) : '—'}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-text-faint font-semibold">Unallocated</p>
          <p className="num text-xl font-semibold">
            {p.unallocated != null ? formatMoney(p.unallocated, currency, { compact: true }) : '—'}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-text-faint font-semibold">Daily budget</p>
          <p className="num text-xl font-semibold">
            {p.dailyBudget != null ? formatMoney(p.dailyBudget, currency) : '—'}
          </p>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="font-semibold mb-4">Category limits</h2>
        {!p.allocations.length ? (
          <p className="text-sm text-text-faint">No category limits set on this budget.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {p.allocations.map((a) => (
              <div key={a.categoryId} className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: a.color }} />
                    {a.categoryName}
                    <span className={`text-xs font-normal ${statusClass(a.status)}`}>{LABEL[a.status]}</span>
                  </span>
                  <span className="num text-sm">
                    <span className={statusClass(a.status)}>{formatMoney(a.spent, currency)}</span>
                    <span className="text-text-faint"> / {formatMoney(a.limit, currency)}</span>
                  </span>
                </div>
                <ProgressBar percentage={a.percentage} status={a.status} />
                <p className="num text-xs text-text-faint">
                  {a.remaining >= 0
                    ? `${formatMoney(a.remaining, currency)} left`
                    : `${formatMoney(Math.abs(a.remaining), currency)} over`}
                  {' · '}{a.percentage}%
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {p.unbudgeted.spent > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Unbudgeted spending</h2>
            <span className="num text-sm">{formatMoney(p.unbudgeted.spent, currency)}</span>
          </div>
          <p className="text-sm text-text-muted mb-3">
            Spent in this period on categories with no allocation. Counted in the total above.
          </p>
          <ul className="flex flex-col gap-2">
            {p.unbudgeted.categories.map((c) => (
              <li key={c.categoryId} className="flex items-center justify-between text-sm border-t border-line pt-2">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                  {c.name}
                </span>
                <span className="num">{formatMoney(c.spent, currency)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
