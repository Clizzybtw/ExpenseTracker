import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, Receipt } from 'lucide-react';
import { Card, Skeleton, EmptyState, ErrorState, Button, ProgressBar, Badge, statusClass } from '../components/ui/index.jsx';
import { CategoryDonut } from '../components/charts/index.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useFetch } from '../hooks/useFetch';
import { analyticsApi, budgetsApi, expensesApi } from '../api/resources';
import { formatMoney, formatDate, monthRange } from '../lib';

function Stat({ label, value, sub, tone }) {
  return (
    <Card className="p-4 flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-text-faint font-semibold">{label}</span>
      <span className={`num text-xl font-semibold ${tone || ''}`}>{value}</span>
      {sub && <span className="text-xs text-text-faint">{sub}</span>}
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const currency = user?.currency || 'INR';
  const range = monthRange(0);

  const summary = useFetch(useCallback(() => analyticsApi.summary(range), [range.from, range.to]), [range.from]);
  const byCat = useFetch(useCallback(() => analyticsApi.byCategory(range), [range.from, range.to]), [range.from]);
  const recent = useFetch(useCallback(() => expensesApi.list({ limit: 5, sort: 'date', order: 'desc' }), []), []);
  const activeId = useFetch(useCallback(() => analyticsApi.activeBudget(), []), []);
  const progress = useFetch(
    useCallback(() => (activeId.data ? budgetsApi.progress(activeId.data) : Promise.resolve(null)), [activeId.data]),
    [activeId.data]
  );

  const s = summary.data;
  const change = s?.changePercent;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-bold tracking-tight">
          {new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}
        </h1>
        <p className="text-sm text-text-muted">
          {progress.data?.daysRemaining != null
            ? `${progress.data.daysRemaining} days left in the active budget`
            : 'Your spending this month'}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {summary.loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[86px]" />)
        ) : summary.error ? (
          <Card className="col-span-full"><ErrorState message={summary.error} onRetry={summary.refetch} /></Card>
        ) : (
          <>
            <Stat
              label="Spent this month"
              value={formatMoney(s.totalSpent, currency, { compact: true })}
              sub={progress.data?.budget?.totalLimit ? `of ${formatMoney(progress.data.budget.totalLimit, currency, { compact: true })} limit` : null}
            />
            <Stat
              label="Remaining"
              value={
                progress.data?.budget?.totalLimit != null
                  ? formatMoney(progress.data.budget.totalLimit - progress.data.totalSpent, currency, { compact: true })
                  : '—'
              }
              sub={progress.data?.dailyBudget != null ? `${formatMoney(progress.data.dailyBudget, currency)} / day` : 'No active budget'}
              tone={progress.data?.status === 'over' ? 'text-danger' : ''}
            />
            <Stat
              label="Expenses logged"
              value={s.expenseCount}
              sub={s.topCategory ? `${s.topCategory.name} leads` : null}
            />
            <Stat
              label="vs last month"
              value={change == null ? '—' : `${change > 0 ? '+' : ''}${change}%`}
              sub={change == null ? 'No prior data' : `was ${formatMoney(s.previousPeriodSpent, currency, { compact: true })}`}
              tone={change == null ? '' : change > 0 ? 'text-danger' : 'text-ok'}
            />
          </>
        )}
      </div>

      {/* Budget progress */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Budget progress</h2>
          {progress.data && (
            <span className="num text-xs text-text-faint">
              {formatMoney(progress.data.totalAllocated, currency, { compact: true })} allocated
              {progress.data.unallocated != null && ` · ${formatMoney(progress.data.unallocated, currency, { compact: true })} free`}
            </span>
          )}
        </div>

        {activeId.loading || progress.loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8" />)}
          </div>
        ) : !activeId.data ? (
          <EmptyState
            icon={Wallet}
            title="No active budget"
            description="Set limits per category to see progress here."
            action={<Link to="/budgets"><Button variant="primary">Create a budget</Button></Link>}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {progress.data?.allocations.map((a) => (
              <div key={a.categoryId} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: a.color }} />
                    {a.categoryName}
                  </span>
                  <span className={`num text-xs ${statusClass(a.status)}`}>
                    {formatMoney(a.spent, currency, { compact: true })} / {formatMoney(a.limit, currency, { compact: true })}
                  </span>
                </div>
                <ProgressBar percentage={a.percentage} status={a.status} />
              </div>
            ))}

            {progress.data?.unbudgeted.spent > 0 && (
              <div className="flex items-center justify-between pt-3 mt-1 border-t border-line">
                <div>
                  <p className="text-sm">Unbudgeted</p>
                  <p className="text-xs text-text-faint">
                    {progress.data.unbudgeted.categories.map((c) => c.name).join(' · ')} — no allocation set
                  </p>
                </div>
                <span className="num text-sm">{formatMoney(progress.data.unbudgeted.spent, currency)}</span>
              </div>
            )}
          </div>
        )}
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Donut */}
        <Card className="p-5">
          <h2 className="font-semibold mb-4">Where it went</h2>
          {byCat.loading ? (
            <Skeleton className="h-[220px]" />
          ) : byCat.error ? (
            <ErrorState message={byCat.error} onRetry={byCat.refetch} />
          ) : !byCat.data?.length ? (
            <EmptyState icon={Receipt} title="Nothing logged yet" description="Add an expense and this fills in." />
          ) : (
            <CategoryDonut data={byCat.data} currency={currency} />
          )}
        </Card>

        {/* Recent */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Recent expenses</h2>
            <Link to="/expenses" className="text-xs text-accent font-semibold hover:underline">View all</Link>
          </div>
          {recent.loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : !recent.data?.expenses.length ? (
            <EmptyState
              icon={Receipt}
              title="No expenses yet"
              description="Log one and the charts fill in."
              action={<Link to="/expenses"><Button variant="primary">Add first expense</Button></Link>}
            />
          ) : (
            <ul className="flex flex-col">
              {recent.data.expenses.map((e) => (
                <li key={e.id} className="flex items-center gap-3 py-2.5 border-t border-line first:border-0">
                  <span className="num text-xs text-text-faint w-14 shrink-0">{formatDate(e.date)}</span>
                  <Badge color={e.category?.color}>{e.category?.name}</Badge>
                  <span className="flex-1 text-sm text-text-secondary truncate">{e.note}</span>
                  <span className="num text-sm whitespace-nowrap">{formatMoney(e.amount, currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
